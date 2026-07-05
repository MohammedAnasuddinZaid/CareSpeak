"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import { HandLandmarker, FaceLandmarker, FilesetResolver } from "@mediapipe/tasks-vision";
import { classifyHandGesture, HandGestureSmoother, isOpenPalm } from "@/lib/handClassifier";
import { classifyEyeGesture, EyeGestureSmoother } from "@/lib/eyeClassifier";
import { voiceAlert } from "@/lib/tts";
import { addGestureLog } from "@/lib/gestureLog";
import { HandGesture, EyeGesture, HAND_GESTURE_MAP, EYE_GESTURE_MAP, PatientMetrics, Point } from "@/types";

const WASM_URL = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.18/wasm";
const HAND_MODEL_URL = "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/latest/hand_landmarker.task";
const FACE_MODEL_URL = "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/latest/face_landmarker.task";

const FINGER_COLORS = ["#ef4444", "#f97316", "#eab308", "#22c55e", "#3b82f6"];
const FINGER_INDICES = [[1,2,3,4],[5,6,7,8],[9,10,11,12],[13,14,15,16],[17,18,19,20]];
const HAND_CONNECTIONS: [number, number][] = [[0,1],[1,2],[2,3],[3,4],[5,6],[6,7],[7,8],[9,10],[10,11],[11,12],[13,14],[14,15],[15,16],[17,18],[18,19],[19,20],[0,5],[5,9],[9,13],[13,17],[0,17]];

function dist(a: Point, b: Point): number {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2 + (a.z - b.z) ** 2);
}

type CctvMode = "hand" | "eye";

interface UseCctvFeedOptions {
  feedUrl: string;
  mode: CctvMode;
  sessionId: string;
  deviceId: string;
  onGesture?: (gesture: string, description: string, confidence: number) => void;
}

