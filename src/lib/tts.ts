import { SupportedLanguage, LANGUAGE_DESCRIPTIONS, GestureType } from "@/types";
import { playAlertSound } from "./alertSounds";

const LANG_KEY = "carespeak_language";

const GREETINGS: Record<SupportedLanguage, string> = {
  "en-US": "Hello, this is CareSpeak. How can I help you?",
  "hi-IN": "नमस्ते, यह केयरस्पीक है। मैं आपकी कैसे मदद कर सकता हूँ?",
  "es-ES": "Hola, soy CareSpeak. ¿Cómo puedo ayudarte?",
  "fr-FR": "Bonjour, ici CareSpeak. Comment puis-je vous aider?",
  "de-DE": "Hallo, hier ist CareSpeak. Wie kann ich Ihnen helfen?",
  "zh-CN": "你好，这里是CareSpeak。我能帮你什么？",
  "ar-SA": "مرحباً، هذا كيرسبيك. كيف يمكنني مساعدتك؟",
  "pt-BR": "Olá, aqui é o CareSpeak. Como posso ajudar?",
};

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

let cachedVoices: SpeechSynthesisVoice[] | null = null;
let voicesLoaded = false;

function ensureVoices(): Promise<SpeechSynthesisVoice[]> {
  if (voicesLoaded && cachedVoices && cachedVoices.length > 0) {
    return Promise.resolve(cachedVoices);
  }
  return new Promise((resolve) => {
    const voices = window.speechSynthesis.getVoices();
    if (voices.length > 0) {
      cachedVoices = voices;
      voicesLoaded = true;
      resolve(voices);
      return;
    }
    window.speechSynthesis.onvoiceschanged = () => {
      const v = window.speechSynthesis.getVoices();
      cachedVoices = v;
      voicesLoaded = true;
      resolve(v);
      window.speechSynthesis.onvoiceschanged = null;
    };
    setTimeout(() => {
      if (!voicesLoaded) {
        const v = window.speechSynthesis.getVoices();
        cachedVoices = v;
        voicesLoaded = true;
        resolve(v);
      }
    }, 1000);
  });
}

function findVoiceForLang(lang: string, voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | null {
  try {
    if (voices.length === 0) return null;

    const langLower = lang.toLowerCase();
    const exact = voices.find((v) => v.lang.toLowerCase() === langLower);
    if (exact) return exact;

    const prefix = langLower.split("-")[0];
    const prefixMatch = voices.find((v) => v.lang.toLowerCase().startsWith(prefix));
    if (prefixMatch) return prefixMatch;

    return null;
  } catch { return null; }
}

let ttsQueue: SpeechSynthesisUtterance[] = [];
let ttsSpeaking = false;

function processTtsQueue(): void {
  if (ttsQueue.length === 0) return;
  if (ttsSpeaking) return;

  ttsSpeaking = true;
  const utterance = ttsQueue.shift()!;

  const safetyTimer = setTimeout(() => {
    ttsSpeaking = false;
    processTtsQueue();
  }, 10000);

  utterance.onstart = () => clearTimeout(safetyTimer);
  utterance.onend = () => {
    clearTimeout(safetyTimer);
    ttsSpeaking = false;
    processTtsQueue();
  };
  utterance.onerror = () => {
    clearTimeout(safetyTimer);
    ttsSpeaking = false;
    processTtsQueue();
  };

  try {
    window.speechSynthesis.speak(utterance);
  } catch {
    clearTimeout(safetyTimer);
    ttsSpeaking = false;
    processTtsQueue();
  }
}

async function doSpeak(text: string, lang: string): Promise<void> {
  try {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    if (!text || text.trim().length === 0) return;

    await ensureVoices();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.85;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;
    utterance.lang = lang;

    const voices = window.speechSynthesis.getVoices();
    const voice = findVoiceForLang(lang, voices);
    if (voice) {
      utterance.voice = voice;
      console.log(`[TTS] Voice for ${lang}: ${voice.name} (${voice.lang})`);
    } else {
      console.log(`[TTS] No voice match for ${lang}, using browser default`);
    }

    ttsQueue.push(utterance);
    processTtsQueue();
  } catch {}
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
  constructor(cooldownMs = 10000) {
    this.cooldownMs = cooldownMs;
    this.language = getSavedLanguage();
  }

  setEnabled(v: boolean) { this.enabled = v; }
  setSoundEnabled(v: boolean) { this.soundEnabled = v; }
  getLanguage(): SupportedLanguage { return this.language; }

  setLanguage(lang: SupportedLanguage) {
    this.language = lang;
    saveLanguage(lang);
    const greeting = GREETINGS[lang] || GREETINGS["en-US"];
    doSpeak(greeting, lang);
  }

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
    doSpeak(description, this.language);
  }

  speakDirect(text: string, lang?: SupportedLanguage): void {
    if (!this.enabled) return;
    const l = lang ?? this.language;
    doSpeak(text, l);
  }

  resetGesture(gestureName?: string) {
    if (gestureName) { this.playCount[gestureName] = 0; } else { this.playCount = {}; }
  }

  replay(text: string, lang?: SupportedLanguage): void {
    if (!this.enabled) return;
    if (lang) {
      const desc = getDescription(text, lang);
      doSpeak(desc, lang);
    } else {
      doSpeak(text, this.language);
    }
  }

  stop(): void {
    if (typeof window !== "undefined" && window.speechSynthesis) {
      try { window.speechSynthesis.cancel(); } catch {}
    }
  }

  getGreeting(lang: SupportedLanguage): string {
    return GREETINGS[lang] || GREETINGS["en-US"];
  }
}

export const voiceAlert = new VoiceAlert(10000);
