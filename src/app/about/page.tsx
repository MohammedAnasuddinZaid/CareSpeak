"use client";

import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { Shield, Cpu, Mic, Globe, Zap, Activity, CheckCircle, Heart, Eye, Hand, Volume2, Layers } from "lucide-react";

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] as const } },
};

const stagger = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.08 } },
};

function Section({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-80px" });
  return (
    <section ref={ref} className={`section-padding ${className}`}>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div initial="hidden" animate={isInView ? "visible" : "hidden"} variants={stagger}>
          {children}
        </motion.div>
      </div>
    </section>
  );
}

export default function AboutPage() {
  return (
    <div className="overflow-hidden pt-20">
      <Section>
        <motion.div variants={fadeUp} className="text-center mb-12">
          <h1 className="text-4xl sm:text-5xl font-bold text-[#1f1f1f] tracking-tight">
            About <span className="text-[#c63a22]">CareSpeak</span> AI
          </h1>
          <p className="mt-4 text-lg text-[#6e6e6e] max-w-2xl mx-auto">
            Turning any laptop with a webcam into an assistive communication device — 
            no servers, no setup, no expensive hardware.
          </p>
        </motion.div>

        <motion.div variants={fadeUp} className="card p-8 mb-12">
          <h2 className="text-xl font-bold text-[#1f1f1f] mb-4">The Problem</h2>
          <p className="text-[#6e6e6e] leading-relaxed mb-4">
            Every year, millions of hospitalized patients lose the ability to communicate. 
            ICU patients on ventilators, stroke survivors with paralysis, and individuals 
            recovering from surgery often cannot speak, gesture, or move enough to express 
            basic needs like pain, thirst, or the need for help.
          </p>
          <p className="text-[#6e6e6e] leading-relaxed">
            Existing solutions are expensive, complex, and require specialized hardware. 
            Dedicated eye trackers cost thousands of dollars. Speech-generating devices 
            require weeks of setup and training. Most hospitals simply lack the resources 
            to provide every patient with a communication aid.
          </p>
        </motion.div>

        <motion.div variants={fadeUp} className="card p-8 mb-12">
          <h2 className="text-xl font-bold text-[#1f1f1f] mb-4">The Solution</h2>
          <p className="text-[#6e6e6e] leading-relaxed mb-4">
            CareSpeak AI turns any standard laptop or tablet with a webcam into a 
            real-time assistive communication device. Using on-device AI, it tracks 
            hand gestures or eye/face movements and converts them into spoken words 
            in the patient&apos;s chosen language.
          </p>
          <div className="bg-[#f5f3f0] rounded-2xl p-6 mt-6">
            <h3 className="font-semibold text-[#1f1f1f] mb-4">How it works</h3>
            <div className="space-y-4">
              {[
                { step: "1", title: "Camera detects", desc: "MediaPipe tracks 21 hand landmarks or 478 face landmarks in real-time via WebAssembly at 30+ FPS — all on-device, no data leaves the browser", icon: Eye },
                { step: "2", title: "AI classifies", desc: "Rule-based classifiers with temporal smoothing identify gestures — thumbs up, thumbs down, peace sign, gaze direction, blinks, mouth openness — and assign confidence scores", icon: Layers },
                { step: "3", title: "Voice speaks", desc: "Browser-based Text-to-Speech announces the patient's need aloud in one of 8 supported languages, from English to Hindi to Arabic", icon: Volume2 },
              ].map((item, i) => {
                const Icon = item.icon;
                return (
                  <div key={i} className="flex gap-4">
                    <div className="w-10 h-10 rounded-xl bg-[#c63a22] flex items-center justify-center shrink-0 mt-0.5">
                      <span className="text-white font-bold text-sm">{item.step}</span>
                    </div>
                    <div>
                      <h4 className="font-semibold text-[#1f1f1f] text-sm">{item.title}</h4>
                      <p className="text-sm text-[#6e6e6e] mt-1">{item.desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </motion.div>
      </Section>

      <section className="bg-[#f5f3f0] section-padding">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger}>
            <motion.h2 variants={fadeUp} className="text-2xl sm:text-3xl font-bold text-[#1f1f1f] text-center mb-3">
              Our Principles
            </motion.h2>
            <motion.p variants={fadeUp} className="text-[#6e6e6e] text-center mb-10 max-w-xl mx-auto">
              Four values guide every decision.
            </motion.p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[
                { icon: Shield, title: "Privacy First", desc: "Zero video, images, or data ever leave the device. All AI runs locally in the browser via WebAssembly." },
                { icon: Hand, title: "On-Device AI", desc: "MediaPipe machine learning models run entirely in-browser. No servers, no cloud, no API calls." },
                { icon: Zap, title: "Real-Time Feedback", desc: "Sub-100ms inference latency with temporal smoothing for jitter-free, responsive gesture recognition." },
                { icon: Globe, title: "Multi-Language", desc: "8 languages supported out of the box. Voice output in the patient's preferred language." },
              ].map((item, i) => {
                const Icon = item.icon;
                return (
                  <motion.div key={i} variants={fadeUp} className="card p-6">
                    <Icon className="w-8 h-8 text-[#c63a22] mb-3" />
                    <h3 className="font-semibold text-[#1f1f1f] mb-2">{item.title}</h3>
                    <p className="text-sm text-[#6e6e6e]">{item.desc}</p>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        </div>
      </section>

      <Section>
        <motion.h2 variants={fadeUp} className="text-2xl sm:text-3xl font-bold text-[#1f1f1f] text-center mb-3">
          Noise Reduction & Accuracy
        </motion.h2>
        <motion.p variants={fadeUp} className="text-[#6e6e6e] text-center mb-8 max-w-xl mx-auto">
          Designed for the real world — where patients move, blink, and rest.
        </motion.p>
        <motion.div variants={fadeUp} className="card p-8">
          <ul className="space-y-3">
            {[
              "Temporal smoothing with 8-frame (hand) and 12-frame (eye) majority voting eliminates jitter from individual frame errors",
              "Hold-time confidence ramp prevents momentary movements or partial gestures from triggering unintended alerts",
              "Resting-state debounce detects rapid gesture switching and dynamically raises confidence thresholds to prevent spam",
              "10-second per-gesture cooldown with max 3 plays prevents repeated alerts for the same detected gesture",
              "Blink hysteresis filtering uses separate close (0.22 EAR) and open (0.28 EAR) thresholds to avoid blink-induced false triggers",
              "Dual-detection pause — 5-second eye closure or open palm hold — lets patients intentionally pause tracking during repositioning",
              "Multi-language TTS with serialized promise queue ensures alerts are spoken in order without overlapping speech",
              "Privacy-by-design guarantees that no video frame, image, or landmark data ever leaves the device's browser",
            ].map((item, i) => (
              <li key={i} className="flex gap-3 text-sm text-[#6e6e6e]">
                <CheckCircle className="w-4 h-4 text-[#22a67e] shrink-0 mt-0.5" />
                {item}
              </li>
            ))}
          </ul>
        </motion.div>
      </Section>

      <section className="bg-[#f5f3f0] section-padding">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger}>
            <motion.h2 variants={fadeUp} className="text-2xl sm:text-3xl font-bold text-[#1f1f1f] text-center mb-3">
              Technology Stack
            </motion.h2>
            <motion.p variants={fadeUp} className="text-[#6e6e6e] text-center mb-10 max-w-xl mx-auto">
              Modern, lightweight, and entirely client-side.
            </motion.p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {[
                { name: "Next.js 15", desc: "App Router, React 19, Server Components" },
                { name: "TypeScript", desc: "Strict mode, full type safety" },
                { name: "MediaPipe", desc: "On-device WASM AI models" },
                { name: "Web Speech API", desc: "Multi-language TTS" },
                { name: "Tailwind CSS v4", desc: "Utility-first styling" },
                { name: "Framer Motion", desc: "Tasteful micro-interactions" },
              ].map((tech, i) => (
                <motion.div key={i} variants={fadeUp} className="card p-5 text-center">
                  <h3 className="font-semibold text-[#1f1f1f] text-sm">{tech.name}</h3>
                  <p className="text-[10px] text-[#6e6e6e] mt-1">{tech.desc}</p>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      <Section>
        <motion.h2 variants={fadeUp} className="text-2xl sm:text-3xl font-bold text-[#1f1f1f] text-center mb-3">
          Hospital Use Cases
        </motion.h2>
        <motion.p variants={fadeUp} className="text-[#6e6e6e] text-center mb-10 max-w-xl mx-auto">
          From ICU to recovery ward.
        </motion.p>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {[
            { title: "ICU", desc: "Ventilator patients who cannot speak" },
            { title: "Stroke Recovery", desc: "Patients with limited motor function" },
            { title: "Post-Surgery", desc: "Temporary speech impairment" },
            { title: "ALS / MND", desc: "Progressive communication loss" },
            { title: "Emergency", desc: "Rapid alerting of critical needs" },
            { title: "Elderly Care", desc: "Age-related communication difficulties" },
          ].map((item, i) => (
            <motion.div key={i} variants={fadeUp} className="card p-5 text-center">
              <Heart className="w-6 h-6 text-[#c63a22] mx-auto mb-2" />
              <h3 className="font-semibold text-[#1f1f1f] text-sm">{item.title}</h3>
              <p className="text-[10px] text-[#6e6e6e] mt-1">{item.desc}</p>
            </motion.div>
          ))}
        </div>
      </Section>
    </div>
  );
}
