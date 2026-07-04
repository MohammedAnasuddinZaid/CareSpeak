"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import { HandLandmarker, FilesetResolver } from "@mediapipe/tasks-vision";
import { classifyHandGesture, HandGestureSmoother, isOpenPalm } from "@/lib/handClassifier";
import { voiceAlert } from "@/lib/tts";
import { addGestureLog } from "@/lib/gestureLog";
import { HandGesture, HandData, HAND_GESTURE_MAP, SystemDiagnostics, PatientMetrics, Point } from "@/types";

const WASM_URL = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.18/wasm";
const MODEL_URL = "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/latest/hand_landmarker.task";

const FINGER_COLORS = ["#ef4444", "#f97316", "#eab308", "#22c55e", "#3b82f6"];
const FINGER_INDICES = [[1,2,3,4],[5,6,7,8],[9,10,11,12],[13,14,15,16],[17,18,19,20]];
const CLUTCH_CLOSE_MS = 5000;
const RESTING_WINDOW_MS = 10000;
const RESTING_THRESHOLD = 5;
const RESTING_COOLDOWN_MS = 30000;

const CONNECTIONS: [number, number][] = [[0,1],[1,2],[2,3],[3,4],[5,6],[6,7],[7,8],[9,10],[10,11],[11,12],[13,14],[14,15],[15,16],[17,18],[18,19],[19,20],[0,5],[5,9],[9,13],[13,17],[0,17]];

function dist(a: Point, b: Point): number {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2 + (a.z - b.z) ** 2);
}

