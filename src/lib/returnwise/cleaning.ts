import { classifyReason } from "./classifier";
import { PLATFORM_ALIASES, type ReasonCategory } from "./config";

export const STANDARD_COLUMNS = [
  "Platform", "Order_ID", "Product_ID", "Product_Name", "Product_Category", "Order_Date",
  "Price", "Quantity", "Discount_Applied", "Payment_Type", "Shipping_Method", "Return_Status",
  "Return_Date", "Returned_Quantity", "Return_Reason", "City",
] as const;
export type StdCol = (typeof STANDARD_COLUMNS)[number];

export const REQUIRED_COLUMNS: StdCol[] = [
  "Platform", "Order_ID", "Product_ID", "Product_Name", "Product_Category", "Order_Date",
  "Price", "Quantity", "Return_Status",
];

export interface CleanRow {
  dedupe_key: string;
  order_ref: string;
  platform: string;
  product_id: string;
  product_name: string;
  category: string;
  order_date: string; // YYYY-MM-DD
  price: number;
  quantity: number;
  discount: number;
  payment_type: string | null;
  shipping_method: string | null;
  returned: boolean;
  return_date: string | null;
  returned_qty: number;
  return_reason: string | null;
  reason_category: ReasonCategory | null;
  city: string | null;
  flag: string | null;
}

export interface Problem { row_number: number; kind: "rejected" | "flagged"; reason: string }

export interface CleanStats {
  uploaded: number;
  valid: number;
  duplicates: number;
  corrected: number;
  rejected: number;
  flagged: number;
}

const normHeader = (h: string) => h.toLowerCase().replace(/[^a-z]/g, "");
const HEADER_MAP = new Map<string, StdCol>(STANDARD_COLUMNS.map((c) => [normHeader(c), c]));
HEADER_MAP.set("discount", "Discount_Applied");
HEADER_MAP.set("sku", "Product_ID");
HEADER_MAP.set("category", "Product_Category");
HEADER_MAP.set("returnqty", "Returned_Quantity");
HEADER_MAP.set("returnedqty", "Returned_Quantity");

/** Maps the sheet's headers to standard columns. Unknown columns (PII etc.) are dropped. */
export function mapHeaders(headers: string[]): { map: Map<string, StdCol>; missing: StdCol[] } {
  const map = new Map<string, StdCol>();
  for (const h of headers) {
    const std = HEADER_MAP.get(normHeader(String(h)));
    if (std && ![...map.values()].includes(std)) map.set(h, std);
  }
  const present = new Set(map.values());
  return { map, missing: REQUIRED_COLUMNS.filter((c) => !present.has(c)) };
}

/** Keep only standard columns; everything else is discarded immediately. */
export function projectRow(raw: Record<string, unknown>, map: Map<string, StdCol>): Partial<Record<StdCol, unknown>> {
  const out: Partial<Record<StdCol, unknown>> = {};
  for (const [h, std] of map) out[std] = raw[h];
  return out;
}

const MONTHS: Record<string, number> = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, sept: 9, oct: 10, nov: 11, dec: 12,
};
const pad = (n: number) => String(n).padStart(2, "0");
function ymd(y: number, m: number, d: number): string | null {
  if (y < 100) y += 2000;
  const dt = new Date(Date.UTC(y, m - 1, d));
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== m - 1 || dt.getUTCDate() !== d) return null;
  if (y < 2000 || y > 2100) return null;
  return `${y}-${pad(m)}-${pad(d)}`;
}

