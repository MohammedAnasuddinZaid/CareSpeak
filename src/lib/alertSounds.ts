import { ALERT_SOUNDS } from "@/types";

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!audioCtx) {
    try { audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)(); } catch { return null; }
  }
  if (audioCtx.state === "suspended") audioCtx.resume();
  return audioCtx;
}

export function playAlertSound(gestureName: string): void {
  const ctx = getAudioContext();
  if (!ctx) return;

  const soundConfig = ALERT_SOUNDS[gestureName] ?? ALERT_SOUNDS.EMERGENCY;
  const { frequency, duration, type } = soundConfig;

  const oscillator = ctx.createOscillator();
  const gainNode = ctx.createGain();

  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, ctx.currentTime);

  if (gestureName === "HELP" || gestureName === "EMERGENCY") {
    oscillator.frequency.setValueAtTime(frequency, ctx.currentTime);
    oscillator.frequency.linearRampToValueAtTime(frequency * 1.5, ctx.currentTime + duration / 1000);
  }

  if (gestureName === "EMERGENCY") {
    gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
    gainNode.gain.linearRampToValueAtTime(0, ctx.currentTime + duration / 1000);
    for (let i = 0; i < 3; i++) {
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = "square";
      osc2.frequency.setValueAtTime(440 + i * 110, ctx.currentTime + i * 0.3);
      gain2.gain.setValueAtTime(0.2, ctx.currentTime + i * 0.3);
      gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.3 + 0.25);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(ctx.currentTime + i * 0.3);
      osc2.stop(ctx.currentTime + i * 0.3 + 0.25);
    }
  } else {
    gainNode.gain.setValueAtTime(0.2, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration / 1000);
  }

  oscillator.connect(gainNode);
  gainNode.connect(ctx.destination);
  oscillator.start(ctx.currentTime);
  oscillator.stop(ctx.currentTime + duration / 1000);
}
