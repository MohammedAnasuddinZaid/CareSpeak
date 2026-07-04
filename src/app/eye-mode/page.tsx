"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Eye, RotateCcw, Camera, StopCircle, Pause, ArrowLeft, ArrowRight, HelpCircle, Droplets, Sparkles, Activity, Fingerprint, Volume2 } from "lucide-react";
import { useEyeGesture } from "@/hooks/useEyeGesture";
import { EYE_GESTURE_MAP } from "@/types";
import { voiceAlert } from "@/lib/tts";

const GESTURE_GUIDE = [
  { label: "YES", desc: "Look Left", icon: ArrowLeft, gradient: "from-emerald-500 to-teal-600" },
  { label: "NO", desc: "Look Right", icon: ArrowRight, gradient: "from-red-500 to-rose-600" },
  { label: "HELP", desc: "Double Blink (fast)", icon: HelpCircle, gradient: "from-amber-500 to-orange-600" },
  { label: "WATER", desc: "Open Mouth", icon: Droplets, gradient: "from-cyan-500 to-blue-600" },
  { label: "PAUSE", desc: "Close eyes 5s to pause", icon: Pause, gradient: "from-slate-500 to-slate-600" },
];

export default function EyeModePage() {
  const {
    videoRef, canvasRef, gesture, confidence,
    loading, error, cameraOn, faceDetected, isPaused, startCamera, stopCamera,
  } = useEyeGesture();

  return (
    <div className="min-h-screen bg-slate-950 pt-20 pb-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-sm font-medium mb-4">
                <Eye className="w-4 h-4" />
                Eye Gesture Mode
              </div>
              <h1 className="text-3xl sm:text-4xl font-bold text-white tracking-tight">
                AI Eye Tracking Dashboard
              </h1>
              <p className="mt-2 text-slate-400">
                Use your eyes and face — look left, right, open your mouth, or blink twice. Close eyes for 5s to pause.
              </p>
            </div>
            {cameraOn && (
              <button onClick={stopCamera}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm font-medium hover:bg-red-500/20 transition-all duration-200"
              >
                <StopCircle className="w-4 h-4" />
                Stop Camera
              </button>
            )}
          </div>
        </motion.div>

        <AnimatePresence>
          {error && (
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
              className="mb-6 p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm"
            >{error}</motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {isPaused && cameraOn && (
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
              className="mb-6 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 text-sm font-medium flex items-center gap-2"
            >
              <Pause className="w-4 h-4" />
              System PAUSED — Open eyes wide to resume
            </motion.div>
          )}
        </AnimatePresence>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          <div className="lg:col-span-2 space-y-6">
            <div className="relative overflow-hidden rounded-3xl aspect-[4/3] dashboard-card">
              {loading && (
                <div className="absolute inset-0 flex items-center justify-center bg-slate-950/90 z-20">
                  <div className="text-center">
                    <div className="w-12 h-12 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                    <p className="text-slate-300 text-sm font-medium">Loading face tracking model...</p>
                    <p className="text-slate-500 text-xs mt-1">Downloading MediaPipe WASM</p>
                  </div>
                </div>
              )}
              <video ref={videoRef} className="absolute inset-0 w-full h-full object-cover scale-x-[-1]" playsInline muted />
              <canvas ref={canvasRef} className="absolute inset-0 w-full h-full object-cover" />

              {!cameraOn && !loading && (
                <div className="absolute inset-0 flex items-center justify-center bg-slate-950/90 z-10">
                  <div className="text-center max-w-xs">
                    <div className="w-20 h-20 rounded-full bg-indigo-500/10 border-2 border-dashed border-indigo-400/30 flex items-center justify-center mx-auto mb-6">
                      <Camera className="w-8 h-8 text-indigo-400/60" />
                    </div>
                    <button onClick={startCamera}
                      className="px-8 py-4 rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold text-lg shadow-xl shadow-indigo-500/20 hover:shadow-indigo-500/40 hover:scale-[1.02] active:scale-[0.98] transition-all duration-300"
                    >
                      Start Camera
                    </button>
                    <p className="mt-4 text-slate-500 text-xs">Chrome will ask for camera permission</p>
                  </div>
                </div>
              )}

              {cameraOn && (
                <div className="absolute top-4 left-4 px-3 py-1.5 rounded-xl bg-black/50 backdrop-blur-sm text-white/80 text-xs font-medium flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${isPaused ? "bg-amber-500" : faceDetected ? "bg-emerald-500" : "bg-slate-500"}`} />
                  {isPaused ? "PAUSED" : faceDetected ? "Face Detected" : "No Face"}
                </div>
              )}

              {gesture && confidence > 0.5 && (
                <div className="absolute -bottom-20 -left-20 w-40 h-40 rounded-full bg-indigo-500/10 blur-[60px] pointer-events-none" />
              )}
            </div>

            {cameraOn && (
              <div className="dashboard-card p-4 flex items-center gap-3">
                <span className={`flex items-center gap-1.5 text-sm ${isPaused ? "text-amber-400" : faceDetected ? "text-emerald-400" : "text-slate-500"}`}>
                  <span className={`w-2 h-2 rounded-full ${isPaused ? "bg-amber-500" : faceDetected ? "bg-emerald-500 animate-pulse" : "bg-slate-600"}`} />
                  {isPaused ? "Paused — tracking off" : faceDetected ? "Face detected — tracking eyes" : "No face in view"}
                </span>
                <div className="flex-1" />
                <div className="flex items-center gap-1.5 text-xs text-slate-500">
                  <Volume2 className="w-3 h-3" />
                  Voice alerts active
                </div>
              </div>
            )}
          </div>

          <div className="space-y-6">
            <AnimatePresence mode="wait">
              {isPaused ? (
                <motion.div key="paused" initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
                  className="dashboard-card p-8 text-center"
                >
                  <div className="w-16 h-16 rounded-2xl bg-amber-500/10 flex items-center justify-center mx-auto mb-4">
                    <Pause className="w-8 h-8 text-amber-400" />
                  </div>
                  <div className="text-2xl font-bold text-amber-300 mb-1">PAUSED</div>
                  <div className="text-sm text-slate-400 mb-5">Tracking suspended</div>
                  <div className="text-xs text-slate-500">Open eyes wide to resume</div>
                </motion.div>
              ) : gesture && confidence > 0.5 ? (
                <motion.div key="result" initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
                  className="dashboard-card p-8 text-center"
                >
                  <div className="text-6xl font-extrabold gradient-text mb-2">
                    {gesture}
                  </div>
                  <div className="text-sm text-slate-400 mb-6">
                    {EYE_GESTURE_MAP[gesture]?.description}
                  </div>
                  <div className="w-full bg-slate-800/50 rounded-full h-2.5 overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min(confidence * 100, 100)}%` }}
                      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                      className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-full"
                    />
                  </div>
                  <div className="mt-2 text-xs font-medium text-slate-500">
                    {Math.round(confidence * 100)}% confidence
                  </div>
                  <div className="mt-6 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-medium border border-emerald-500/20">
                    <Sparkles className="w-3 h-3" />
                    Gesture detected
                  </div>
                </motion.div>
              ) : (
                <motion.div key="waiting" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className="dashboard-card p-8 text-center"
                >
                  <div className="w-16 h-16 rounded-2xl bg-slate-800/50 flex items-center justify-center mx-auto mb-4">
                    <Fingerprint className="w-8 h-8 text-slate-600" />
                  </div>
                  <p className="text-slate-400 font-medium">Waiting for eye gesture...</p>
                  <p className="text-slate-600 text-xs mt-1">Move your eyes or blink to communicate</p>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="dashboard-card p-6">
              <h3 className="text-sm font-bold text-slate-200 mb-4 flex items-center gap-2">
                <Activity className="w-4 h-4 text-indigo-400" />
                Eye Gesture Guide
              </h3>
              <div className="space-y-2">
                {GESTURE_GUIDE.map((g) => {
                  const Icon = g.icon;
                  const isActive = gesture === g.label;
                  const isPauseItem = g.label === "PAUSE";
                  return (
                    <div key={g.label}
                      className={`flex items-center justify-between p-2.5 rounded-xl transition-all duration-200 ${
                        isPauseItem
                          ? isPaused ? "bg-amber-500/10 border border-amber-500/20" : "hover:bg-white/5 border border-transparent"
                          : isActive ? "bg-indigo-500/10 border border-indigo-500/20" : "hover:bg-white/5 border border-transparent"
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${g.gradient} flex items-center justify-center`}>
                          <Icon className="w-4 h-4 text-white" />
                        </div>
                        <span className={`font-bold text-sm ${isPauseItem ? isPaused ? "text-amber-300" : "text-slate-400" : isActive ? "text-indigo-300" : "text-slate-300"}`}>
                          {g.label}
                        </span>
                      </div>
                      <span className="text-slate-500 text-xs">{g.desc}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            <button onClick={() => {
              if (gesture) voiceAlert.speak(gesture, "eye");
            }} disabled={!gesture}
              className={`w-full py-3.5 rounded-2xl transition-all duration-200 text-sm font-medium flex items-center justify-center gap-2 ${
                gesture ? "dashboard-card hover:bg-white/5 text-slate-300" : "bg-slate-800/50 text-slate-600 border border-white/5 cursor-not-allowed"
              }`}
            >
              <RotateCcw className="w-4 h-4" />
              Replay Last Alert
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
