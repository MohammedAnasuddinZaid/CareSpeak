import { GestureLogEntry, SyncMessage, PatientMetrics, AlertAction } from "@/types";

const POLL_INTERVAL = 100;
const MAX_RETRY_INTERVAL = 5000;
const INITIAL_RETRY_BACKOFF = 500;
const BROADCAST_CHANNEL = "carespeak_bystander";

type AlertCallback = (entry: GestureLogEntry) => void;
type ActionCallback = (action: AlertAction, entryId: string) => void;
type MetricsCallback = (metrics: Record<string, PatientMetrics>) => void;
type StatusChangeCallback = (status: "connected" | "reconnecting" | "disconnected") => void;

interface NetworkSyncConfig {
  sessionId?: string;
  serverUrl?: string;
  onAlert?: AlertCallback;
  onAction?: ActionCallback;
  onMetrics?: MetricsCallback;
  onStatusChange?: StatusChangeCallback;
}

export class NetworkSync {
  private config: NetworkSyncConfig;
  private pollTimer: ReturnType<typeof setInterval> | null = null;
  private retryTimer: ReturnType<typeof setTimeout> | null = null;
  private lastPollTime: number = 0;
  private retryBackoff: number = INITIAL_RETRY_BACKOFF;
  private consecutiveFailures: number = 0;
  private broadcastChannel: BroadcastChannel | null = null;
  private entries: GestureLogEntry[] = [];
  private offlineQueue: GestureLogEntry[] = [];
  private status: "connected" | "reconnecting" | "disconnected" = "disconnected";

  constructor(config: NetworkSyncConfig) {
    this.config = config;
    this.initBroadcast();
  }

  private initBroadcast(): void {
    try {
      this.broadcastChannel = new BroadcastChannel(BROADCAST_CHANNEL);
      this.broadcastChannel.onmessage = (event: MessageEvent<SyncMessage>) => {
        this.handleSyncMessage(event.data);
      };
    } catch {
      this.broadcastChannel = null;
    }
  }

  private handleSyncMessage(msg: SyncMessage): void {
    if (msg.type === "new_gesture" && msg.entry) {
      const exists = this.entries.some((e) => e.id === msg.entry!.id);
      if (!exists) {
        this.entries.push(msg.entry);
        this.config.onAlert?.(msg.entry);
      }
    }
    if (msg.type === "acknowledge" && msg.entryId) {
      const entry = this.entries.find((e) => e.id === msg.entryId);
      if (entry) {
        entry.acknowledged = true;
        this.config.onAction?.({ type: "acknowledge", entryId: msg.entryId, timestamp: Date.now() }, msg.entryId);
      }
    }
    if (msg.type === "resolve" && msg.entryId) {
      const entry = this.entries.find((e) => e.id === msg.entryId);
      if (entry) {
        entry.acknowledged = true;
        entry.resolved = true;
        this.config.onAction?.({ type: "resolve", entryId: msg.entryId, timestamp: Date.now() }, msg.entryId);
      }
    }
  }

  private getServerUrl(): string {
    return this.config.serverUrl || (typeof window !== "undefined" ? `${window.location.origin}/api/sync` : "/api/sync");
  }

