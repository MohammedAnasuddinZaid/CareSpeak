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
      <div className="card p-5">
        <h3 className="text-sm font-semibold text-[#1f1f1f] mb-3 flex items-center gap-2">
          <Activity className="w-4 h-4 text-[#c63a22]" />
          Patient Wellness
        </h3>
        <div className="flex items-center justify-center h-24 text-[#6e6e6e] text-sm">
          Waiting for metrics...
        </div>
      </div>
    );
  }

  const metricsList = [
    { label: "Blink Rate", value: metrics.blinkRate != null ? `${metrics.blinkRate.toFixed(1)}/min` : "\u2014", icon: Eye, color: "text-[#22a67e]", bg: "bg-[#ecfdf5]" },
    { label: "Alertness", value: metrics.alertnessScore != null ? `${Math.round(metrics.alertnessScore)}%` : "\u2014", icon: BarChart3, color: metrics.alertnessScore != null && metrics.alertnessScore < 25 ? "text-[#d94a4a]" : "text-[#22a67e]", bg: metrics.alertnessScore != null && metrics.alertnessScore < 25 ? "bg-[#fef2f2]" : "bg-[#ecfdf5]" },
    { label: "Eye Closure", value: metrics.eyeClosureDuration != null ? `${(metrics.eyeClosureDuration / 1000).toFixed(1)}s` : "\u2014", icon: Clock, color: "text-[#e8993e]", bg: "bg-[#fffbeb]" },
    { label: "Movement", value: metrics.movementActivity != null ? `${Math.round(metrics.movementActivity * 100)}%` : "\u2014", icon: Activity, color: "text-[#3b82f6]", bg: "bg-[#eff6ff]" },
  ];

  const isLowAlertness = metrics.alertnessScore != null && metrics.alertnessScore < 25;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="card p-5"
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-[#1f1f1f] flex items-center gap-2">
          <Activity className="w-4 h-4 text-[#c63a22]" />
          Patient Wellness
        </h3>
        <span className="text-[10px] text-[#6e6e6e]">{deviceName}</span>
      </div>

      {isLowAlertness && (
        <motion.div
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          className="mb-3 p-2 rounded-lg bg-[#fef2f2] border border-[#fecaca] flex items-center gap-2"
        >
          <AlertTriangle className="w-3.5 h-3.5 text-[#d94a4a] shrink-0" />
          <span className="text-xs text-[#d94a4a]">Low alertness detected</span>
        </motion.div>
      )}

      <div className="grid grid-cols-2 gap-3">
        {metricsList.map((m) => {
          const Icon = m.icon;
          return (
            <div key={m.label} className={`rounded-xl ${m.bg} p-3`}>
              <div className="flex items-center gap-1.5 mb-1.5">
                <Icon className={`w-3.5 h-3.5 ${m.color}`} />
                <span className="text-[10px] text-[#6e6e6e] uppercase tracking-wider">{m.label}</span>
              </div>
              <p className={`text-lg font-bold ${m.color}`}>{m.value}</p>
            </div>
          );
        })}
      </div>

      {metrics.lastSeen && (
        <p className="text-[10px] text-[#9ca3af] mt-3 text-right">
          Last updated: {new Date(metrics.lastSeen).toLocaleTimeString()}
        </p>
      )}
    </motion.div>
  );
}
