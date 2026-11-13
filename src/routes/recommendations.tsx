import { createFileRoute } from "@tanstack/react-router";
import { AnalysisPage } from "@/components/returnwise/AnalysisPage";
import { StateMessage } from "@/components/returnwise/AppShell";
import { PRIORITY_RULE, recommendations, type Line } from "@/lib/returnwise/analytics";
import { colorFor } from "@/lib/returnwise/colors";

export const Route = createFileRoute("/recommendations")({
  ssr: false,
  head: () => ({ meta: [
    { title: "Recommendations — ReturnWise" },
    { name: "description", content: "Rule-based actions to reduce returns, backed by your data." },
    { property: "og:title", content: "Recommendations — ReturnWise" },
    { property: "og:description", content: "Problem, evidence, action and priority for each return reason." },
  ] }),
  component: () => <AnalysisPage>{(c) => <RecList lines={c.lines} colors={c.colors} />}</AnalysisPage>,
});

const PRIO: Record<string, string> = {
  High: "bg-destructive/10 text-destructive",
  Medium: "bg-warning-soft text-warning-foreground",
  Low: "bg-secondary text-secondary-foreground",
};

export function RecList({ lines, colors = {} }: { lines: Line[]; colors?: Record<string, string> }) {
  const recs = recommendations(lines);
  if (!recs.length) return <StateMessage title="No returns, no recommendations" body="There are no returns in this period." />;
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Recommendations</h1>
      <p className="text-sm text-muted-foreground">Things to check, based on your return reasons and figures. Sorted by return loss. Results depend on execution; savings are not guaranteed.</p>
      <p className="rounded-lg border bg-muted px-3 py-2 text-xs text-muted-foreground">{PRIORITY_RULE}</p>
      {recs.map((r) => (
        <article key={r.reason} className="rounded-xl border bg-card p-6 shadow-card animate-fade-in">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="flex items-center gap-2 text-lg font-semibold"><span className="h-3 w-3 rounded-full" style={{ background: colorFor(colors, r.reason) }} />{r.problem}</h2>
            <span className={`rounded-full px-3 py-0.5 text-xs font-bold ${PRIO[r.priority]}`}>{r.priority} priority</span>
          </div>
          <p className="mt-2 text-sm"><span className="font-semibold">Evidence: </span>{r.evidence}</p>
          <p className="mt-2 rounded-lg bg-secondary p-3 text-sm text-secondary-foreground"><span className="font-semibold">Action: </span>{r.action}</p>
        </article>
      ))}
    </div>
  );
}
