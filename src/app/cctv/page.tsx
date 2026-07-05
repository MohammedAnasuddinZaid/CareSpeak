"use client";

import { Suspense, useEffect, useRef, useState, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Camera, Wifi, WifiOff, Eye, Hand, Maximize2, Play, Monitor, Smartphone, HelpCircle, ExternalLink, X, Settings } from "lucide-react";
import { useCctvFeed } from "@/hooks/useCctvFeed";
import { voiceAlert } from "@/lib/tts";
import { getOrCreateSession } from "@/lib/session";
import { createNetworkSync } from "@/lib/networkSync";
import { addGestureLog } from "@/lib/gestureLog";
import { HAND_GESTURE_MAP, EYE_GESTURE_MAP } from "@/types";
import QRPairingDisplay from "@/components/QRPairingDisplay";

const EXAMPLES = [
  {
    app: "IP Webcam (Android)",
    url: "http://192.168.1.100:8080/video",
    icon: Smartphone,
    note: "Replace 192.168.1.100 with your phone's IP",
  },
  {
    app: "DroidCam (WiFi)",
    url: "http://192.168.1.100:4747/video",
    icon: Smartphone,
    note: "Replace with DroidCam's shown IP address",
  },
  {
    app: "Generic MJPEG Camera",
    url: "http://camera-ip:8080/video/mjpeg",
    icon: Camera,
    note: "For Hikvision, Dahua, and other IP cameras",
  },
  {
    app: "HLS Stream (.m3u8)",
    url: "http://camera-ip:8080/hls/stream.m3u8",
    icon: Monitor,
    note: "Requires hls.js compatible stream",
  },
];

