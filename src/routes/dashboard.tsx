import { createFileRoute } from "@tanstack/react-router";
import type { ReactNode } from "react";
import {
  Bar, BarChart, CartesianGrid, Cell, LabelList, Line as RLine, LineChart, Pie, PieChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { Boxes, IndianRupee, Layers, Percent, ShoppingBag, TrendingDown, Undo2, PartyPopper } from "lucide-react";
import { AnalysisPage, type AnalysisCtx } from "@/components/returnwise/AnalysisPage";
import { Card, StateMessage } from "@/components/returnwise/AppShell";
import { Amount } from "@/components/returnwise/Amount";
import { groupRates, kpis, monthlyTrend, reasonCounts, type Line } from "@/lib/returnwise/analytics";
import { colorFor } from "@/lib/returnwise/colors";
import { pct } from "@/lib/returnwise/client";
import { InfoTip, RATE_LABEL, RATE_TIP, ReturnRateLabel } from "@/components/returnwise/InfoTip";

export const Route = createFileRoute("/dashboard")({
  ssr: false,
  head: () => ({ meta: [
    { title: "Dashboard — ReturnWise" },
    { name: "description", content: "Sales, returns and estimated return loss at a glance." },
    { property: "og:title", content: "Dashboard — ReturnWise" },
    { property: "og:description", content: "Return rate, reasons and loss by month, category and platform." },
  ] }),
  component: () => <AnalysisPage>{(c) => <Dashboard {...c} />}</AnalysisPage>,
});

const GRID = "var(--chart-grid)";
const AXIS = { fontSize: 12, fill: "var(--muted-foreground)" };
const TIP_STYLE = { borderRadius: 8, border: "1px solid var(--border)", fontSize: 12 };

export function KpiGrid({ lines }: { lines: Line[] }) {
  const k = kpis(lines);
  const tip = (label: string, t: string) => <span className="inline-flex items-center gap-1">{label}<InfoTip tip={t} label={`${label}: ${t}`} /></span>;
  const items: { id: string; icon: ReactNode; label: ReactNode; value: ReactNode; hint: string }[] = [
    { id: "units", icon: <Boxes />, label: "Total sales (units)", value: k.unitsSold.toLocaleString("en-IN"), hint: "Units ordered in this period" },
    { id: "revenue", icon: <IndianRupee />, label: "Revenue (net)", value: <Amount value={k.revenue} />, hint: "After discounts" },
    { id: "orders", icon: <ShoppingBag />, label: tip("Orders", "Unique order IDs"), value: k.orders.toLocaleString("en-IN"), hint: "Unique order IDs" },
    { id: "lines", icon: <Layers />, label: tip("Order lines", "One row per product in an order (valid rows after cleaning)"), value: k.orderLines.toLocaleString("en-IN"), hint: "One row per product in an order" },
    { id: "returnedOrders", icon: <Undo2 />, label: tip("Returned orders", "Unique orders with at least one returned unit"), value: k.returnedOrders.toLocaleString("en-IN"), hint: "Orders with at least one return" },
    { id: "rate", icon: <Percent />, label: <ReturnRateLabel />, value: pct(k.returnRate), hint: "Returned units / units sold" },
  ];
  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      <div className="col-span-2 flex flex-col justify-between rounded-xl bg-gradient-lead p-6 text-primary-foreground shadow-card animate-fade-in">
        <div className="flex items-center gap-2 text-sm font-medium opacity-90">
          <TrendingDown className="h-4 w-4" />
          <span className="inline-flex items-center gap-1">Est. return loss<InfoTip tip="Net unit price × returned units" label="Est. return loss: Net unit price × returned units" /></span>
        </div>
        <div className="mt-3 text-4xl font-extrabold sm:text-5xl"><Amount value={k.returnLoss} /></div>
        <p className="mt-2 text-sm opacity-80">Money lost to {k.returnedUnits.toLocaleString("en-IN")} returned units (net unit price × returned units)</p>
      </div>
      {items.map((it) => (
        <div key={it.id} className="rounded-xl border bg-card p-5 shadow-card animate-fade-in">
          <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
            <span className="grid h-7 w-7 place-items-center rounded-lg bg-primary-soft text-primary [&_svg]:h-4 [&_svg]:w-4">{it.icon}</span>
            {it.label}
          </div>
          <div className="mt-3 text-2xl font-bold tabular">{it.value}</div>
          <p className="mt-1 text-xs text-muted-foreground">{it.hint}</p>
        </div>
      ))}
    </div>
  );
}

