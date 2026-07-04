"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import { FaceLandmarker, FilesetResolver } from "@mediapipe/tasks-vision";
import { classifyEyeGesture, EyeGestureSmoother } from "@/lib/eyeClassifier";
import { voiceAlert } from "@/lib/tts";
import { addGestureLog } from "@/lib/gestureLog";
import { EyeGesture, EYE_GESTURE_MAP, SystemDiagnostics, PatientMetrics, Point } from "@/types";

const WASM_URL = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.18/wasm";
const MODEL_URL = "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/latest/face_landmarker.task";

const CLUTCH_CLOSE_MS = 5000;
const RESTING_WINDOW_MS = 10000;
const RESTING_THRESHOLD = 5;
const RESTING_COOLDOWN_MS = 30000;
const LEFT_EYE_CORNERS = [33, 133];
const RIGHT_EYE_CORNERS = [362, 263];
const LEFT_EYE_TOP_BOTTOM = [159, 145];
const RIGHT_EYE_TOP_BOTTOM = [386, 374];

function dist(a: Point, b: Point): number {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2 + (a.z - b.z) ** 2);
}

function eyeAspectRatio(landmarks: Point[], cornerL: number, cornerR: number, top: number, bottom: number): number {
  const eyeWidth = dist(landmarks[cornerL], landmarks[cornerR]);
  const eyeHeight = dist(landmarks[top], landmarks[bottom]);
  if (eyeWidth < 1e-6) return 1;
  return eyeHeight / eyeWidth;
}