  async sendAlert(entry: GestureLogEntry): Promise<void> {
    this.entries.push(entry);
    try {
      const res = await fetch(this.getServerUrl(), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "new_gesture",
          entry: { ...entry, sessionId: this.config.sessionId },
        }),
      });
      if (!res.ok) throw new Error("Server error");
      this.offlineQueue = this.offlineQueue.filter((e) => e.id !== entry.id);
    } catch {
      this.offlineQueue.push(entry);
    }
    this.sendLocal(entry);
  }

  async sendAction(action: AlertAction): Promise<void> {
    const typeMap: Record<string, string> = {
      acknowledge: "acknowledge",
      escalate: "escalate",
      resolve: "resolve",
    };
    const type = typeMap[action.type];
    if (!type) return;

    try {
      await fetch(this.getServerUrl(), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          entryId: action.entryId,
          action,
          sessionId: this.config.sessionId,
        }),
      });
    } catch {}
    this.sendLocal({ type, entryId: action.entryId, sessionId: this.config.sessionId } as unknown as GestureLogEntry);
  }

  async sendPatientMetrics(metrics: PatientMetrics, deviceId: string): Promise<void> {
    try {
      await fetch(this.getServerUrl(), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "metrics",
          patientMetrics: metrics,
          deviceId,
          sessionId: this.config.sessionId,
        }),
      });
    } catch {}
  }

  private sendLocal(msg: SyncMessage | GestureLogEntry): void {
    const syncMsg: SyncMessage = "gesture" in msg
      ? { type: "new_gesture", entry: msg as GestureLogEntry }
      : msg as unknown as SyncMessage;
    this.broadcastChannel?.postMessage(syncMsg);
    this.saveToLocalStorage();
  }

  private saveToLocalStorage(): void {
    try {
      const recent = this.entries.slice(-50);
      localStorage.setItem("carespeak_gesture_log", JSON.stringify(recent));
    } catch {}
  }

  private setStatus(status: "connected" | "reconnecting" | "disconnected"): void {
    if (this.status === status) return;
    this.status = status;
    this.config.onStatusChange?.(status);
  }

  refresh(): void {
    this.lastPollTime = 0;
    this.consecutiveFailures = 0;
    this.retryBackoff = INITIAL_RETRY_BACKOFF;
    this.poll();
  }

  startPolling(): void {
    if (this.pollTimer) return;
    this.setStatus("connected");
    this.poll();
    this.pollTimer = setInterval(() => this.poll(), POLL_INTERVAL);
  }

  stopPolling(): void {
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
    if (this.retryTimer) {
      clearTimeout(this.retryTimer);
      this.retryTimer = null;
    }
  }

  private scheduleRetry(): void {
    this.stopPolling();
    this.setStatus("reconnecting");
    this.retryTimer = setTimeout(() => {
      this.retryTimer = null;
      this.poll();
      this.pollTimer = setInterval(() => this.poll(), POLL_INTERVAL);
    }, this.retryBackoff);
  }

  private async poll(): Promise<void> {
    try {
      const since = this.lastPollTime;
      const url = `${this.getServerUrl()}?since=${since}${this.config.sessionId ? `&session=${this.config.sessionId}` : ""}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`Poll failed: ${res.status}`);
      const data = await res.json();
      const serverTime = data.serverTime || Date.now();

      this.consecutiveFailures = 0;
      this.retryBackoff = INITIAL_RETRY_BACKOFF;
      this.setStatus("connected");

      if (data.entries && data.entries.length > 0) {
        const entries = data.entries as GestureLogEntry[];
        const maxEntryTs = Math.max(...entries.map((e: GestureLogEntry) => e.timestamp), 0);
        this.lastPollTime = Math.max(serverTime, maxEntryTs, this.lastPollTime);

        for (const entry of entries) {
          const exists = this.entries.some((e) => e.id === entry.id);
          if (!exists) {
            this.entries.push(entry);
            this.config.onAlert?.(entry);
          }
        }
      } else {
        this.lastPollTime = Math.max(serverTime, this.lastPollTime);
      }

      if (data.patientMetrics) {
        this.config.onMetrics?.(data.patientMetrics);
      }
    } catch {
      this.consecutiveFailures++;
      this.retryBackoff = Math.min(this.retryBackoff * 2, MAX_RETRY_INTERVAL);
      if (this.consecutiveFailures > 2) {
        this.setStatus("disconnected");
      }
      this.scheduleRetry();
    }
  }

  async flushOfflineQueue(): Promise<void> {
    if (this.offlineQueue.length === 0) return;
    const queue = [...this.offlineQueue];
    this.offlineQueue = [];
    for (const entry of queue) {
      await this.sendAlert(entry);
    }
  }

  getEntries(): GestureLogEntry[] {
    return [...this.entries];
  }

  destroy(): void {
    this.stopPolling();
    try {
      this.broadcastChannel?.close();
    } catch {}
    this.entries = [];
    this.offlineQueue = [];
  }
}

export function createNetworkSync(config: NetworkSyncConfig): NetworkSync {
  const sync = new NetworkSync(config);
  sync.startPolling();
  return sync;
}
