"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FileText, Hand, Eye, Search, Trash2, Volume2, Download, Clock, Filter, CheckCircle, BarChart3, PieChart, TrendingUp, Activity, Sun } from "lucide-react";
import { loadGestureLog, subscribeToGestureUpdates, clearGestureLog, getStats, getDailyGestureCounts, getHourlyDistribution, getGestureDistribution, getTrends } from "@/lib/gestureLog";
import { voiceAlert } from "@/lib/tts";
import { GestureLogEntry, SupportedLanguage } from "@/types";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart as RePieChart, Pie, Cell, BarChart, Bar, Legend,
} from "recharts";

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

const GESTURE_COLORS: Record<string, string> = {
  YES: "#22a67e",
  NO: "#d94a4a",
  HELP: "#e8993e",
  WATER: "#3b82f6",
  EMERGENCY: "#dc2626",
};

type Tab = "timeline" | "analytics";

export default function LogsPage() {
  const [log, setLog] = useState<GestureLogEntry[]>([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "hand" | "eye">("all");
  const [showClear, setShowClear] = useState(false);
  const [tab, setTab] = useState<Tab>("timeline");
  const [chartDays, setChartDays] = useState(7);

  const stats = useMemo(() => getStats(), [log]);
  const trends = useMemo(() => getTrends(), [log]);
  const dailyData = useMemo(() => getDailyGestureCounts(chartDays), [log, chartDays]);
  const hourlyData = useMemo(() => getHourlyDistribution(), [log]);
  const distData = useMemo(() => getGestureDistribution(), [log]);

  const gestureTypes = useMemo(() => [...new Set(dailyData.map((d) => d.gesture))], [dailyData]);

  const dailyChartData = useMemo(() => {
    const dateMap = new Map<string, Record<string, number>>();
    const dateOrder: string[] = [];
    for (const entry of dailyData) {
      if (!dateMap.has(entry.date)) {
        dateMap.set(entry.date, {});
        dateOrder.push(entry.date);
      }
      const day = dateMap.get(entry.date)!;
      day[entry.gesture] = (day[entry.gesture] || 0) + entry.count;
    }
    return dateOrder.map((date) => ({ date, ...dateMap.get(date) }));
  }, [dailyData]);

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
              <p className="mt-2 text-[#6e6e6e]">Review and analyze all recorded gestures.</p>
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

        <div className="grid grid-cols-4 gap-4 mb-8">
          {[
            { label: "Total", value: stats.total },
            { label: "Today", value: stats.today },
            { label: "Unacknowledged", value: stats.unacknowledged, accent: stats.unacknowledged > 0 },
            { label: "Trend", value: `${trends.change > 0 ? "+" : ""}${trends.change}%`, accent: trends.direction !== "flat", icon: TrendingUp },
          ].map((stat, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
              className="card p-4 text-center"
            >
              <div className="text-[10px] text-[#6e6e6e] uppercase tracking-wider font-medium mb-1">{stat.label}</div>
              <div className={`text-2xl font-bold flex items-center justify-center gap-1 ${stat.accent ? "text-[#e8993e]" : "text-[#1f1f1f]"}`}>
                {stat.icon && trends.direction === "up" && <TrendingUp className="w-4 h-4 text-[#22a67e]" />}
                {stat.icon && trends.direction === "down" && <TrendingUp className="w-4 h-4 text-[#d94a4a] rotate-180" />}
                {stat.value}
              </div>
            </motion.div>
          ))}
        </div>

        <div className="flex items-center gap-1 mb-6 border-b border-[#ececec]">
          <button onClick={() => setTab("timeline")}
            className={`px-5 py-3 text-sm font-medium transition-all border-b-2 -mb-[1px] ${
              tab === "timeline"
                ? "text-[#c63a22] border-[#c63a22]"
                : "text-[#6e6e6e] border-transparent hover:text-[#1f1f1f]"
            }`}
          >
            <Clock className="w-4 h-4 inline mr-1.5" />
            Timeline
          </button>
          <button onClick={() => setTab("analytics")}
            className={`px-5 py-3 text-sm font-medium transition-all border-b-2 -mb-[1px] ${
              tab === "analytics"
                ? "text-[#c63a22] border-[#c63a22]"
                : "text-[#6e6e6e] border-transparent hover:text-[#1f1f1f]"
            }`}
          >
            <BarChart3 className="w-4 h-4 inline mr-1.5" />
            Analytics
          </button>
        </div>

        {tab === "analytics" ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="card p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-bold text-[#1f1f1f] flex items-center gap-2">
                    <Activity className="w-4 h-4 text-[#c63a22]" />
                    Gestures Over Time
                  </h3>
                  <div className="flex gap-1">
                    {[7, 14, 30].map((d) => (
                      <button key={d} onClick={() => setChartDays(d)}
                        className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                          chartDays === d
                            ? "bg-[#c63a22]/10 text-[#c63a22]"
                            : "text-[#6e6e6e] hover:bg-[#f5f3f0]"
                        }`}
                      >{d}d</button>
                    ))}
                  </div>
                </div>
                {dailyChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={250}>
                    <LineChart data={dailyChartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#ececec" />
                      <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#6e6e6e" }} tickFormatter={(v) => v.slice(5)} />
                      <YAxis tick={{ fontSize: 11, fill: "#6e6e6e" }} allowDecimals={false} />
                      <Tooltip
                        contentStyle={{
                          background: "#fff", border: "1px solid #ececec", borderRadius: "12px",
                          fontSize: "12px", boxShadow: "0 4px 12px rgba(0,0,0,0.06)",
                        }}
                      />
                      {gestureTypes.map((g) => (
                        <Line key={g} type="monotone" dataKey={g} stroke={GESTURE_COLORS[g] ?? "#6e6e6e"}
                          strokeWidth={2} dot={false} connectNulls
                        />
                      ))}
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-[250px] text-[#6e6e6e] text-sm">
                    No data for selected period
                  </div>
                )}
              </div>

              <div className="card p-6">
                <h3 className="text-sm font-bold text-[#1f1f1f] mb-4 flex items-center gap-2">
                  <PieChart className="w-4 h-4 text-[#c63a22]" />
                  Gesture Distribution
                </h3>
                {distData.length > 0 ? (
                  <div className="flex items-center gap-4">
                    <ResponsiveContainer width="60%" height={220}>
                      <RePieChart>
                        <Pie data={distData} cx="50%" cy="50%" innerRadius={50} outerRadius={80}
                          paddingAngle={3} dataKey="value"
                        >
                          {distData.map((entry, i) => (
                            <Cell key={i} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{
                            background: "#fff", border: "1px solid #ececec", borderRadius: "12px",
                            fontSize: "12px",
                          }}
                        />
                      </RePieChart>
                    </ResponsiveContainer>
                    <div className="space-y-2 flex-1">
                      {distData.map((entry) => (
                        <div key={entry.name} className="flex items-center justify-between text-xs">
                          <span className="flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 rounded-full" style={{ background: entry.color }} />
                            <span className="font-medium text-[#1f1f1f]">{entry.name}</span>
                          </span>
                          <span className="text-[#6e6e6e]">{entry.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-[220px] text-[#6e6e6e] text-sm">
                    No gestures recorded yet
                  </div>
                )}
              </div>
            </div>

            <div className="card p-6">
              <h3 className="text-sm font-bold text-[#1f1f1f] mb-4 flex items-center gap-2">
                <Sun className="w-4 h-4 text-[#c63a22]" />
                Hourly Activity
              </h3>
              {hourlyData.some((h) => h.count > 0) ? (
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={hourlyData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#ececec" />
                    <XAxis dataKey="hour" tick={{ fontSize: 11, fill: "#6e6e6e" }}
                      tickFormatter={(h) => `${h.toString().padStart(2, "0")}:00`}
                    />
                    <YAxis tick={{ fontSize: 11, fill: "#6e6e6e" }} allowDecimals={false} />
                    <Tooltip
                      contentStyle={{
                        background: "#fff", border: "1px solid #ececec", borderRadius: "12px", fontSize: "12px",
                      }}
                      formatter={(value) => [value, "Gestures"]}
                      labelFormatter={(h) => `${h.toString().padStart(2, "0")}:00`}
                    />
                    <Bar dataKey="count" fill="#c63a22" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-[180px] text-[#6e6e6e] text-sm">
                  No activity data yet
                </div>
              )}
            </div>

            <div className="card p-4">
              <div className="flex items-center flex-wrap gap-3 text-xs text-[#6e6e6e]">
                <span className="flex items-center gap-1">
                  <Hand className="w-3 h-3" /> Hand: {stats.byType.hand ?? 0}
                </span>
                <span className="flex items-center gap-1">
                  <Eye className="w-3 h-3" /> Eye: {stats.byType.eye ?? 0}
                </span>
                {Object.entries(stats.byGesture).map(([g, c]) => (
                  <span key={g} className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full" style={{ background: GESTURE_COLORS[g] ?? "#6e6e6e" }} />
                    {g}: {c}
                  </span>
                ))}
              </div>
            </div>
          </motion.div>
        ) : (
          <>
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
          </>
        )}
      </div>
    </div>
  );
}
