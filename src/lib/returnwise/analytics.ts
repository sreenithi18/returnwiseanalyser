import {
  MIN_ORDER_LINES_FOR_PROBLEMATIC,
  RECOMMENDATIONS,
  REASON_CATEGORIES,
  type ReasonCategory,
} from "./config";

export interface Line {
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
  reason_category: string | null;
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
  orders: number;
  returnedOrders: number;
  returnedUnits: number;
  returnRate: number;
  returnLoss: number;
}
export function kpis(lines: Line[]): Kpis {
  let unitsSold = 0, revenue = 0, returnedOrders = 0, returnedUnits = 0, returnLoss = 0;
  for (const l of lines) {
    const net = netUnitPrice(l.price, l.discount);
    unitsSold += l.quantity;
    revenue += net * l.quantity;
    if (l.returned && l.returned_qty > 0) {
      returnedOrders++;
      returnedUnits += l.returned_qty;
      returnLoss += net * l.returned_qty;
    }
  }
  return {
    unitsSold, revenue, orders: lines.length, returnedOrders, returnedUnits,
    returnRate: unitsSold ? returnedUnits / unitsSold : 0, returnLoss,
  };
}

export function reasonCounts(lines: Line[]): { reason: ReasonCategory; count: number }[] {
  const m = new Map<string, number>();
  for (const l of lines) if (l.returned && l.reason_category) m.set(l.reason_category, (m.get(l.reason_category) ?? 0) + l.returned_qty);
  return REASON_CATEGORIES.map((r) => ({ reason: r, count: m.get(r) ?? 0 }))
    .filter((r) => r.count > 0)
    .sort((a, b) => b.count - a.count);
}

export interface ProductStat {
  product_id: string;
  product_name: string;
  category: string;
  orderLines: number;
  unitsSold: number;
  returnedUnits: number;
  returnRate: number;
  avgPrice: number;
  returnLoss: number;
  primaryReason: ReasonCategory | null;
  secondaryReason: ReasonCategory | null;
  qualifies: boolean;
  action: string;
}

export function productStats(lines: Line[], minLines = MIN_ORDER_LINES_FOR_PROBLEMATIC): ProductStat[] {
  const by = new Map<string, Line[]>();
  for (const l of lines) (by.get(l.product_id) ?? by.set(l.product_id, []).get(l.product_id)!).push(l);
  const out: ProductStat[] = [];
  for (const [pid, ls] of by) {
    const k = kpis(ls);
    const reasons = reasonCounts(ls);
    const primary = reasons[0]?.reason ?? null;
    out.push({
      product_id: pid,
      product_name: ls[0]!.product_name,
      category: ls[0]!.category,
      orderLines: ls.length,
      unitsSold: k.unitsSold,
      returnedUnits: k.returnedUnits,
      returnRate: k.returnRate,
      avgPrice: ls.reduce((s, l) => s + l.price, 0) / ls.length,
      returnLoss: k.returnLoss,
      primaryReason: primary,
      secondaryReason: reasons[1]?.reason ?? null,
      qualifies: ls.length >= minLines,
      action: primary ? RECOMMENDATIONS[primary] : "No returns recorded — keep monitoring.",
    });
  }
  return out.sort((a, b) => b.returnLoss - a.returnLoss || b.returnRate - a.returnRate);
}

/** Top problematic products: ranked by return loss, only those meeting the minimum order-line rule and with returns. */
export function topProblematic(lines: Line[], n = 3, minLines = MIN_ORDER_LINES_FOR_PROBLEMATIC) {
  const qualifying = productStats(lines, minLines).filter((p) => p.qualifies && p.returnedUnits > 0);
  return { products: qualifying.slice(0, n), qualifyingCount: qualifying.length };
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
  reason: ReasonCategory;
  problem: string;
  evidence: string;
  action: string;
  priority: Priority;
  share: number;
}

const inr = (n: number) => "₹" + Math.round(n).toLocaleString("en-IN");

export function recommendations(lines: Line[]): Recommendation[] {
  const counts = reasonCounts(lines);
  const total = counts.reduce((s, c) => s + c.count, 0);
  if (!total) return [];
  return counts.map(({ reason, count }) => {
    const ls = lines.filter((l) => l.returned && l.reason_category === reason);
    const loss = ls.reduce((s, l) => s + netUnitPrice(l.price, l.discount) * l.returned_qty, 0);
    const prodLoss = new Map<string, { name: string; units: number }>();
    for (const l of ls) {
      const p = prodLoss.get(l.product_id) ?? { name: l.product_name, units: 0 };
      p.units += l.returned_qty;
      prodLoss.set(l.product_id, p);
    }
    const topProds = [...prodLoss.values()].sort((a, b) => b.units - a.units).slice(0, 2).map((p) => `${p.name} (${p.units})`);
    const share = count / total;
    const priority: Priority = share >= 0.25 ? "High" : share >= 0.1 ? "Medium" : "Low";
    return {
      reason,
      problem: `${reason} returns`,
      evidence: `${count} returned units (${(share * 100).toFixed(1)}% of returns), est. loss ${inr(loss)}. Most affected: ${topProds.join(", ")}.`,
      action: RECOMMENDATIONS[reason],
      priority,
      share,
    };
  });
}
