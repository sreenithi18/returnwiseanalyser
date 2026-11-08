import { createFileRoute } from "@tanstack/react-router";
import { AnalysisPage } from "@/components/returnwise/AnalysisPage";
import { StateMessage } from "@/components/returnwise/AppShell";
import { recommendations, type Line } from "@/lib/returnwise/analytics";

export const Route = createFileRoute("/recommendations")({
  ssr: false,
  head: () => ({ meta: [
    { title: "Recommendations — ReturnWise" },
    { name: "description", content: "Rule-based actions to reduce returns, backed by your data." },
    { property: "og:title", content: "Recommendations — ReturnWise" },
    { property: "og:description", content: "Problem, evidence, action and priority for each return reason." },
  ] }),
  component: () => <AnalysisPage>{(c) => <RecList lines={c.lines} />}</AnalysisPage>,
});

const PRIO: Record<string, string> = {
  High: "bg-destructive/10 text-destructive",
  Medium: "bg-warning text-warning-foreground",
  Low: "bg-secondary text-secondary-foreground",
};

export function RecList({ lines }: { lines: Line[] }) {
  const recs = recommendations(lines);
  if (!recs.length) return <StateMessage title="No returns, no recommendations" body="There are no returns in this period." />;
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Recommendations</h1>
      <p className="text-sm text-muted-foreground">Suggested actions based on your return reasons. Results depend on execution; savings are not guaranteed.</p>
      {recs.map((r) => (
        <article key={r.reason} className="rounded-xl border bg-card p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-semibold">{r.problem}</h2>
            <span className={`rounded-full px-3 py-0.5 text-xs font-bold ${PRIO[r.priority]}`}>{r.priority} priority</span>
          </div>
          <p className="mt-2 text-sm"><span className="font-semibold">Evidence: </span>{r.evidence}</p>
          <p className="mt-1 text-sm"><span className="font-semibold">Action: </span>{r.action}</p>
        </article>
      ))}
    </div>
  );
}
