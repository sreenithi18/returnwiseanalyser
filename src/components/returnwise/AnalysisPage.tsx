import { Link } from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { AnalysisSkeleton, AppShell, SimpleShell, StateMessage } from "./AppShell";
import { reasonColorMap } from "@/lib/returnwise/colors";
import { clearToken, isExpiredError, useLines, useMonth } from "@/lib/returnwise/client";
import { filterMonth, monthsIn, type Line } from "@/lib/returnwise/analytics";
import type { SessionInfo } from "@/lib/returnwise/server.functions";

export interface AnalysisCtx { all: Line[]; lines: Line[]; month: string; info: SessionInfo; months: string[]; colors: Record<string, string> }

/** Loads session data and renders the shell; children get month-filtered lines. */
export function AnalysisPage({ children }: { children: (ctx: AnalysisCtx) => ReactNode }) {
  const { data, error, isLoading, ready, token } = useLines();
  const [month, setMonth] = useMonth();
  const home = <Button asChild><Link to="/">Go to home</Link></Button>;
  const expired = isExpiredError(error);
  // Expired or deleted session: forget it in this browser too.
  useEffect(() => { if (expired) clearToken(); }, [expired]);

  if (!ready || (token && isLoading)) return <AnalysisSkeleton />;
  if (!token) return <SimpleShell><StateMessage title="No active session" body="Start a new analysis, reopen one with your Session ID, or try the demo." action={home} /></SimpleShell>;
  if (error) return <SimpleShell><StateMessage title={isExpiredError(error) ? "Session expired, please start a new analysis." : "Something went wrong"} body={isExpiredError(error) ? "Sessions and their data are deleted 24 hours after creation." : error.message} action={home} /></SimpleShell>;
  if (!data) return null;
  if (!data.info.confirmed) return <SimpleShell isDemo={data.info.isDemo}><StateMessage title="Finish the cleaning review first" action={<Button asChild><Link to="/review">Go to Cleaning Review</Link></Button>} /></SimpleShell>;

  const months = monthsIn(data.lines);
  const m = month === "all" || months.includes(month) ? month : "all";
  const lines = filterMonth(data.lines, m);
  return (
    <AppShell months={months} month={m} onMonth={setMonth} isDemo={data.info.isDemo} expiresAt={data.info.expiresAt}>
      {lines.length === 0
        ? <StateMessage title="No orders in this month" body="Pick another month from the dropdown." />
        : children({ all: data.lines, lines, month: m, info: data.info, months, colors: reasonColorMap(data.lines) })}
    </AppShell>
  );
}
