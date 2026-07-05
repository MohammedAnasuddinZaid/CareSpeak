"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import { HandLandmarker, FaceLandmarker, FilesetResolver } from "@mediapipe/tasks-vision";
import { classifyHandGesture, HandGestureSmoother } from "@/lib/handClassifier";
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
type StreamType = "mjpeg" | "video" | "unknown";

interface UseCctvFeedOptions {
  feedUrl: string;
  mode: CctvMode;
  sessionId: string;
  deviceId: string;
  onGesture?: (gesture: string, description: string, confidence: number) => void;
}

function detectStreamType(url: string): StreamType {
  const path = url.toLowerCase();
  if (path.includes(".m3u8")) return "video";
  if (path.includes("/video") || path.includes("/mjpeg") || path.includes("/stream") || path.endsWith(".mjpeg")) {
    return "mjpeg";
  }
  return "unknown";
}

export function useCctvFeed({ feedUrl, mode, sessionId, deviceId, onGesture }: UseCctvFeedOptions) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const offscreenCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const landmarkerRef = useRef<HandLandmarker | FaceLandmarker | null>(null);
  const animRef = useRef<number>(0);
  const handSmootherRef = useRef(new HandGestureSmoother());
  const eyeSmootherRef = useRef(new EyeGestureSmoother());
  const lastLoggedGesture = useRef<string | null>(null);
  const lastFpsTime = useRef(0);
  const frameCount = useRef(0);
  const streamAttempted = useRef(false);
  const mjpegFetchAbort = useRef<AbortController | null>(null);
  const streamTypeRef = useRef<StreamType>("unknown");
  const processFramesRef = useRef<(() => void) | null>(null);

  const [gesture, setGesture] = useState<string | null>(null);
  const [confidence, setConfidence] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [feedReady, setFeedReady] = useState(false);
  const [streamType, setStreamType] = useState<StreamType>("unknown");
  const [patientMetrics, setPatientMetrics] = useState<PatientMetrics>({});
  const [fps, setFps] = useState(0);

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
      if (mjpegFetchAbort.current) mjpegFetchAbort.current.abort();
      if (videoRef.current) { videoRef.current.src = ""; }
      if (imgRef.current) { imgRef.current.src = ""; }
    };
  }, [init, feedUrl]);

  function processFramesMJPEG() {
    if (!imgRef.current || !canvasRef.current || !landmarkerRef.current) {
      animRef.current = requestAnimationFrame(processFramesMJPEG);
      return;
    }
    const img = imgRef.current;
    const canvas = canvasRef.current;
    const landmarker = landmarkerRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) { animRef.current = requestAnimationFrame(processFramesMJPEG); return; }

    if (!img.complete || img.naturalWidth === 0) {
      animRef.current = requestAnimationFrame(processFramesMJPEG);
      return;
    }

    frameCount.current++;
    const now = performance.now();
    if (now - lastFpsTime.current >= 1000) {
      setFps(frameCount.current);
      frameCount.current = 0;
      lastFpsTime.current = now;
    }

    const w = img.naturalWidth || 640;
    const h = img.naturalHeight || 480;
    canvas.width = w;
    canvas.height = h;

    if (mode === "hand") {
      ctx.save();
      ctx.translate(w, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(img, 0, 0, w, h);
      ctx.restore();
    } else {
      ctx.drawImage(img, 0, 0, w, h);
    }

    const landmarks: Point[][] = [];
    let rawResult: any;

    if (landmarker instanceof HandLandmarker) {
      if (!offscreenCanvasRef.current) {
        offscreenCanvasRef.current = document.createElement("canvas");
      }
      const oc = offscreenCanvasRef.current;
      oc.width = w;
      oc.height = h;
      const octx = oc.getContext("2d");
      if (!octx) { animRef.current = requestAnimationFrame(processFramesMJPEG); return; }
      octx.drawImage(img, 0, 0, w, h);
      const fakeVideo = document.createElement("video");
      const perfNow = performance.now();
      rawResult = landmarker.detectForVideo(oc as unknown as HTMLVideoElement, perfNow);
      if (rawResult.landmarks) {
        for (const lmArr of rawResult.landmarks) {
          landmarks.push(lmArr.map((lm: any) => ({ x: lm.x, y: lm.y, z: lm.z ?? 0 })));
        }
      }
    } else if (landmarker instanceof FaceLandmarker) {
      if (!offscreenCanvasRef.current) {
        offscreenCanvasRef.current = document.createElement("canvas");
      }
      const oc = offscreenCanvasRef.current;
      oc.width = w;
      oc.height = h;
      const octx = oc.getContext("2d");
      if (!octx) { animRef.current = requestAnimationFrame(processFramesMJPEG); return; }
      octx.drawImage(img, 0, 0, w, h);
      const perfNow = performance.now();
      rawResult = landmarker.detectForVideo(oc as unknown as HTMLVideoElement, perfNow);
      if (rawResult.faceLandmarks) {
        for (const lmArr of rawResult.faceLandmarks) {
          landmarks.push(lmArr.map((lm: any) => ({ x: lm.x, y: lm.y, z: lm.z ?? 0 })));
        }
      }
    } else {
      animRef.current = requestAnimationFrame(processFramesMJPEG);
      return;
    }

    updateDetection(landmarks, rawResult, w, h, ctx);

    animRef.current = requestAnimationFrame(processFramesMJPEG);
  }

  function processFramesVideo() {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const landmarker = landmarkerRef.current;
    if (!video || !landmarker || !canvas) { animRef.current = requestAnimationFrame(processFramesVideo); return; }
    if (video.readyState < 2) { animRef.current = requestAnimationFrame(processFramesVideo); return; }

    frameCount.current++;
    const now = performance.now();
    if (now - lastFpsTime.current >= 1000) {
      setFps(frameCount.current);
      frameCount.current = 0;
      lastFpsTime.current = now;
    }

    const perfNow = performance.now();
    const w = video.videoWidth || 640;
    const h = video.videoHeight || 480;
    canvas.width = w;
    canvas.height = h;

    const ctx = canvas.getContext("2d");
    if (!ctx) { animRef.current = requestAnimationFrame(processFramesVideo); return; }
    ctx.drawImage(video, 0, 0, w, h);

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
      animRef.current = requestAnimationFrame(processFramesVideo);
      return;
    }

    updateDetection(landmarks, rawResult, w, h, ctx);

    animRef.current = requestAnimationFrame(processFramesVideo);
  }

  function updateDetection(landmarks: Point[][], rawResult: any, w: number, h: number, ctx: CanvasRenderingContext2D) {
    const m = metricsRef.current;
    if (landmarks.length > 0 && m.prevLandmarks && landmarks[0].length > 0) {
      let total = 0;
      const len = Math.min(landmarks[0].length, m.prevLandmarks.length);
      for (let i = 0; i < len; i++) {
        total += dist(landmarks[0][i], m.prevLandmarks[i]);
      }
      m.movementAccum += total / len;
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

    if (mode === "hand" && rawResult?.landmarks) {
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

    if (mode === "eye" && rawResult?.faceLandmarks) {
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

  const startMJPEGStream = useCallback(() => {
    if (mjpegFetchAbort.current) mjpegFetchAbort.current.abort();
    const abort = new AbortController();
    mjpegFetchAbort.current = abort;

    setFeedReady(true);
    processFramesMJPEG();

    const doFetch = async () => {
      while (!abort.signal.aborted) {
        try {
          const res = await fetch(feedUrl, {
            signal: abort.signal,
            cache: "no-store",
            mode: "cors",
          });
          if (!res.ok) {
            setError(`Camera responded with status ${res.status}. Make sure the camera is reachable.`);
            break;
          }
        } catch (err: any) {
          if (err?.name === "AbortError") break;
          setError(`Cannot connect to camera. ${err?.message || "Check the URL and network connection."}`);
          break;
        }
      }
    };
    doFetch();
  }, [feedUrl]);

  const startVideoStream = useCallback(() => {
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
        processFramesVideo();
      }).catch(() => {
        setError("Failed to play video stream. The URL may not be a valid video stream.");
      });
    };

    const onError = () => {
      setError("Failed to load video feed. The stream may be incompatible or blocked by CORS.");
    };

    video.addEventListener("loadedmetadata", onMeta, { once: true });
    video.addEventListener("error", onError, { once: true });

    const fallbackTimer = setTimeout(() => {
      if (!feedReady) {
        video.removeEventListener("loadedmetadata", onMeta);
        video.removeEventListener("error", onError);
        if (!streamAttempted.current) return;
        setError(`Could not load stream after 15s. Is "${feedUrl}" a valid video URL?`);
      }
    }, 15000);
  }, [feedUrl]);

  useEffect(() => {
    if (loading || !landmarkerRef.current || feedReady || !feedUrl) return;
    const detected = detectStreamType(feedUrl);
    streamTypeRef.current = detected;
    setStreamType(detected);
    if (detected === "mjpeg") {
      startMJPEGStream();
    } else {
      startVideoStream();
    }
  }, [loading, feedReady, startMJPEGStream, startVideoStream, feedUrl]);

  return {
    videoRef, imgRef, canvasRef, gesture, confidence,
    loading, error, feedReady, streamType, patientMetrics, fps,
  };
}