export function useEyeGesture(onBroadcastAlert?: (gesture: string, description: string, confidence: number) => void) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const landmarkerRef = useRef<FaceLandmarker | null>(null);
  const animRef = useRef<number>(0);
  const streamRef = useRef<MediaStream | null>(null);
  const smootherRef = useRef(new EyeGestureSmoother());
  const lastLoggedGesture = useRef<string | null>(null);
  const restState = useRef({ transitions: 0, windowStart: 0, cooldownUntil: 0 });
  const pauseState = useRef({ paused: false, closeStart: 0 });
  const lastFpsTime = useRef(0);
  const frameCount = useRef(0);
  const diagnostics = useRef<SystemDiagnostics>({ brightness: 0, trackingStable: false, fps: 0, message: null });

  const metricsRef = useRef({
    earValues: [] as number[],
    blinkCount: 0,
    blinkRateWindow: [] as number[],
    lastBlinkTime: 0,
    closureStart: 0,
    totalClosureMs: 0,
    lastMetricsBroadcast: 0,
    prevLandmarks: null as Point[] | null,
    movementAccum: 0,
    movementSamples: 0,
  });

  function getEffectiveThreshold(): number {
    if (Date.now() < restState.current.cooldownUntil) return 0.85;
    return 0.7;
  }

  const [gesture, setGesture] = useState<EyeGesture>(null);
  const [confidence, setConfidence] = useState(0);
  const [fps, setFps] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cameraOn, setCameraOn] = useState(false);
  const [faceDetected, setFaceDetected] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [patientMetrics, setPatientMetrics] = useState<PatientMetrics>({});

  function computePatientMetrics() {
    const m = metricsRef.current;
    const now = Date.now();
    const recentEar = m.earValues.slice(-150);
    const avgEar = recentEar.length > 0 ? recentEar.reduce((a, b) => a + b, 0) / recentEar.length : 0.3;

    const blinkRateWindow = m.blinkRateWindow.filter((t) => now - t < 60000);
    m.blinkRateWindow = blinkRateWindow;
    const blinkRate = blinkRateWindow.length;

    const alertnessScore = Math.min(100, Math.max(0, (avgEar / 0.35) * 100));

    let eyeClosureDuration = 0;
    if (m.closureStart > 0) {
      eyeClosureDuration = now - m.closureStart;
    }

    const movementActivity = m.movementSamples > 0 ? Math.min(1, m.movementAccum / m.movementSamples / 0.01) : 0.5;

    m.movementAccum = 0;
    m.movementSamples = 0;

    return {
      blinkRate,
      alertnessScore: Math.round(alertnessScore),
      eyeClosureDuration,
      movementActivity: Math.round(movementActivity * 100) / 100,
    };
  }

  const init = useCallback(async () => {
    try {
      setLoading(true);
      const wasm = await FilesetResolver.forVisionTasks(WASM_URL);
      const landmarker = await FaceLandmarker.createFromOptions(wasm, {
        baseOptions: { modelAssetPath: MODEL_URL },
        runningMode: "VIDEO",
        outputFaceBlendshapes: true,
        minFaceDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5,
      });
      landmarkerRef.current = landmarker;
      setLoading(false);
    } catch {
      setError("Failed to load face tracking model. Please ensure you have a stable internet connection.");
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
    setCameraOn(false); setGesture(null); setConfidence(0); setFaceDetected(false); setIsPaused(false);
    setPatientMetrics({});
    smootherRef.current.reset();
    lastLoggedGesture.current = null;
    pauseState.current = { paused: false, closeStart: 0 };
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

    const hasFace = result.faceLandmarks && result.faceLandmarks.length > 0;
    setFaceDetected(!!hasFace);

    let raw = null;
    let faceLm: Point[] | null = null;
    if (hasFace) {
      faceLm = result.faceLandmarks[0].map((lm) => ({ x: lm.x, y: lm.y, z: lm.z ?? 0 }));
      raw = classifyEyeGesture(faceLm);
    }

    if (hasFace && faceLm) {
      const m = metricsRef.current;

      const leftEAR = eyeAspectRatio(faceLm, LEFT_EYE_CORNERS[0], LEFT_EYE_CORNERS[1], LEFT_EYE_TOP_BOTTOM[0], LEFT_EYE_TOP_BOTTOM[1]);
      const rightEAR = eyeAspectRatio(faceLm, RIGHT_EYE_CORNERS[0], RIGHT_EYE_CORNERS[1], RIGHT_EYE_TOP_BOTTOM[0], RIGHT_EYE_TOP_BOTTOM[1]);
      const avgEAR = (leftEAR + rightEAR) / 2;

      m.earValues.push(avgEAR);
      if (m.earValues.length > 300) m.earValues = m.earValues.slice(-300);

      const isBlinking = avgEAR < 0.22;
      const now = Date.now();

      if (isBlinking) {
        if (m.closureStart === 0) m.closureStart = now;
      } else {
        if (m.closureStart > 0) {
          const blinkDuration = now - m.closureStart;
          if (blinkDuration < 500) {
            m.blinkCount++;
            m.blinkRateWindow.push(now);
          }
        }
        m.closureStart = 0;
      }

      if (m.prevLandmarks) {
        let totalMovement = 0;
        const sampleCount = Math.min(faceLm.length, m.prevLandmarks.length);
        for (let i = 0; i < sampleCount; i++) {
          totalMovement += dist(faceLm[i], m.prevLandmarks[i]);
        }
        m.movementAccum += totalMovement / sampleCount;
        m.movementSamples++;
      }
      m.prevLandmarks = faceLm.map((p) => ({ ...p }));

      if (now - m.lastMetricsBroadcast > 1000) {
        const metrics = computePatientMetrics();
        setPatientMetrics(metrics);
        m.lastMetricsBroadcast = now;
      }
    }

    const smoothed = smootherRef.current.push(raw);
    setGesture(smoothed.gesture);
    setConfidence(smoothed.confidence);

    if (hasFace && raw === null && faceLm) {
      const now = Date.now();
      if (pauseState.current.closeStart === 0) pauseState.current.closeStart = now;
      if (!pauseState.current.paused && now - pauseState.current.closeStart >= CLUTCH_CLOSE_MS) {
        pauseState.current.paused = true;
        setIsPaused(true);
      }
    } else {
      pauseState.current.closeStart = 0;
      if (pauseState.current.paused) {
        pauseState.current.paused = false;
        setIsPaused(false);
      }
    }

    if (!pauseState.current.paused) {
      const threshold = getEffectiveThreshold();
      if (smoothed.gesture && smoothed.confidence > threshold) {
        const entry = EYE_GESTURE_MAP[smoothed.gesture];
        if (entry) {
          voiceAlert.speak(smoothed.gesture, "eye");
          if (smoothed.gesture !== lastLoggedGesture.current) {
            lastLoggedGesture.current = smoothed.gesture;
            if (onBroadcastAlert) {
              onBroadcastAlert(smoothed.gesture, entry.description, smoothed.confidence);
            } else {
              addGestureLog(smoothed.gesture, entry.description, smoothed.confidence, "eye", voiceAlert.getLanguage());
            }
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
      const canvas = canvasRef.current; const ctx = canvas.getContext("2d");
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
          ctx.fillText("Open eyes wide to resume", w / 2, h / 2 + 30);
        }

        if (result.faceLandmarks && !pauseState.current.paused) {
          const faceLm = result.faceLandmarks[0];
          const eyeOutline = [33,246,161,160,159,158,157,173,133,155,154,153,145,144,163,7,33];
          const rightEyeOutline = [362,398,384,385,386,387,388,466,263,249,390,373,374,380,381,382,362];
          const leftIris = [468,469,470,471,468];
          const rightIris = [473,474,475,476,473];
          ctx.strokeStyle = "rgba(34,197,94,0.5)"; ctx.lineWidth = 1.5;
          const drawPath = (indices: number[]) => {
            ctx.beginPath();
            ctx.moveTo(faceLm[indices[0]].x * w, faceLm[indices[0]].y * h);
            for (let i = 1; i < indices.length; i++) { ctx.lineTo(faceLm[indices[i]].x * w, faceLm[indices[i]].y * h); }
            ctx.stroke();
          };
          drawPath(eyeOutline); drawPath(rightEyeOutline);
          ctx.strokeStyle = "rgba(59,130,246,0.6)"; drawPath(leftIris); drawPath(rightIris);
          const gazeConf = confidence > 0.3 ? confidence : 0.1;
          ctx.fillStyle = `rgba(34,197,94,${Math.max(0.3, gazeConf)})`;
          for (const lm of faceLm) { ctx.beginPath(); ctx.arc(lm.x * w, lm.y * h, 1.5, 0, 2 * Math.PI); ctx.fill(); }
          if (smoothed.gesture) {
            ctx.strokeStyle = "rgba(255,255,255,0.3)"; ctx.lineWidth = 1; ctx.setLineDash([4, 4]);
            ctx.strokeRect(faceLm[33].x * w - 20, faceLm[33].y * h - 20, (faceLm[263].x - faceLm[33].x) * w + 40, (faceLm[152].y - faceLm[10].y) * h + 40);
            ctx.setLineDash([]);
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

  return { videoRef, canvasRef, gesture, confidence, fps, loading, error, cameraOn, faceDetected, isPaused, diagnostics: diagnostics.current, patientMetrics, startCamera, stopCamera };
}
