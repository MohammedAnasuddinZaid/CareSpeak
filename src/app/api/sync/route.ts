import { NextRequest, NextResponse } from "next/server";
import { GestureLogEntry, PatientMetrics } from "@/types";

interface StoredEntry {
  entry: GestureLogEntry;
  acknowledged: boolean;
  acknowledgedAt?: number;
  escalated: boolean;
  escalatedAt?: number;
  resolved: boolean;
  resolvedAt?: number;
}

interface SyncState {
  entries: StoredEntry[];
  patientMetrics: Map<string, PatientMetrics>;
}

let state: SyncState = {
  entries: [],
  patientMetrics: new Map(),
};

function warmState(): void {
  const entries = state.entries;
  const cutoff = Date.now() - 3600000;
  state.entries = entries.filter((e) => e.entry.timestamp > cutoff);
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  warmState();
  const { searchParams } = new URL(request.url);
  const since = parseInt(searchParams.get("since") || "0", 10);
  const sessionId = searchParams.get("session") || undefined;

  let filtered = state.entries;
  if (since > 0) {
    filtered = filtered.filter((e) => e.entry.timestamp > since);
  }
  if (sessionId) {
    filtered = filtered.filter((e) => e.entry.sessionId === sessionId);
  }

  const entries = filtered.map((s) => ({
    ...s.entry,
    acknowledged: s.acknowledged,
    acknowledgedAt: s.acknowledgedAt,
    escalated: s.escalated,
    escalatedAt: s.escalatedAt,
    resolved: s.resolved,
    resolvedAt: s.resolvedAt,
    isEscalated: s.escalated,
  }));

  const metrics: Record<string, PatientMetrics> = {};
  state.patientMetrics.forEach((v, k) => {
    metrics[k] = v;
  });

  return NextResponse.json({
    entries,
    patientMetrics: metrics,
    serverTime: Date.now(),
  });
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  warmState();
  try {
    const body = await request.json();
    const { type, entry, entryId, action, patientMetrics } = body;

    if (type === "new_gesture" && entry) {
      state.entries.push({
        entry: entry as GestureLogEntry,
        acknowledged: false,
        escalated: false,
        resolved: false,
      });
      if (state.entries.length > 10000) {
        state.entries = state.entries.slice(-10000);
      }
      return NextResponse.json({ ok: true, index: state.entries.length - 1 });
    }

    if (type === "acknowledge" && entryId) {
      const found = state.entries.find((s) => s.entry.id === entryId);
      if (found) {
        found.acknowledged = true;
        found.acknowledgedAt = action?.timestamp || Date.now();
      }
      return NextResponse.json({ ok: true });
    }

    if (type === "escalate" && entryId) {
      const found = state.entries.find((s) => s.entry.id === entryId);
      if (found) {
        found.escalated = true;
        found.escalatedAt = action?.timestamp || Date.now();
      }
      return NextResponse.json({ ok: true });
    }

    if (type === "resolve" && entryId) {
      const found = state.entries.find((s) => s.entry.id === entryId);
      if (found) {
        found.resolved = true;
        found.resolvedAt = action?.timestamp || Date.now();
      }
      return NextResponse.json({ ok: true });
    }

    if (type === "metrics" && patientMetrics) {
      const deviceId = body.deviceId || "unknown";
      state.patientMetrics.set(deviceId, { ...patientMetrics, lastSeen: new Date().toISOString() });
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ ok: false, error: "Unknown type" }, { status: 400 });
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request" }, { status: 400 });
  }
}
