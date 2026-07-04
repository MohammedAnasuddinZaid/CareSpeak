"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, Menu, X, Hand, Eye, Activity, FileText, Info, AlertTriangle } from "lucide-react";
import { SUPPORTED_LANGUAGES, SupportedLanguage } from "@/types";
import { voiceAlert } from "@/lib/tts";

const NAV_LINKS = [
  { href: "/hand-mode", label: "Hand Mode", icon: Hand },
  { href: "/eye-mode", label: "Eye Mode", icon: Eye },
  { href: "/nurse-view", label: "Nurse", icon: Activity },
  { href: "/logs", label: "Logs", icon: FileText },
  { href: "/about", label: "About", icon: Info },
  { href: "/emergency", label: "Emergency", icon: AlertTriangle, highlight: true },
];

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const [langOpen, setLangOpen] = useState(false);
  const pathname = usePathname();
  const currentLang = voiceAlert.getLanguage();
  const currentLangInfo = SUPPORTED_LANGUAGES[currentLang];

  const handleLanguageChange = (lang: SupportedLanguage) => {
    voiceAlert.setLanguage(lang);
    setLangOpen(false);
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 nav-blur">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <a href="/" className="flex items-center gap-2.5 shrink-0 group">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20 group-hover:shadow-indigo-500/40 transition-all duration-300">
              <span className="text-white font-extrabold text-sm tracking-tight">CS</span>
            </div>
            <div className="hidden sm:block">
              <span className="font-bold text-white text-lg tracking-tight">CareSpeak</span>
              <span className="text-indigo-400 font-bold text-lg"> AI</span>
            </div>
          </a>

          <div className="hidden lg:flex items-center gap-1">
            {NAV_LINKS.map((link) => {
              const Icon = link.icon;
              const isActive = pathname === link.href;
              return (
                <a key={link.href} href={link.href}
                  className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
                    isActive
                      ? link.highlight
                        ? "bg-red-500/15 text-red-400"
                        : "bg-indigo-500/15 text-indigo-400"
                      : link.highlight
                      ? "text-slate-400 hover:text-red-400 hover:bg-red-500/10"
                      : "text-slate-400 hover:text-white hover:bg-white/5"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {link.label}
                </a>
              );
            })}
          </div>

          <div className="flex items-center gap-2">
            <div className="relative">
              <button
                onClick={() => setLangOpen(!langOpen)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm text-slate-400 hover:text-white hover:bg-white/5 transition-all duration-200"
              >
                <span className="text-sm">{currentLangInfo.native}</span>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${langOpen ? "rotate-180" : ""}`} />
              </button>
              <AnimatePresence>
                {langOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -8, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -8, scale: 0.96 }}
                    className="absolute right-0 top-full mt-2 w-48 rounded-2xl bg-slate-900 border border-white/10 shadow-xl shadow-black/50 py-2 z-50"
                  >
                    {(Object.entries(SUPPORTED_LANGUAGES) as [SupportedLanguage, { label: string; native: string }][]).map(([code, info]) => (
                      <button key={code} onClick={() => handleLanguageChange(code)}
                        className={`w-full text-left px-4 py-2.5 text-sm transition-colors flex items-center gap-2 ${
                          currentLang === code ? "text-indigo-400 bg-indigo-500/10 font-medium" : "text-slate-400 hover:text-white hover:bg-white/5"
                        }`}
                      >
                        <span>{info.native}</span>
                        <span className="text-slate-600 text-xs">{info.label}</span>
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <button
              onClick={() => setOpen(!open)}
              className="lg:hidden p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition-all duration-200"
            >
              {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="lg:hidden border-t border-white/5 bg-slate-950"
          >
            <div className="px-4 py-3 space-y-1">
              {NAV_LINKS.map((link) => {
                const Icon = link.icon;
                const isActive = pathname === link.href;
                return (
                  <a key={link.href} href={link.href} onClick={() => setOpen(false)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${
                      isActive
                        ? link.highlight ? "bg-red-500/15 text-red-400" : "bg-indigo-500/15 text-indigo-400"
                        : "text-slate-400 hover:text-white hover:bg-white/5"
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {link.label}
                  </a>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
