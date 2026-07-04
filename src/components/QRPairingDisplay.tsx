"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { QrCode, Copy, Link, Check, Smartphone } from "lucide-react";
import { getNurseDashboardUrl } from "@/lib/session";
import QRCode from "qrcode";

interface QRPairingDisplayProps {
  sessionId: string;
  compact?: boolean;
}

export default function QRPairingDisplay({ sessionId, compact = false }: QRPairingDisplayProps) {
  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  const [copied, setCopied] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const url = getNurseDashboardUrl(sessionId);
    if (url) {
      QRCode.toDataURL(url, {
        width: compact ? 160 : 280,
        margin: 1,
        color: { dark: "#ffffff", light: "#0f172a" },
      }).then(setQrDataUrl).catch(() => {});
    }
  }, [sessionId, compact]);

  const handleCopy = async () => {
    const url = getNurseDashboardUrl(sessionId);
    if (url) {
      try {
        await navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch {}
    }
  };

  if (compact) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-slate-800/50 rounded-2xl border border-white/10 p-4"
      >
        <div className="flex items-center gap-3">
          <div className="shrink-0">
            {qrDataUrl ? (
              <img src={qrDataUrl} alt="Pairing QR" className="w-16 h-16 rounded-lg" />
            ) : (
              <canvas ref={canvasRef} className="w-16 h-16 rounded-lg bg-slate-900" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs text-slate-400 mb-1">Session</p>
            <p className="text-lg font-bold text-white tracking-widest font-mono">{sessionId}</p>
          </div>
          <button
            onClick={handleCopy}
            className="p-2 rounded-xl bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-400 transition-all shrink-0"
          >
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
          </button>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-slate-800/50 rounded-2xl border border-white/10 p-6"
    >
      <div className="flex items-center gap-2 mb-4">
        <QrCode className="w-5 h-5 text-indigo-400" />
        <h3 className="font-semibold text-white">Pair Remote Nurse Console</h3>
      </div>
      <p className="text-sm text-slate-400 mb-4">
        Scan this QR code with a device to open the nurse monitoring dashboard.
      </p>
      <div className="flex flex-col items-center gap-4">
        <div className="bg-slate-900 rounded-2xl p-4 border border-white/10">
          {qrDataUrl ? (
            <img src={qrDataUrl} alt="Pairing QR Code" className="w-44 h-44" />
          ) : (
            <div className="w-44 h-44 bg-slate-800 rounded-xl animate-pulse flex items-center justify-center">
              <QrCode className="w-12 h-12 text-slate-600" />
            </div>
          )}
        </div>
        <div className="text-center">
          <p className="text-xs text-slate-500 mb-1">Session ID</p>
          <p className="text-2xl font-bold text-white tracking-[0.3em] font-mono">{sessionId}</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleCopy}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-400 text-sm font-medium transition-all"
          >
            {copied ? (
              <><Check className="w-4 h-4" /> Copied!</>
            ) : (
              <><Link className="w-4 h-4" /> Copy Dashboard URL</>
            )}
          </button>
        </div>
      </div>
      <div className="mt-4 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-start gap-2">
        <Smartphone className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
        <p className="text-xs text-amber-300/80">
          Open the nurse dashboard on another device and enter this Session ID to pair.
        </p>
      </div>
    </motion.div>
  );
}
