import { GestureLogEntry, GestureType } from "@/types";

const STORAGE_KEY = "carespeak_gesture_log";
const MAX_ENTRIES = 200;
const BC_CHANNEL_NAME = "carespeak_bystander";

let broadcastChannel: BroadcastChannel | null = null;

function getChannel(): BroadcastChannel | null {
  if (typeof window === "undefined") return null;
  if (!broadcastChannel) {
    try { broadcastChannel = new BroadcastChannel(BC_CHANNEL_NAME); } catch { return null; }
  }
  return broadcastChannel;
}

export function loadGestureLog(): GestureLogEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch { return []; }
}

export function addGestureLog(gesture: string, description: string, confidence: number, type: GestureType, language = "en-US"): GestureLogEntry {
  const entry: GestureLogEntry = {
    id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    gesture, description, confidence, type, timestamp: Date.now(), language,
  };
  const log = loadGestureLog();
  log.unshift(entry);
  if (log.length > MAX_ENTRIES) log.length = MAX_ENTRIES;
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(log)); } catch {}
  const channel = getChannel();
  if (channel) { try { channel.postMessage({ type: "new_gesture", entry }); } catch {} }
  return entry;
}

export function acknowledgeEntry(id: string): void {
  const log = loadGestureLog();
  const idx = log.findIndex((e) => e.id === id);
  if (idx === -1) return;
  log[idx].acknowledged = true;
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(log)); } catch {}
  const channel = getChannel();
  if (channel) { try { channel.postMessage({ type: "acknowledge", entryId: id }); } catch {} }
}

export function getUnacknowledgedCount(): number {
  return loadGestureLog().filter((e) => !e.acknowledged).length;
}

export function getTodayCount(): number {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  return loadGestureLog().filter((e) => e.timestamp >= todayStart).length;
}

export function getStats(): { total: number; today: number; unacknowledged: number; byGesture: Record<string, number>; byType: Record<string, number> } {
  const log = loadGestureLog();
  const byGesture: Record<string, number> = {};
  const byType: Record<string, number> = {};
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  let today = 0;
  let unacknowledged = 0;
  for (const entry of log) {
    byGesture[entry.gesture] = (byGesture[entry.gesture] ?? 0) + 1;
    byType[entry.type] = (byType[entry.type] ?? 0) + 1;
    if (entry.timestamp >= todayStart) today++;
    if (!entry.acknowledged) unacknowledged++;
  }
  return { total: log.length, today, unacknowledged, byGesture, byType };
}

export function clearGestureLog(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(STORAGE_KEY);
  const channel = getChannel();
  if (channel) { try { channel.postMessage({ type: "clear" }); } catch {} }
}

export function subscribeToGestureUpdates(
  onGesture: (entry: GestureLogEntry) => void,
  onClear?: () => void,
  onAcknowledge?: (entryId: string) => void
): () => void {
  const channel = getChannel();
  if (!channel) return () => {};
  const handler = (event: MessageEvent) => {
    const data = event.data;
    if (data?.type === "new_gesture" && data.entry) onGesture(data.entry as GestureLogEntry);
    else if (data?.type === "clear" && onClear) onClear();
    else if (data?.type === "acknowledge" && data.entryId && onAcknowledge) onAcknowledge(data.entryId);
  };
  channel.addEventListener("message", handler);
  return () => channel.removeEventListener("message", handler);
}

export function getLatestGesture(): GestureLogEntry | null {
  const log = loadGestureLog();
  return log.length > 0 ? log[0] : null;
}