/** Accepts Date objects, Excel serials, ISO, DD/MM/YYYY, DD-MM-YY, "12 Jan 2026", "Jan 12, 2026". Returns [date, wasReformatted]. */
export function parseDate(v: unknown): [string | null, boolean] {
  if (v == null || v === "") return [null, false];
  if (v instanceof Date && !isNaN(v.getTime())) {
    // SheetJS cellDates gives local-midnight dates; add 12h to dodge TZ rollovers.
    const d = new Date(v.getTime() + 12 * 3600 * 1000);
    return [ymd(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate()), false];
  }
  if (typeof v === "number" && v > 20000 && v < 80000) {
    const d = new Date(Date.UTC(1899, 11, 30) + Math.round(v) * 86400000);
    return [ymd(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate()), true];
  }
  const s = String(v).trim();
  let m = s.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
  if (m) {
    const r = ymd(+m[1], +m[2], +m[3]);
    return [r, r !== s];
  }
  m = s.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})$/);
  if (m) return [ymd(+m[3], +m[2], +m[1]), true]; // Indian DD/MM/YYYY
  m = s.match(/^(\d{1,2})[\s-]+([a-z]{3,9})[\s,-]+(\d{2,4})$/i);
  if (m && MONTHS[m[2].slice(0, 4).toLowerCase()] ?? MONTHS[m?.[2]?.slice(0, 3).toLowerCase() ?? ""]) {
    const mo = MONTHS[m[2].slice(0, 3).toLowerCase()];
    return [mo ? ymd(+m[3], mo, +m[1]) : null, true];
  }
  m = s.match(/^([a-z]{3,9})[\s-]+(\d{1,2}),?[\s-]+(\d{2,4})$/i);
  if (m) {
    const mo = MONTHS[m[1].slice(0, 3).toLowerCase()];
    return [mo ? ymd(+m[3], mo, +m[2]) : null, true];
  }
  return [null, false];
}

function num(v: unknown): number | null {
  if (v == null || v === "") return null;
  if (typeof v === "number") return isFinite(v) ? v : null;
  const s = String(v).replace(/[₹,\s]|rs\.?|inr/gi, "").replace(/%$/, "");
  if (!/^-?\d+(\.\d+)?$/.test(s)) return null;
  return parseFloat(s);
}
const str = (v: unknown) => (v == null ? "" : String(v).trim());

export function normalizePlatform(v: unknown): string | null {
  const k = str(v).toLowerCase().replace(/\s+/g, "");
  return PLATFORM_ALIASES[k] ?? null;
}
function normalizePayment(v: unknown): string | null {
  const s = str(v).toLowerCase();
  if (!s) return null;
  if (/cod|cash/.test(s)) return "COD";
  if (/prepaid|upi|card|online|net ?banking|wallet|paid/.test(s)) return "Prepaid";
  return str(v);
}
function normalizeReturnStatus(v: unknown): boolean | null {
  const s = str(v).toLowerCase().replace(/[^a-z]/g, "");
  if (["returned", "return", "yes", "y", "true", "rto"].includes(s)) return true;
  if (["notreturned", "no", "n", "false", "delivered", ""].includes(s)) return false;
  return null;
}
const titleName = (s: string) => s.replace(/\s+/g, " ").trim();

function randomRef(): string {
  const b = new Uint8Array(5);
  crypto.getRandomValues(b);
  return "RW-" + Array.from(b, (x) => x.toString(16).padStart(2, "0")).join("").toUpperCase();
}
export async function sha256(s: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return Array.from(new Uint8Array(buf), (x) => x.toString(16).padStart(2, "0")).join("");
}

/**
 * Cleans projected rows. `seenKeys` holds dedupe keys already stored for the session
 * (cross-file duplicates); it is mutated with new keys.
 * `rowOffset` = spreadsheet row number of the first data row (header is row 1 → 2).
 */
