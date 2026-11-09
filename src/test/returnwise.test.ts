import { describe, expect, it } from "vitest";
import { classifyReason } from "@/lib/returnwise/classifier";
import { cleanRows, mapHeaders, parseDate } from "@/lib/returnwise/cleaning";
import { filterMonth, kpis, netUnitPrice, topProblematic, type Line } from "@/lib/returnwise/analytics";
import { generateDemoRows } from "@/lib/returnwise/demo";

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
    expect(r.clean[0].returned_qty).toBe(2);
  });
  it("reports missing required columns", () => expect(mapHeaders(["Platform", "Order_ID"]).missing).toContain("Price"));
  it("parses mixed date formats", () => {
    expect(parseDate("05/10/2026")[0]).toBe("2026-10-05");
    expect(parseDate("12 Oct 2026")[0]).toBe("2026-10-12");
    expect(parseDate("2026-10-03")[0]).toBe("2026-10-03");
  });
  it("classifies Hinglish and unknown reasons", () => {
    expect(classifyReason("bahut chota hai", "Fashion")).toBe("Size/Fit");
    expect(classifyReason("toota hua aaya")).toBe("Damaged in transit");
    expect(classifyReason("kharab nikla")).toBe("Defective");
    expect(classifyReason("personal reasons")).toBe("Other/needs review");
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
  it("needs 20 order lines to be problematic", async () => {
    const { clean } = await cleanRows([base], new Set());
    expect(topProblematic(clean as unknown as Line[]).qualifyingCount).toBe(0);
  });
});
