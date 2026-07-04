"use client";

import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, Clock, Eye, Hand, CheckCircle, Filter, Activity, Monitor, AlertTriangle, Wifi, Smartphone, Shield, ArrowUpCircle } from "lucide-react";
import { loadGestureLog, subscribeToGestureUpdates, acknowledgeEntry as acknowledgeLocal } from "@/lib/gestureLog";
import { GestureLogEntry, ESCALATION_RULES, PatientMetrics } from "@/types";
import { createNetworkSync, NetworkSync } from "@/lib/networkSync";
import { getSession, setSessionId } from "@/lib/session";
import PatientMetricsCard from "@/components/PatientMetricsCard";
import ClinicianActions from "@/components/ClinicianActions";

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

export default function NurseViewPage() {
  const [log, setLog] = useState<GestureLogEntry[]>([]);
  const [latest, setLatest] = useState<GestureLogEntry | null>(null);
  const [filter, setFilter] = useState<"all" | "hand" | "eye" | "unacknowledged">("all");
  const [sessionInput, setSessionInput] = useState("");
  const [paired, setPaired] = useState(false);
  const [remoteMetrics, setRemoteMetrics] = useState<Record<string, PatientMetrics>>({});
  const [connectionStatus, setConnectionStatus] = useState<"connected" | "reconnecting" | "disconnected">("disconnected");
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);
  const [now, setNow] = useState(Date.now());
  const syncRef = useRef<NetworkSync | null>(null);
  const autoPaidRef = useRef(false);

  const entriesForActions = useMemo(() =>
    log.filter((e) => e.gesture === "HELP" || e.gesture === "EMERGENCY" || (e.patientMetrics?.alertnessScore != null && e.patientMetrics.alertnessScore < 25) || log.length < 10),
  [log]);

  const createSync = useCallback((sessionId?: string) => {
    if (syncRef.current) syncRef.current.destroy();
    const sync = createNetworkSync({
      sessionId,
      onAlert: (entry) => {
        setLog((prev) => {
          if (prev.some((e) => e.id === entry.id)) return prev;
          return [entry, ...prev];
        });
        setLatest(entry);
        setLastUpdated(Date.now());
      },
      onMetrics: (metrics) => {
        setRemoteMetrics((prev) => ({ ...prev, ...metrics }));
        setLastUpdated(Date.now());
      },
      onStatusChange: (status) => setConnectionStatus(status),
    });
    syncRef.current = sync;
    return sync;
  }, []);

  useEffect(() => {
    const entries = loadGestureLog();
    setLog(entries);
    setLatest(entries[0] ?? null);
    if (entries.length > 0) setLastUpdated(entries[0].timestamp);

    let sessionId: string | undefined;
    const existing = getSession();
    if (existing?.sessionId) {
      sessionId = existing.sessionId;
      setPaired(true);
    }

    const params = new URLSearchParams(window.location.search);
    const urlSession = params.get("session");
    if (urlSession && urlSession.length >= 3 && !autoPaidRef.current) {
      autoPaidRef.current = true;
      sessionId = urlSession.toUpperCase();
      setSessionId(sessionId);
      setSessionInput(sessionId);
      setPaired(true);
    }

    const sync = createSync(sessionId);
    syncRef.current = sync;

    const unsub = subscribeToGestureUpdates(
      (entry) => {
        setLog((prev) => {
          if (prev.some((e) => e.id === entry.id)) return prev;
          return [entry, ...prev];
        });
        setLatest(entry);
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
  }, [createSync]);

  const handlePairSession = useCallback(() => {
    const id = sessionInput.trim().toUpperCase();
    if (id.length < 3) return;
    const session = setSessionId(id);
    setPaired(true);
    createSync(session.sessionId);
  }, [sessionInput, createSync]);

  const handleAcknowledge = useCallback((id: string) => {
    acknowledgeLocal(id);
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

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

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
    <div className="min-h-screen pt-20 pb-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#c63a22]/5 border border-[#c63a22]/15 text-[#c63a22] text-sm font-medium mb-4">
                <Bell className="w-4 h-4" />
                Clinician Console
              </div>
              <h1 className="text-3xl sm:text-4xl font-bold text-[#1f1f1f] tracking-tight">Patient Communication Monitor</h1>
              <p className="mt-2 text-[#6e6e6e]">Live feed of all patient gestures with remote monitoring and escalation.</p>
            </div>
          </div>
        </motion.div>

        {!paired && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            className="mb-8 p-5 rounded-2xl bg-[#c63a22]/5 border border-[#c63a22]/15"
          >
            <div className="flex items-center gap-3 mb-3">
              <Smartphone className="w-5 h-5 text-[#c63a22]" />
              <h3 className="font-semibold text-[#1f1f1f] text-sm">Pair with Patient Device</h3>
            </div>
            <p className="text-xs text-[#6e6e6e] mb-3">
              Enter the Session ID shown on the patient&apos;s device to start receiving remote alerts.
            </p>
            <div className="flex gap-2">
              <input
                type="text"
                value={sessionInput}
                onChange={(e) => setSessionInput(e.target.value.toUpperCase().slice(0, 6))}
                placeholder="Enter Session ID (e.g., ABC123)"
                className="input flex-1 font-mono tracking-widest uppercase"
                maxLength={6}
              />
              <button onClick={handlePairSession} disabled={sessionInput.length < 3}
                className="btn-primary px-5 py-2.5 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Connect
              </button>
            </div>
          </motion.div>
        )}

        {paired && (
          <div className={`mb-6 flex items-center gap-3 px-4 py-2 rounded-xl border text-xs font-medium w-fit transition-colors duration-300 ${
            connectionStatus === "connected"
              ? "bg-[#ecfdf5] border-[#a7f3d0] text-[#22a67e]"
              : connectionStatus === "reconnecting"
              ? "bg-[#fffbeb] border-[#fde68a] text-[#e8993e]"
              : "bg-[#fef2f2] border-[#fecaca] text-[#d94a4a]"
          }`}>
            <span className="relative flex w-2.5 h-2.5">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                connectionStatus === "connected" ? "bg-[#22a67e]" : connectionStatus === "reconnecting" ? "bg-[#e8993e]" : "bg-[#d94a4a]"
              }`} />
              <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${
                connectionStatus === "connected" ? "bg-[#22a67e]" : connectionStatus === "reconnecting" ? "bg-[#e8993e]" : "bg-[#d94a4a]"
              }`} />
            </span>
            {connectionStatus === "connected" ? "Live" : connectionStatus === "reconnecting" ? "Reconnecting..." : "Disconnected"}
            {lastUpdated && connectionStatus === "connected" ? ` · ${Math.max(0, Math.floor((now - lastUpdated) / 1000))}s ago` : ""}
          </div>
        )}

        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
          {[
            { label: "Latest", value: latest?.gesture || "\u2014", sub: latest ? formatTime(latest.timestamp) : "No alerts" },
            { label: "Today", value: stats.today, sub: "gestures recorded" },
            { label: "Pending", value: stats.unacknowledged, sub: "needs review", accent: stats.unacknowledged > 0 },
            { label: "Escalated", value: stats.escalated, sub: "critical alerts", accent: stats.escalated > 0 },
            { label: "Total", value: stats.total, sub: "all-time gestures" },
          ].map((stat, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
              className="card p-4"
            >
              <div className="text-[10px] text-[#6e6e6e] uppercase tracking-wider font-medium mb-1">{stat.label}</div>
              <div className={`text-xl font-bold ${stat.accent ? "text-[#e8993e]" : "text-[#1f1f1f]"}`}>{stat.value}</div>
              <div className="text-[10px] text-[#6e6e6e] mt-0.5">{stat.sub}</div>
            </motion.div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <div className="lg:col-span-2 space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-[#6e6e6e]" />
                {(["all", "unacknowledged", "hand", "eye"] as const).map((f) => (
                  <button key={f} onClick={() => setFilter(f)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 ${
                      filter === f ? "bg-[#c63a22]/10 text-[#c63a22] border border-[#c63a22]/20" : "text-[#6e6e6e] hover:text-[#1f1f1f] border border-transparent"
                    }`}
                  >
                    {f === "all" ? "All" : f === "unacknowledged" ? "Unread" : f === "hand" ? "Hand" : "Eye"}
                  </button>
                ))}
              </div>
              <div className="text-xs text-[#6e6e6e]">{filteredLog.length} of {log.length} entries</div>
            </div>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
              className="rounded-3xl border border-[#ececec] overflow-hidden bg-white"
            >
              {filteredLog.length === 0 ? (
                <div className="text-center py-16">
                  <Bell className="w-12 h-12 text-[#d5d5d5] mx-auto mb-4" />
                  <p className="text-[#6e6e6e] font-medium">No gestures recorded yet</p>
                  <p className="text-[#9ca3af] text-xs mt-1">Gestures from paired devices will appear here in real time.</p>
                </div>
              ) : (
                <div className="divide-y divide-[#ececec] max-h-96 overflow-y-auto">
                  {filteredLog.map((entry, i) => {
                    const badge = GESTURE_BADGES[entry.gesture] ?? GESTURE_BADGES.HELP;
                    const typeCfg = TYPE_CONFIG[entry.type] ?? TYPE_CONFIG.hand;
                    const Icon = typeCfg.icon;
                    const isCritical = entry.gesture === "HELP" || entry.gesture === "EMERGENCY" || entry.isEscalated;
                    return (
                      <motion.div key={entry.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0 }}
                        className={`flex items-center gap-4 px-6 py-4 transition-all duration-200 ${
                          isCritical && !entry.acknowledged ? "bg-[#fef2f2] border-l-2 border-l-[#d94a4a]" :
                          !entry.acknowledged ? "bg-[#fdf4f0] border-l-2 border-l-[#c63a22]" : "hover:bg-[#f5f3f0]"
                        }`}
                      >
                        <div className="w-10 h-10 rounded-xl bg-[#f5f3f0] flex items-center justify-center flex-shrink-0">
                          <Icon className="w-5 h-5 text-[#6e6e6e]" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`font-bold text-sm ${isCritical ? "text-[#d94a4a]" : badge.text}`}>{entry.gesture}</span>
                            <span className={`px-2 py-0.5 rounded text-xs font-medium ${badge.bg} ${badge.text}`}>{badge.label}</span>
                            <span className="px-2 py-0.5 rounded bg-[#f5f3f0] text-[#6e6e6e] text-xs">{entry.type}</span>
                            {entry.isEscalated && <span className="px-2 py-0.5 rounded bg-[#fef2f2] text-[#d94a4a] text-xs font-bold border border-[#fecaca]">ESCALATED</span>}
                            {!entry.acknowledged && <span className="w-2 h-2 rounded-full status-active" />}
                          </div>
                          <div className="text-xs text-[#6e6e6e] mt-0.5 truncate">{formatDescription(entry)}</div>
                          <div className="text-xs text-[#9ca3af] mt-0.5">{formatTime(entry.timestamp)}</div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {!entry.acknowledged && (
                            <button onClick={() => handleAcknowledge(entry.id)}
                              className="p-2 rounded-lg bg-[#ecfdf5] hover:bg-[#d1fae5] text-[#22a67e] transition-all duration-200" title="Acknowledge"
                            ><CheckCircle className="w-4 h-4" /></button>
                          )}
                          {entry.acknowledged && !entry.escalated && !entry.resolved && (
                            <button onClick={() => handleEscalate(entry.id)}
                              className="p-2 rounded-lg bg-[#fef2f2] hover:bg-[#fee2e2] text-[#d94a4a] transition-all duration-200" title="Escalate"
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
            className="card p-5"
          >
            <div className="flex items-center gap-2 mb-3">
              <Monitor className="w-4 h-4 text-[#c63a22]" />
              <h3 className="text-sm font-semibold text-[#1f1f1f]">Monitoring Devices</h3>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-[#6e6e6e]">📷 Camera (Webcam)</span>
                <span className="badge-success px-2 py-0.5 rounded text-[10px] font-medium">Active</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-[#6e6e6e]">📡 Wearable Sensor</span>
                <span className="badge-warning px-2 py-0.5 rounded text-[10px] font-medium">Simulated</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-[#6e6e6e]">☁️ Cloud Sync</span>
                <span className="badge-success px-2 py-0.5 rounded text-[10px] font-medium">Active</span>
              </div>
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
            className="card p-5"
          >
            <div className="flex items-center gap-2 mb-3">
              <Shield className="w-4 h-4 text-[#c63a22]" />
              <h3 className="text-sm font-semibold text-[#1f1f1f]">Privacy & Security</h3>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-[#6e6e6e]">🔒 End-to-End Encrypted</span>
                <span className="badge-success px-2 py-0.5 rounded text-[10px] font-medium">Active</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-[#6e6e6e]">👁️ No Video Upload</span>
                <span className="badge-success px-2 py-0.5 rounded text-[10px] font-medium">Guaranteed</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-[#6e6e6e]">📊 Local Processing</span>
                <span className="badge-success px-2 py-0.5 rounded text-[10px] font-medium">100% Client-Side</span>
              </div>
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
            className="card p-5"
          >
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="w-4 h-4 text-[#c63a22]" />
              <h3 className="text-sm font-semibold text-[#1f1f1f]">Escalation Rules</h3>
            </div>
            <div className="space-y-2">
              {ESCALATION_RULES.map((rule) => (
                <div key={rule.type} className="flex items-center justify-between text-xs">
                  <span className="text-[#6e6e6e]">
                    {rule.type === "help_frequency" ? "3+ HELP in 2 min" :
                     rule.type === "low_alertness" ? "Alertness < 25%" :
                     "Inactivity > 60s"}
                  </span>
                  <span className="text-[#9ca3af] font-medium">Auto</span>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
