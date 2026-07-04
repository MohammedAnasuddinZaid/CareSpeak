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
  const active = entries.filter((e) => e.acknowledged && !e.resolved);
  const displayEntries = expanded ? entries : unacknowledged.slice(0, 5);

  if (entries.length === 0) {
    return (
      <div className="bg-slate-800/30 rounded-2xl border border-white/5 p-5">
        <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
          <Bell className="w-4 h-4 text-indigo-400" />
          Clinician Actions
        </h3>
        <div className="flex items-center justify-center h-16 text-slate-600 text-sm">
          No pending alerts
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-800/30 rounded-2xl border border-white/5 p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-white flex items-center gap-2">
          <Bell className="w-4 h-4 text-indigo-400" />
          Clinician Actions
        </h3>
        {unacknowledged.length > 0 && (
          <span className="px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 text-[10px] font-bold">
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
                  ? "bg-emerald-500/5 border-emerald-500/20"
                  : entry.escalated
                  ? "bg-red-500/10 border-red-500/30"
                  : entry.acknowledged
                  ? "bg-blue-500/5 border-blue-500/20"
                  : "bg-slate-800/50 border-white/10"
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className={`text-sm font-bold ${
                      entry.gesture === "HELP" ? "text-amber-400" :
                      entry.gesture === "EMERGENCY" ? "text-red-400" : "text-white"
                    }`}>
                      {entry.gesture}
                    </span>
                    {entry.escalated && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-500/20 text-red-400 font-bold">
                        ESCALATED
                      </span>
                    )}
                    {entry.resolved && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-bold">
                        RESOLVED
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 truncate">{entry.description}</p>
                  <p className="text-[10px] text-slate-600 mt-0.5">
                    {new Date(entry.timestamp).toLocaleTimeString()}
                  </p>
                </div>
              </div>

              {!entry.resolved && (
                <div className="flex gap-1.5 mt-2">
                  {!entry.acknowledged && (
                    <button
                      onClick={() => onAcknowledge(entry.id)}
                      className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 text-xs font-medium transition-all"
                    >
                      <CheckCircle className="w-3 h-3" />
                      Acknowledge
                    </button>
                  )}
                  {entry.acknowledged && !entry.escalated && (
                    <button
                      onClick={() => onEscalate(entry.id)}
                      className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-400 text-xs font-medium transition-all"
                    >
                      <ArrowUpCircle className="w-3 h-3" />
                      Escalate
                    </button>
                  )}
                  {(entry.acknowledged || entry.escalated) && (
                    <button
                      onClick={() => onResolve(entry.id)}
                      className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 text-xs font-medium transition-all"
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
          className="w-full mt-3 flex items-center justify-center gap-1 py-2 rounded-xl text-xs text-slate-500 hover:text-slate-300 transition-all"
        >
          <ChevronDown className={`w-3.5 h-3.5 transition-transform ${expanded ? "rotate-180" : ""}`} />
          {expanded ? "Show less" : `Show all (${entries.length})`}
        </button>
      )}
    </div>
  );
}
