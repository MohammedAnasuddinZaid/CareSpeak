"use client";

import { Suspense, useEffect, useRef, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { Camera, Wifi, WifiOff, Eye, Hand, Maximize2 } from "lucide-react";
import { useCctvFeed } from "@/hooks/useCctvFeed";
import { voiceAlert } from "@/lib/tts";
import { getOrCreateSession } from "@/lib/session";
import { createNetworkSync } from "@/lib/networkSync";
import { addGestureLog } from "@/lib/gestureLog";
import { HAND_GESTURE_MAP, EYE_GESTURE_MAP } from "@/types";
import QRPairingDisplay from "@/components/QRPairingDisplay";

function CctvContent() {
  const searchParams = useSearchParams();
  const feedUrl = searchParams.get("feed") || "";
  const mode = (searchParams.get("mode") === "eye" ? "eye" : "hand") as "hand" | "eye";
  const sessionRef = useRef(getOrCreateSession());
  const syncRef = useRef<ReturnType<typeof createNetworkSync> | null>(null);
  const [fullscreen, setFullscreen] = useState(false);

  const onGesture = useCallback((gesture: string, description: string, confidence: number) => {
    const lang = voiceAlert.getLanguage();
    const entry = addGestureLog(gesture, description, confidence, mode, lang, sessionRef.current.sessionId);
    if (entry && syncRef.current) {
      syncRef.current.sendAlert(entry);
    }
  }, [mode]);

  const {
    videoRef, canvasRef, gesture, confidence,
    loading, error, feedReady, patientMetrics,
  } = useCctvFeed({
    feedUrl,
    mode,
    sessionId: sessionRef.current.sessionId,
    deviceId: sessionRef.current.deviceId,
    onGesture,
  });

  useEffect(() => {
    const sync = createNetworkSync({ sessionId: sessionRef.current.sessionId });
    syncRef.current = sync;
    return () => sync.destroy();
  }, []);

  useEffect(() => {
    if (Object.keys(patientMetrics).length === 0) return;
    const timer = setInterval(() => {
      syncRef.current?.sendPatientMetrics(patientMetrics, sessionRef.current.deviceId);
    }, 2000);
    return () => clearInterval(timer);
  }, [patientMetrics]);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => setFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setFullscreen(false)).catch(() => {});
    }
  };

  const gestureLabel = HAND_GESTURE_MAP[gesture || ""]?.description || EYE_GESTURE_MAP[gesture || ""]?.description || null;

  return (
    <div className="min-h-screen bg-black text-white overflow-hidden">
      {/* Top bar */}
      <div className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 py-3 bg-gradient-to-b from-black/80 to-transparent pointer-events-none">
        <div className="flex items-center gap-3 pointer-events-auto">
          <div className="flex items-center gap-2">
            <Camera className="w-4 h-4 text-[#c63a22]" />
            <span className="text-sm font-semibold">CareSpeak CCTV</span>
          </div>
          <span className="text-xs px-2 py-0.5 rounded-full bg-white/10 text-white/60 uppercase tracking-wider">
            {mode === "hand" ? "Hand Mode" : "Eye Mode"}
          </span>
          {feedReady ? (
            <span className="flex items-center gap-1 text-xs text-[#22a67e]">
              <Wifi className="w-3 h-3" /> Live
            </span>
          ) : (
            <span className="flex items-center gap-1 text-xs text-[#e8993e]">
              <WifiOff className="w-3 h-3" /> Connecting
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 pointer-events-auto">
          <QRPairingDisplay sessionId={sessionRef.current.sessionId} compact />
          <button onClick={toggleFullscreen}
            className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
            title="Toggle fullscreen"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Video feed */}
      <div className="fixed inset-0">
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black z-30">
            <div className="text-center">
              <div className="w-12 h-12 border-2 border-[#c63a22] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-white text-sm font-medium">Loading {mode === "hand" ? "hand" : "face"} tracking model...</p>
              <p className="text-white/40 text-xs mt-1">Downloading MediaPipe WASM</p>
            </div>
          </div>
        )}

        {error && (
          <div className="absolute inset-0 flex items-center justify-center bg-black z-30">
            <div className="text-center max-w-md px-6">
              <div className="w-16 h-16 rounded-full bg-[#c63a22]/20 flex items-center justify-center mx-auto mb-4">
                <WifiOff className="w-8 h-8 text-[#c63a22]" />
              </div>
              <p className="text-white font-medium mb-2">Stream Error</p>
              <p className="text-white/50 text-sm mb-4">{error}</p>
              <p className="text-white/30 text-xs">URL: <span className="font-mono">{feedUrl}</span></p>
            </div>
          </div>
        )}

        <video
          ref={videoRef}
          className={`absolute inset-0 w-full h-full object-contain ${mode === "hand" ? "scale-x-[-1]" : ""}`}
          playsInline
          muted
        />
        <canvas ref={canvasRef} className="absolute inset-0 w-full h-full object-contain" />
      </div>

      {/* Gesture overlay */}
      {feedReady && gesture && confidence > 0.5 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          className="fixed bottom-[15%] left-1/2 -translate-x-1/2 z-40 text-center"
        >
          <div className="px-10 py-5 rounded-3xl bg-black/70 backdrop-blur-xl border border-white/10">
            <div className="text-7xl sm:text-8xl font-extrabold gradient-text mb-2">
              {gesture}
            </div>
            {gestureLabel && (
              <div className="text-white/60 text-sm tracking-wide">{gestureLabel}</div>
            )}
            <div className="mt-3 w-48 mx-auto bg-white/10 rounded-full h-1.5 overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(confidence * 100, 100)}%` }}
                className="h-full rounded-full bg-gradient-to-r from-[#c63a22] to-[#f06a4a]"
              />
            </div>
          </div>
        </motion.div>
      )}

      {/* Bottom status bar */}
      <div className="fixed bottom-0 left-0 right-0 z-50 px-4 py-3 bg-gradient-to-t from-black/80 to-transparent">
        <div className="flex items-center justify-between text-xs text-white/50">
          <div className="flex items-center gap-3">
            {mode === "hand" ? <Hand className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            <span className="font-mono text-white/30 truncate max-w-[200px]">{feedUrl}</span>
          </div>
          <div className="flex items-center gap-3">
            {patientMetrics.movementActivity !== undefined && (
              <span>Motion: {Math.round((patientMetrics.movementActivity ?? 0) * 100)}%</span>
            )}
            <span className={`flex items-center gap-1 ${feedReady ? "text-[#22a67e]" : "text-[#e8993e]"}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${feedReady ? "bg-[#22a67e] animate-pulse" : "bg-[#e8993e]"}`} />
              {feedReady ? "Live" : "Connecting"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CctvPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#c63a22] border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <CctvContent />
    </Suspense>
  );
}
