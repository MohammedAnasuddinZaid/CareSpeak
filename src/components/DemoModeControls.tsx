"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Beaker, Eye, Hand, ThumbsUp, ThumbsDown, HelpCircle, Droplets } from "lucide-react";

interface DemoModeControlsProps {
  onSimulateGesture: (gesture: string) => void;
  gestureType: "hand" | "eye";
}

const GESTURE_BUTTONS = [
  { gesture: "YES", icon: ThumbsUp, label: "Yes", color: "text-[#22a67e] bg-[#ecfdf5] hover:bg-[#d1fae5]" },
  { gesture: "NO", icon: ThumbsDown, label: "No", color: "text-[#d94a4a] bg-[#fef2f2] hover:bg-[#fee2e2]" },
  { gesture: "HELP", icon: HelpCircle, label: "Help", color: "text-[#e8993e] bg-[#fffbeb] hover:bg-[#fef3c7]" },
  { gesture: "WATER", icon: Droplets, label: "Water", color: "text-[#3b82f6] bg-[#eff6ff] hover:bg-[#dbeafe]" },
];

export default function DemoModeControls({ onSimulateGesture, gestureType }: DemoModeControlsProps) {
  const [active, setActive] = useState(false);

  return (
    <div>
      <button
        onClick={() => setActive(!active)}
        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
          active
            ? "bg-[#c63a22]/10 text-[#c63a22] border border-[#c63a22]/20"
            : "btn-secondary"
        }`}
      >
        <Beaker className={`w-4 h-4 ${active ? "animate-breathe" : ""}`} />
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
            <div className="bg-white rounded-xl border border-[#ececec] p-3">
              <div className="flex items-center gap-2 mb-3">
                {gestureType === "hand" ? (
                  <Hand className="w-4 h-4 text-[#c63a22]" />
                ) : (
                  <Eye className="w-4 h-4 text-[#22a67e]" />
                )}
                <span className="text-xs text-[#6e6e6e]">
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
              <p className="text-[10px] text-[#9ca3af] mt-2 text-center">
                Gestures logged, synced, and displayed on nurse dashboard in real time
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