export function useCctvFeed({ feedUrl, mode, sessionId, deviceId, onGesture }: UseCctvFeedOptions) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const landmarkerRef = useRef<HandLandmarker | FaceLandmarker | null>(null);
  const animRef = useRef<number>(0);
  const handSmootherRef = useRef(new HandGestureSmoother());
  const eyeSmootherRef = useRef(new EyeGestureSmoother());
  const lastLoggedGesture = useRef<string | null>(null);
  const lastFpsTime = useRef(0);
  const frameCount = useRef(0);
  const streamAttempted = useRef(false);

  const [gesture, setGesture] = useState<string | null>(null);
  const [confidence, setConfidence] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [feedReady, setFeedReady] = useState(false);
  const [patientMetrics, setPatientMetrics] = useState<PatientMetrics>({});

  const metricsRef = useRef({
    prevLandmarks: null as Point[] | null,
    movementAccum: 0,
    movementSamples: 0,
    lastMetricsTime: 0,
  });

  function computeMetrics() {
    const m = metricsRef.current;
    if (m.movementSamples === 0) return { movementActivity: 0.5 };
    return { movementActivity: Math.round(Math.min(1, m.movementAccum / m.movementSamples / 0.005) * 100) / 100 };
  }

  const init = useCallback(async () => {
    try {
      setLoading(true);
      const wasm = await FilesetResolver.forVisionTasks(WASM_URL);
      if (mode === "hand") {
        const lm = await HandLandmarker.createFromOptions(wasm, {
          baseOptions: { modelAssetPath: HAND_MODEL_URL },
          runningMode: "VIDEO",
          numHands: 2,
          minHandDetectionConfidence: 0.7,
          minTrackingConfidence: 0.5,
        });
        landmarkerRef.current = lm;
      } else {
        const lm = await FaceLandmarker.createFromOptions(wasm, {
          baseOptions: { modelAssetPath: FACE_MODEL_URL },
          runningMode: "VIDEO",
          minFaceDetectionConfidence: 0.5,
          minTrackingConfidence: 0.5,
        });
        landmarkerRef.current = lm;
      }
      setLoading(false);
    } catch {
      setError("Failed to load vision model. Check internet connection.");
      setLoading(false);
    }
  }, [mode]);

  useEffect(() => {
    if (feedUrl) init();
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
      if (videoRef.current) { videoRef.current.src = ""; }
    };
  }, [init, feedUrl]);

  const startFeed = useCallback(() => {
    if (!videoRef.current || streamAttempted.current) return;
    streamAttempted.current = true;
    const video = videoRef.current;
    video.src = feedUrl;
    video.crossOrigin = "anonymous";
    video.muted = true;
    video.playsInline = true;

    const onMeta = () => {
      video.play().then(() => {
        setFeedReady(true);
        processFrames();
      }).catch(() => {
        setError("Failed to play video stream. Check the URL.");
      });
    };

    const onError = () => {
      setError("Failed to load video feed. Check the URL and ensure the camera is accessible.");
    };

    video.addEventListener("loadedmetadata", onMeta, { once: true });
    video.addEventListener("error", onError, { once: true });

    setTimeout(() => {
      if (!feedReady) {
        video.removeEventListener("loadedmetadata", onMeta);
        video.removeEventListener("error", onError);
      }
    }, 15000);
  }, [feedUrl]);

  const processFrames = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const landmarker = landmarkerRef.current;
    if (!video || !landmarker) return;
    if (video.readyState < 2) { animRef.current = requestAnimationFrame(processFrames); return; }

    frameCount.current++;
    const now = performance.now();
    if (now - lastFpsTime.current >= 1000) {
      frameCount.current = 0;
      lastFpsTime.current = now;
    }

    const perfNow = performance.now();
    const landmarks: Point[][] = [];
    let rawResult: any;

    if (landmarker instanceof HandLandmarker) {
      rawResult = landmarker.detectForVideo(video, perfNow);
      if (rawResult.landmarks) {
        for (const lmArr of rawResult.landmarks) {
          landmarks.push(lmArr.map((lm: any) => ({ x: lm.x, y: lm.y, z: lm.z ?? 0 })));
        }
      }
    } else if (landmarker instanceof FaceLandmarker) {
      rawResult = landmarker.detectForVideo(video, perfNow);
      if (rawResult.faceLandmarks) {
        for (const lmArr of rawResult.faceLandmarks) {
          landmarks.push(lmArr.map((lm: any) => ({ x: lm.x, y: lm.y, z: lm.z ?? 0 })));
        }
      }
    } else {
      return;
    }

    const m = metricsRef.current;
    if (landmarks.length > 0 && m.prevLandmarks && landmarks[0].length > 0) {
      let total = 0;
      for (let i = 0; i < landmarks[0].length; i++) {
        total += dist(landmarks[0][i], m.prevLandmarks[i]);
      }
      m.movementAccum += total / landmarks[0].length;
      m.movementSamples++;
    }
    m.prevLandmarks = landmarks.length > 0 ? landmarks[0].map((p) => ({ ...p })) : null;

    if (Date.now() - m.lastMetricsTime > 2000) {
      setPatientMetrics(computeMetrics());
      m.lastMetricsTime = Date.now();
    }

    if (mode === "hand" && landmarks.length > 0) {
      const hands = landmarks.map((lm, i) => ({
        landmarks: lm,
        handedness: (rawResult.handednesses?.[i]?.[0]?.categoryName as "Left" | "Right") ?? "Left",
      }));
      const raw = classifyHandGesture(hands);
      const smoothed = handSmootherRef.current.push(raw);
      setGesture(smoothed.gesture);
      setConfidence(smoothed.confidence);

      if (smoothed.gesture && smoothed.confidence > 0.7) {
        const entry = HAND_GESTURE_MAP[smoothed.gesture];
        if (entry) {
          voiceAlert.speak(smoothed.gesture, "hand");
          if (smoothed.gesture !== lastLoggedGesture.current) {
            lastLoggedGesture.current = smoothed.gesture;
            addGestureLog(smoothed.gesture, entry.description, smoothed.confidence, "hand", voiceAlert.getLanguage(), sessionId);
            onGesture?.(smoothed.gesture, entry.description, smoothed.confidence);
          }
        }
      }
    }

    if (mode === "eye" && landmarks.length > 0) {
      const face = landmarks[0];
      const raw = classifyEyeGesture(face);
      const smoothed = eyeSmootherRef.current.push(raw);
      setGesture(smoothed.gesture);
      setConfidence(smoothed.confidence);

      if (smoothed.gesture && smoothed.confidence > 0.7) {
        const entry = EYE_GESTURE_MAP[smoothed.gesture];
        if (entry) {
          voiceAlert.speak(smoothed.gesture, "eye");
          if (smoothed.gesture !== lastLoggedGesture.current) {
            lastLoggedGesture.current = smoothed.gesture;
            addGestureLog(smoothed.gesture, entry.description, smoothed.confidence, "eye", voiceAlert.getLanguage(), sessionId);
            onGesture?.(smoothed.gesture, entry.description, smoothed.confidence);
          }
        }
      }
    }

    if (canvas && video) {
      const ctx = canvas.getContext("2d");
      if (ctx) {
        const w = video.videoWidth || 640;
        const h = video.videoHeight || 480;
        canvas.width = w;
        canvas.height = h;
        ctx.drawImage(video, 0, 0, w, h);

        if (mode === "hand" && rawResult.landmarks) {
          for (let hi = 0; hi < rawResult.landmarks.length; hi++) {
            const lmArr = rawResult.landmarks[hi];
            ctx.strokeStyle = "rgba(59,130,246,0.6)";
            ctx.lineWidth = 2;
            for (const [i, j] of HAND_CONNECTIONS) {
              ctx.beginPath();
              ctx.moveTo(lmArr[i].x * w, lmArr[i].y * h);
              ctx.lineTo(lmArr[j].x * w, lmArr[j].y * h);
              ctx.stroke();
            }
            for (let fi = 0; fi < FINGER_INDICES.length; fi++) {
              for (const idx of FINGER_INDICES[fi]) {
                const lm = lmArr[idx];
                ctx.beginPath();
                ctx.arc(lm.x * w, lm.y * h, 4, 0, 2 * Math.PI);
                ctx.fillStyle = FINGER_COLORS[fi % FINGER_COLORS.length];
                ctx.globalAlpha = Math.max(0.3, Math.min(1, confidence));
                ctx.fill();
                ctx.globalAlpha = 1;
              }
            }
          }
        }

        if (mode === "eye" && rawResult.faceLandmarks) {
          const faceLms = rawResult.faceLandmarks[0];
          if (faceLms) {
            ctx.strokeStyle = "rgba(34, 166, 126, 0.5)";
            ctx.lineWidth = 1;
            const faceConnections: [number, number][] = [
              [33, 133], [362, 263], [61, 291], [0, 17], [17, 78], [78, 292], [292, 306], [306, 405], [405, 321], [321, 375],
              [164, 389], [155, 387], [66, 296], [159, 145], [386, 374],
            ];
            for (const [i, j] of faceConnections) {
              ctx.beginPath();
              ctx.moveTo(faceLms[i].x * w, faceLms[i].y * h);
              ctx.lineTo(faceLms[j].x * w, faceLms[j].y * h);
              ctx.stroke();
            }
          }
        }
      }
    }

    animRef.current = requestAnimationFrame(processFrames);
  }, [mode, confidence, sessionId, onGesture]);

  useEffect(() => {
    if (!loading && landmarkerRef.current && !feedReady && feedUrl) {
      startFeed();
    }
  }, [loading, feedReady, startFeed, feedUrl]);

  return { videoRef, canvasRef, gesture, confidence, loading, error, feedReady, patientMetrics };
}
