import { MIN_ORDER_LINES_FOR_PROBLEMATIC, PRIORITY_HIGH_SHARE, PRIORITY_MEDIUM_SHARE } from "./config";
import { NO_REASON, UNCLASSIFIED } from "./reasons";

export interface Line {
  /** Pseudonymous order reference: same value for every line of the same order. */
  order_ref: string;
  platform: string;
  product_id: string;
  product_name: string;
  category: string;
  order_date: string;
  price: number;
  quantity: number;
  discount: number;
  payment_type: string | null;
  returned: boolean;
  returned_qty: number;
  /** AI theme for returned lines ("No reason given" / "Unclassified" when applicable). */
  reason_category: string | null;
  /** AI issue label (detail), e.g. "Size too small". */
  reason_label?: string | null;
  reason_confidence?: string | null;
}

export const ALL_MONTHS = "all";
export const monthOf = (d: string) => d.slice(0, 7);
export const netUnitPrice = (price: number, discount: number) => price * (1 - (discount || 0) / 100);

export function monthsIn(lines: Line[]): string[] {
  return [...new Set(lines.map((l) => monthOf(l.order_date)))].sort();
}
export function filterMonth(lines: Line[], month: string): Line[] {
  return month === ALL_MONTHS ? lines : lines.filter((l) => monthOf(l.order_date) === month);
}
export function monthLabel(m: string): string {
  if (m === ALL_MONTHS) return "All months";
  const [y = 2000, mo = 1] = m.split("-").map(Number);
  return new Date(Date.UTC(y, mo - 1, 1)).toLocaleString("en-IN", { month: "long", year: "numeric", timeZone: "UTC" });
}

export interface Kpis {
  unitsSold: number;
  revenue: number;
  /** Unique order references. */
  orders: number;
  /** Rows after cleaning (one per product in an order). */
  orderLines: number;
  /** Unique orders with at least one returned unit. */
  returnedOrders: number;
  returnedUnits: number;
  returnRate: number;
  returnLoss: number;
}
export function kpis(lines: Line[]): Kpis {
  let unitsSold = 0, revenue = 0, returnedUnits = 0, returnLoss = 0;
  const orders = new Set<string>(), returnedOrders = new Set<string>();
  for (const l of lines) {
    const net = netUnitPrice(l.price, l.discount);
    orders.add(l.order_ref);
    unitsSold += l.quantity;
    revenue += net * l.quantity;
    if (l.returned && l.returned_qty > 0) {
      returnedOrders.add(l.order_ref);
      returnedUnits += l.returned_qty;
      returnLoss += net * l.returned_qty;
    }
  }
  return {
    unitsSold, revenue, orders: orders.size, orderLines: lines.length, returnedOrders: returnedOrders.size, returnedUnits,
    returnRate: unitsSold ? returnedUnits / unitsSold : 0, returnLoss,
  };
}

/** Returned units per theme, largest first. */
export function reasonCounts(lines: Line[]): { reason: string; count: number }[] {
  const m = new Map<string, number>();
  for (const l of lines) if (l.returned && l.returned_qty > 0) {
    const r = l.reason_category ?? NO_REASON;
    m.set(r, (m.get(r) ?? 0) + l.returned_qty);
  }
  return [...m].map(([reason, count]) => ({ reason, count })).filter((r) => r.count > 0)
    .sort((a, b) => b.count - a.count || a.reason.localeCompare(b.reason));
}

/** Returned units per specific issue label (detail under each theme). `unsure` = all its lines are low confidence. */
export function issueCounts(lines: Line[]): { label: string; theme: string; count: number; unsure: boolean }[] {
  const m = new Map<string, { label: string; theme: string; count: number; low: number; n: number }>();
  for (const l of lines) if (l.returned && l.returned_qty > 0) {
    const label = l.reason_label ?? l.reason_category ?? NO_REASON;
    const theme = l.reason_category ?? NO_REASON;
    const k = `${theme}|${label}`;
    const e = m.get(k) ?? { label, theme, count: 0, low: 0, n: 0 };
    e.count += l.returned_qty; e.n++; if (l.reason_confidence === "low") e.low++;
    m.set(k, e);
  }
  return [...m.values()].map((e) => ({ label: e.label, theme: e.theme, count: e.count, unsure: e.n > 0 && e.low === e.n }))
    .sort((a, b) => b.count - a.count);
}

const topLabel = (ls: Line[]) => issueCounts(ls)[0]?.label ?? null;

export interface ProductStat {
  product_id: string;
  product_name: string;
  category: string;
  orders: number;
  orderLines: number;
  unitsSold: number;
  returnedUnits: number;
  returnRate: number;
  /** Average list price per order line. */
  avgPrice: number;
  /** Average net unit price after discount per order line. */
  avgNetPrice: number;
  returnLoss: number;
  primaryReason: string | null;
  secondaryReason: string | null;
  /** Most reported issue label for the primary theme. */
  primaryIssue: string | null;
  qualifies: boolean;
  action: string;
}

function productAction(theme: string | null, issue: string | null): string {
  if (!theme) return "No returns recorded — keep monitoring.";
  if (theme === NO_REASON) return "Check the platform return reports: buyers gave no reason for most returns.";
  if (theme === UNCLASSIFIED) return "Check the return comments for this product manually.";
  return `Check why buyers report "${issue ?? theme}" for this product.`;
}

