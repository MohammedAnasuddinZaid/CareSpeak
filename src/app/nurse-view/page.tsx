"use client";

import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, Clock, Eye, Hand, CheckCircle, Filter, Activity, Monitor, AlertTriangle, Wifi, Smartphone, Shield, ArrowUpCircle } from "lucide-react";
import { loadGestureLog, subscribeToGestureUpdates, acknowledgeEntry } from "@/lib/gestureLog";
import { GestureLogEntry, ESCALATION_RULES, PatientMetrics } from "@/types";
import { createNetworkSync, NetworkSync } from "@/lib/networkSync";
import { getSession, setSessionId } from "@/lib/session";
import PatientMetricsCard from "@/components/PatientMetricsCard";
import ClinicianActions from "@/components/ClinicianActions";

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
  const [filter, setFilter] = useState<"all" | "hand" | "eye" | "unacknowledged">("all");
  const [sessionInput, setSessionInput] = useState("");
  const [paired, setPaired] = useState(false);
  const [remoteMetrics, setRemoteMetrics] = useState<Record<string, PatientMetrics>>({});
  const [syncStatus, setSyncStatus] = useState<"disconnected" | "connected" | "polling">("disconnected");
  const syncRef = useRef<NetworkSync | null>(null);

  const entriesForActions = useMemo(() =>
    log.filter((e) => e.gesture === "HELP" || e.gesture === "EMERGENCY" || (e.patientMetrics?.alertnessScore != null && e.patientMetrics.alertnessScore < 25) || log.length < 10),
  [log]);

  useEffect(() => {
    const entries = loadGestureLog();
    setLog(entries);
    setLatest(entries[0] ?? null);

    const session = getSession();
    if (session?.sessionId) {
      setPaired(true);
    }

    const sync = createNetworkSync({
      sessionId: session?.sessionId,
      onAlert: (entry) => {
        setLog((prev) => {
          if (prev.some((e) => e.id === entry.id)) return prev;
          return [entry, ...prev].slice(0, 200);
        });
        setLatest(entry);
      },
      onMetrics: (metrics) => {
        setRemoteMetrics((prev) => ({ ...prev, ...metrics }));
      },
    });
    syncRef.current = sync;
    setSyncStatus("polling");

    const unsub = subscribeToGestureUpdates(
      (entry) => {
        setLog((prev) => {
          if (prev.some((e) => e.id === entry.id)) return prev;
          return [entry, ...prev].slice(0, 200);
        });
        setLatest(entry);
        sync.sendAlert(entry);
      },
      undefined,
      (entryId) => {
        setLog((prev) => prev.map((e) => e.id === entryId ? { ...e, acknowledged: true } : e));
      }
    );

    return () => {
      unsub();
      sync.destroy();
    };
  }, []);

  const handlePairSession = useCallback(() => {
    const id = sessionInput.trim().toUpperCase();
    if (id.length < 3) return;
    const session = setSessionId(id);
    setPaired(true);
    setSyncStatus("connected");

    if (syncRef.current) {
      syncRef.current.destroy();
    }
    const sync = createNetworkSync({
      sessionId: session.sessionId,
      onAlert: (entry) => {
        setLog((prev) => {
          if (prev.some((e) => e.id === entry.id)) return prev;
          return [entry, ...prev].slice(0, 200);
        });
        setLatest(entry);
      },
      onMetrics: (metrics) => {
        setRemoteMetrics((prev) => ({ ...prev, ...metrics }));
      },
    });
    syncRef.current = sync;
  }, [sessionInput]);

  const handleAcknowledge = useCallback((id: string) => {
    acknowledgeEntry(id);
    setLog((prev) => prev.map((e) => e.id === id ? { ...e, acknowledged: true, acknowledgedAt: Date.now() } : e));
    syncRef.current?.sendAction({ type: "acknowledge", entryId: id, timestamp: Date.now() });
  }, []);

  const handleEscalate = useCallback((id: string) => {
    setLog((prev) => prev.map((e) => e.id === id ? { ...e, escalated: true, isEscalated: true, escalatedAt: Date.now() } : e));
    syncRef.current?.sendAction({ type: "escalate", entryId: id, timestamp: Date.now() });
  }, []);

  const handleResolve = useCallback((id: string) => {
    setLog((prev) => prev.map((e) => e.id === id ? { ...e, resolved: true, acknowledged: true, resolvedAt: Date.now() } : e));
    syncRef.current?.sendAction({ type: "resolve", entryId: id, timestamp: Date.now() });
  }, []);

  const stats = useMemo(() => {
    const today = log.filter((e) => {
      const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
      return e.timestamp >= todayStart.getTime();
    }).length;
    return {
      total: log.length,
      today,
      unacknowledged: log.filter((e) => !e.acknowledged).length,
      escalated: log.filter((e) => e.escalated && !e.resolved).length,
    };
  }, [log]);

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
                Clinician Console — Remote Patient Monitoring
              </div>
              <h1 className="text-3xl sm:text-4xl font-bold text-white tracking-tight">Patient Communication Monitor</h1>
              <p className="mt-2 text-slate-400">Live feed of all patient gestures with remote monitoring and escalation.</p>
            </div>
          </div>
        </motion.div>

        {!paired && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            className="mb-8 p-5 rounded-2xl bg-indigo-500/10 border border-indigo-500/20"
          >
            <div className="flex items-center gap-3 mb-3">
              <Smartphone className="w-5 h-5 text-indigo-400" />
              <h3 className="font-semibold text-white text-sm">Pair with Patient Device</h3>
            </div>
            <p className="text-xs text-slate-400 mb-3">
              Enter the Session ID shown on the patient&apos;s device to start receiving remote alerts.
            </p>
            <div className="flex gap-2">
              <input
                type="text"
                value={sessionInput}
                onChange={(e) => setSessionInput(e.target.value.toUpperCase().slice(0, 6))}
                placeholder="Enter Session ID (e.g. ABC123)"
                className="flex-1 px-4 py-2.5 rounded-xl bg-slate-900 border border-white/10 text-white text-sm font-mono tracking-widest uppercase placeholder:text-slate-600 focus:outline-none focus:border-indigo-500/50"
                maxLength={6}
              />
              <button onClick={handlePairSession} disabled={sessionInput.length < 3}
                className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-600 text-white text-sm font-medium transition-all"
              >
                Connect
              </button>
            </div>
          </motion.div>
        )}

        {paired && (
          <div className="mb-6 flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium w-fit">
            <Wifi className="w-3.5 h-3.5" />
            Connected — {syncStatus === "polling" ? "Polling" : "Live"}
          </div>
        )}

        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
          {[
            { label: "Latest", value: latest?.gesture || "\u2014", sub: latest ? formatTime(latest.timestamp) : "No alerts", color: latest ? GESTURE_BADGES[latest.gesture]?.text || "text-white" : "text-slate-500" },
            { label: "Today", value: stats.today, sub: "gestures recorded", color: "text-white" },
            { label: "Pending", value: stats.unacknowledged, sub: "needs review", accent: stats.unacknowledged > 0, color: stats.unacknowledged > 0 ? "text-amber-400" : "text-white" },
            { label: "Escalated", value: stats.escalated, sub: "critical alerts", accent: stats.escalated > 0, color: stats.escalated > 0 ? "text-red-400" : "text-white" },
            { label: "Total", value: stats.total, sub: "all-time gestures", color: "text-white" },
          ].map((stat, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
              className="dashboard-card p-4"
            >
              <div className="text-[10px] text-slate-500 uppercase tracking-wider font-medium mb-1">{stat.label}</div>
              <div className={`text-xl font-bold ${stat.accent ? stat.color : stat.color}`}>{stat.value}</div>
              <div className="text-[10px] text-slate-500 mt-0.5">{stat.sub}</div>
            </motion.div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <div className="lg:col-span-2 space-y-6">
            <div className="flex items-center justify-between">
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
                <div className="text-center py-16">
                  <Bell className="w-12 h-12 text-slate-700 mx-auto mb-4" />
                  <p className="text-slate-500 font-medium">No gestures recorded yet</p>
                  <p className="text-slate-600 text-xs mt-1">Gestures from paired devices will appear here in real time.</p>
                </div>
              ) : (
                <div className="divide-y divide-white/5 max-h-96 overflow-y-auto">
                  {filteredLog.map((entry, i) => {
                    const badge = GESTURE_BADGES[entry.gesture] ?? GESTURE_BADGES.HELP;
                    const typeCfg = TYPE_CONFIG[entry.type] ?? TYPE_CONFIG.hand;
                    const Icon = typeCfg.icon;
                    const isCritical = entry.gesture === "HELP" || entry.gesture === "EMERGENCY" || entry.isEscalated;
                    return (
                      <motion.div key={entry.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: Math.min(i * 0.02, 0.5) }}
                        className={`flex items-center gap-4 px-6 py-4 transition-all duration-200 ${
                          isCritical && !entry.acknowledged ? "bg-red-500/5 border-l-2 border-l-red-500" :
                          !entry.acknowledged ? "bg-indigo-500/5 border-l-2 border-l-indigo-500" : "hover:bg-white/5"
                        }`}
                      >
                        <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center flex-shrink-0">
                          <Icon className="w-5 h-5 text-slate-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`font-bold text-sm ${isCritical ? "text-red-400" : badge.text}`}>{entry.gesture}</span>
                            <span className={`px-2 py-0.5 rounded ${badge.bg} ${badge.text} text-xs font-medium`}>{badge.label}</span>
                            <span className="px-2 py-0.5 rounded bg-white/5 text-slate-500 text-xs">{entry.type}</span>
                            {entry.isEscalated && <span className="px-2 py-0.5 rounded bg-red-500/20 text-red-400 text-xs font-bold">ESCALATED</span>}
                            {!entry.acknowledged && <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />}
                          </div>
                          <div className="text-xs text-slate-500 mt-0.5 truncate">{formatDescription(entry)}</div>
                          <div className="text-xs text-slate-600 mt-0.5">{formatTime(entry.timestamp)}</div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {!entry.acknowledged && (
                            <button onClick={() => handleAcknowledge(entry.id)}
                              className="p-2 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 transition-all duration-200" title="Acknowledge"
                            ><CheckCircle className="w-4 h-4" /></button>
                          )}
                          {entry.acknowledged && !entry.escalated && !entry.resolved && (
                            <button onClick={() => handleEscalate(entry.id)}
                              className="p-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-all duration-200" title="Escalate"
                            ><ArrowUpCircle className="w-4 h-4" /></button>
                          )}
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </motion.div>
          </div>

          <div className="space-y-6">
            <PatientMetricsCard metrics={Object.values(remoteMetrics)[0] || null} />
            <ClinicianActions
              entries={entriesForActions}
              onAcknowledge={handleAcknowledge}
              onEscalate={handleEscalate}
              onResolve={handleResolve}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            className="dashboard-card p-5"
          >
            <div className="flex items-center gap-2 mb-3">
              <Monitor className="w-4 h-4 text-indigo-400" />
              <h3 className="text-sm font-semibold text-white">Monitoring Devices</h3>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">📷 Camera (Webcam)</span>
                <span className="text-emerald-400 font-medium">Active</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">📡 Wearable Sensor</span>
                <span className="text-amber-400 font-medium">Simulated</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">☁️ Cloud Sync</span>
                <span className="text-emerald-400 font-medium">Active</span>
              </div>
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
            className="dashboard-card p-5"
          >
            <div className="flex items-center gap-2 mb-3">
              <Shield className="w-4 h-4 text-indigo-400" />
              <h3 className="text-sm font-semibold text-white">Privacy & Security</h3>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">🔒 End-to-End Encrypted</span>
                <span className="text-emerald-400 font-medium">Active</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">👁️ No Video Upload</span>
                <span className="text-emerald-400 font-medium">Guaranteed</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">📊 Local Processing</span>
                <span className="text-emerald-400 font-medium">100% Client-Side</span>
              </div>
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
            className="dashboard-card p-5"
          >
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="w-4 h-4 text-indigo-400" />
              <h3 className="text-sm font-semibold text-white">Escalation Rules</h3>
            </div>
            <div className="space-y-2">
              {ESCALATION_RULES.map((rule) => (
                <div key={rule.type} className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">
                    {rule.type === "help_frequency" ? "3+ HELP in 2 min" :
                     rule.type === "low_alertness" ? "Alertness < 25%" :
                     "Inactivity > 60s"}
                  </span>
                  <span className="text-slate-500 font-medium">Auto</span>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
