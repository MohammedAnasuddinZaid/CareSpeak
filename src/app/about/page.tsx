"use client";

import { motion } from "framer-motion";
import { ShieldCheck, Zap, Globe, Heart, Cpu, Sparkles, Activity, Eye, Volume2, Server, Lock, Languages } from "lucide-react";

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.7, ease: [0.16, 1, 0.3, 1] as const } },
};

const TECH_STACK = [
  { name: "Next.js 15", desc: "App Router, React 19, TypeScript 5.8 — modern full-stack framework", icon: Cpu },
  { name: "MediaPipe", desc: "Google's on-device ML — hand & face landmark detection via WebAssembly at 30+ FPS", icon: Activity },
  { name: "Web Speech API", desc: "Browser-native text-to-speech in 8 languages with queue management", icon: Volume2 },
  { name: "Web Audio API", desc: "Synthesized alert tones using OscillatorNode for each gesture type", icon: Zap },
  { name: "Tailwind CSS 4", desc: "Utility-first styling with custom dark theme and animations", icon: Sparkles },
  { name: "BroadcastChannel", desc: "Cross-tab real-time synchronization for multi-screen setups", icon: Server },
];

const ACCURACY_FEATURES = [
  "Temporal smoothing: 12-frame window with 75% majority vote filters random noise",
  "Hold-time ramp: 800ms required for full confidence — prevents momentary movements from triggering",
  "Resting-state debounce: auto-raises threshold after 5+ rapid transitions in 10 seconds",
  "Multi-language TTS: 8 languages with proper voice selection and fallback",
  "10-second cooldown prevents repeated same-gesture alert spam",
  "Emergency alert with 10-second countdown and cancel capability",
  "Separate audio alert tones for each gesture type (sine, square, sawtooth, triangle waveforms)",
  "Hysteresis-based blink detection prevents false triggers from tracking noise",
];

const USE_CASES = [
  { title: "ICU & Critical Care", desc: "Intubated patients who cannot speak due to breathing tubes or ventilation", icon: Heart },
  { title: "Post-Surgery Recovery", desc: "Patients emerging from anesthesia with limited mobility and speech", icon: Activity },
  { title: "Stroke Rehabilitation", desc: "Individuals with aphasia or hemiparesis regaining communication", icon: Heart },
  { title: "ALS / MND Care", desc: "Progressive conditions where movement becomes increasingly limited", icon: Activity },
  { title: "Temporary Paralysis", desc: "Patients under neuromuscular blocking agents needing to communicate", icon: Activity },
  { title: "Speech Therapy", desc: "Augmentative and alternative communication during recovery", icon: Heart },
];

