import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { SimpleShell, StateMessage, Stepper } from "@/components/returnwise/AppShell";
import { Skeleton } from "@/components/ui/skeleton";
import { confirmAnalysis, getReview } from "@/lib/returnwise/server.functions";
import { clearToken, isExpiredError, useToken } from "@/lib/returnwise/client";
import { downloadProblems } from "@/lib/returnwise/excel-client";

export const Route = createFileRoute("/review")({
  ssr: false,
  head: () => ({ meta: [
    { title: "Cleaning Review — ReturnWise" },
    { name: "description", content: "Review how your order data was cleaned before analysis." },
    { property: "og:title", content: "Cleaning Review — ReturnWise" },
    { property: "og:description", content: "Rows uploaded, valid, duplicates removed and flagged." },
  ] }),
  component: Review,
});

function Review() {
  const { ready, token } = useToken();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false);
  const q = useQuery({ queryKey: ["review", token], queryFn: () => getReview({ data: { token: token! } }), enabled: !!token, retry: false });

  const expired = isExpiredError(q.error);
  useEffect(() => { if (expired) clearToken(); }, [expired]);
  if (!ready || (token && q.isLoading)) return <SimpleShell><Skeleton className="h-10 w-72" /><div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">{Array.from({ length: 8 }, (_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}</div></SimpleShell>;
  if (!token || q.error) return <SimpleShell><StateMessage title={!token || isExpiredError(q.error) ? "Session expired, please start a new analysis." : "Could not load the review"} action={<Button asChild><Link to="/">Go to home</Link></Button>} /></SimpleShell>;
  const { info, problems, counts } = q.data!;
  const files = info.stats.files;
  const t = files.reduce((a, f) => ({
    uploaded: a.uploaded + f.uploaded, valid: a.valid + f.valid, duplicates: a.duplicates + f.duplicates,
    corrected: a.corrected + f.corrected, rejected: a.rejected + f.rejected, flagged: a.flagged + f.flagged,
  }), { uploaded: 0, valid: 0, duplicates: 0, corrected: 0, rejected: 0, flagged: 0 });

  if (!files.length) return <SimpleShell><StateMessage title="No files uploaded yet" action={<Button asChild><Link to="/upload">Upload files</Link></Button>} /></SimpleShell>;

  async function confirm() {
    setBusy(true);
    try {
      const r = await confirmAnalysis({ data: { token: token! } });
      if (!r.aiOk) toast.warning("AI classification is unavailable. Showing unclassified reasons.");
      qc.invalidateQueries();
      navigate({ to: "/dashboard" });
    } catch (e) { toast.error(e instanceof Error ? e.message : "Could not continue"); }
    finally { setBusy(false); }
  }

  const tiles: [string, number][] = [
    ["Rows uploaded", t.uploaded], ["Order lines (valid rows)", counts.orderLines], ["Orders (unique order IDs)", counts.orders], ["Duplicates removed", t.duplicates],
    ["Corrected", t.corrected], ["Rejected", t.rejected], ["Flagged (kept)", t.flagged],
  ];
  return (
    <SimpleShell>
      <Stepper current={1} />
      <h1 className="text-2xl font-bold">Cleaning Review</h1>
      <p className="mt-1 text-sm text-muted-foreground">Check what happened to your data before we analyse it.</p>
      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {tiles.map(([l, v]) => (
          <div key={l} className="rounded-xl border bg-card p-4 shadow-card">
            <div className="text-xs text-muted-foreground">{l}</div>
            <div className="mt-1 text-2xl font-bold tabular">{v.toLocaleString("en-IN")}</div>
          </div>
        ))}
      </div>

      <div className="mt-6 overflow-x-auto rounded-xl border bg-card shadow-card">
        <table className="w-full text-sm">
          <thead className="bg-muted text-left"><tr>{["File", "Uploaded", "Valid (order lines)", "Duplicates", "Corrected", "Rejected", "Flagged"].map((h) => <th key={h} className="px-3 py-2 font-semibold">{h}</th>)}</tr></thead>
          <tbody>{files.map((f, i) => (
            <tr key={i} className="border-t"><td className="px-3 py-2 font-medium">{f.name}</td>
              {[f.uploaded, f.valid, f.duplicates, f.corrected, f.rejected, f.flagged].map((v, j) => <td key={j} className="px-3 py-2">{v}</td>)}</tr>
          ))}</tbody>
        </table>
      </div>

      <div className="mt-6 rounded-xl border bg-card p-5 shadow-card">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-semibold">Rejected and flagged rows ({problems.length})</h2>
          <Button variant="outline" size="sm" disabled={!problems.length} onClick={() => downloadProblems(problems)}>Download list (.xlsx)</Button>
        </div>
        {problems.length === 0 ? <p className="mt-2 text-sm text-muted-foreground">No problems found.</p> : (
          <ul className="mt-3 max-h-72 space-y-1 overflow-y-auto text-sm">
            {problems.slice(0, 200).map((p, i) => (
              <li key={i} className="flex gap-2 border-t py-1.5">
                <span className={`shrink-0 rounded px-2 text-xs font-semibold leading-5 ${p.kind === "rejected" ? "bg-destructive/10 text-destructive" : "bg-warning-soft text-warning-foreground"}`}>{p.kind === "rejected" ? "Rejected" : "Flagged"}</span>
                <span className="text-muted-foreground">{p.file_name} · row {p.row_number}:</span> <span>{p.reason}</span>
              </li>
            ))}
            {problems.length > 200 && <li className="pt-2 text-muted-foreground">…and {problems.length - 200} more in the download.</li>}
          </ul>
        )}
      </div>

      {t.valid === 0 && <p role="alert" className="mt-4 text-sm text-destructive">No valid rows yet. Fix the file and upload again.</p>}
      <div className="mt-6 flex flex-wrap justify-between gap-3">
        <Button asChild variant="outline"><Link to="/upload">Upload another file</Link></Button>
        <Button size="lg" onClick={confirm} disabled={busy || t.valid === 0}>{busy ? "Analysing return reasons…" : "Confirm and analyse"}</Button>
      </div>
    </SimpleShell>
  );
}
