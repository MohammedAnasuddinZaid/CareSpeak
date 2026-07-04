"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, Bell, Clock, ShieldCheck, StopCircle } from "lucide-react";
import { voiceAlert } from "@/lib/tts";

export default function EmergencyPage() {
  const [activated, setActivated] = useState(false);
  const [countdown, setCountdown] = useState(10);

  const handleActivate = useCallback(() => {
    setActivated(true);
    setCountdown(10);
    voiceAlert.speak("EMERGENCY", "hand");
    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          setActivated(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    const cleanup = () => clearInterval(interval);
    setTimeout(cleanup, 10000);
  }, []);

  const handleStop = useCallback(() => {
    setActivated(false);
    setCountdown(0);
    voiceAlert.stop();
  }, []);

  return (
    <div className="min-h-screen pt-20 pb-16 flex items-center justify-center">
      <div className="max-w-lg mx-auto px-4 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#fef2f2] border border-[#fecaca] text-[#d94a4a] text-sm font-medium mb-4">
            <Bell className="w-4 h-4" />
            Emergency Alert
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-[#1f1f1f] tracking-tight">
            Emergency Assistance
          </h1>
          <p className="mt-2 text-[#6e6e6e]">
            Tap the button to trigger an emergency voice alert. 
            This will notify nearby caregivers immediately.
          </p>
        </motion.div>

        <AnimatePresence mode="wait">
          {!activated ? (
            <motion.button
              key="activate"
              onClick={handleActivate}
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-64 h-64 rounded-full bg-[#d94a4a] text-white font-bold text-2xl shadow-2xl shadow-[#d94a4a]/30 hover:shadow-[#d94a4a]/50 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 flex flex-col items-center justify-center gap-3 alert-pulse"
            >
              <AlertTriangle className="w-12 h-12" />
              <span>TAP FOR</span>
              <span>EMERGENCY</span>
            </motion.button>
          ) : (
            <motion.div
              key="active"
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="flex flex-col items-center gap-6"
            >
              <div className="w-64 h-64 rounded-full bg-[#d94a4a] text-white font-bold text-6xl shadow-2xl shadow-[#d94a4a]/30 animate-breathe flex items-center justify-center">
                {countdown}
              </div>
              <p className="text-lg font-semibold text-[#d94a4a]">EMERGENCY ACTIVE</p>
              <p className="text-sm text-[#6e6e6e]">Voice alert playing — will auto-expire in {countdown}s</p>
              <button
                onClick={handleStop}
                className="btn-danger flex items-center gap-2 px-6 py-3 text-sm"
              >
                <StopCircle className="w-4 h-4" />
                Stop Emergency
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mt-16 grid grid-cols-1 sm:grid-cols-3 gap-4"
        >
          {[
            { icon: Bell, title: "Voice Alert", desc: "Plays aloud in current language" },
            { icon: Clock, title: "Auto-expires", desc: "Stops after 10 seconds" },
            { icon: ShieldCheck, title: "Caregiver Notice", desc: "Alerts nearby immediately" },
          ].map((item, i) => {
            const Icon = item.icon;
            return (
              <div key={i} className="card p-4 text-center">
                <Icon className="w-5 h-5 text-[#c63a22] mx-auto mb-2" />
                <h3 className="text-xs font-semibold text-[#1f1f1f] mb-1">{item.title}</h3>
                <p className="text-[10px] text-[#6e6e6e]">{item.desc}</p>
              </div>
            );
          })}
        </motion.div>
      </div>
    </div>
  );
}
