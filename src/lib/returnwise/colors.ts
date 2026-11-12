// One fixed colour per return reason theme, used by every chart and badge.
import { reasonCounts, type Line } from "./analytics";

export const NEUTRAL_REASONS = new Set(["No reason given", "Unclassified", "Other/needs review"]);
const PALETTE = Array.from({ length: 10 }, (_, i) => `var(--chart-${i + 1})`);
export const NEUTRAL_COLOR = "var(--chart-neutral)";

/** Colours are assigned by rank across ALL months, so a reason keeps its colour when the month changes. */
export function reasonColorMap(allLines: Line[]): Record<string, string> {
  const out: Record<string, string> = {};
  let i = 0;
  for (const { reason } of reasonCounts(allLines)) {
    out[reason] = NEUTRAL_REASONS.has(reason) ? NEUTRAL_COLOR : PALETTE[i++ % PALETTE.length]!;
  }
  return out;
}
export const colorFor = (map: Record<string, string>, reason: string | null | undefined) =>
  (reason && map[reason]) || NEUTRAL_COLOR;

export type RateTone = "good" | "warn" | "bad";
/** Return rate colour: green below 10%, amber 10–20%, red above 20%. */
export const rateTone = (rate: number): RateTone => (rate < 0.1 ? "good" : rate <= 0.2 ? "warn" : "bad");
export const RATE_TONE_CLASS: Record<RateTone, string> = { good: "text-good-text", warn: "text-warn-text", bad: "text-bad-text" };
