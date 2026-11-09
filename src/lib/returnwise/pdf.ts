import { kpis, monthLabel, reasonCounts, recommendations, topProblematic, type Line } from "./analytics";

const rs = (n: number) => "Rs " + Math.round(n).toLocaleString("en-IN");
const pc = (n: number) => (n * 100).toFixed(1) + "%";

export interface DQ { uploaded: number; valid: number; duplicates: number; rejected: number; flagged: number }

export async function buildSummaryPdf(lines: Line[], month: string, dq: DQ, isDemo: boolean): Promise<{ base64: string; blob: Blob }> {
  const { jsPDF } = await import("jspdf");
  const autoTable = (await import("jspdf-autotable")).default;
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  const navy: [number, number, number] = [28, 32, 86];

  doc.setFillColor(...navy); doc.rect(0, 0, W, 70, "F");
  doc.setTextColor(255, 255, 255); doc.setFont("helvetica", "bold"); doc.setFontSize(20);
  doc.text("ReturnWise", 40, 32);
  doc.setFont("helvetica", "normal"); doc.setFontSize(10);
  doc.text("Turn product returns into business insights.", 40, 50);
  doc.text(`Monthly Summary - ${monthLabel(month)}`, W - 40, 32, { align: "right" });
  doc.text(`Generated ${new Date().toLocaleString("en-IN")}`, W - 40, 50, { align: "right" });
  doc.setTextColor(30, 30, 40);
  let y = 92;
  if (isDemo) { doc.setFontSize(9); doc.setTextColor(150, 90, 0); doc.text("Synthetic demo data", 40, y); doc.setTextColor(30, 30, 40); y += 14; }

  const k = kpis(lines);
  autoTable(doc, {
    startY: y, head: [["Units sold", "Revenue (net)", "Orders", "Returned orders", "Return rate", "Est. return loss"]],
    body: [[k.unitsSold, rs(k.revenue), k.orders, k.returnedOrders, pc(k.returnRate), rs(k.returnLoss)]],
    headStyles: { fillColor: navy }, styles: { fontSize: 9 },
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  y = (doc as any).lastAutoTable.finalY + 24;

  const reasons = reasonCounts(lines).slice(0, 5);
  doc.setFont("helvetica", "bold"); doc.setFontSize(12); doc.text("Top 5 return reasons", 40, y); y += 12;
  doc.setFont("helvetica", "normal"); doc.setFontSize(9);
  const max = Math.max(1, ...reasons.map((r) => r.count));
  for (const r of reasons) {
    doc.text(r.reason, 40, y + 9);
    doc.setFillColor(...navy); doc.rect(160, y, (W - 260) * (r.count / max), 12, "F");
    doc.text(String(r.count), 165 + (W - 260) * (r.count / max), y + 9);
    y += 18;
  }
  if (!reasons.length) { doc.text("No returns in this period.", 40, y + 9); y += 18; }
  y += 10;

  const top = topProblematic(lines).products;
  doc.setFont("helvetica", "bold"); doc.setFontSize(12); doc.text("Top loss-causing products", 40, y);
  autoTable(doc, {
    startY: y + 6, head: [["Product", "SKU", "Units", "Returned", "Return rate", "Loss", "Primary reason"]],
    body: top.length ? top.map((p) => [p.product_name, p.product_id, p.unitsSold, p.returnedUnits, pc(p.returnRate), rs(p.returnLoss), p.primaryReason ?? "-"]) : [["No product met the minimum order lines", "", "", "", "", "", ""]],
    headStyles: { fillColor: navy }, styles: { fontSize: 9 },
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  y = (doc as any).lastAutoTable.finalY + 24;

  doc.setFont("helvetica", "bold"); doc.setFontSize(12); doc.text("Recommendations", 40, y);
  autoTable(doc, {
    startY: y + 6, head: [["Priority", "Problem", "Evidence", "Action"]],
    body: recommendations(lines).map((r) => [r.priority, r.problem, r.evidence.replace(/₹/g, "Rs "), r.action]),
    headStyles: { fillColor: navy }, styles: { fontSize: 8 }, columnStyles: { 2: { cellWidth: 180 } },
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  y = (doc as any).lastAutoTable.finalY + 24;

  doc.setFont("helvetica", "bold"); doc.setFontSize(12); doc.text("Data quality", 40, y);
  autoTable(doc, {
    startY: y + 6, head: [["Rows uploaded", "Valid", "Duplicates removed", "Rejected", "Flagged"]],
    body: [[dq.uploaded, dq.valid, dq.duplicates, dq.rejected, dq.flagged]],
    headStyles: { fillColor: navy }, styles: { fontSize: 9 },
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  y = (doc as any).lastAutoTable.finalY + 18;
  doc.setFontSize(8); doc.setTextColor(110, 110, 120);
  doc.text("Recent months may show lower return rates because returns can still arrive. Recommendations are suggestions; savings are not guaranteed.", 40, y, { maxWidth: W - 80 });

  const blob = doc.output("blob");
  const base64 = (doc.output("datauristring") as string).split(",")[1] ?? "";
  return { base64, blob };
}
