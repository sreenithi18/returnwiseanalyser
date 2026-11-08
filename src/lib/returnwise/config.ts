// ============================================================
// ReturnWise editable configuration.
// The team can safely edit the keyword lists and settings below.
// ============================================================

/** A product is only flagged "problematic" when it has at least this many order lines. */
export const MIN_ORDER_LINES_FOR_PROBLEMATIC = 20;

export const MAX_FILES_PER_SESSION = 3;
export const MAX_FILE_BYTES = 10 * 1024 * 1024;
export const SESSION_HOURS = 24;

export const REASON_CATEGORIES = [
  "Size/Fit",
  "Defective",
  "Wrong item",
  "Damaged in transit",
  "Not as described",
  "Late delivery",
  "Changed mind",
  "Other/needs review",
] as const;
export type ReasonCategory = (typeof REASON_CATEGORIES)[number];

/**
 * RETURN_REASON_KEYWORDS — case-insensitive. Single words tolerate small typos
 * (1 edit for words of 5+ letters). Phrases (with spaces) must appear as-is.
 * Order matters for ties: earlier categories win.
 */
export const RETURN_REASON_KEYWORDS: Record<Exclude<ReasonCategory, "Other/needs review">, string[]> = {
  "Size/Fit": [
    "size", "small", "large", "tight", "loose", "fit", "fitting", "short", "long", "big",
    "chota", "chhota", "bada", "tight hai", "dheela", "dhila", "xl", "xxl", "length", "waist",
  ],
  Defective: [
    "defective", "defect", "broken", "not working", "stopped working", "faulty", "dead",
    "kharab", "kharaab", "malfunction", "not charging", "no sound", "battery", "dosent work",
    "doesnt work", "doesn't work", "poor quality", "quality", "torn", "stitching",
  ],
  "Wrong item": [
    "wrong", "different item", "different product", "wrong colour", "wrong color", "galat",
    "another product", "mismatch", "not ordered", "wrong size sent", "wrong model",
  ],
  "Damaged in transit": [
    "damaged", "damage", "toota", "tuta", "tuta", "cracked", "crushed", "packaging", "package",
    "box", "dented", "leaked", "leaking", "shattered", "scratch", "scratched",
  ],
  "Not as described": [
    "not as described", "not as shown", "different from image", "picture", "photo", "image",
    "description", "colour different", "color different", "fake", "duplicate", "material",
    "looks different", "not same", "cheap",
  ],
  "Late delivery": [
    "late", "delay", "delayed", "took too long", "not delivered on time", "der se", "slow delivery",
  ],
  "Changed mind": [
    "changed mind", "change of mind", "not needed", "no longer", "dont want", "don't want",
    "nahi chahiye", "mind change", "ordered by mistake", "mistake", "better price", "cheaper elsewhere",
    "not required",
  ],
};

/** Categories where generic size words ("small", "big") are trusted. */
export const SIZE_CONTEXT_CATEGORIES = ["fashion", "apparel", "clothing", "footwear", "shoes", "clothes"];

export const PLATFORM_ALIASES: Record<string, "Amazon" | "Flipkart" | "Meesho"> = {
  amazon: "Amazon", amz: "Amazon", "amazon.in": "Amazon", amazonin: "Amazon",
  flipkart: "Flipkart", fk: "Flipkart", flipkrt: "Flipkart",
  meesho: "Meesho", msho: "Meesho", meeesho: "Meesho",
};

export const RECOMMENDATIONS: Record<ReasonCategory, string> = {
  "Size/Fit": "Add clearer size charts with measurements and fit notes on the listing.",
  Defective: "Run supplier quality inspection and spot-check batches before dispatch.",
  "Wrong item": "Tighten picking and SKU checks (barcode scan before packing).",
  "Damaged in transit": "Improve packaging: sturdier boxes, padding and fragile labels.",
  "Not as described": "Update listing images and descriptions to match the real product.",
  "Late delivery": "Review delivery partner performance and promised delivery times.",
  "Changed mind": "Review COD-heavy orders and set clearer expectations on the listing.",
  "Other/needs review": "Read these return comments manually to find the root cause.",
};
