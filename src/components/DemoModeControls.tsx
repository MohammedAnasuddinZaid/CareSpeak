"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Beaker, Eye, Hand, ThumbsUp, ThumbsDown, HelpCircle, Droplets, Ban } from "lucide-react";

interface DemoModeControlsProps {
  onSimulateGesture: (gesture: string) => void;
  gestureType: "hand" | "eye";
}

const GESTURE_BUTTONS = [
  { gesture: "YES", icon: ThumbsUp, label: "Yes", color: "text-green-400 bg-green-500/20 hover:bg-green-500/30" },
  { gesture: "NO", icon: ThumbsDown, label: "No", color: "text-red-400 bg-red-500/20 hover:bg-red-500/30" },
  { gesture: "HELP", icon: HelpCircle, label: "Help", color: "text-amber-400 bg-amber-500/20 hover:bg-amber-500/30" },
  { gesture: "WATER", icon: Droplets, label: "Water", color: "text-blue-400 bg-blue-500/20 hover:bg-blue-500/30" },
];

export default function DemoModeControls({ onSimulateGesture, gestureType }: DemoModeControlsProps) {
  const [active, setActive] = useState(false);

  return (
    <div>
      <button
        onClick={() => setActive(!active)}
        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
          active
            ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
            : "bg-slate-800/50 text-slate-400 hover:text-white hover:bg-slate-700/50 border border-white/10"
        }`}
      >
        <Beaker className={`w-4 h-4 ${active ? "animate-pulse" : ""}`} />
        {active ? "Demo Mode Active" : "Demo Mode"}
      </button>
      <AnimatePresence>
        {active && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-3 overflow-hidden"
          >
            <div className="bg-slate-800/30 rounded-xl border border-white/10 p-3">
              <div className="flex items-center gap-2 mb-3">
                {gestureType === "hand" ? (
                  <Hand className="w-4 h-4 text-indigo-400" />
                ) : (
                  <Eye className="w-4 h-4 text-emerald-400" />
                )}
                <span className="text-xs text-slate-400">
                  Simulate {gestureType === "hand" ? "hand" : "eye"} gestures
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {GESTURE_BUTTONS.map((btn) => {
                  const Icon = btn.icon;
                  return (
                    <button
                      key={btn.gesture}
                      onClick={() => onSimulateGesture(btn.gesture)}
                      className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${btn.color}`}
                    >
                      <Icon className="w-4 h-4" />
                      {btn.label}
                    </button>
                  );
                })}
              </div>
              <p className="text-[10px] text-slate-600 mt-2 text-center">
                Gestures logged, synced, and displayed on nurse dashboard in real time
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
