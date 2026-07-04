import { HandData, HandGesture, Point } from "@/types";

const WRIST = 0;
const THUMB_MCP = 2;
const THUMB_IP = 3;
const THUMB_TIP = 4;
const INDEX_MCP = 5;
const INDEX_PIP = 6;
const INDEX_TIP = 8;
const MIDDLE_MCP = 9;
const MIDDLE_PIP = 10;
const MIDDLE_TIP = 12;
const RING_MCP = 13;
const RING_PIP = 14;
const RING_TIP = 16;
const PINKY_MCP = 17;
const PINKY_PIP = 18;
const PINKY_TIP = 20;

const FINGERS = [
  { tip: INDEX_TIP, pip: INDEX_PIP, mcp: INDEX_MCP },
  { tip: MIDDLE_TIP, pip: MIDDLE_PIP, mcp: MIDDLE_MCP },
  { tip: RING_TIP, pip: RING_PIP, mcp: RING_MCP },
  { tip: PINKY_TIP, pip: PINKY_PIP, mcp: PINKY_MCP },
];

function dist(a: Point, b: Point): number {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2 + (a.z - b.z) ** 2);
}

function handSize(landmarks: Point[]): number {
  return dist(landmarks[WRIST], landmarks[MIDDLE_MCP]);
}

function getFingerRatios(landmarks: Point[]): number[] {
  return FINGERS.map((f) => {
    const tipDist = dist(landmarks[f.tip], landmarks[f.mcp]);
    const pipDist = dist(landmarks[f.pip], landmarks[f.mcp]);
    return pipDist > 0 ? tipDist / pipDist : 0;
  });
}

function getThumbState(landmarks: Point[]): { extended: boolean; up: boolean; down: boolean } {
  const tipDist = dist(landmarks[THUMB_TIP], landmarks[THUMB_MCP]);
  const ipDist = dist(landmarks[THUMB_IP], landmarks[THUMB_MCP]);
  const extended = ipDist > 0 && tipDist > ipDist * 1.05;
  const yDiff = landmarks[THUMB_MCP].y - landmarks[THUMB_TIP].y;
  const up = yDiff > 0.005;
  const down = yDiff < -0.005;
  return { extended, up, down };
}

function areFingersSpread(landmarks: Point[]): boolean {
  const hs = handSize(landmarks);
  if (hs < 1e-6) return false;
  let spreadCount = 0;
  for (let i = 0; i < FINGERS.length - 1; i++) {
    const d = dist(landmarks[FINGERS[i].tip], landmarks[FINGERS[i + 1].tip]);
    if (d > hs * 0.18) spreadCount++;
  }
  return spreadCount >= 2;
}

export function isFist(landmarks: Point[]): boolean {
  const ratios = getFingerRatios(landmarks);
  const thumb_ext = dist(landmarks[THUMB_TIP], landmarks[THUMB_MCP]) > dist(landmarks[THUMB_IP], landmarks[THUMB_MCP]) * 1.05;
  return ratios.every((r) => r < 0.85) && !thumb_ext;
}

export function isPeaceSign(landmarks: Point[]): boolean {
  const ratios = getFingerRatios(landmarks);
  const [idxRatio, midRatio, ringRatio, pinkyRatio] = ratios;
  const thumbExtended = dist(landmarks[THUMB_TIP], landmarks[THUMB_MCP]) > dist(landmarks[THUMB_IP], landmarks[THUMB_MCP]) * 1.05;
  return idxRatio > 1.05 && midRatio > 1.05 && ringRatio < 0.85 && pinkyRatio < 0.85 && !thumbExtended;
}

export function isOpenPalm(landmarks: Point[]): boolean {
  const ratios = getFingerRatios(landmarks);
  const allExtended = ratios.every((r) => r > 1.05);
  const thumbExtended = dist(landmarks[THUMB_TIP], landmarks[THUMB_MCP]) > dist(landmarks[THUMB_IP], landmarks[THUMB_MCP]) * 1.05;
  return allExtended && thumbExtended;
}

export function classifyHandGesture(
  hands: HandData[]
): { gesture: HandGesture; confidence: number } | null {
  if (!hands || hands.length === 0) return null;

  if (hands.length >= 2) {
    const bothOpen = hands.every((h) => {
      const ratios2 = getFingerRatios(h.landmarks);
      const allExt = ratios2.every((r) => r > 1.05);
      const spread = areFingersSpread(h.landmarks);
      return allExt && spread;
    });
    if (bothOpen) return { gesture: "WATER", confidence: 0.92 };
  }

  const lm = hands[0].landmarks;
  const ratios = getFingerRatios(lm);
  const thumb = getThumbState(lm);

  const [idxRatio, midRatio, ringRatio, pinkyRatio] = ratios;
  const idxCurl = idxRatio < 0.95;
  const midCurl = midRatio < 0.95;
  const ringCurl = ringRatio < 0.95;
  const pinkyCurl = pinkyRatio < 0.95;
  const idxExt = idxRatio > 1.05;
  const midExt = midRatio > 1.05;
  const ringExt = ringRatio > 1.05;
  const pinkyExt = pinkyRatio > 1.05;
  const allCurled = idxCurl && midCurl && ringCurl && pinkyCurl;

  if (thumb.extended && thumb.up && allCurled) {
    return { gesture: "YES", confidence: 0.9 };
  }

  if (thumb.extended && thumb.down && allCurled) {
    return { gesture: "NO", confidence: 0.9 };
  }

  if (idxExt && pinkyExt && midCurl && ringCurl) {
    return { gesture: "HELP", confidence: 0.9 };
  }

  return null;
}

const SMOOTHING_WINDOW = 8;
const REQUIRED_MAJORITY = 0.75;

export class HandGestureSmoother {
  private buffer: { gesture: HandGesture; confidence: number }[] = [];
  private stable: HandGesture = null;
  private stableConf = 0;
  private gestureStartTime = 0;

  push(result: { gesture: HandGesture; confidence: number } | null) {
    this.buffer.push(result ?? { gesture: null, confidence: 0 });
    if (this.buffer.length > SMOOTHING_WINDOW) this.buffer.shift();
    if (this.buffer.length < 2) return { gesture: this.stable, confidence: this.stableConf };

    const counts = new Map<string, { count: number; confs: number[] }>();
    for (const item of this.buffer) {
      const key = item.gesture ?? "__none__";
      if (!counts.has(key)) counts.set(key, { count: 0, confs: [] });
      const entry = counts.get(key)!;
      entry.count++;
      entry.confs.push(item.confidence);
    }

    let bestKey = "__none__";
    let bestCount = 0;
    for (const [key, val] of counts) {
      if (val.count > bestCount) {
        bestCount = val.count;
        bestKey = key;
      }
    }

    if (bestKey !== "__none__" && bestCount >= this.buffer.length * REQUIRED_MAJORITY && bestCount >= 2) {
      const entry = counts.get(bestKey)!;
      const newGesture = bestKey === "__none__" ? null : (bestKey as HandGesture);
      const newConf = entry.confs.reduce((a, b) => a + b, 0) / entry.confs.length;

      if (newGesture !== this.stable) {
        this.gestureStartTime = Date.now();
      }

      this.stable = newGesture;
      this.stableConf = newConf;
    }

    const now = Date.now();
    const holdTime = now - this.gestureStartTime;
    const adjustedConf = this.stableConf * Math.min(1, holdTime / 500);

    return { gesture: this.stable, confidence: Math.min(adjustedConf, 1) };
  }

  reset() {
    this.buffer = [];
    this.stable = null;
    this.stableConf = 0;
    this.gestureStartTime = 0;
  }
}