export function useHandGesture(onBroadcastAlert?: (gesture: string, description: string, confidence: number) => void) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const landmarkerRef = useRef<HandLandmarker | null>(null);
  const animRef = useRef<number>(0);
  const streamRef = useRef<MediaStream | null>(null);
  const smootherRef = useRef(new HandGestureSmoother());
  const lastLoggedGesture = useRef<string | null>(null);
  const restState = useRef({ transitions: 0, windowStart: 0, cooldownUntil: 0 });
  const pauseState = useRef({ paused: false, palmCloseStart: 0 });
  const lastFpsTime = useRef(0);
  const frameCount = useRef(0);
  const diagnostics = useRef<SystemDiagnostics>({ brightness: 0, trackingStable: false, fps: 0, message: null });

  const metricsRef = useRef({
    prevLandmarks: null as Point[] | null,
    movementAccum: 0,
    movementSamples: 0,
    lastMetricsBroadcast: 0,
    lastGestureTime: 0,
  });

  function getEffectiveThreshold(): number {
    if (Date.now() < restState.current.cooldownUntil) return 0.85;
    return 0.7;
  }

  const [gesture, setGesture] = useState<HandGesture>(null);
  const [confidence, setConfidence] = useState(0);
  const [fps, setFps] = useState(0);
  const [numHands, setNumHands] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cameraOn, setCameraOn] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [pausedReason, setPausedReason] = useState<string | null>(null);
  const [patientMetrics, setPatientMetrics] = useState<PatientMetrics>({});

  function computePatientMetrics() {
    const m = metricsRef.current;
    const movementActivity = m.movementSamples > 0 ? Math.min(1, m.movementAccum / m.movementSamples / 0.005) : 0.5;
    m.movementAccum = 0;
    m.movementSamples = 0;
    return { movementActivity: Math.round(movementActivity * 100) / 100 };
  }

  const init = useCallback(async () => {
    try {
      setLoading(true);
      const wasm = await FilesetResolver.forVisionTasks(WASM_URL);
      const landmarker = await HandLandmarker.createFromOptions(wasm, {
        baseOptions: { modelAssetPath: MODEL_URL },
        runningMode: "VIDEO",
        numHands: 2,
        minHandDetectionConfidence: 0.7,
        minTrackingConfidence: 0.5,
      });
      landmarkerRef.current = landmarker;
      setLoading(false);
    } catch {
      setError("Failed to load hand gesture model. Please ensure you have a stable internet connection.");
      setLoading(false);
    }
  }, []);

  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, facingMode: "user" },
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        await videoRef.current.play();
        setCameraOn(true);
        processFrames();
      }
    } catch {
      setError("Camera access denied. Please allow camera permission in your browser settings.");
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (animRef.current) cancelAnimationFrame(animRef.current);
    if (streamRef.current) { streamRef.current.getTracks().forEach((t) => t.stop()); streamRef.current = null; }
    setCameraOn(false); setGesture(null); setConfidence(0); setNumHands(0); setIsPaused(false); setPausedReason(null);
    setPatientMetrics({});
    smootherRef.current.reset();
    lastLoggedGesture.current = null;
    pauseState.current = { paused: false, palmCloseStart: 0 };
  }, []);

  const processFrames = useCallback(() => {
    if (!videoRef.current || !landmarkerRef.current) return;
    const video = videoRef.current;
    if (video.readyState < 2) { animRef.current = requestAnimationFrame(processFrames); return; }

    frameCount.current++;
    const nowTs = performance.now();
    if (nowTs - lastFpsTime.current >= 1000) {
      diagnostics.current.fps = frameCount.current;
      setFps(frameCount.current);
      frameCount.current = 0;
      lastFpsTime.current = nowTs;
    }

    const nowPerf = performance.now();
    const result = landmarkerRef.current.detectForVideo(video, nowPerf);

    const hands: HandData[] = [];
    if (result.landmarks && result.handedness) {
      for (let i = 0; i < result.landmarks.length; i++) {
        hands.push({
          landmarks: result.landmarks[i].map((lm) => ({ x: lm.x, y: lm.y, z: lm.z ?? 0 })),
          handedness: result.handedness[i][0].categoryName as "Left" | "Right",
          worldLandmarks: result.worldLandmarks?.[i]?.map((lm) => ({ x: lm.x, y: lm.y, z: lm.z ?? 0 })),
        });
      }
    }
    setNumHands(hands.length);

    if (hands.length > 0) {
      const m = metricsRef.current;
      const lm0 = hands[0].landmarks;
      if (m.prevLandmarks && lm0.length > 0) {
        let totalMovement = 0;
        for (let i = 0; i < lm0.length; i++) {
          totalMovement += dist(lm0[i], m.prevLandmarks[i]);
        }
        m.movementAccum += totalMovement / lm0.length;
        m.movementSamples++;
      }
      m.prevLandmarks = lm0.map((p) => ({ ...p }));

      const now = Date.now();
      if (now - m.lastMetricsBroadcast > 1000) {
        const metrics = computePatientMetrics();
        setPatientMetrics(metrics);
        m.lastMetricsBroadcast = now;
      }
    }

    if (hands.length > 0 && isOpenPalm(hands[0].landmarks)) {
      const now = Date.now();
      if (pauseState.current.palmCloseStart === 0) pauseState.current.palmCloseStart = now;
      if (!pauseState.current.paused && now - pauseState.current.palmCloseStart >= CLUTCH_CLOSE_MS) {
        pauseState.current.paused = true;
        setIsPaused(true);
        setPausedReason("Palm held open — system paused");
      }
    } else {
      pauseState.current.palmCloseStart = 0;
      if (pauseState.current.paused) {
        pauseState.current.paused = false;
        setIsPaused(false);
        setPausedReason(null);
      }
    }

    if (!pauseState.current.paused) {
      const raw = classifyHandGesture(hands);
      const smoothed = smootherRef.current.push(raw);
      setGesture(smoothed.gesture);
      setConfidence(smoothed.confidence);

      const threshold = getEffectiveThreshold();
      if (smoothed.gesture && smoothed.confidence > threshold) {
        const entry = HAND_GESTURE_MAP[smoothed.gesture];
        if (entry) {
          voiceAlert.speak(smoothed.gesture, "hand");
          if (smoothed.gesture !== lastLoggedGesture.current) {
            addGestureLog(smoothed.gesture, entry.description, smoothed.confidence, "hand", voiceAlert.getLanguage());
            lastLoggedGesture.current = smoothed.gesture;
            onBroadcastAlert?.(smoothed.gesture, entry.description, smoothed.confidence);
          }
        }
      }

      const rs = restState.current;
      if (smoothed.gesture && smoothed.confidence > 0.5) {
        const now = Date.now();
        if (now - rs.windowStart > RESTING_WINDOW_MS) { rs.transitions = 0; rs.windowStart = now; }
        rs.transitions++;
        if (rs.transitions >= RESTING_THRESHOLD) {
          rs.cooldownUntil = now + RESTING_COOLDOWN_MS;
          rs.transitions = 0;
          diagnostics.current.message = "Resting state cooldown active — threshold raised to 0.85";
        }
      }
    }

    if (canvasRef.current && videoRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        const w = video.videoWidth; const h = video.videoHeight;
        canvas.width = w; canvas.height = h;
        ctx.drawImage(video, 0, 0);

        if (pauseState.current.paused) {
          ctx.fillStyle = "rgba(0,0,0,0.5)";
          ctx.fillRect(0, 0, w, h);
          ctx.fillStyle = "rgba(251, 191, 36, 0.9)";
          ctx.font = "bold 48px Inter, sans-serif";
          ctx.textAlign = "center";
          ctx.fillText("PAUSED", w / 2, h / 2 - 20);
          ctx.font = "16px Inter, sans-serif";
          ctx.fillStyle = "rgba(148, 163, 184, 0.8)";
          ctx.fillText("Open palm to resume", w / 2, h / 2 + 30);
        }

        if (result.landmarks && !pauseState.current.paused) {
          const allLm = result.landmarks;
          for (let hi = 0; hi < allLm.length; hi++) {
            const landmarks = allLm[hi];
            ctx.strokeStyle = "rgba(59,130,246,0.6)"; ctx.lineWidth = 2;
            for (const [i, j] of CONNECTIONS) {
              ctx.beginPath();
              ctx.moveTo(landmarks[i].x * w, landmarks[i].y * h);
              ctx.lineTo(landmarks[j].x * w, landmarks[j].y * h);
              ctx.stroke();
            }
            for (let fi = 0; fi < FINGER_INDICES.length; fi++) {
              const indices = FINGER_INDICES[fi];
              const fingerConf = confidence > 0.3 ? confidence : 0.1;
              const alpha = Math.max(0.3, Math.min(1, fingerConf));
              const color = FINGER_COLORS[fi % FINGER_COLORS.length];
              for (const idx of indices) {
                const lm = landmarks[idx];
                ctx.beginPath(); ctx.arc(lm.x * w, lm.y * h, 5, 0, 2 * Math.PI);
                ctx.fillStyle = color; ctx.globalAlpha = alpha; ctx.fill(); ctx.globalAlpha = 1;
                ctx.beginPath(); ctx.arc(lm.x * w, lm.y * h, 5, 0, 2 * Math.PI);
                ctx.strokeStyle = "rgba(255,255,255,0.3)"; ctx.lineWidth = 1; ctx.stroke();
              }
            }
            for (const lm of landmarks) {
              ctx.beginPath(); ctx.arc(lm.x * w, lm.y * h, 2, 0, 2 * Math.PI);
              ctx.fillStyle = "rgba(255,255,255,0.15)"; ctx.fill();
            }
          }
        }
      }
    }
    animRef.current = requestAnimationFrame(processFrames);
  }, [confidence]);

  useEffect(() => {
    init();
    return () => { stopCamera(); if (animRef.current) cancelAnimationFrame(animRef.current); };
  }, []);

  return { videoRef, canvasRef, gesture, confidence, fps, numHands, loading, error, cameraOn, isPaused, pausedReason, diagnostics: diagnostics.current, patientMetrics, startCamera, stopCamera };
}
