import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { AppShell, StateMessage } from "./AppShell";
import { isExpiredError, useLines, useMonth } from "@/lib/returnwise/client";
import { filterMonth, monthsIn, type Line } from "@/lib/returnwise/analytics";
import type { SessionInfo } from "@/lib/returnwise/server.functions";

export interface AnalysisCtx { all: Line[]; lines: Line[]; month: string; info: SessionInfo; months: string[] }

/** Loads session data and renders the shell; children get month-filtered lines. */
export function AnalysisPage({ children }: { children: (ctx: AnalysisCtx) => ReactNode }) {
  const { data, error, isLoading, ready, token } = useLines();
  const [month, setMonth] = useMonth();
  const home = <Button asChild><Link to="/">Go to home</Link></Button>;

  if (!ready || (token && isLoading)) return <div className="p-10 text-center text-muted-foreground">Loading analysis…</div>;
  if (!token) return <div className="p-6"><StateMessage title="No active session" body="Start a new analysis, reopen one with your Session ID, or try the demo." action={home} /></div>;
  if (error) return <div className="p-6"><StateMessage title={isExpiredError(error) ? "Session expired, please start a new analysis." : "Something went wrong"} body={isExpiredError(error) ? "Sessions and their data are deleted 24 hours after creation." : error.message} action={home} /></div>;
  if (!data) return null;
  if (!data.info.confirmed) return <div className="p-6"><StateMessage title="Finish the cleaning review first" action={<Button asChild><Link to="/review">Go to Cleaning Review</Link></Button>} /></div>;

  const months = monthsIn(data.lines);
  const m = month === "all" || months.includes(month) ? month : "all";
  const lines = filterMonth(data.lines, m);
  return (
    <AppShell months={months} month={m} onMonth={setMonth} isDemo={data.info.isDemo} expiresAt={data.info.expiresAt}>
      {lines.length === 0
        ? <StateMessage title="No orders in this month" body="Pick another month from the dropdown." />
        : children({ all: data.lines, lines, month: m, info: data.info, months })}
    </AppShell>
  );
}