export async function cleanRows(
  rows: Partial<Record<StdCol, unknown>>[],
  seenKeys: Set<string>,
  rowOffset = 2,
): Promise<{ clean: CleanRow[]; problems: Problem[]; stats: CleanStats }> {
  const clean: CleanRow[] = [];
  const problems: Problem[] = [];
  const stats: CleanStats = { uploaded: 0, valid: 0, duplicates: 0, corrected: 0, rejected: 0, flagged: 0 };
  // Product name unification: first-seen trimmed name per Product_ID wins.
  const nameById = new Map<string, string>();

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    const rowNo = i + rowOffset;
    if (Object.values(r).every((v) => v == null || str(v) === "")) continue;
    stats.uploaded++;
    let corrected = false;
    const reject = (reason: string) => { problems.push({ row_number: rowNo, kind: "rejected", reason }); stats.rejected++; };

    const platform = normalizePlatform(r.Platform);
    if (!platform) { reject(`Unknown platform "${str(r.Platform) || "blank"}"`); continue; }
    if (platform !== str(r.Platform)) corrected = true;

    const orderId = str(r.Order_ID);
    const productId = str(r.Product_ID).toUpperCase();
    if (!orderId) { reject("Missing Order_ID"); continue; }
    if (!productId) { reject("Missing Product_ID"); continue; }

    const price = num(r.Price);
    if (price == null || price < 0) { reject(`Blank or non-numeric price "${str(r.Price) || "blank"}"`); continue; }
    const qtyRaw = num(r.Quantity);
    if (qtyRaw == null || qtyRaw <= 0) { reject(`Invalid quantity "${str(r.Quantity) || "blank"}"`); continue; }
    const quantity = Math.round(qtyRaw);

    const [orderDate, od] = parseDate(r.Order_Date);
    if (!orderDate) { reject(`Unreadable order date "${str(r.Order_Date) || "blank"}"`); continue; }
    if (od) corrected = true;

    const returned = normalizeReturnStatus(r.Return_Status);
    if (returned == null) { reject(`Unknown return status "${str(r.Return_Status)}"`); continue; }

    const key = await sha256(`${platform}|${orderId.toLowerCase()}|${productId}`);
    if (seenKeys.has(key)) { stats.duplicates++; continue; }
    seenKeys.add(key);

    let discount = num(r.Discount_Applied) ?? 0;
    if (discount > 0 && discount < 1 && typeof r.Discount_Applied === "number") { discount *= 100; corrected = true; }
    if (discount < 0 || discount > 100) { discount = Math.min(100, Math.max(0, discount)); corrected = true; }

    const rawName = str(r.Product_Name);
    let name = titleName(rawName) || productId;
    if (nameById.has(productId)) name = nameById.get(productId)!;
    else nameById.set(productId, name);
    if (name !== rawName) corrected = true;

    const flags: string[] = [];
    let returnDate: string | null = null;
    let returnedQty = 0;
    let reason: string | null = null;
    if (returned) {
      const [rd, rdc] = parseDate(r.Return_Date);
      returnDate = rd;
      if (rdc) corrected = true;
      if (rd && rd < orderDate) flags.push("Return date before order date");
      const rq = num(r.Returned_Quantity);
      returnedQty = rq == null || rq <= 0 ? quantity : Math.round(rq);
      if (rq == null) corrected = true;
      if (returnedQty > quantity) { flags.push(`Returned quantity (${returnedQty}) above ordered (${quantity}); capped`); returnedQty = quantity; }
      reason = str(r.Return_Reason) || null;
    }
    const category = titleName(str(r.Product_Category)) || "Uncategorised";
    if (flags.length) { stats.flagged++; problems.push({ row_number: rowNo, kind: "flagged", reason: flags.join("; ") }); }
    if (corrected) stats.corrected++;
    stats.valid++;

    const payment = normalizePayment(r.Payment_Type);
    clean.push({
      dedupe_key: key,
      order_ref: randomRef(),
      platform,
      product_id: productId,
      product_name: name,
      category,
      order_date: orderDate,
      price,
      quantity,
      discount,
      payment_type: payment,
      shipping_method: str(r.Shipping_Method) || null,
      returned,
      return_date: returnDate,
      returned_qty: returnedQty,
      return_reason: reason,
      reason_category: returned ? classifyReason(reason, category) : null,
      city: str(r.City) || null,
      flag: flags.length ? flags.join("; ") : null,
    });
  }
  return { clean, problems, stats };
}
