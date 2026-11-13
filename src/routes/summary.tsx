import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { AnalysisPage, type AnalysisCtx } from "@/components/returnwise/AnalysisPage";
import { Card } from "@/components/returnwise/AppShell";
import { KpiGrid } from "./dashboard";
import { LOSS_FORMULA, TopProductCards } from "./products";
import { RecList } from "./recommendations";
import { kpis, monthLabel, monthsIn, reasonCounts } from "@/lib/returnwise/analytics";
import { getToken, inr, pct } from "@/lib/returnwise/client";
import { buildSummaryPdf } from "@/lib/returnwise/pdf";
import { saveReport } from "@/lib/returnwise/server.functions";
import { fmtDateTime } from "@/lib/returnwise/format";

export const Route = createFileRoute("/summary")({
  ssr: false,
  head: () => ({ meta: [
    { title: "Monthly Summary — ReturnWise" },
    { name: "description", content: "Monthly return summary with PDF download and sharing." },
    { property: "og:title", content: "Monthly Summary — ReturnWise" },
    { property: "og:description", content: "KPIs, top reasons, loss-causing products and actions." },
  ] }),
  component: () => <AnalysisPage>{(c) => <Summary {...c} />}</AnalysisPage>,
});

function Summary({ lines, all, month, info, colors }: AnalysisCtx) {
  const [link, setLink] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const allK = kpis(all);
  const dq = {
    ...info.stats.files.reduce((a, f) => ({ uploaded: a.uploaded + f.uploaded, valid: a.valid + f.valid, duplicates: a.duplicates + f.duplicates, rejected: a.rejected + f.rejected, flagged: a.flagged + f.flagged }), { uploaded: 0, valid: 0, duplicates: 0, rejected: 0, flagged: 0 }),
    orders: allK.orders, orderLines: allK.orderLines,
  };
  const ms = monthsIn(lines);
  const period = month === "all" ? `${monthLabel(ms[0] ?? "all")} – ${monthLabel(ms[ms.length - 1] ?? "all")}` : monthLabel(month);
  const k = kpis(lines);

  async function pdf() {
    setBusy("pdf");
    try {
      const { blob } = await buildSummaryPdf(lines, month, dq, info.isDemo);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = `ReturnWise-Summary-${month}.pdf`; a.click();
      setTimeout(() => URL.revokeObjectURL(url), 5000);
    } catch { toast.error("Could not create the PDF"); } finally { setBusy(null); }
  }
  async function getLink() {
    setBusy("link");
    try {
      const { base64 } = await buildSummaryPdf(lines, month, dq, info.isDemo);
      const { reportToken } = await saveReport({ data: { token: getToken()!, pdfBase64: base64 } });
      const l = `${window.location.origin}/api/public/report/${reportToken}`;
      setLink(l);
      await navigator.clipboard.writeText(l).catch(() => {});
      toast.success("Download link created and copied");
      return l;
    } catch { toast.error("Could not create the link"); return null; } finally { setBusy(null); }
  }
  async function whatsapp() {
    const l = link ?? (await getLink());
    if (!l) return;
    const top = reasonCounts(lines)[0];
    const text = `ReturnWise summary (${period}): ${k.orders} orders (${k.orderLines} order lines), return rate (units) ${pct(k.returnRate)}, est. return loss ${inr(k.returnLoss)}.${top ? ` Top reason: ${top.reason}.` : ""} Report (valid until session expires): ${l}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank", "noopener");
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Monthly Summary</h1>
          <p className="text-sm text-muted-foreground">Reporting period: {period} · Generated {fmtDateTime(new Date())}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={pdf} disabled={!!busy}>{busy === "pdf" ? "Creating…" : "Generate PDF"}</Button>
          <Button variant="outline" onClick={getLink} disabled={!!busy}>{busy === "link" ? "Creating…" : "Get download link"}</Button>
          <Button variant="outline" onClick={whatsapp} disabled={!!busy}>Share on WhatsApp</Button>
        </div>
      </div>
      {link && <p className="break-all rounded-md border bg-card p-3 text-sm">Link (stops working when the session expires or is deleted): <a className="font-mono text-primary underline" href={link} target="_blank" rel="noreferrer">{link}</a></p>}
      <KpiGrid lines={lines} />
      <Card>
        <h2 className="font-semibold">Top 5 return reasons</h2>
        <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm">
          {reasonCounts(lines).slice(0, 5).map((r) => <li key={r.reason}>{r.reason} — {r.count} units</li>)}
        </ol>
      </Card>
      <section><h2 className="text-lg font-semibold">Top 3 loss-causing products</h2><p className="mb-3 mt-1 text-sm text-muted-foreground">{LOSS_FORMULA}</p><TopProductCards lines={lines} colors={colors} /></section>
      <RecList lines={lines} colors={colors} />
      <Card>
        <h2 className="font-semibold">Data quality</h2>
        <p className="mt-1 text-sm">{dq.uploaded} rows uploaded · {dq.orderLines} order lines (valid rows) · {dq.orders} orders (unique order IDs) · {dq.duplicates} duplicates removed · {dq.rejected} rejected · {dq.flagged} flagged</p>
      </Card>
    </div>
  );
}
