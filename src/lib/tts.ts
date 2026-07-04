import { SupportedLanguage, LANGUAGE_DESCRIPTIONS, GestureType } from "@/types";
import { playAlertSound } from "./alertSounds";

const LANG_KEY = "carespeak_language";

function getSavedLanguage(): SupportedLanguage {
  if (typeof window === "undefined") return "en-US";
  try {
    const saved = localStorage.getItem(LANG_KEY);
    if (saved && ["en-US", "hi-IN", "es-ES", "fr-FR", "de-DE", "zh-CN", "ar-SA", "pt-BR"].includes(saved)) {
      return saved as SupportedLanguage;
    }
  } catch {}
  return "en-US";
}

function saveLanguage(lang: SupportedLanguage): void {
  if (typeof window === "undefined") return;
  try { localStorage.setItem(LANG_KEY, lang); } catch {}
}

function getDescription(gestureName: string, lang: SupportedLanguage): string {
  const langMap = LANGUAGE_DESCRIPTIONS[lang];
  if (langMap && langMap[gestureName]) return langMap[gestureName];
  const fallback: Record<string, string> = {
    YES: "Yes — Patient confirms", NO: "No — Patient refuses", HELP: "Help — Patient needs immediate assistance",
    HELLO: "Hello — Patient is greeting", WATER: "Water/Food — Patient needs water or food",
    EMERGENCY: "EMERGENCY — Medical assistance required immediately!",
  };
  return fallback[gestureName] ?? gestureName;
}

function doSpeak(text: string, lang: SupportedLanguage): Promise<void> {
  return new Promise((resolve) => {
    if (typeof window === "undefined" || !window.speechSynthesis) { resolve(); return; }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;
    utterance.lang = lang;

    let timedOut = false;
    const timeout = setTimeout(() => { timedOut = true; resolve(); }, 3000);

    utterance.onend = () => { if (!timedOut) { clearTimeout(timeout); resolve(); } };
    utterance.onerror = () => { if (!timedOut) { clearTimeout(timeout); resolve(); } };

    window.speechSynthesis.speak(utterance);
  });
}

export class VoiceAlert {
  private lastSpoken: Record<string, number> = {};
  private playCount: Record<string, number> = {};
  private currentGesture: string | null = null;
  private readonly cooldownMs: number;
  private readonly maxPlays = 3;
  private enabled = true;
  private language: SupportedLanguage;
  private soundEnabled = true;
  private speechQueue: Promise<void> = Promise.resolve();

  constructor(cooldownMs = 10000) {
    this.cooldownMs = cooldownMs;
    this.language = getSavedLanguage();
  }

  setEnabled(v: boolean) { this.enabled = v; }
  setSoundEnabled(v: boolean) { this.soundEnabled = v; }
  getLanguage(): SupportedLanguage { return this.language; }
  setLanguage(lang: SupportedLanguage) { this.language = lang; saveLanguage(lang); }

  speak(gestureName: string, type: GestureType = "hand"): void {
    if (!this.enabled) return;
    if (gestureName !== this.currentGesture) { this.playCount[gestureName] = 0; this.currentGesture = gestureName; }
    const played = this.playCount[gestureName] ?? 0;
    if (played >= this.maxPlays) return;
    const now = Date.now();
    const last = this.lastSpoken[gestureName] ?? 0;
    if (now - last < this.cooldownMs) return;
    this.lastSpoken[gestureName] = now;
    this.playCount[gestureName] = played + 1;
    const description = getDescription(gestureName, this.language);
    const urgentOnly = ["HELP", "EMERGENCY"];
    if (this.soundEnabled && urgentOnly.includes(gestureName)) { playAlertSound(gestureName); }
    this.speechQueue = this.speechQueue.then(() => doSpeak(description, this.language));
  }

  speakDirect(text: string, lang?: SupportedLanguage): void {
    if (!this.enabled) return;
    const l = lang ?? this.language;
    this.speechQueue = this.speechQueue.then(() => doSpeak(text, l));
  }

  resetGesture(gestureName?: string) {
    if (gestureName) { this.playCount[gestureName] = 0; } else { this.playCount = {}; }
  }

  replay(text: string): void {
    if (!this.enabled) return;
    this.speechQueue = this.speechQueue.then(() => doSpeak(text, this.language));
  }

  stop(): void {
    if (typeof window !== "undefined" && window.speechSynthesis) { window.speechSynthesis.cancel(); }
  }
}

export const voiceAlert = new VoiceAlert(10000);
