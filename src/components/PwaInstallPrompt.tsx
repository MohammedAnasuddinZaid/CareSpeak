"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Download, X } from "lucide-react";

export default function PwaInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [show, setShow] = useState(false);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      const dismissed = sessionStorage.getItem("pwa_install_dismissed");
      if (!dismissed) {
        setTimeout(() => setShow(true), 2000);
      }
    };

    const handleInstalled = () => {
      setInstalled(true);
      setShow(false);
      setDeferredPrompt(null);
      sessionStorage.setItem("pwa_install_dismissed", "true");
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstall);
    window.addEventListener("appinstalled", handleInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
      window.removeEventListener("appinstalled", handleInstalled);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const result = await deferredPrompt.userChoice;
    if (result.outcome === "accepted") {
      setInstalled(true);
    }
    setDeferredPrompt(null);
    setShow(false);
    sessionStorage.setItem("pwa_install_dismissed", "true");
  };

  const handleDismiss = () => {
    setShow(false);
    sessionStorage.setItem("pwa_install_dismissed", "true");
  };

  if (typeof window === "undefined") return null;

  const isStandalone = window.matchMedia("(display-mode: standalone)").matches;
  if (isStandalone || installed) return null;

  return (
    <AnimatePresence>
      {show && deferredPrompt && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 25 }}
          className="fixed bottom-6 left-4 right-4 z-[100] max-w-md mx-auto"
        >
          <div className="relative bg-white rounded-2xl shadow-2xl border border-[#ececec] p-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-[#c63a22]/10 flex items-center justify-center flex-shrink-0">
              <Download className="w-6 h-6 text-[#c63a22]" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-[#1f1f1f]">Install CareSpeak</p>
              <p className="text-xs text-[#6e6e6e]">Get the best experience with offline support</p>
            </div>
            <button onClick={handleInstall}
              className="px-4 py-2 rounded-xl bg-[#c63a22] text-white text-sm font-semibold hover:bg-[#a32e1a] transition-colors flex-shrink-0"
            >
              Install
            </button>
            <button onClick={handleDismiss}
              className="p-1.5 rounded-lg hover:bg-[#f5f3f0] transition-colors flex-shrink-0"
              aria-label="Dismiss"
            >
              <X className="w-4 h-4 text-[#6e6e6e]" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
