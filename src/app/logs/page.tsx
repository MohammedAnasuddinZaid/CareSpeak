"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FileText, Hand, Eye, Search, Trash2, Volume2, Download, Clock, Filter, CheckCircle } from "lucide-react";
import { loadGestureLog, subscribeToGestureUpdates, clearGestureLog, getStats } from "@/lib/gestureLog";
import { voiceAlert } from "@/lib/tts";
import { GestureLogEntry, SupportedLanguage } from "@/types";

const TYPE_CONFIG: Record<string, { icon: React.ComponentType<{ className?: string }>; text: string }> = {
  hand: { icon: Hand, text: "text-[#22a67e]" },
  eye: { icon: Eye, text: "text-[#3b82f6]" },
};

const GESTURE_BADGES: Record<string, { bg: string; text: string; label: string }> = {
  YES: { bg: "gesture-yes", text: "text-[#22a67e]", label: "Confirm" },
  NO: { bg: "gesture-no", text: "text-[#d94a4a]", label: "Refuse" },
  HELP: { bg: "gesture-help", text: "text-[#e8993e]", label: "Assistance" },
  HELLO: { bg: "bg-[#eff6ff]", text: "text-[#3b82f6]", label: "Greeting" },
  WATER: { bg: "gesture-water", text: "text-[#3b82f6]", label: "Water/Food" },
  EMERGENCY: { bg: "gesture-emergency", text: "text-[#dc2626]", label: "Emergency" },
};

function groupByDate(log: GestureLogEntry[]): Record<string, GestureLogEntry[]> {
  const groups: Record<string, GestureLogEntry[]> = {};
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const yesterday = today - 86400000;
  const thisWeek = today - now.getDay() * 86400000;
  for (const entry of log) {
    let key: string;
    if (entry.timestamp >= today) key = "Today";
    else if (entry.timestamp >= yesterday) key = "Yesterday";
    else if (entry.timestamp >= thisWeek) key = "This Week";
    else key = "Older";
    if (!groups[key]) groups[key] = [];
    groups[key].push(entry);
  }
  return groups;
}

const GROUP_ORDER = ["Today", "Yesterday", "This Week", "Older"];