const VALUES = [
  { title: "Privacy by Design", desc: "Zero data leaves the device. No servers, no accounts, no tracking. All AI runs locally via WebAssembly.", icon: Lock },
  { title: "Zero Cost", desc: "Free and open source. No subscriptions, no expensive hardware — just a laptop with a webcam.", icon: Zap },
  { title: "Universal Access", desc: "8 languages supported. Works in any modern browser. No installation required.", icon: Languages },
  { title: "Hospital Grade", desc: "Temporal smoothing, hysteresis, debouncing, and cooldown systems ensure reliability in real-world conditions.", icon: ShieldCheck },
];

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-slate-950 pt-20 pb-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-20">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-sm font-medium mb-4">
            <Heart className="w-4 h-4" />
            About CareSpeak AI
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-white tracking-tight mb-4">
            Giving Every Patient{" "}
            <span className="gradient-text">a Voice</span>
          </h1>
          <p className="text-lg text-slate-400 max-w-2xl mx-auto">
            Turning any laptop into an assistive communication device using on-device AI.
            No servers. No expensive hardware. No setup.
          </p>
        </motion.div>

        <motion.section initial="hidden" whileInView="visible" viewport={{ once: true }} className="mb-20">
          <div className="bg-gradient-to-br from-slate-900 to-indigo-950/50 rounded-3xl p-8 md:p-12 border border-white/5">
            <h2 className="text-2xl md:text-3xl font-bold text-white mb-4">The Problem</h2>
            <p className="text-slate-300 text-lg leading-relaxed max-w-3xl">
              Millions of hospitalized patients worldwide cannot communicate basic needs because they are intubated,
              paralyzed, or speech-impaired. A sip of water, a need for help, or a simple yes or no becomes a struggle.
              Nurses and caregivers are stretched thin and cannot always be at the bedside. Existing assistive
              communication devices are expensive, complex, and require significant movement.
            </p>
          </div>
        </motion.section>

        <motion.section initial="hidden" whileInView="visible" viewport={{ once: true }} className="mb-20">
          <div className="bg-gradient-to-br from-indigo-950/50 to-purple-950/30 rounded-3xl p-8 md:p-12 border border-white/5">
            <h2 className="text-2xl md:text-3xl font-bold text-white mb-4">The Solution</h2>
            <p className="text-slate-300 text-lg leading-relaxed max-w-3xl">
              CareSpeak AI turns any laptop with a webcam into an assistive communication device. Using on-device AI
              (MediaPipe WebAssembly), it tracks hand gestures or eye movements in real-time and converts them into
              spoken voice alerts. No servers, no data leaves the device, and no expensive hardware is needed.
            </p>
          </div>
        </motion.section>

        <motion.section initial="hidden" whileInView="visible" viewport={{ once: true }} className="mb-20">
          <h2 className="text-2xl md:text-3xl font-bold text-white mb-8 text-center">The AI Pipeline</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { step: "1", title: "Camera Input", desc: "Webcam captures video at 640x480. MediaPipe locates 21 hand landmarks or 478 face landmarks per frame at 30+ FPS.", icon: Eye, color: "from-indigo-500 to-blue-600" },
              { step: "2", title: "Gesture Classification", desc: "Rule-based classifiers detect thumbs up/down, index-pinky, open palm, both-hands-open, gaze direction, and double-blinks with temporal smoothing.", icon: Cpu, color: "from-purple-500 to-pink-600" },
              { step: "3", title: "Voice Output", desc: "Web Speech API announces the gesture in the patient's chosen language. Each gesture also triggers a unique synthesized alert tone.", icon: Volume2, color: "from-emerald-500 to-teal-600" },
            ].map((s) => (
              <motion.div key={s.step} variants={fadeUp} className="dashboard-card p-8">
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${s.color} flex items-center justify-center mb-4 shadow-lg`}>
                  <s.icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-lg font-bold text-white mb-2">Step {s.step}: {s.title}</h3>
                <p className="text-slate-400 text-sm leading-relaxed">{s.desc}</p>
              </motion.div>
            ))}
          </div>
        </motion.section>

        <motion.section initial="hidden" whileInView="visible" viewport={{ once: true }} className="mb-20">
          <h2 className="text-2xl md:text-3xl font-bold text-white mb-8 text-center">Our Principles</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {VALUES.map((v, i) => {
              const Icon = v.icon;
              return (
                <motion.div key={i} variants={fadeUp} className="dashboard-card p-6">
                  <Icon className="w-8 h-8 text-indigo-400 mb-3" />
                  <h3 className="font-bold text-white mb-1">{v.title}</h3>
                  <p className="text-slate-400 text-sm">{v.desc}</p>
                </motion.div>
              );
            })}
          </div>
        </motion.section>

        <motion.section initial="hidden" whileInView="visible" viewport={{ once: true }} className="mb-20">
          <h2 className="text-2xl md:text-3xl font-bold text-white mb-8 flex items-center gap-3">
            <ShieldCheck className="w-7 h-7 text-indigo-400" />
            Noise Reduction & Accuracy
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {ACCURACY_FEATURES.map((feat, i) => (
              <motion.div key={i} variants={fadeUp} className="flex items-start gap-3 p-4 rounded-xl bg-white/5 border border-white/5">
                <ShieldCheck className="w-5 h-5 text-emerald-500 mt-0.5 shrink-0" />
                <span className="text-slate-300 text-sm">{feat}</span>
              </motion.div>
            ))}
          </div>
        </motion.section>

        <motion.section initial="hidden" whileInView="visible" viewport={{ once: true }} className="mb-20">
          <h2 className="text-2xl md:text-3xl font-bold text-white mb-8 flex items-center gap-3">
            <Zap className="w-7 h-7 text-indigo-400" />
            Technology Stack
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {TECH_STACK.map((tech, i) => {
              const Icon = tech.icon;
              return (
                <motion.div key={i} variants={fadeUp} className="dashboard-card p-6">
                  <Icon className="w-6 h-6 text-indigo-400 mb-3" />
                  <h3 className="font-bold text-white mb-1">{tech.name}</h3>
                  <p className="text-slate-400 text-sm">{tech.desc}</p>
                </motion.div>
              );
            })}
          </div>
        </motion.section>

        <motion.section initial="hidden" whileInView="visible" viewport={{ once: true }} className="mb-20">
          <h2 className="text-2xl md:text-3xl font-bold text-white mb-8 text-center">Hospital Use Cases</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {USE_CASES.map((uc, i) => {
              const Icon = uc.icon;
              return (
                <motion.div key={i} variants={fadeUp} className="dashboard-card p-6">
                  <Icon className="w-6 h-6 text-indigo-400 mb-3" />
                  <h3 className="font-bold text-white mb-1">{uc.title}</h3>
                  <p className="text-slate-400 text-sm">{uc.desc}</p>
                </motion.div>
              );
            })}
          </div>
        </motion.section>

        <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}
          className="text-center py-12 border-t border-white/5"
        >
          <div className="flex items-center justify-center gap-2 text-slate-500 text-sm">
            <Globe className="w-4 h-4" />
            Open source · Free to use · Giving every patient a voice.
          </div>
          <div className="mt-2 text-slate-600 text-xs">CareSpeak AI v1.0.0</div>
        </motion.div>
      </div>
    </div>
  );
}
