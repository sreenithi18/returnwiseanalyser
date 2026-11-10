import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { AnalysisPage } from "@/components/returnwise/AnalysisPage";
import { Card, StateMessage } from "@/components/returnwise/AppShell";
import { productStats, topProblematic, type Line, type ProductStat } from "@/lib/returnwise/analytics";
import { MIN_ORDER_LINES_FOR_PROBLEMATIC } from "@/lib/returnwise/config";
import { inr, pct } from "@/lib/returnwise/client";
import { InfoTip, RATE_LABEL, RATE_TIP, ReturnRateLabel } from "@/components/returnwise/InfoTip";

export const LOSS_FORMULA = "Return loss = net unit price × returned units";

export const Route = createFileRoute("/products")({
  ssr: false,
  head: () => ({ meta: [
    { title: "Product Analysis — ReturnWise" },
    { name: "description", content: "Products ranked by return loss with reasons and actions." },
    { property: "og:title", content: "Product Analysis — ReturnWise" },
    { property: "og:description", content: "See which products cost you the most in returns." },
  ] }),
  component: () => <AnalysisPage>{(c) => <Products lines={c.lines} />}</AnalysisPage>,
});

export function TopProductCards({ lines }: { lines: Line[] }) {
  const { products, qualifyingCount } = topProblematic(lines);
  if (!products.length) return <StateMessage title="No product qualifies as problematic yet" body={`A product needs at least ${MIN_ORDER_LINES_FOR_PROBLEMATIC} order lines with returns to be flagged.`} />;
  return (
    <>
      {qualifyingCount < 3 && <p className="mb-3 rounded-md bg-warning p-3 text-sm text-warning-foreground">Only {qualifyingCount} product{qualifyingCount === 1 ? "" : "s"} met the minimum of {MIN_ORDER_LINES_FOR_PROBLEMATIC} order lines, so fewer than 3 are shown.</p>}
      <div className="grid gap-4 md:grid-cols-3">
        {products.map((p, i) => (
          <article key={p.product_id} className="rounded-xl border-2 border-primary/20 bg-card p-5">
            <div className="flex items-center justify-between"><span className="rounded-full bg-primary px-2.5 py-0.5 text-xs font-bold text-primary-foreground">#{i + 1} by loss</span><span className="text-xs text-muted-foreground">{p.category}</span></div>
            <h3 className="mt-3 text-lg font-semibold">{p.product_name}</h3>
            <p className="font-mono text-xs text-muted-foreground">SKU {p.product_id}</p>
            <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1 text-sm">
              <dt className="text-muted-foreground">Return loss</dt><dd className="font-bold">{inr(p.returnLoss)}</dd>
              <dt className="text-muted-foreground"><ReturnRateLabel /></dt><dd className="font-semibold">{pct(p.returnRate)}</dd>
              <dt className="text-muted-foreground">Units sold</dt><dd>{p.unitsSold}</dd>
              <dt className="text-muted-foreground">Returned units</dt><dd>{p.returnedUnits}</dd>
              <dt className="text-muted-foreground">Orders</dt><dd>{p.orders}</dd>
              <dt className="text-muted-foreground">Order lines</dt><dd>{p.orderLines}</dd>
              <dt className="text-muted-foreground">Avg list price</dt><dd>{inr(p.avgPrice)}</dd>
              <dt className="text-muted-foreground">Avg net price (after discount)</dt><dd>{inr(p.avgNetPrice)}</dd>
              <dt className="text-muted-foreground">Primary reason</dt><dd>{p.primaryReason ?? "—"}</dd>
              <dt className="text-muted-foreground">Secondary</dt><dd>{p.secondaryReason ?? "—"}</dd>
            </dl>
            <p className="mt-3 rounded-md bg-secondary p-2.5 text-sm text-secondary-foreground"><span className="font-semibold">Action: </span>{p.action}</p>
          </article>
        ))}
      </div>
    </>
  );
}

type SortKey = "returnLoss" | "returnRate" | "orders" | "orderLines" | "avgPrice" | "avgNetPrice" | "unitsSold" | "returnedUnits" | "product_name";

