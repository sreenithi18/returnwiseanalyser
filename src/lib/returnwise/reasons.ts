// Pure helpers for AI return-reason classification (shared by server and tests).

export const NO_REASON = "No reason given";
export const UNCLASSIFIED = "Unclassified";
export const AI_UNAVAILABLE_MESSAGE = "AI classification is unavailable. Showing unclassified reasons.";
export const AI_BATCH_SIZE = 100;

/** Cache key: same text + category is only ever classified once per session. */
export const reasonKey = (text: string, category: string) =>
  `${text.toLowerCase().replace(/\s+/g, " ").trim()}|${category.toLowerCase().trim()}`;

/** Remove anything that looks like an email, URL or phone number before text leaves the app. */
export function scrubPII(text: string): string {
  return text
    .replace(/[\w.+-]+@[\w-]+(\.[\w-]+)+/g, "[removed]")
    .replace(/\b(https?:\/\/|www\.)\S+/gi, "[removed]")
    .replace(/\b[\w-]+\.(com|in|net|org|co|io|me|ly)(\/\S*)?\b/gi, "[removed]")
    .replace(/(\+?\d[\d\s-]{7,}\d)/g, "[removed]")
    .replace(/\s+/g, " ")
    .trim();
}

export type Confidence = "high" | "medium" | "low";
export interface Classification { issue_label: string; theme: string; confidence: Confidence }

/** Theme/label for one returned line, given the session cache. Blank → "No reason given"; missing → "Unclassified". */
export function resolveReason(
  text: string | null | undefined,
  category: string,
  cache: Map<string, Classification>,
): Classification | { issue_label: string; theme: string; confidence: null } {
  if (!text || !text.trim()) return { issue_label: NO_REASON, theme: NO_REASON, confidence: null };
  return cache.get(reasonKey(text, category)) ?? { issue_label: UNCLASSIFIED, theme: UNCLASSIFIED, confidence: null };
}

/** Clean model output: short labels, a valid confidence, never empty. */
export function normalizeClassification(r: { issue_label?: unknown; theme?: unknown; confidence?: unknown }): Classification | null {
  const label = String(r.issue_label ?? "").trim().slice(0, 60);
  const theme = String(r.theme ?? "").trim().slice(0, 40);
  if (!label || !theme) return null;
  const c = String(r.confidence ?? "").toLowerCase();
  return { issue_label: label, theme, confidence: c === "high" || c === "low" ? c : "medium" };
}
