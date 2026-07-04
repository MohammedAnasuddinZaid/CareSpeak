export type Handedness = "Left" | "Right";

export interface Point {
  x: number;
  y: number;
  z: number;
}

export interface HandData {
  landmarks: Point[];
  handedness: Handedness;
  worldLandmarks?: Point[];
}

export interface EyeData {
  leftIris: Point;
  rightIris: Point;
  leftEyeLandmarks: Point[];
  rightEyeLandmarks: Point[];
  faceLandmarks: Point[];
}

export type HandGesture =
  | "YES"
  | "NO"
  | "HELP"
  | "WATER"
  | null;

export type EyeGesture =
  | "YES"
  | "NO"
  | "HELP"
  | "WATER"
  | null;

export type GestureType = "hand" | "eye";

export interface GestureResult<T> {
  gesture: T;
  confidence: number;
  timestamp: number;
}

export interface PatientMetrics {
  blinkRate?: number;
  alertnessScore?: number;
  eyeClosureDuration?: number;
  movementActivity?: number;
  lastSeen?: string;
}

export interface GestureLogEntry {
  id: string;
  gesture: string;
  description: string;
  confidence: number;
  type: GestureType;
  timestamp: number;
  language: string;
  acknowledged?: boolean;
  deviceId?: string;
  sessionId?: string;
  patientMetrics?: PatientMetrics;
  isEscalated?: boolean;
  escalated?: boolean;
  resolved?: boolean;
  resolvedAt?: number;
  escalatedAt?: number;
  acknowledgedAt?: number;
}

export interface AlertAction {
  type: "acknowledge" | "escalate" | "resolve";
  entryId: string;
  timestamp: number;
  actor?: string;
}

export interface SyncMessage {
  type: "new_gesture" | "acknowledge" | "clear" | "escalate" | "resolve" | "ping";
  entry?: GestureLogEntry;
  entryId?: string;
  action?: AlertAction;
  sessionId?: string;
  deviceId?: string;
}

export interface ClutchState {
  paused: boolean;
  pauseTime: number | null;
  resumeGesture: "eyes_open" | "palm_open" | null;
}

export type SensitivityLevel = "high" | "medium" | "low";

export interface SystemDiagnostics {
  brightness: number;
  trackingStable: boolean;
  fps: number;
  message: string | null;
}

export interface TTSConfig {
  enabled: boolean;
  rate: number;
  pitch: number;
  volume: number;
  voiceURI?: string;
  language: string;
}

export interface SessionInfo {
  sessionId: string;
  deviceId: string;
  createdAt: number;
  label?: string;
}

export interface EscalationRule {
  type: "help_frequency" | "low_alertness" | "prolonged_inactivity";
  threshold: number;
  windowMs: number;
}

export type SupportedLanguage = "en-US" | "hi-IN" | "es-ES" | "fr-FR" | "de-DE" | "zh-CN" | "ar-SA" | "pt-BR";

export const SUPPORTED_LANGUAGES: Record<SupportedLanguage, { label: string; native: string }> = {
  "en-US": { label: "English", native: "English" },
  "hi-IN": { label: "Hindi", native: "हिन्दी" },
  "es-ES": { label: "Spanish", native: "Español" },
  "fr-FR": { label: "French", native: "Français" },
  "de-DE": { label: "German", native: "Deutsch" },
  "zh-CN": { label: "Chinese", native: "中文" },
  "ar-SA": { label: "Arabic", native: "العربية" },
  "pt-BR": { label: "Portuguese", native: "Português" },
};

