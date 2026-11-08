import { createFileRoute } from "@tanstack/react-router";
import { Bar, BarChart, CartesianGrid, Cell, Line as RLine, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis, Legend } from "recharts";
import { AnalysisPage } from "@/components/returnwise/AnalysisPage";
import { Card, StateMessage } from "@/components/returnwise/AppShell";
import { groupRates, kpis, monthlyTrend, reasonCounts } from "@/lib/returnwise/analytics";
import { inr, pct } from "@/lib/returnwise/client";

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

export const CHART_COLORS = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)", "var(--chart-6)", "var(--chart-7)", "var(--chart-8)"];

export function KpiGrid({ lines }: { lines: Parameters<typeof kpis>[0] }) {
  const k = kpis(lines);
  const items: [string, string][] = [
    ["Total sales (units)", k.unitsSold.toLocaleString("en-IN")],
    ["Revenue (net)", inr(k.revenue)],
    ["Orders", k.orders.toLocaleString("en-IN")],
    ["Returned orders", k.returnedOrders.toLocaleString("en-IN")],
    ["Return rate", pct(k.returnRate)],
    ["Est. return loss", inr(k.returnLoss)],
  ];
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
      {items.map(([l, v], i) => (
        <div key={l} className={`rounded-xl border p-4 ${i === 5 ? "bg-navy text-navy-foreground" : "bg-card"}`}>
          <div className="text-xs opacity-75">{l}</div>
          <div className="mt-1 font-display text-xl font-bold">{v}</div>
        </div>
      ))}
    </div>
  );
}

function Dashboard({ lines, all }: { lines: Parameters<typeof kpis>[0]; all: Parameters<typeof kpis>[0] }) {
  const reasons = reasonCounts(lines);
  const top5 = reasons.slice(0, 5);
  const trend = monthlyTrend(all);
  const cats = groupRates(lines, "category").map((c) => ({ ...c, rate: +(c.returnRate * 100).toFixed(1) }));
  const plats = groupRates(lines, "platform").map((c) => ({ ...c, rate: +(c.returnRate * 100).toFixed(1) }));
  const noReturns = reasons.length === 0;

  return (
    <div className="space-y-5">
      <KpiGrid lines={lines} />
      {noReturns ? <StateMessage title="No returns in this data" body="Great news — there is nothing to analyse for this period." /> : (
        <div className="grid gap-5 lg:grid-cols-2">
          <Card>
            <h2 className="font-semibold">Top 5 return reasons (units)</h2>
            <div className="mt-3 h-64"><ResponsiveContainer>
              <BarChart data={top5} layout="vertical" margin={{ left: 40 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" allowDecimals={false} />
                <YAxis type="category" dataKey="reason" width={120} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="count" name="Returned units" fill="var(--chart-1)" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer></div>
          </Card>
          <Card>
            <h2 className="font-semibold">Reason categories</h2>
            <div className="mt-3 h-64"><ResponsiveContainer>
              <PieChart>
                <Pie data={reasons} dataKey="count" nameKey="reason" innerRadius={55} outerRadius={90} paddingAngle={2}>
                  {reasons.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                </Pie>
                <Tooltip /><Legend wrapperStyle={{ fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer></div>
          </Card>
        </div>
      )}
      <Card>
        <h2 className="font-semibold">Monthly return trend (all months)</h2>
        <div className="mt-3 h-60"><ResponsiveContainer>
          <LineChart data={trend.map((t) => ({ ...t, rate: +(t.returnRate * 100).toFixed(1) }))}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="label" tick={{ fontSize: 12 }} /><YAxis unit="%" />
            <Tooltip /><RLine type="monotone" dataKey="rate" name="Return rate %" stroke="var(--chart-1)" strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer></div>
      </Card>
      <div className="grid gap-5 lg:grid-cols-2">
        {[["Return rate by category", cats], ["Return rate by platform", plats]].map(([title, data]) => (
          <Card key={title as string}>
            <h2 className="font-semibold">{title as string}</h2>
            <div className="mt-3 h-60"><ResponsiveContainer>
              <BarChart data={data as typeof cats}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} /><YAxis unit="%" />
                <Tooltip /><Bar dataKey="rate" name="Return rate %" fill="var(--chart-2)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer></div>
          </Card>
        ))}
      </div>
    </div>
  );
}
