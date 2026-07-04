"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, StopCircle, Volume2, ShieldAlert, Clock, Heart } from "lucide-react";
import { voiceAlert } from "@/lib/tts";

export default function EmergencyPage() {
  const [activated, setActivated] = useState(false);
  const [countdown, setCountdown] = useState(0);

  useEffect(() => {
    if (!activated) return;
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
    if (countdown === 0 && activated) {
      setActivated(false);
    }
  }, [activated, countdown]);

  const handleEmergency = useCallback(() => {
    setActivated(true);
    setCountdown(10);
    voiceAlert.speak("EMERGENCY", "hand");
  }, []);

  const stopAlert = useCallback(() => {
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    setActivated(false);
    setCountdown(0);
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 pt-20 pb-16 relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-red-500/5 blur-[150px]" />
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 text-sm font-medium mb-4">
            <AlertTriangle className="w-4 h-4" />
            Emergency Alert System
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white tracking-tight">Emergency Alert</h1>
          <p className="mt-3 text-slate-400 text-lg">Use only in case of urgent medical need. Triggers an immediate voice alert.</p>
        </motion.div>

        <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="mt-12 flex flex-col items-center">
          <button
            onClick={activated ? stopAlert : handleEmergency}
            className={`relative w-72 h-72 rounded-full flex flex-col items-center justify-center text-white font-bold text-2xl shadow-2xl transition-all duration-300 ${
              activated
                ? "bg-red-600 scale-95 shadow-red-500/40"
                : "bg-gradient-to-br from-red-600 to-red-800 hover:from-red-700 hover:to-red-900 hover:scale-105 active:scale-95 shadow-red-500/20 hover:shadow-red-500/40"
            }`}
          >
            {activated ? (
              <>
                <div className="absolute inset-0 rounded-full border-4 border-red-400/40 animate-ping" />
                <div className="absolute inset-3 rounded-full border-2 border-red-300/20 animate-pulse" />
                <StopCircle className="w-14 h-14 mb-3 relative z-10" />
                <span className="text-lg relative z-10">STOP</span>
                <span className="text-sm font-normal mt-1 opacity-80 relative z-10">{countdown}s</span>
              </>
            ) : (
              <>
                <div className="absolute inset-0 rounded-full border-4 border-red-400/30 animate-ping" />
                <div className="absolute inset-4 rounded-full border-2 border-red-300/20 animate-pulse" />
                <AlertTriangle className="w-14 h-14 mb-3 relative z-10" />
                <span className="relative z-10">TAP FOR</span>
                <span className="relative z-10 text-3xl">EMERGENCY</span>
              </>
            )}
          </button>

          <AnimatePresence>
            {activated ? (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                className="mt-6 flex flex-col items-center gap-3"
              >
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 text-sm font-medium">
                  <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                  Alert active — speaking loudly
                </div>
                <p className="text-sm text-slate-500">Tap the button again or wait {countdown}s to cancel.</p>
              </motion.div>
            ) : (
              <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-6 text-sm text-slate-500">
                Tap the red button above to alert caregivers immediately.
              </motion.p>
            )}
          </AnimatePresence>
        </motion.div>

        <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
          {[
            { icon: Volume2, title: "Voice Alert", desc: "A loud voice alert plays: \"EMERGENCY — Medical assistance required immediately!\"", gradient: "from-red-500 to-rose-600" },
            { icon: Clock, title: "Auto-expires", desc: "The alert automatically stops after 10 seconds. Tap the button to cancel early.", gradient: "from-amber-500 to-orange-600" },
            { icon: Heart, title: "Caregiver Notice", desc: "Alert plays through browser speakers. Caregivers hear it even if not watching the screen.", gradient: "from-indigo-500 to-purple-600" },
          ].map((card, i) => {
            const Icon = card.icon;
            return (
              <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
                className="dashboard-card p-6 group card-hover"
              >
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${card.gradient} flex items-center justify-center mb-4`}>
                  <Icon className="w-5 h-5 text-white" />
                </div>
                <h3 className="font-bold text-white mb-2">{card.title}</h3>
                <p className="text-sm text-slate-400 leading-relaxed">{card.desc}</p>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
