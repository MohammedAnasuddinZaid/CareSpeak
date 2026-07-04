"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle, AlertTriangle, ArrowUpCircle, ChevronDown, Bell } from "lucide-react";

interface ActionEntry {
  id: string;
  gesture: string;
  description: string;
  timestamp: number;
  acknowledged?: boolean;
  escalated?: boolean;
  resolved?: boolean;
}

interface ClinicianActionsProps {
  entries: ActionEntry[];
  onAcknowledge: (id: string) => void;
  onEscalate: (id: string) => void;
  onResolve: (id: string) => void;
}

export default function ClinicianActions({ entries, onAcknowledge, onEscalate, onResolve }: ClinicianActionsProps) {
  const [expanded, setExpanded] = useState(false);

  const unacknowledged = entries.filter((e) => !e.acknowledged && !e.resolved);
  const displayEntries = expanded ? entries : unacknowledged.slice(0, 5);

  if (entries.length === 0) {
    return (
      <div className="card p-5">
        <h3 className="text-sm font-semibold text-[#1f1f1f] mb-3 flex items-center gap-2">
          <Bell className="w-4 h-4 text-[#c63a22]" />
          Clinician Actions
        </h3>
        <div className="flex items-center justify-center h-16 text-[#6e6e6e] text-sm">
          No pending alerts
        </div>
      </div>
    );
  }

  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-[#1f1f1f] flex items-center gap-2">
          <Bell className="w-4 h-4 text-[#c63a22]" />
          Clinician Actions
        </h3>
        {unacknowledged.length > 0 && (
          <span className="px-2 py-0.5 rounded-full bg-[#fef2f2] text-[#d94a4a] text-[10px] font-bold border border-[#fecaca]">
            {unacknowledged.length} pending
          </span>
        )}
      </div>

      <div className="space-y-2 max-h-80 overflow-y-auto">
        <AnimatePresence>
          {displayEntries.map((entry) => (
            <motion.div
              key={entry.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              className={`rounded-xl p-3 border ${
                entry.resolved
                  ? "bg-[#ecfdf5] border-[#a7f3d0]"
                  : entry.escalated
                  ? "bg-[#fef2f2] border-[#fecaca]"
                  : entry.acknowledged
                  ? "bg-[#eff6ff] border-[#bfdbfe]"
                  : "bg-white border-[#ececec]"
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className={`text-sm font-bold ${
                      entry.gesture === "HELP" ? "text-[#e8993e]" :
                      entry.gesture === "EMERGENCY" ? "text-[#d94a4a]" : "text-[#1f1f1f]"
                    }`}>
                      {entry.gesture}
                    </span>
                    {entry.escalated && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#fef2f2] text-[#d94a4a] font-bold border border-[#fecaca]">
                        ESCALATED
                      </span>
                    )}
                    {entry.resolved && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#ecfdf5] text-[#22a67e] font-bold border border-[#a7f3d0]">
                        RESOLVED
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-[#6e6e6e] truncate">{entry.description}</p>
                  <p className="text-[10px] text-[#9ca3af] mt-0.5">
                    {new Date(entry.timestamp).toLocaleTimeString()}
                  </p>
                </div>
              </div>

              {!entry.resolved && (
                <div className="flex gap-1.5 mt-2">
                  {!entry.acknowledged && (
                    <button
                      onClick={() => onAcknowledge(entry.id)}
                      className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg bg-[#ecfdf5] hover:bg-[#d1fae5] text-[#22a67e] text-xs font-medium transition-all"
                    >
                      <CheckCircle className="w-3 h-3" />
                      Acknowledge
                    </button>
                  )}
                  {entry.acknowledged && !entry.escalated && (
                    <button
                      onClick={() => onEscalate(entry.id)}
                      className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg bg-[#fef2f2] hover:bg-[#fee2e2] text-[#d94a4a] text-xs font-medium transition-all"
                    >
                      <ArrowUpCircle className="w-3 h-3" />
                      Escalate
                    </button>
                  )}
                  {(entry.acknowledged || entry.escalated) && !entry.resolved && (
                    <button
                      onClick={() => onResolve(entry.id)}
                      className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg bg-[#ecfdf5] hover:bg-[#d1fae5] text-[#22a67e] text-xs font-medium transition-all"
                    >
                      <CheckCircle className="w-3 h-3" />
                      Resolve
                    </button>
                  )}
                </div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {entries.length > 5 && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full mt-3 flex items-center justify-center gap-1 py-2 rounded-xl text-xs text-[#6e6e6e] hover:text-[#1f1f1f] transition-all"
        >
          <ChevronDown className={`w-3.5 h-3.5 transition-transform ${expanded ? "rotate-180" : ""}`} />
          {expanded ? "Show less" : `Show all (${entries.length})`}
        </button>
      )}
    </div>
  );
}
