"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Clock, Eye, Hand, Trash2, Volume2, Filter, Search, Download, FileText } from "lucide-react";
import { loadGestureLog, clearGestureLog, subscribeToGestureUpdates } from "@/lib/gestureLog";
import { GestureLogEntry } from "@/types";

const TYPE_CONFIG: Record<string, { icon: React.ComponentType<{ className?: string }>; label: string }> = {
  hand: { icon: Hand, label: "Hand" },
  eye: { icon: Eye, label: "Eye" },
};

const GESTURE_COLORS: Record<string, string> = {
  YES: "text-emerald-400", NO: "text-red-400", HELP: "text-amber-400",
  HELLO: "text-blue-400", WATER: "text-cyan-400", EMERGENCY: "text-red-400",
};

function getDateGroup(ts: number): string {
  const now = new Date();
  const date = new Date(ts);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today.getTime() - 86400000);
  const weekAgo = new Date(today.getTime() - 6 * 86400000);
  if (date >= today) return "Today";
  if (date >= yesterday) return "Yesterday";
  if (date >= weekAgo) return "This Week";
  return "Older";
}

export default function LogsPage() {
  const [log, setLog] = useState<GestureLogEntry[]>([]);
  const [filter, setFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  useEffect(() => {
    setLog(loadGestureLog());
    const unsub = subscribeToGestureUpdates(
      (entry) => setLog((prev) => [entry, ...prev].slice(0, 200)),
      () => setLog([])
    );
    return unsub;
  }, []);

  const handleClear = useCallback(() => { clearGestureLog(); setLog([]); setShowClearConfirm(false); }, []);
  const handleExport = useCallback(() => {
    const data = JSON.stringify(log, null, 2);
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `carespeak-log-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [log]);

  const filtered = useMemo(() => {
    let result = log;
    if (filter !== "all") result = result.filter((e) => e.type === filter);
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((e) => e.gesture.toLowerCase().includes(q) || e.description.toLowerCase().includes(q));
    }
    return result;
  }, [log, filter, search]);

  const grouped = useMemo(() => {
    const groups: Record<string, GestureLogEntry[]> = {};
    for (const entry of filtered) {
      const group = getDateGroup(entry.timestamp);
      if (!groups[group]) groups[group] = [];
      groups[group].push(entry);
    }
    return groups;
  }, [filtered]);

  const formatTime = (ts: number) => {
    const d = new Date(ts);
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" }) + " " +
      d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  };

  const filterOptions = [
    { value: "all", label: "All", icon: Filter },
    { value: "hand", label: "Hand", icon: Hand },
    { value: "eye", label: "Eye", icon: Eye },
  ];

  return (
    <div className="min-h-screen bg-slate-950 pt-20 pb-16">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between mb-8 flex-wrap gap-4"
        >
          <div>
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-sm font-medium mb-4">
              <FileText className="w-4 h-4" />
              Gesture History
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold text-white tracking-tight">Gesture Logs</h1>
            <p className="mt-1 text-slate-400">Complete history of all detected gestures</p>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={handleExport}
              className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-sm border border-white/10 transition-all duration-200 flex items-center gap-2"
            ><Download className="w-4 h-4" /> Export JSON</button>
            <button onClick={() => setShowClearConfirm(true)}
              className="px-4 py-2 rounded-xl bg-white/5 hover:bg-red-500/10 text-slate-400 hover:text-red-400 text-sm border border-white/10 hover:border-red-500/20 transition-all duration-200 flex items-center gap-2"
            ><Trash2 className="w-4 h-4" /> Clear</button>
          </div>
        </motion.div>

        <AnimatePresence>
          {showClearConfirm && (
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
              className="mb-6 p-4 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-between"
            >
              <span className="text-red-400 text-sm">Clear all gesture history?</span>
              <div className="flex gap-2">
                <button onClick={handleClear} className="px-4 py-1.5 rounded-lg bg-red-500 hover:bg-red-600 text-white text-xs font-medium">Clear</button>
                <button onClick={() => setShowClearConfirm(false)} className="px-4 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-medium">Cancel</button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-6">
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            {filterOptions.map((opt) => {
              const Icon = opt.icon;
              const active = filter === opt.value;
              return (
                <button key={opt.value} onClick={() => setFilter(opt.value)}
                  className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 flex items-center gap-2 ${
                    active ? "bg-indigo-500/20 text-indigo-400 border border-indigo-500/30" : "bg-white/5 text-slate-400 border border-white/10 hover:bg-white/10"
                  }`}
                ><Icon className="w-4 h-4" /> {opt.label}</button>
              );
            })}
          </div>
          <div className="relative flex-1 max-w-xs w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input type="text" placeholder="Search gestures..." value={search} onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-xl bg-white/5 border border-white/10 text-slate-300 text-sm placeholder-slate-600 focus:outline-none focus:border-indigo-500/50 transition-colors"
            />
          </div>
          <div className="text-xs text-slate-500 whitespace-nowrap">{filtered.length} {filtered.length === 1 ? "entry" : "entries"}</div>
        </div>

        {filtered.length === 0 ? (
          <div className="text-center py-20 rounded-3xl border-2 border-dashed border-white/10 bg-white/5">
            <Clock className="w-16 h-16 text-slate-600 mx-auto mb-4" />
            <p className="text-slate-400 font-medium">No gestures found</p>
            <p className="text-slate-600 text-sm mt-1">
              {search ? "Try a different search term." : filter !== "all" ? `No ${filter} gestures logged.` : "Use Hand Mode or Eye Mode to start."}
            </p>
          </div>
        ) : (
          <div className="space-y-8">
            {Object.entries(grouped).map(([group, entries]) => (
              <div key={group}>
                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-3 px-1">{group}</h3>
                <div className="rounded-3xl border border-white/5 overflow-hidden bg-slate-900/50 backdrop-blur-sm">
                  <div className="divide-y divide-white/5">
                    {entries.map((entry, i) => {
                      const cfg = TYPE_CONFIG[entry.type] ?? TYPE_CONFIG.hand;
                      const Icon = cfg.icon;
                      return (
                        <motion.div key={entry.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: Math.min(i * 0.02, 0.5) }}
                          className="flex items-center gap-4 p-4 hover:bg-white/5 transition-colors"
                        >
                          <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center flex-shrink-0">
                            <Icon className="w-5 h-5 text-slate-400" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className={`text-lg font-extrabold ${GESTURE_COLORS[entry.gesture] ?? "text-white"}`}>{entry.gesture}</span>
                              <span className="text-xs text-slate-500 capitalize px-2 py-0.5 rounded-full bg-white/5">{entry.type}</span>
                              <span className="text-[10px] text-slate-600">{Math.round(entry.confidence * 100)}%</span>
                            </div>
                            <div className="text-sm text-slate-400 truncate">{entry.description}</div>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <div className="text-[10px] text-slate-500">{formatTime(entry.timestamp)}</div>
                          </div>
                          <button onClick={() => {
                            if (typeof window !== "undefined" && window.speechSynthesis) {
                              window.speechSynthesis.cancel();
                              const u = new SpeechSynthesisUtterance(entry.description);
                              window.speechSynthesis.speak(u);
                            }
                          }} className="p-2 rounded-lg hover:bg-white/10 text-slate-500 hover:text-slate-300 transition-colors" title="Replay"
                          ><Volume2 className="w-4 h-4" /></button>
                        </motion.div>
                      );
                    })}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
