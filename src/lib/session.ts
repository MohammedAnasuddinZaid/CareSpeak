import { SessionInfo } from "@/types";

const SESSION_KEY = "carespeak_session";
const DEVICE_KEY = "carespeak_device_id";

function generateId(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let result = "";
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

function generateDeviceId(): string {
  const existing = typeof window !== "undefined" ? localStorage.getItem(DEVICE_KEY) : null;
  if (existing) return existing;
  const id = `device_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  if (typeof window !== "undefined") {
    try { localStorage.setItem(DEVICE_KEY, id); } catch {}
  }
  return id;
}

export function getOrCreateSession(): SessionInfo {
  if (typeof window === "undefined") {
    return { sessionId: generateId(), deviceId: "server", createdAt: Date.now() };
  }
  try {
    const stored = localStorage.getItem(SESSION_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as SessionInfo;
      if (parsed.sessionId && parsed.deviceId) return parsed;
    }
  } catch {}
  const session: SessionInfo = {
    sessionId: generateId(),
    deviceId: generateDeviceId(),
    createdAt: Date.now(),
  };
  try { localStorage.setItem(SESSION_KEY, JSON.stringify(session)); } catch {}
  return session;
}

export function setSessionId(sessionId: string): SessionInfo {
  const session: SessionInfo = {
    sessionId,
    deviceId: generateDeviceId(),
    createdAt: Date.now(),
  };
  if (typeof window !== "undefined") {
    try { localStorage.setItem(SESSION_KEY, JSON.stringify(session)); } catch {}
  }
  return session;
}

export function clearSession(): void {
  if (typeof window !== "undefined") {
    try { localStorage.removeItem(SESSION_KEY); } catch {}
  }
}

export function getSession(): SessionInfo | null {
  if (typeof window === "undefined") return null;
  try {
    const stored = localStorage.getItem(SESSION_KEY);
    if (stored) return JSON.parse(stored) as SessionInfo;
  } catch {}
  return null;
}

export function getNurseDashboardUrl(sessionId: string): string {
  if (typeof window === "undefined") return "";
  const base = window.location.origin;
  return `${base}/nurse-view?session=${sessionId}`;
}
