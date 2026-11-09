// Synthetic demo data generator (deterministic). Output uses the standard upload columns,
// so it runs through exactly the same cleaning + analytics code as uploaded files.
import type { StdCol } from "./cleaning";

function rng(seed: number) {
  return () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  };
}

type Prod = { id: string; name: string; cat: string; price: number; rate: number; reasons: [string, number][] };

const REASON_TEXT: Record<string, string[]> = {
  size: ["Size too small", "bahut chota hai", "Too tight at waist", "size bada hai", "Doesn't fit well"],
  defect: ["Stopped working after 2 days", "kharab nikla", "Not charging", "defective piece", "No sound from left side"],
  wrong: ["Wrong colour sent", "Received different item", "galat product aaya", "wrong model delivered"],
  damage: ["Box was crushed, item cracked", "toota hua aaya", "Damaged in packaging", "glass shattered"],
  desc: ["Looks different from image", "Material cheap, not as described", "colour different from photo"],
  late: ["Delivery was late", "Delayed by a week"],
  mind: ["Changed mind", "Not needed anymore", "ordered by mistake"],
  other: ["ok", "personal reasons", "—"],
};

const PRODUCTS: Prod[] = [
  { id: "FSH-KUR-01", name: "Cotton Kurti Blue", cat: "Fashion", price: 799, rate: 0.38, reasons: [["size", 0.7], ["desc", 0.2], ["mind", 0.1]] },
  { id: "FSH-JNS-02", name: "Slim Fit Jeans", cat: "Fashion", price: 1199, rate: 0.12, reasons: [["size", 0.6], ["mind", 0.4]] },
  { id: "FSH-TSH-03", name: "Graphic T-Shirt", cat: "Fashion", price: 449, rate: 0.08, reasons: [["size", 0.5], ["desc", 0.5]] },
  { id: "ELC-EAR-01", name: "Wireless Earbuds Pro", cat: "Electronics", price: 1899, rate: 0.34, reasons: [["defect", 0.7], ["desc", 0.15], ["mind", 0.15]] },
  { id: "ELC-PWB-02", name: "Power Bank 10000mAh", cat: "Electronics", price: 1299, rate: 0.07, reasons: [["defect", 0.6], ["late", 0.4]] },
  { id: "ELC-CBL-03", name: "USB-C Cable 1m", cat: "Electronics", price: 249, rate: 0.06, reasons: [["defect", 0.5], ["wrong", 0.5]] },
  { id: "HOM-LMP-01", name: "Ceramic Table Lamp", cat: "Home Decor", price: 1499, rate: 0.36, reasons: [["damage", 0.75], ["wrong", 0.15], ["other", 0.1]] },
  { id: "HOM-CSH-02", name: "Cushion Cover Set", cat: "Home Decor", price: 599, rate: 0.09, reasons: [["desc", 0.6], ["wrong", 0.4]] },
  { id: "HOM-WCL-03", name: "Wall Clock Wooden", cat: "Home Decor", price: 899, rate: 0.08, reasons: [["damage", 0.5], ["late", 0.5]] },
  { id: "BTY-SRM-01", name: "Vitamin C Serum", cat: "Beauty", price: 549, rate: 0.07, reasons: [["mind", 0.5], ["desc", 0.5]] },
  { id: "BTY-LIP-02", name: "Matte Lipstick Kit", cat: "Beauty", price: 399, rate: 0.06, reasons: [["wrong", 0.6], ["mind", 0.4]] },
  { id: "BTY-HDR-03", name: "Hair Dryer Compact", cat: "Beauty", price: 999, rate: 0.08, reasons: [["defect", 0.6], ["late", 0.4]] },
];

const PLATFORMS = ["Amazon", "Flipkart", "Meesho"];
const MONTHS = [
  [2026, 8], [2026, 9], [2026, 10],
] as const;

export function generateDemoRows(count = 600): Partial<Record<StdCol, unknown>>[] {
  const r = rng(42);
  const pick = <T,>(a: readonly T[]) => a[Math.floor(r() * a.length)]!;
  const rows: Partial<Record<StdCol, unknown>>[] = [];
  for (let i = 0; i < count; i++) {
    const p = PRODUCTS[i % PRODUCTS.length]!;
    const [y, m] = MONTHS[Math.floor(r() * MONTHS.length)]!;
    const day = 1 + Math.floor(r() * 27);
    const qty = r() < 0.85 ? 1 : 2;
    const returned = r() < p.rate;
    let reasonKey = p.reasons[0]![0];
    if (returned) {
      let x = r();
      for (const [k, w] of p.reasons) { if ((x -= w) <= 0) { reasonKey = k; break; } }
    }
    const rd = new Date(Date.UTC(y, m - 1, day + 4 + Math.floor(r() * 6)));
    rows.push({
      Platform: pick(PLATFORMS),
      Order_ID: `DEMO-${100000 + i}`,
      Product_ID: p.id,
      Product_Name: p.name,
      Product_Category: p.cat,
      Order_Date: `${y}-${String(m).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
      Price: p.price,
      Quantity: qty,
      Discount_Applied: pick([0, 0, 5, 10, 15, 20]),
      Payment_Type: r() < 0.55 ? "COD" : "Prepaid",
      Shipping_Method: pick(["Standard", "Express"]),
      Return_Status: returned ? "Returned" : "Not Returned",
      Return_Date: returned ? rd.toISOString().slice(0, 10) : null,
      Returned_Quantity: returned ? qty : null,
      Return_Reason: returned ? pick(REASON_TEXT[reasonKey]!) : null,
      City: pick(["Mumbai", "Delhi", "Bengaluru", "Chennai", "Jaipur", "Pune"]),
    });
  }
  return rows;
}