export function productStats(lines: Line[], minLines = MIN_ORDER_LINES_FOR_PROBLEMATIC): ProductStat[] {
  const by = new Map<string, Line[]>();
  for (const l of lines) (by.get(l.product_id) ?? by.set(l.product_id, []).get(l.product_id)!).push(l);
  const out: ProductStat[] = [];
  for (const [pid, ls] of by) {
    const k = kpis(ls);
    const reasons = reasonCounts(ls);
    const primary = reasons[0]?.reason ?? null;
    const primaryIssue = primary ? topLabel(ls.filter((l) => l.reason_category === primary)) : null;
    out.push({
      product_id: pid,
      product_name: ls[0]!.product_name,
      category: ls[0]!.category,
      orders: k.orders,
      orderLines: k.orderLines,
      unitsSold: k.unitsSold,
      returnedUnits: k.returnedUnits,
      returnRate: k.returnRate,
      avgPrice: ls.reduce((s, l) => s + l.price, 0) / ls.length,
      avgNetPrice: ls.reduce((s, l) => s + netUnitPrice(l.price, l.discount), 0) / ls.length,
      returnLoss: k.returnLoss,
      primaryReason: primary,
      secondaryReason: reasons[1]?.reason ?? null,
      primaryIssue,
      qualifies: ls.length >= minLines,
      action: productAction(primary, primaryIssue),
    });
  }
  return out.sort((a, b) => b.returnLoss - a.returnLoss || b.returnRate - a.returnRate);
}

/**
 * Top problematic products, ranked by return loss. Qualifying = at least `minLines` order lines
 * (ALL lines of the product, returned or not) and some returns. If none qualify, the top products
 * by loss are still returned with `lowSample: true` so the page is never empty when data exists.
 */
export function topProblematic(lines: Line[], n = 3, minLines = MIN_ORDER_LINES_FOR_PROBLEMATIC) {
  const withReturns = productStats(lines, minLines).filter((p) => p.returnedUnits > 0);
  const qualifying = withReturns.filter((p) => p.qualifies);
  const lowSample = qualifying.length === 0;
  return { products: (lowSample ? withReturns : qualifying).slice(0, n), qualifyingCount: qualifying.length, lowSample };
}

export function groupRates(lines: Line[], key: "category" | "platform") {
  const m = new Map<string, Line[]>();
  for (const l of lines) (m.get(l[key]) ?? m.set(l[key], []).get(l[key])!).push(l);
  return [...m].map(([name, ls]) => {
    const k = kpis(ls);
    return { name, returnRate: k.returnRate, returnLoss: k.returnLoss, unitsSold: k.unitsSold };
  }).sort((a, b) => b.returnRate - a.returnRate);
}

export function monthlyTrend(lines: Line[]) {
  return monthsIn(lines).map((m) => {
    const k = kpis(filterMonth(lines, m));
    return { month: m, label: monthLabel(m), returnRate: k.returnRate, returnLoss: k.returnLoss };
  });
}

export type Priority = "High" | "Medium" | "Low";
export interface Recommendation {
  reason: string;
  problem: string;
  evidence: string;
  action: string;
  priority: Priority;
  /** Share of total return loss. */
  share: number;
  loss: number;
}

const inr = (n: number) => "₹" + Math.round(n).toLocaleString("en-IN");
export const priorityFor = (lossShare: number): Priority =>
  lossShare >= PRIORITY_HIGH_SHARE ? "High" : lossShare >= PRIORITY_MEDIUM_SHARE ? "Medium" : "Low";
export const PRIORITY_RULE = `Priority = share of total return loss: High ${PRIORITY_HIGH_SHARE * 100}% or more, Medium ${PRIORITY_MEDIUM_SHARE * 100}–${PRIORITY_HIGH_SHARE * 100}%, Low below ${PRIORITY_MEDIUM_SHARE * 100}%.`;

/** One recommendation per theme, built only from the themes and evidence figures. Sorted by loss. */
export function recommendations(lines: Line[]): Recommendation[] {
  const returned = lines.filter((l) => l.returned && l.returned_qty > 0);
  const totalUnits = returned.reduce((s, l) => s + l.returned_qty, 0);
  const totalLoss = returned.reduce((s, l) => s + netUnitPrice(l.price, l.discount) * l.returned_qty, 0);
  if (!totalUnits) return [];
  return reasonCounts(lines).map(({ reason, count }) => {
    const ls = returned.filter((l) => (l.reason_category ?? NO_REASON) === reason);
    const loss = ls.reduce((s, l) => s + netUnitPrice(l.price, l.discount) * l.returned_qty, 0);
    const prod = new Map<string, { name: string; loss: number }>();
    for (const l of ls) {
      const p = prod.get(l.product_id) ?? { name: l.product_name, loss: 0 };
      p.loss += netUnitPrice(l.price, l.discount) * l.returned_qty;
      prod.set(l.product_id, p);
    }
    const topProds = [...prod.values()].sort((a, b) => b.loss - a.loss).slice(0, 2).map((p) => p.name);
    const issues = issueCounts(ls).slice(0, 2).map((i) => `"${i.label}"`);
    const share = totalLoss ? loss / totalLoss : 0;
    let action: string;
    if (reason === NO_REASON) action = `Check the platform return reports for ${topProds.join(" and ")}: buyers gave no reason for these returns.`;
    else if (reason === UNCLASSIFIED) action = `Check these return comments manually for ${topProds.join(" and ")}.`;
    else action = `Check ${topProds.join(" and ")} for ${issues.join(" and ")}.`;
    return {
      reason,
      problem: `${reason} returns`,
      evidence: `${count} returned units (${((count / totalUnits) * 100).toFixed(1)}% of returns), est. loss ${inr(loss)} (${(share * 100).toFixed(1)}% of total return loss). Affected products: ${prod.size} (most: ${topProds.join(", ")}).`,
      action,
      priority: priorityFor(share),
      share,
      loss,
    };
  }).sort((a, b) => b.loss - a.loss);
}