export default function LogsPage() {
  const [log, setLog] = useState<GestureLogEntry[]>([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "hand" | "eye">("all");
  const [showClear, setShowClear] = useState(false);

  const stats = useMemo(() => getStats(), [log]);

  useEffect(() => {
    setLog(loadGestureLog());
    const unsub = subscribeToGestureUpdates(
      (entry) => setLog((prev) => [entry, ...prev].slice(0, 200)),
      () => setLog([]),
    );
    return unsub;
  }, []);

  const filteredLog = useMemo(() => {
    let entries = log;
    if (search.trim()) {
      const q = search.toLowerCase();
      entries = entries.filter((e) => e.gesture.toLowerCase().includes(q) || e.description.toLowerCase().includes(q));
    }
    if (filter !== "all") entries = entries.filter((e) => e.type === filter);
    return entries;
  }, [log, search, filter]);

  const grouped = useMemo(() => groupByDate(filteredLog), [filteredLog]);

  const handleExport = useCallback(() => {
    const blob = new Blob([JSON.stringify(log, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `carespeak-gestures-${new Date().toISOString().split("T")[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [log]);

  const handleClear = useCallback(() => {
    clearGestureLog();
    setLog([]);
    setShowClear(false);
  }, []);

  const formatTime = (ts: number) => {
    const d = new Date(ts);
    const now = new Date();
    const diffMin = Math.floor((now.getTime() - ts) / 60000);
    if (diffMin < 1) return "Just now";
    if (diffMin < 60) return `${diffMin}m ago`;
    return d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <div className="min-h-screen pt-20 pb-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#c63a22]/5 border border-[#c63a22]/15 text-[#c63a22] text-sm font-medium mb-4">
                <FileText className="w-4 h-4" />
                Gesture History
              </div>
              <h1 className="text-3xl sm:text-4xl font-bold text-[#1f1f1f] tracking-tight">Gesture Logs</h1>
              <p className="mt-2 text-[#6e6e6e]">Review and manage all recorded gestures.</p>
            </div>
            <div className="flex items-center gap-3">
              <button onClick={handleExport}
                className="btn-secondary flex items-center gap-2 px-4 py-2.5 text-sm"
              >
                <Download className="w-4 h-4" />
                Export JSON
              </button>
              <button onClick={() => setShowClear(true)}
                className="btn-danger flex items-center gap-2 px-4 py-2.5 text-sm"
              >
                <Trash2 className="w-4 h-4" />
                Clear
              </button>
            </div>
          </div>
        </motion.div>

        <AnimatePresence>
          {showClear && (
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
              className="mb-6 p-4 rounded-2xl bg-[#fef2f2] border border-[#fecaca] flex items-center justify-between"
            >
              <span className="text-[#d94a4a] text-sm">Clear all gesture history? This cannot be undone.</span>
              <div className="flex gap-2">
                <button onClick={handleClear} className="px-4 py-1.5 rounded-lg bg-[#d94a4a] hover:bg-[#b91c1c] text-white text-xs font-medium transition-colors">Clear</button>
                <button onClick={() => setShowClear(false)} className="px-4 py-1.5 rounded-lg bg-[#f5f3f0] hover:bg-[#ececec] text-[#1f1f1f] text-xs font-medium transition-colors">Cancel</button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="grid grid-cols-3 gap-4 mb-8">
          {[
            { label: "Total", value: stats.total },
            { label: "Today", value: stats.today },
            { label: "Unacknowledged", value: stats.unacknowledged, accent: stats.unacknowledged > 0 },
          ].map((stat, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
              className="card p-4 text-center"
            >
              <div className="text-[10px] text-[#6e6e6e] uppercase tracking-wider font-medium mb-1">{stat.label}</div>
              <div className={`text-2xl font-bold ${stat.accent ? "text-[#e8993e]" : "text-[#1f1f1f]"}`}>{stat.value}</div>
            </motion.div>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <div className="relative flex-1 max-w-md w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6e6e6e]" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search gestures..."
              className="input w-full pl-9"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-[#6e6e6e]" />
            {(["all", "hand", "eye"] as const).map((f) => (
              <button key={f} onClick={() => setFilter(f)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 ${
                  filter === f ? "bg-[#c63a22]/10 text-[#c63a22] border border-[#c63a22]/20" : "text-[#6e6e6e] hover:text-[#1f1f1f] border border-transparent"
                }`}
              >
                {f === "all" ? "All" : f === "hand" ? "Hand" : "Eye"}
              </button>
            ))}
          </div>
        </div>

        {filteredLog.length === 0 ? (
          <div className="card p-16 text-center">
            <Clock className="w-12 h-12 text-[#d5d5d5] mx-auto mb-4" />
            <p className="text-[#6e6e6e] font-medium">No gestures found</p>
            <p className="text-[#9ca3af] text-xs mt-1">
              {search ? "Try a different search term" : "Start using Hand or Eye mode to see gestures here"}
            </p>
          </div>
        ) : (
          <div className="space-y-8">
            {GROUP_ORDER.filter((g) => grouped[g]).map((group) => (
              <div key={group}>
                <h3 className="text-sm font-semibold text-[#1f1f1f] mb-3 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-[#c63a22]" />
                  {group}
                  <span className="text-xs text-[#6e6e6e] font-normal">({grouped[group].length})</span>
                </h3>
                <div className="space-y-2">
                  {grouped[group].map((entry) => {
                    const badge = GESTURE_BADGES[entry.gesture] ?? GESTURE_BADGES.HELP;
                    const typeCfg = TYPE_CONFIG[entry.type] ?? TYPE_CONFIG.hand;
                    const Icon = typeCfg.icon;
                    return (
                      <motion.div key={entry.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                        className="card p-4 flex items-center gap-4"
                      >
                        <div className="w-10 h-10 rounded-xl bg-[#f5f3f0] flex items-center justify-center flex-shrink-0">
                          <Icon className="w-5 h-5 text-[#6e6e6e]" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className={`font-bold text-sm ${badge.text}`}>{entry.gesture}</span>
                            <span className={`px-2 py-0.5 rounded text-xs font-medium ${badge.bg} ${badge.text}`}>{badge.label}</span>
                            <span className="px-2 py-0.5 rounded bg-[#f5f3f0] text-[#6e6e6e] text-xs">{entry.type}</span>
                            {entry.acknowledged && <CheckCircle className="w-3.5 h-3.5 text-[#22a67e]" />}
                          </div>
                          <div className="text-xs text-[#6e6e6e] mt-0.5">{entry.description.replace(/^[^—]*—\s*/, "")}</div>
                          <div className="text-[10px] text-[#9ca3af] mt-0.5">
                            {formatTime(entry.timestamp)} · {Math.round(entry.confidence * 100)}% confidence
                          </div>
                        </div>
                        <button
                          onClick={() => {
                            voiceAlert.replay(entry.gesture, entry.language as SupportedLanguage);
                          }}
                          className="p-2 rounded-lg bg-[#f5f3f0] hover:bg-[#ececec] text-[#6e6e6e] transition-all duration-200"
                          title="Replay"
                        >
                          <Volume2 className="w-4 h-4" />
                        </button>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
