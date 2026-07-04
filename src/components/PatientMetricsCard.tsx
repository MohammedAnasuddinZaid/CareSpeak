"use client";

import { motion } from "framer-motion";
import { Eye, Activity, BarChart3, Clock, AlertTriangle } from "lucide-react";
import { PatientMetrics } from "@/types";

interface PatientMetricsCardProps {
  metrics: PatientMetrics | null;
  deviceName?: string;
}

export default function PatientMetricsCard({ metrics, deviceName = "Patient Device" }: PatientMetricsCardProps) {
  if (!metrics) {
    return (
      <div className="bg-slate-800/30 rounded-2xl border border-white/5 p-5">
        <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
          <Activity className="w-4 h-4 text-indigo-400" />
          Patient Wellness
        </h3>
        <div className="flex items-center justify-center h-24 text-slate-600 text-sm">
          Waiting for metrics...
        </div>
      </div>
    );
  }

  const metricsList = [
    { label: "Blink Rate", value: metrics.blinkRate != null ? `${metrics.blinkRate.toFixed(1)}/min` : "—", icon: Eye, color: "text-cyan-400", bg: "bg-cyan-500/10" },
    { label: "Alertness", value: metrics.alertnessScore != null ? `${Math.round(metrics.alertnessScore)}%` : "—", icon: BarChart3, color: metrics.alertnessScore != null && metrics.alertnessScore < 25 ? "text-red-400" : "text-emerald-400", bg: metrics.alertnessScore != null && metrics.alertnessScore < 25 ? "bg-red-500/10" : "bg-emerald-500/10" },
    { label: "Eye Closure", value: metrics.eyeClosureDuration != null ? `${(metrics.eyeClosureDuration / 1000).toFixed(1)}s` : "—", icon: Clock, color: "text-violet-400", bg: "bg-violet-500/10" },
    { label: "Movement", value: metrics.movementActivity != null ? `${Math.round(metrics.movementActivity * 100)}%` : "—", icon: Activity, color: "text-amber-400", bg: "bg-amber-500/10" },
  ];

  const isLowAlertness = metrics.alertnessScore != null && metrics.alertnessScore < 25;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-slate-800/30 rounded-2xl border border-white/5 p-5"
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-white flex items-center gap-2">
          <Activity className="w-4 h-4 text-indigo-400" />
          Patient Wellness
        </h3>
        <span className="text-[10px] text-slate-600">{deviceName}</span>
      </div>

      {isLowAlertness && (
        <motion.div
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          className="mb-3 p-2 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center gap-2"
        >
          <AlertTriangle className="w-3.5 h-3.5 text-red-400 shrink-0" />
          <span className="text-xs text-red-300">Low alertness detected</span>
        </motion.div>
      )}

      <div className="grid grid-cols-2 gap-3">
        {metricsList.map((m) => {
          const Icon = m.icon;
          return (
            <div key={m.label} className={`rounded-xl ${m.bg} p-3`}>
              <div className="flex items-center gap-1.5 mb-1.5">
                <Icon className={`w-3.5 h-3.5 ${m.color}`} />
                <span className="text-[10px] text-slate-500 uppercase tracking-wider">{m.label}</span>
              </div>
              <p className={`text-lg font-bold ${m.color}`}>{m.value}</p>
            </div>
          );
        })}
      </div>

      {metrics.lastSeen && (
        <p className="text-[10px] text-slate-600 mt-3 text-right">
          Last updated: {new Date(metrics.lastSeen).toLocaleTimeString()}
        </p>
      )}
    </motion.div>
  );
}
