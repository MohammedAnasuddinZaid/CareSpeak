import type { Metadata } from "next";
import "@/app/globals.css";
import Navbar from "@/components/Navbar";
import ServiceWorkerRegister from "@/components/ServiceWorkerRegister";

export const metadata: Metadata = {
  title: "CareSpeak AI — Giving Every Patient a Voice",
  description:
    "AI-powered communication for patients who cannot speak or move easily. Use hand gestures or eye movements to express needs — instantly converted to text and speech.",
  other: {
    "theme-color": "#0f172a",
    "apple-mobile-web-app-capable": "yes",
    "apple-mobile-web-app-status-bar-style": "black-translucent",
    "apple-mobile-web-app-title": "CareSpeak AI",
    "mobile-web-app-capable": "yes",
    "application-name": "CareSpeak AI",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap"
          rel="stylesheet"
        />
        <link rel="manifest" href="/manifest.json" />
      </head>
      <body className="min-h-screen bg-slate-950 text-white antialiased">
        <ServiceWorkerRegister />
        <Navbar />
        <main className="min-h-screen">{children}</main>
        <footer className="border-t border-white/5 bg-slate-950 py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-10">
              <div className="md:col-span-2">
                <div className="flex items-center gap-2.5 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
                    <span className="text-white font-extrabold text-sm tracking-tight">CS</span>
                  </div>
                  <span className="font-bold text-lg text-white">CareSpeak</span>
                  <span className="text-indigo-400 font-bold text-lg">AI</span>
                </div>
                <p className="text-slate-400 text-sm leading-relaxed max-w-md">
                  Turning any laptop into an assistive communication device. 
                  On-device AI translates hand gestures and eye movements into speech — 
                  no servers, no setup, no expensive hardware.
                </p>
              </div>
              <div>
                <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-widest mb-4">Product</h4>
                <div className="space-y-3">
                  {[
                    { href: "/hand-mode", label: "Hand Mode" },
                    { href: "/eye-mode", label: "Eye Mode" },
                    { href: "/nurse-view", label: "Nurse Dashboard" },
                    { href: "/emergency", label: "Emergency" },
                  ].map((link) => (
                    <a key={link.href} href={link.href}
                      className="block text-sm text-slate-500 hover:text-indigo-400 transition-colors"
                    >{link.label}</a>
                  ))}
                </div>
              </div>
              <div>
                <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-widest mb-4">Resources</h4>
                <div className="space-y-3">
                  {[
                    { href: "/about", label: "About" },
                    { href: "/logs", label: "Gesture Logs" },
                  ].map((link) => (
                    <a key={link.href} href={link.href}
                      className="block text-sm text-slate-500 hover:text-indigo-400 transition-colors"
                    >{link.label}</a>
                  ))}
                </div>
              </div>
            </div>
            <div className="mt-12 pt-8 border-t border-white/5 flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="text-sm text-slate-600">
                © {new Date().getFullYear()} CareSpeak AI. Giving every patient a voice.
              </div>
              <div className="flex items-center gap-4 text-xs text-slate-600">
                <span>100% on-device · no data leaves your browser</span>
                <span>Free & open source</span>
              </div>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
