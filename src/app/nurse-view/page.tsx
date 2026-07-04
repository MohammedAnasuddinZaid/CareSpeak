"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, Clock, Eye, Hand, Trash2, Volume2, CheckCircle, Filter, Activity, BarChart3 } from "lucide-react";
import { loadGestureLog, subscribeToGestureUpdates, clearGestureLog, acknowledgeEntry, getStats } from "@/lib/gestureLog";
import { GestureLogEntry } from "@/types";

const TYPE_CONFIG: Record<string, { icon: React.ComponentType<{ className?: string }>; text: string }> = {
  hand: { icon: Hand, text: "text-blue-400" },
  eye: { icon: Eye, text: "text-emerald-400" },
};

const GESTURE_BADGES: Record<string, { bg: string; text: string; label: string }> = {
  YES: { bg: "bg-emerald-500/10", text: "text-emerald-400", label: "Confirm" },
  NO: { bg: "bg-red-500/10", text: "text-red-400", label: "Refuse" },
  HELP: { bg: "bg-amber-500/10", text: "text-amber-400", label: "Assistance" },
  HELLO: { bg: "bg-blue-500/10", text: "text-blue-400", label: "Greeting" },
  WATER: { bg: "bg-cyan-500/10", text: "text-cyan-400", label: "Water/Food" },
  EMERGENCY: { bg: "bg-red-500/20", text: "text-red-300", label: "Emergency" },
};