function CctvSetup({ onStart }: { onStart: (url: string, mode: "hand" | "eye") => void }) {
  const [url, setUrl] = useState("");
  const [mode, setMode] = useState<"hand" | "eye">("hand");
  const [showHelp, setShowHelp] = useState(false);

  return (
    <div className="min-h-screen bg-[#f9f7f5] flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-[#c63a22]/10 flex items-center justify-center mx-auto mb-4">
            <Camera className="w-8 h-8 text-[#c63a22]" />
          </div>
          <h1 className="text-3xl font-bold text-[#1f1f1f]">CCTV Monitoring</h1>
          <p className="text-[#6e6e6e] mt-2 text-sm">
            Connect any IP camera or phone camera for patient monitoring
          </p>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="card p-6 space-y-5">
          {/* Mode selector */}
          <div>
            <label className="text-xs font-semibold text-[#1f1f1f] uppercase tracking-widest mb-3 block">Detection Mode</label>
            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => setMode("hand")}
                className={`p-4 rounded-xl border-2 transition-all duration-200 text-center ${
                  mode === "hand"
                    ? "border-[#c63a22] bg-[#c63a22]/5"
                    : "border-[#ececec] hover:border-[#d5d5d5]"
                }`}
              >
                <Hand className={`w-6 h-6 mx-auto mb-1 ${mode === "hand" ? "text-[#c63a22]" : "text-[#6e6e6e]"}`} />
                <div className={`text-sm font-bold ${mode === "hand" ? "text-[#c63a22]" : "text-[#1f1f1f]"}`}>Hand Mode</div>
                <div className="text-xs text-[#6e6e6e] mt-0.5">Thumbs up/down, HELP, WATER</div>
              </button>
              <button onClick={() => setMode("eye")}
                className={`p-4 rounded-xl border-2 transition-all duration-200 text-center ${
                  mode === "eye"
                    ? "border-[#22a67e] bg-[#22a67e]/5"
                    : "border-[#ececec] hover:border-[#d5d5d5]"
                }`}
              >
                <Eye className={`w-6 h-6 mx-auto mb-1 ${mode === "eye" ? "text-[#22a67e]" : "text-[#6e6e6e]"}`} />
                <div className={`text-sm font-bold ${mode === "eye" ? "text-[#22a67e]" : "text-[#1f1f1f]"}`}>Eye Mode</div>
                <div className="text-xs text-[#6e6e6e] mt-0.5">Gaze, blink, mouth gestures</div>
              </button>
            </div>
          </div>

          {/* Camera URL input */}
          <div>
            <label className="text-xs font-semibold text-[#1f1f1f] uppercase tracking-widest mb-3 block">Camera Stream URL</label>
            <div className="relative">
              <input
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="http://192.168.1.100:8080/video"
                className="input w-full pr-10 font-mono text-sm"
              />
              {url && (
                <button onClick={() => setUrl("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6e6e6e] hover:text-[#1f1f1f]">
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            <p className="text-xs text-[#6e6e6e] mt-2">
              Enter the HTTP stream URL from your camera or IP Webcam app
            </p>
          </div>

          {/* Start button */}
          <button onClick={() => onStart(url, mode)} disabled={!url.trim()}
            className={`w-full py-4 rounded-2xl font-semibold text-lg flex items-center justify-center gap-2.5 transition-all duration-200 ${
              url.trim()
                ? "bg-[#c63a22] text-white shadow-lg shadow-[#c63a22]/25 hover:shadow-xl hover:shadow-[#c63a22]/30 hover:translate-y-[-1px] active:translate-y-0"
                : "bg-[#f5f3f0] text-[#6e6e6e] cursor-not-allowed"
            }`}
          >
            <Play className="w-5 h-5" />
            Start Monitoring
          </button>

          {/* Help toggle */}
          <div className="text-center">
            <button onClick={() => setShowHelp(!showHelp)} className="inline-flex items-center gap-1.5 text-xs text-[#6e6e6e] hover:text-[#c63a22] transition-colors">
              <HelpCircle className="w-3.5 h-3.5" />
              {showHelp ? "Hide examples" : "Show example URLs"}
            </button>
          </div>
        </motion.div>

        {/* Examples */}
        <AnimatePresence>
          {showHelp && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden mt-4">
              <div className="card p-5 space-y-3">
                <h3 className="text-xs font-semibold text-[#1f1f1f] uppercase tracking-widest">Example Stream URLs</h3>
                {EXAMPLES.map((ex, i) => {
                  const Icon = ex.icon;
                  return (
                    <div key={i} className="p-3 rounded-xl bg-[#f5f3f0] border border-[#ececec]">
                      <div className="flex items-center gap-2 mb-1.5">
                        <Icon className="w-4 h-4 text-[#c63a22]" />
                        <span className="text-sm font-bold text-[#1f1f1f]">{ex.app}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <code className="text-xs bg-white px-2 py-1 rounded border border-[#ececec] font-mono text-[#6e6e6e] flex-1 truncate">{ex.url}</code>
                        <button onClick={() => { setUrl(ex.url); }} className="text-xs text-[#c63a22] hover:underline flex-shrink-0">Use</button>
                      </div>
                      <p className="text-xs text-[#6e6e6e] mt-1">{ex.note}</p>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Quick instructions */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }} className="mt-8 card p-5">
          <h3 className="text-xs font-semibold text-[#1f1f1f] uppercase tracking-widest mb-3">Quick Start Guide</h3>
          <div className="space-y-2 text-sm text-[#6e6e6e]">
            {[
              { step: "1", text: 'Install "IP Webcam" (free) on an Android phone from Play Store' },
              { step: "2", text: "Open the app and tap START SERVER at the bottom" },
              { step: "3", text: "Look at the IP shown on your phone screen (e.g. 192.168.1.5:8080)" },
              { step: "4", text: "Copy that IP into the URL field above and click Start Monitoring" },
            ].map((item) => (
              <div key={item.step} className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-[#c63a22]/10 text-[#c63a22] text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">{item.step}</span>
                <span>{item.text}</span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}

function CctvMonitor({ feedUrl, mode: initialMode }: { feedUrl: string; mode: "hand" | "eye" }) {
  const sessionRef = useRef(getOrCreateSession());
  const syncRef = useRef<ReturnType<typeof createNetworkSync> | null>(null);
  const [fullscreen, setFullscreen] = useState(false);
  const [detectionMode, setDetectionMode] = useState(initialMode);

  const onGesture = useCallback((gesture: string, description: string, confidence: number) => {
    const lang = voiceAlert.getLanguage();
    const entry = addGestureLog(gesture, description, confidence, detectionMode, lang, sessionRef.current.sessionId);
    if (entry && syncRef.current) {
      syncRef.current.sendAlert(entry);
    }
  }, [detectionMode]);

  const {
    videoRef, canvasRef, gesture, confidence,
    loading, error, feedReady, patientMetrics,
  } = useCctvFeed({
    feedUrl,
    mode: detectionMode,
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
            {detectionMode === "hand" ? "Hand Mode" : "Eye Mode"}
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
              <p className="text-white text-sm font-medium">Loading {detectionMode === "hand" ? "hand" : "face"} tracking model...</p>
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
          className={`absolute inset-0 w-full h-full object-contain ${detectionMode === "hand" ? "scale-x-[-1]" : ""}`}
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
            {detectionMode === "hand" ? <Hand className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
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

function CctvContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const qsFeed = searchParams.get("feed");
  const qsMode = searchParams.get("mode") === "eye" ? "eye" as const : "hand" as const;
  const [started, setStarted] = useState(!!qsFeed);

  const handleStart = (url: string, mode: "hand" | "eye") => {
    const params = new URLSearchParams({ feed: url, mode });
    router.replace(`/cctv?${params.toString()}`);
    setStarted(true);
  };

  if (!started) {
    return <CctvSetup onStart={handleStart} />;
  }

  return <CctvMonitor feedUrl={qsFeed || ""} mode={qsMode} />;
}

export default function CctvPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#f9f7f5] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#c63a22] border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <CctvContent />
    </Suspense>
  );
}