function Products({ lines }: { lines: Line[] }) {
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: "returnLoss", dir: -1 });
  const stats = useMemo(() => productStats(lines), [lines]);
  const rows = useMemo(() => {
    const s = q.trim().toLowerCase();
    return stats
      .filter((p) => !s || p.product_name.toLowerCase().includes(s) || p.product_id.toLowerCase().includes(s) || p.category.toLowerCase().includes(s))
      .sort((a, b) => {
        const av = a[sort.key], bv = b[sort.key];
        return (typeof av === "string" ? av.localeCompare(bv as string) : (av as number) - (bv as number)) * sort.dir;
      });
  }, [stats, q, sort]);
  const th = (key: SortKey, label: string, tip?: string) => (
    <th className="px-3 py-2 font-semibold" aria-sort={sort.key === key ? (sort.dir === 1 ? "ascending" : "descending") : "none"}>
      <span className="inline-flex items-center gap-1">
        <button className="text-left hover:underline" onClick={() => setSort((s) => ({ key, dir: s.key === key ? (s.dir === 1 ? -1 : 1) : -1 }))}>
          {label}{sort.key === key ? (sort.dir === 1 ? " ▲" : " ▼") : ""}
        </button>
        {tip && <InfoTip tip={tip} label={`${label}: ${tip}`} />}
      </span>
    </th>
  );
  return (
    <div className="space-y-6">
      <section>
        <h1 className="text-2xl font-bold">Top problematic products</h1>
        <p className="mb-3 mt-1 text-sm text-muted-foreground">{LOSS_FORMULA}</p>
        {stats.length === 1 && <p className="mb-3 text-sm text-muted-foreground">Your data contains only one product.</p>}
        <TopProductCards lines={lines} />
      </section>
      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-semibold">All products ({rows.length})</h2>
            <p className="text-xs text-muted-foreground">{LOSS_FORMULA}</p>
          </div>
          <label className="sr-only" htmlFor="psearch">Search products</label>
          <Input id="psearch" placeholder="Search name, SKU or category" value={q} onChange={(e) => setQ(e.target.value)} className="max-w-xs" />
        </div>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted text-left"><tr>
              {th("product_name", "Product")}<th className="px-3 py-2 font-semibold">Category</th>
              {th("orders", "Orders", "Unique order IDs")}{th("orderLines", "Order lines", "One row per product in an order")}{th("unitsSold", "Units")}{th("returnedUnits", "Returned")}{th("returnRate", RATE_LABEL, RATE_TIP)}{th("avgPrice", "Avg list price")}{th("avgNetPrice", "Avg net price (after discount)")}{th("returnLoss", "Return loss", "Net unit price × returned units")}
              <th className="px-3 py-2 font-semibold">Primary reason</th>
            </tr></thead>
            <tbody>{rows.map((p: ProductStat) => (
              <tr key={p.product_id} className="border-t">
                <td className="px-3 py-2"><div className="font-medium">{p.product_name}</div><div className="font-mono text-xs text-muted-foreground">{p.product_id}{!p.qualifies && " · below min order lines"}</div></td>
                <td className="px-3 py-2">{p.category}</td><td className="px-3 py-2">{p.orders}</td><td className="px-3 py-2">{p.orderLines}</td><td className="px-3 py-2">{p.unitsSold}</td>
                <td className="px-3 py-2">{p.returnedUnits}</td><td className="px-3 py-2">{pct(p.returnRate)}</td>
                <td className="px-3 py-2">{inr(p.avgPrice)}</td><td className="px-3 py-2">{inr(p.avgNetPrice)}</td>
                <td className="px-3 py-2 font-semibold">{inr(p.returnLoss)}</td><td className="px-3 py-2">{p.primaryReason ?? "—"}</td>
              </tr>
            ))}</tbody>
          </table>
          {rows.length === 0 && <p className="p-4 text-center text-sm text-muted-foreground">No products match your search.</p>}
        </div>
      </Card>
    </div>
  );
}