export const LANGUAGE_DESCRIPTIONS: Record<SupportedLanguage, Record<string, string>> = {
  "en-US": { YES: "Yes — Patient confirms", NO: "No — Patient refuses", HELP: "Help — Patient needs immediate assistance", HELLO: "Hello — Patient is greeting", WATER: "Water/Food — Patient needs water or food", EMERGENCY: "EMERGENCY — Medical assistance required immediately!" },
  "hi-IN": { YES: "हाँ — रोगी पुष्टि करता है", NO: "नहीं — रोगी मना करता है", HELP: "मदद — रोगी को तुरंत सहायता चाहिए", HELLO: "नमस्ते — रोगी अभिवादन कर रहा है", WATER: "पानी/भोजन — रोगी को पानी या भोजन चाहिए", EMERGENCY: "आपातकाल — रोगी को तत्काल चिकित्सा सहायता चाहिए!" },
  "es-ES": { YES: "Sí — El paciente confirma", NO: "No — El paciente rechaza", HELP: "Ayuda — El paciente necesita asistencia inmediata", HELLO: "Hola — El paciente saluda", WATER: "Agua/Comida — El paciente necesita agua o comida", EMERGENCY: "EMERGENCIA — Se requiere asistencia médica inmediata!" },
  "fr-FR": { YES: "Oui — Le patient confirme", NO: "Non — Le patient refuse", HELP: "Aide — Le patient a besoin d'aide immédiate", HELLO: "Bonjour — Le patient salue", WATER: "Eau/Nourriture — Le patient a besoin d'eau ou de nourriture", EMERGENCY: "URGENCE — Une assistance médicale immédiate est requise!" },
  "de-DE": { YES: "Ja — Patient bestätigt", NO: "Nein — Patient lehnt ab", HELP: "Hilfe — Patient benötigt sofortige Hilfe", HELLO: "Hallo — Patient begrüßt", WATER: "Wasser/Essen — Patient benötigt Wasser oder Essen", EMERGENCY: "NOTFALL — Sofortige medizinische Hilfe erforderlich!" },
  "zh-CN": { YES: "是 — 患者确认", NO: "否 — 患者拒绝", HELP: "帮助 — 患者需要立即帮助", HELLO: "你好 — 患者在打招呼", WATER: "水/食物 — 患者需要水或食物", EMERGENCY: "紧急 — 需要立即医疗援助!" },
  "ar-SA": { YES: "نعم — يؤكد المريض", NO: "لا — يرفض المريض", HELP: "مساعدة — المريض يحتاج مساعدة فورية", HELLO: "مرحبا — المريض يحيي", WATER: "ماء/طعام — المريض يحتاج ماء أو طعام", EMERGENCY: "طوارئ — المساعدة الطبية مطلوبة فوراً!" },
  "pt-BR": { YES: "Sim — Paciente confirma", NO: "Não — Paciente recusa", HELP: "Ajuda — Paciente precisa de assistência imediata", HELLO: "Olá — Paciente está cumprimentando", WATER: "Água/Comida — Paciente precisa de água ou comida", EMERGENCY: "EMERGÊNCIA — Assistência médica imediata necessária!" },
};

export const HAND_GESTURE_MAP: Record<string, { label: string; description: string }> = {
  YES: { label: "YES", description: "Yes — Patient confirms" },
  NO: { label: "NO", description: "No — Patient refuses" },
  HELP: { label: "HELP", description: "Help — Patient needs immediate assistance" },
  WATER: { label: "WATER", description: "Water/Food — Patient needs water or food" },
};

export const EYE_GESTURE_MAP: Record<string, { label: string; description: string }> = {
  YES: { label: "YES", description: "Yes — Patient confirms" },
  NO: { label: "NO", description: "No — Patient refuses" },
  HELP: { label: "HELP", description: "Help — Patient needs immediate assistance" },
  WATER: { label: "WATER", description: "Water/Food — Patient needs water or food" },
};

export const ALERT_SOUNDS: Record<string, { frequency: number; duration: number; type: OscillatorType }> = {
  YES: { frequency: 880, duration: 150, type: "sine" },
  NO: { frequency: 440, duration: 200, type: "square" },
  HELP: { frequency: 660, duration: 300, type: "sawtooth" },
  HELLO: { frequency: 1100, duration: 100, type: "sine" },
  WATER: { frequency: 550, duration: 250, type: "triangle" },
  EMERGENCY: { frequency: 330, duration: 500, type: "sawtooth" },
};

export const ESCALATION_RULES: EscalationRule[] = [
  { type: "help_frequency", threshold: 3, windowMs: 120000 },
  { type: "low_alertness", threshold: 25, windowMs: 30000 },
  { type: "prolonged_inactivity", threshold: 60000, windowMs: 60000 },
];
