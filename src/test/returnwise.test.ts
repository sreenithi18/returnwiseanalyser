import { describe, expect, it } from "vitest";
import { NO_REASON, reasonKey, resolveReason, scrubPII, UNCLASSIFIED } from "@/lib/returnwise/reasons";
import { priorityFor, recommendations } from "@/lib/returnwise/analytics";
import { cleanRows, mapHeaders, parseDate, REQUIRED_COLUMNS } from "@/lib/returnwise/cleaning";
import { filterMonth, kpis, netUnitPrice, topProblematic, type Line } from "@/lib/returnwise/analytics";
import { generateDemoRows } from "@/lib/returnwise/demo";
import { deletionNotice, fmtDate, inrShort, shortId } from "@/lib/returnwise/format";
import { rateTone } from "@/lib/returnwise/colors";
import { productStats } from "@/lib/returnwise/analytics";

const base = { Platform: "amazon", Order_ID: "A1", Product_ID: "p1", Product_Name: " Kurti ", Product_Category: "Fashion", Order_Date: "05/10/2026", Price: 1000, Quantity: 2, Return_Status: "Returned", Returned_Quantity: 1, Discount_Applied: 10, Return_Reason: "size chota" };

describe("ReturnWise rules", () => {
  it("net unit price applies discount percent", () => expect(netUnitPrice(1000, 10)).toBe(900));
  it("return loss = net price x returned units", async () => {
    const { clean } = await cleanRows([base], new Set());
    expect(kpis(clean as unknown as Line[]).returnLoss).toBe(900);
  });
  it("removes duplicates on platform+order+product, across files", async () => {
    const seen = new Set<string>();
    await cleanRows([base], seen);
    const r = await cleanRows([{ ...base, Platform: "Amazon" }], seen);
    expect(r.stats.duplicates).toBe(1);
  });
  it("rejects non-numeric price, flags returned qty above ordered", async () => {
    const r = await cleanRows([{ ...base, Price: "abc" }, { ...base, Order_ID: "B", Returned_Quantity: 5 }], new Set());
    expect(r.stats.rejected).toBe(1);
    expect(r.stats.flagged).toBe(1);
    expect(r.clean[0]!.returned_qty).toBe(2);
  });
  it("reports missing required columns", () => expect(mapHeaders(["Platform", "Order_ID"]).missing).toContain("Price"));
  it("matches headers regardless of case, spaces and underscores", () => {
    const h = ["platform", "ORDER ID", "product_id", "Product Name", "product category", "order-date", "PRICE", "quantity", "Return_status"];
    expect(mapHeaders(h).missing).toEqual([]);
  });
  it("a file matching none of the required columns is a template mismatch", () => {
    expect(mapHeaders(["Name", "Phone", "Address"]).missing.length).toBe(REQUIRED_COLUMNS.length);
  });
  it("parses mixed date formats", () => {
    expect(parseDate("05/10/2026")[0]).toBe("2026-10-05");
    expect(parseDate("12 Oct 2026")[0]).toBe("2026-10-12");
    expect(parseDate("2026-10-03")[0]).toBe("2026-10-03");
  });
  it("scrubs phone numbers, emails and URLs before sending reasons to AI", () => {
    const out = scrubPII("call me 98765 43210 or +91-9876543210, mail a.b@x.com, see https://x.com/p and www.shop.in");
    expect(out).not.toMatch(/9876|@|https|www/);
    expect(scrubPII("size chota hai")).toBe("size chota hai");
  });
  it("blank reasons are No reason given; uncached are Unclassified; same text shares one result", () => {
    const cache = new Map([[reasonKey("Size Chota", "Fashion"), { issue_label: "Size too small", theme: "Size & fit", confidence: "high" as const }]]);
    expect(resolveReason("  ", "Fashion", cache).theme).toBe(NO_REASON);
    expect(resolveReason("size  chota", "fashion", cache).issue_label).toBe("Size too small");
    expect(resolveReason("kharab", "Fashion", cache).theme).toBe(UNCLASSIFIED);
  });
  it("return rate colours: green below 10%, amber 10-20%, red above 20%", () => {
    expect(rateTone(0.099)).toBe("good");
    expect(rateTone(0.1)).toBe("warn");
    expect(rateTone(0.2)).toBe("warn");
    expect(rateTone(0.201)).toBe("bad");
  });
  it("short amounts", () => {
    expect(inrShort(573557)).toBe("₹5.7L");
    expect(inrShort(45300)).toBe("₹45.3K");
    expect(inrShort(12500000)).toBe("₹1.3Cr");
  });
  it("priority = share of total return loss: High >=25%, Medium 10-25%, Low <10%", () => {
    expect(priorityFor(0.25)).toBe("High");
    expect(priorityFor(0.249)).toBe("Medium");
    expect(priorityFor(0.1)).toBe("Medium");
    expect(priorityFor(0.099)).toBe("Low");
  });
  it("recommendations are sorted by loss and prioritised by loss share, as Check statements", async () => {
    const mk = (id: string, price: number, theme: string) => ({ ...base, Order_ID: id, Price: price, Discount_Applied: 0, Returned_Quantity: 1, Quantity: 1 });
    const { clean } = await cleanRows([mk("a", 100, "x"), mk("b", 900, "y")], new Set());
    const lines = (clean as unknown as Line[]).map((l, i) => ({ ...l, reason_category: i === 0 ? "Cheap theme" : "Costly theme", reason_label: "Issue" }));
    const recs = recommendations(lines);
    expect(recs.map((r) => r.reason)).toEqual(["Costly theme", "Cheap theme"]);
    expect(recs[0]!.priority).toBe("High");
    expect(recs[1]!.priority).toBe("Medium");
    expect(recs.every((r) => r.action.startsWith("Check "))).toBe(true);
  });
  it("demo: ~600 lines, 12-18% return rate, top 3 are the designed worst products", async () => {
    const { clean } = await cleanRows(generateDemoRows(600), new Set());
    const lines = clean as unknown as Line[];
    expect(lines.length).toBe(600);
    const rate = kpis(lines).returnRate;
    expect(rate).toBeGreaterThan(0.12); expect(rate).toBeLessThan(0.18);
    const top = topProblematic(lines).products.map((p) => p.product_id).sort();
    expect(top).toEqual(["ELC-EAR-01", "FSH-KUR-01", "HOM-LMP-01"]);
    expect(filterMonth(lines, "2026-09").every((l) => l.order_date.startsWith("2026-09"))).toBe(true);
  });
  it("needs 20 order lines (all lines, not only returned) to be problematic; else low-sample fallback", async () => {
    const { clean } = await cleanRows([base], new Set());
    const r = topProblematic(clean as unknown as Line[]);
    expect(r.qualifyingCount).toBe(0);
    expect(r.lowSample).toBe(true);
    expect(r.products.length).toBe(1);
    const rows = Array.from({ length: 20 }, (_, i) => ({ ...base, Order_ID: `Q${i}`, Return_Status: i === 0 ? "Returned" : "Not Returned" }));
    const q = topProblematic((await cleanRows(rows, new Set())).clean as unknown as Line[]);
    expect(q.qualifyingCount).toBe(1);
    expect(q.lowSample).toBe(false);
  });
  it("demo month filter still shows top products (low sample)", async () => {
    const lines = (await cleanRows(generateDemoRows(600), new Set())).clean as unknown as Line[];
    const r = topProblematic(filterMonth(lines, "2026-09"));
    expect(r.products.length).toBe(3);
  });
  it("orders = unique order IDs, order lines = rows; returned orders counted once per order", async () => {
    const { clean } = await cleanRows([base, { ...base, Product_ID: "p2" }, { ...base, Order_ID: "A2", Return_Status: "Delivered" }], new Set(), 2, "s1");
    const k = kpis(clean as unknown as Line[]);
    expect(k.orderLines).toBe(3);
    expect(k.orders).toBe(2);
    expect(k.returnedOrders).toBe(1);
    expect(k.returnRate).toBeCloseTo(2 / 6);
  });
  it("same order across files gets the same reference within a session only", async () => {
    const a = await cleanRows([base], new Set(), 2, "s1");
    const b = await cleanRows([{ ...base, Product_ID: "p9" }], new Set(), 2, "s1");
    const c = await cleanRows([base], new Set(), 2, "s2");
    expect(a.clean[0]!.order_ref).toBe(b.clean[0]!.order_ref);
    expect(a.clean[0]!.order_ref).not.toBe(c.clean[0]!.order_ref);
    expect(a.clean[0]!.order_ref).not.toContain("A1");
  });
  it("avg net price applies discount to list price", async () => {
    const { clean } = await cleanRows([base], new Set());
    const p = productStats(clean as unknown as Line[])[0]!;
    expect(p.avgPrice).toBe(1000);
    expect(p.avgNetPrice).toBe(900);
  });
  it("dates read like 11 Nov 2026 with time and hours left", () => {
    expect(fmtDate(new Date(2026, 8, 3))).toBe("3 Sep 2026");
    const exp = new Date(2026, 10, 11, 15, 9);
    const now = new Date(exp.getTime() - 23.5 * 3600_000);
    expect(deletionNotice(exp, now)).toBe("Data will be deleted on 11 Nov 2026, 3:09 pm (23h left)");
  });
  it("shortens the Session ID for the header", () => expect(shortId("abcdefghijklmnopqrstuvwxyz")).toBe("abcdef…wxyz"));
});
