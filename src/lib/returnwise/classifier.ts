import {
  RETURN_REASON_KEYWORDS,
  SIZE_CONTEXT_CATEGORIES,
  type ReasonCategory,
} from "./config";

function editDistanceAtMostOne(a: string, b: string): boolean {
  if (a === b) return true;
  if (Math.abs(a.length - b.length) > 1) return false;
  let i = 0, j = 0, edits = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) { i++; j++; continue; }
    if (++edits > 1) return false;
    if (a.length > b.length) i++;
    else if (b.length > a.length) j++;
    else { i++; j++; }
  }
  return edits + (a.length - i) + (b.length - j) <= 1;
}

const GENERIC_SIZE_WORDS = new Set(["small", "big", "large", "short", "long"]);

export function classifyReason(text: string | null | undefined, category = ""): ReasonCategory {
  if (!text || !text.trim()) return "Other/needs review";
  const norm = text.toLowerCase().replace(/[^a-z0-9' ]+/g, " ").replace(/\s+/g, " ").trim();
  const words = norm.split(" ");
  const isApparel = SIZE_CONTEXT_CATEGORIES.some((c) => category.toLowerCase().includes(c));

  let best: ReasonCategory = "Other/needs review";
  let bestScore = 0;
  for (const [cat, keywords] of Object.entries(RETURN_REASON_KEYWORDS) as [ReasonCategory, string[]][]) {
    let score = 0;
    for (const kw of keywords) {
      if (kw.includes(" ")) {
        if (norm.includes(kw)) score += 2;
        continue;
      }
      const hit = words.some((w) => w === kw || (kw.length >= 5 && w.length >= 4 && editDistanceAtMostOne(w, kw)));
      if (!hit) continue;
      // Category context: generic size words only count strongly for apparel/footwear.
      if (cat === "Size/Fit" && GENERIC_SIZE_WORDS.has(kw) && !isApparel) score += 0.5;
      else score += 1;
    }
    if (score > bestScore) { best = cat; bestScore = score; }
  }
  return bestScore >= 1 ? best : "Other/needs review";
}