type TrendPoint = { label: string; rate: number; solid: number | null; recent: number | null; recentLabel: number | null; latest: boolean };
function TrendTooltip({ active, payload }: { active?: boolean; payload?: { payload: TrendPoint }[] }) {
  if (!active || !payload?.length) return null;
  const p = payload[0]!.payload;
  return (
    <div className="rounded-lg border bg-card px-3 py-2 text-xs shadow-card">
      <div className="font-semibold">{p.label}</div>
      <div>{RATE_LABEL}: {p.rate}%</div>
      {p.latest && <div className="mt-1 text-warn-text">Returns may still arrive</div>}
    </div>
  );
}

function Dashboard({ lines, all, colors }: AnalysisCtx) {
  const reasons = reasonCounts(lines);
  const total = reasons.reduce((s, r) => s + r.count, 0);
  const top5 = reasons.slice(0, 5);
  const trendRaw = monthlyTrend(all);
  const last = trendRaw.length - 1;
  const trend: TrendPoint[] = trendRaw.map((t, i) => {
    const rate = +(t.returnRate * 100).toFixed(1);
    return { label: t.label, rate, latest: i === last && last > 0, solid: i < last || last === 0 ? rate : null, recent: last > 0 && i >= last - 1 ? rate : null, recentLabel: last > 0 && i === last ? rate : null };
  });
  const cats = groupRates(lines, "category").map((c) => ({ ...c, rate: +(c.returnRate * 100).toFixed(1) }));
  const plats = groupRates(lines, "platform").map((c) => ({ ...c, rate: +(c.returnRate * 100).toFixed(1) }));

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Dashboard</h1>
      <KpiGrid lines={lines} />
      {reasons.length === 0 ? (
        <StateMessage icon={<PartyPopper className="h-6 w-6" />} title="No returns in this period" body="Great news — nothing was returned. Pick another month to compare." />
      ) : (
        <div className="grid gap-5 lg:grid-cols-2">
          <Card>
            <h2 className="font-semibold">Top 5 return reasons (units)</h2>
            <div className="mt-4 h-64"><ResponsiveContainer>
              <BarChart data={top5} layout="vertical" margin={{ left: 8, right: 40 }}>
                <CartesianGrid stroke={GRID} horizontal={false} />
                <XAxis type="number" allowDecimals={false} tick={AXIS} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="reason" width={130} tick={AXIS} axisLine={false} tickLine={false} />
                <Tooltip cursor={{ fill: "var(--muted)" }} contentStyle={TIP_STYLE} />
                <Bar dataKey="count" name="Returned units" radius={[0, 6, 6, 0]} barSize={22}>
                  {top5.map((r) => <Cell key={r.reason} fill={colorFor(colors, r.reason)} />)}
                  <LabelList dataKey="count" position="right" style={{ fontSize: 12, fontWeight: 600, fill: "var(--foreground)" }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer></div>
          </Card>
          <Card>
            <h2 className="font-semibold">Share of returned units by reason</h2>
            <div className="mt-4 grid items-center gap-4 sm:grid-cols-[1fr_auto]">
              <div className="h-64"><ResponsiveContainer>
                <PieChart>
                  <Pie data={reasons} dataKey="count" nameKey="reason" innerRadius={58} outerRadius={92} paddingAngle={2} stroke="var(--card)"
                    label={({ percent }: { percent?: number }) => ((percent ?? 0) >= 0.04 ? `${Math.round((percent ?? 0) * 100)}%` : "")} labelLine={false}>
                    {reasons.map((r) => <Cell key={r.reason} fill={colorFor(colors, r.reason)} />)}
                  </Pie>
                  <Tooltip contentStyle={TIP_STYLE} />
                </PieChart>
              </ResponsiveContainer></div>
              <ul className="space-y-1.5 text-sm">
                {reasons.map((r) => (
                  <li key={r.reason} className="flex items-center gap-2">
                    <span className="h-3 w-3 shrink-0 rounded-sm" style={{ background: colorFor(colors, r.reason) }} />
                    <span className="flex-1">{r.reason}</span>
                    <span className="font-semibold tabular">{((r.count / total) * 100).toFixed(0)}%</span>
                  </li>
                ))}
              </ul>
            </div>
          </Card>
        </div>
      )}
      <Card>
        <h2 className="flex items-center gap-1 font-semibold">Monthly {RATE_LABEL.toLowerCase()} trend (all months) <InfoTip tip={RATE_TIP} /></h2>
        <p className="mt-1 text-xs text-muted-foreground">The latest month is dashed: returns may still arrive.</p>
        <div className="mt-4 h-60"><ResponsiveContainer>
          <LineChart data={trend} margin={{ top: 20, right: 24, left: 0 }}>
            <CartesianGrid stroke={GRID} vertical={false} />
            <XAxis dataKey="label" tick={AXIS} axisLine={false} tickLine={false} />
            <YAxis unit="%" tick={AXIS} axisLine={false} tickLine={false} width={44} />
            <Tooltip content={<TrendTooltip />} />
            <RLine type="linear" dataKey="solid" stroke="var(--chart-1)" strokeWidth={2.5} dot={{ r: 4 }} connectNulls={false} isAnimationActive={false}>
              <LabelList dataKey="solid" position="top" formatter={(v: unknown) => (v == null ? "" : `${v}%`)} style={{ fontSize: 12, fill: "var(--foreground)" }} />
            </RLine>
            <RLine type="linear" dataKey="recent" stroke="var(--chart-1)" strokeWidth={2.5} strokeDasharray="6 5" dot={{ r: 4, strokeDasharray: "0" }} connectNulls={false} isAnimationActive={false}>
              <LabelList dataKey="recentLabel" position="top" formatter={(v: unknown) => (v == null ? "" : `${v}%`)} style={{ fontSize: 12, fill: "var(--foreground)" }} />
            </RLine>
          </LineChart>
        </ResponsiveContainer></div>
      </Card>
      <div className="grid gap-5 lg:grid-cols-2">
        {([[`${RATE_LABEL} by category`, cats], [`${RATE_LABEL} by platform`, plats]] as const).map(([title, data]) => (
          <Card key={title}>
            <h2 className="flex items-center gap-1 font-semibold">{title} <InfoTip tip={RATE_TIP} /></h2>
            <div className="mt-4 h-60"><ResponsiveContainer>
              <BarChart data={data as typeof cats} margin={{ top: 20 }}>
                <CartesianGrid stroke={GRID} vertical={false} />
                <XAxis dataKey="name" tick={AXIS} axisLine={false} tickLine={false} />
                <YAxis unit="%" tick={AXIS} axisLine={false} tickLine={false} width={44} />
                <Tooltip cursor={{ fill: "var(--muted)" }} contentStyle={TIP_STYLE} />
                <Bar dataKey="rate" name={`${RATE_LABEL} %`} fill="var(--chart-2)" radius={[6, 6, 0, 0]} maxBarSize={56}>
                  <LabelList dataKey="rate" position="top" formatter={(v: unknown) => `${v}%`} style={{ fontSize: 12, fontWeight: 600, fill: "var(--foreground)" }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer></div>
          </Card>
        ))}
      </div>
    </div>
  );
}
