// ============================================================
// ReturnWise editable configuration.
// The team can safely edit the settings below. Return reasons are classified by AI (see ai.server.ts).
// ============================================================

/** A product is only flagged "problematic" when it has at least this many order lines. */
export const MIN_ORDER_LINES_FOR_PROBLEMATIC = 20;

export const MAX_FILES_PER_SESSION = 3;
export const MAX_FILE_BYTES = 10 * 1024 * 1024;
export const SESSION_HOURS = 24;

/** Recommendation priority = share of total return loss: High at or above HIGH, Medium at or above MEDIUM, else Low. */
export const PRIORITY_HIGH_SHARE = 0.25;
export const PRIORITY_MEDIUM_SHARE = 0.1;

export const PLATFORM_ALIASES: Record<string, "Amazon" | "Flipkart" | "Meesho"> = {
  amazon: "Amazon", amz: "Amazon", "amazon.in": "Amazon", amazonin: "Amazon",
  flipkart: "Flipkart", fk: "Flipkart", flipkrt: "Flipkart",
  meesho: "Meesho", msho: "Meesho", meeesho: "Meesho",
};