export default function NurseViewPage() {
  const [log, setLog] = useState<GestureLogEntry[]>([]);
  const [latest, setLatest] = useState<GestureLogEntry | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [filter, setFilter] = useState<"all" | "hand" | "eye" | "unacknowledged">("all");
  const [soundOn, setSoundOn] = useState(true);

  const stats = useMemo(() => getStats(), [log]);

  useEffect(() => {
    const entries = loadGestureLog();
    setLog(entries);
    setLatest(entries[0] ?? null);
  }, []);

  useEffect(() => {
    const unsub = subscribeToGestureUpdates(
      (entry) => { setLog((prev) => [entry, ...prev].slice(0, 200)); setLatest(entry); },
      () => { setLog([]); setLatest(null); },
      (entryId) => { setLog((prev) => prev.map((e) => e.id === entryId ? { ...e, acknowledged: true } : e)); }
    );
    return unsub;
  }, []);

  useEffect(() => {
    if (!latest) return;
    const interval = setInterval(() => setElapsed(Math.floor((Date.now() - latest.timestamp) / 1000)), 1000);
    return () => clearInterval(interval);
  }, [latest]);

  const handleClear = useCallback(() => { clearGestureLog(); setLog([]); setLatest(null); setShowClearConfirm(false); }, []);
  const handleAcknowledge = useCallback((id: string) => { acknowledgeEntry(id); setLog((prev) => prev.map((e) => e.id === id ? { ...e, acknowledged: true } : e)); }, []);

  const filteredLog = useMemo(() => {
    switch (filter) {
      case "hand": return log.filter((e) => e.type === "hand");
      case "eye": return log.filter((e) => e.type === "eye");
      case "unacknowledged": return log.filter((e) => !e.acknowledged);
      default: return log;
    }
  }, [log, filter]);

  const formatTime = (ts: number) => {
    const d = new Date(ts);
    const now = new Date();
    const diffMin = Math.floor((now.getTime() - ts) / 60000);
    if (diffMin < 1) return "Just now";
    if (diffMin < 60) return `${diffMin}m ago`;
    return d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
  };

  const formatDescription = (entry: GestureLogEntry): string => entry.description.replace(/^[^—]*—\s*/, "");

  return (
    <div className="min-h-screen bg-slate-950 pt-20 pb-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm font-medium mb-4">
                <Bell className="w-4 h-4" />
                Nurse Dashboard — Real-Time Monitor
              </div>
              <h1 className="text-3xl sm:text-4xl font-bold text-white tracking-tight">Patient Communication Monitor</h1>
              <p className="mt-2 text-slate-400">Live feed of all patient gestures — acknowledge alerts as you respond.</p>
            </div>
            <div className="flex items-center gap-3">
              <button onClick={() => setSoundOn((v) => !v)}
                className={`px-3 py-2 rounded-xl text-sm border transition-all duration-200 flex items-center gap-1.5 ${
                  soundOn ? "bg-white/5 text-slate-300 border-white/10" : "bg-slate-800/50 text-slate-600 border-white/5"
                }`}
              >
                <Volume2 className="w-4 h-4" />
                {soundOn ? "Sound On" : "Sound Off"}
              </button>
              <button onClick={() => setShowClearConfirm(true)}
                className="px-4 py-2 rounded-xl bg-white/5 hover:bg-red-500/10 text-slate-400 hover:text-red-400 text-sm border border-white/10 hover:border-red-500/20 transition-all duration-200 flex items-center gap-2"
              >
                <Trash2 className="w-4 h-4" /> Clear Log
              </button>
            </div>
          </div>
        </motion.div>

        <AnimatePresence>
          {showClearConfirm && (
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
              className="mb-6 p-4 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-between"
            >
              <span className="text-red-400 text-sm">Clear all gesture history? This cannot be undone.</span>
              <div className="flex gap-2">
                <button onClick={handleClear} className="px-4 py-1.5 rounded-lg bg-red-500 hover:bg-red-600 text-white text-xs font-medium transition-colors">Clear</button>
                <button onClick={() => setShowClearConfirm(false)} className="px-4 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-medium transition-colors">Cancel</button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[
            { label: "Latest", value: latest ? <span className={GESTURE_BADGES[latest.gesture]?.text ?? "text-white"}>{latest.gesture}</span> : "\u2014", sub: latest ? formatTime(latest.timestamp) : "No alerts", delay: 0 },
            { label: "Today", value: stats.today, sub: "gestures recorded", delay: 0.05 },
            { label: "Unacknowledged", value: stats.unacknowledged, sub: "pending review", accent: stats.unacknowledged > 0, delay: 0.1 },
            { label: "Total", value: stats.total, sub: "all-time gestures", delay: 0.15 },
          ].map((stat, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: stat.delay }}
              className="dashboard-card p-5"
            >
              <div className="text-xs text-slate-500 uppercase tracking-wider font-medium mb-1">{stat.label}</div>
              <div className={`text-2xl font-bold ${stat.accent ? "text-amber-400" : "text-white"}`}>{stat.value}</div>
              <div className="text-xs text-slate-500 mt-0.5">{stat.sub}</div>
            </motion.div>
          ))}
        </div>

        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-500" />
            {(["all", "unacknowledged", "hand", "eye"] as const).map((f) => (
              <button key={f} onClick={() => setFilter(f)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 ${
                  filter === f ? "bg-indigo-500/20 text-indigo-400 border border-indigo-500/30" : "text-slate-500 hover:text-slate-300 border border-transparent"
                }`}
              >
                {f === "all" ? "All" : f === "unacknowledged" ? "Unread" : f === "hand" ? "Hand" : "Eye"}
              </button>
            ))}
          </div>
          <div className="text-xs text-slate-500">{filteredLog.length} of {log.length} entries</div>
        </div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className="rounded-3xl border border-white/5 overflow-hidden bg-slate-900/50 backdrop-blur-sm"
        >
          {filteredLog.length === 0 ? (
            <div className="text-center py-20">
              <Bell className="w-12 h-12 text-slate-700 mx-auto mb-4" />
              <p className="text-slate-500 font-medium">No gestures recorded yet</p>
              <p className="text-slate-600 text-xs mt-1">Gestures from Hand or Eye mode will appear here in real time.</p>
            </div>
          ) : (
            <div className="divide-y divide-white/5">
              {filteredLog.map((entry, i) => {
                const badge = GESTURE_BADGES[entry.gesture] ?? GESTURE_BADGES.HELP;
                const typeCfg = TYPE_CONFIG[entry.type] ?? TYPE_CONFIG.hand;
                const Icon = typeCfg.icon;
                return (
                  <motion.div key={entry.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: Math.min(i * 0.02, 0.5) }}
                    className={`flex items-center gap-4 px-6 py-4 transition-all duration-200 ${
                      !entry.acknowledged ? "bg-indigo-500/5 border-l-2 border-l-indigo-500" : "hover:bg-white/5"
                    }`}
                  >
                    <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center flex-shrink-0">
                      <Icon className="w-5 h-5 text-slate-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`font-bold text-sm ${badge.text}`}>{entry.gesture}</span>
                        <span className={`px-2 py-0.5 rounded ${badge.bg} ${badge.text} text-xs font-medium`}>{badge.label}</span>
                        <span className="px-2 py-0.5 rounded bg-white/5 text-slate-500 text-xs">{entry.type}</span>
                        {!entry.acknowledged && <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />}
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5 truncate">{formatDescription(entry)}</div>
                      <div className="text-xs text-slate-600 mt-0.5">{formatTime(entry.timestamp)} · {Math.round(entry.confidence * 100)}% confidence</div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {!entry.acknowledged && (
                        <button onClick={() => handleAcknowledge(entry.id)}
                          className="p-2 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 transition-all duration-200" title="Acknowledge"
                        ><CheckCircle className="w-4 h-4" /></button>
                      )}
                      <button onClick={() => {
                        if (typeof window !== "undefined" && window.speechSynthesis) {
                          window.speechSynthesis.cancel();
                          const u = new SpeechSynthesisUtterance(entry.description);
                          window.speechSynthesis.speak(u);
                        }
                      }} className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 transition-all duration-200" title="Replay"
                      ><Volume2 className="w-4 h-4" /></button>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </motion.div>

        {filteredLog.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mt-8 dashboard-card p-6">
            <h3 className="text-sm font-bold text-slate-200 mb-4 flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-indigo-400" />
              Gesture Breakdown
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
              {["YES", "NO", "HELP", "WATER", "HELLO", "EMERGENCY"].map((g) => {
                const count = filteredLog.filter((e) => e.gesture === g).length;
                const total = filteredLog.length;
                const pct = total > 0 ? Math.round((count / total) * 100) : 0;
                const badge = GESTURE_BADGES[g] ?? GESTURE_BADGES.HELP;
                return (
                  <div key={g} className="text-center p-3 rounded-xl bg-white/5">
                    <div className={`text-lg font-bold ${badge.text}`}>{count}</div>
                    <div className="text-xs text-slate-500">{g}</div>
                    <div className="w-full bg-slate-800 rounded-full h-1 mt-1">
                      <div className={`h-full rounded-full ${badge.bg.replace("/10", "/40")}`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
