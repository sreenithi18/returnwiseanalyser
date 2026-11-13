import { Link } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import { Check, Copy, FileText, Inbox, LayoutDashboard, Lightbulb, LogOut, Package, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useEndSession, useToken } from "@/lib/returnwise/client";
import { deletionNotice, shortId } from "@/lib/returnwise/format";
import { ALL_MONTHS, monthLabel } from "@/lib/returnwise/analytics";

const NAV = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/products", label: "Products", icon: Package },
  { to: "/recommendations", label: "Recommendations", icon: Lightbulb },
  { to: "/summary", label: "Monthly Summary", short: "Summary", icon: FileText },
] as const;

export function Logo({ className = "" }: { className?: string }) {
  return (
    <Link to="/" aria-label="ReturnWise home" className={`flex items-center gap-2 text-lg font-bold tracking-tight ${className}`}>
      <span className="grid h-8 w-8 place-items-center rounded-lg bg-primary text-sm font-extrabold text-primary-foreground">R</span>
      ReturnWise
    </Link>
  );
}

/** Shortened Session ID with a copy button (copies the full ID). Renders nothing without a session. */
export function SessionChip({ dark = false }: { dark?: boolean }) {
  const { token } = useToken();
  const [copied, setCopied] = useState(false);
  if (!token) return null;
  return (
    <div className={`flex items-center gap-1.5 rounded-lg border px-2 py-1 text-xs ${dark ? "border-navy-foreground/25" : "bg-muted"}`}>
      <span className="opacity-75">Session ID</span>
      <code className="font-mono" title="Your Session ID (shortened)">{shortId(token)}</code>
      <button
        type="button"
        aria-label="Copy full Session ID"
        className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 font-medium transition-colors ${dark ? "hover:bg-sidebar-accent" : "hover:bg-accent hover:text-accent-foreground"}`}
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(token);
            setCopied(true); setTimeout(() => setCopied(false), 1500);
            toast.success("Full Session ID copied");
          } catch { toast.error("Could not copy the Session ID."); }
        }}
      >
        {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />} Copy
      </button>
    </div>
  );
}

function DeletionNotice({ expiresAt }: { expiresAt: string }) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => { const t = setInterval(() => setNow(new Date()), 30_000); return () => clearInterval(t); }, []);
  return <span className="hidden text-xs text-muted-foreground xl:inline">{deletionNotice(new Date(expiresAt), now)}</span>;
}

export function EndSessionButton({ variant = "outline" as const }: { variant?: "outline" | "destructive" }) {
  const end = useEndSession();
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant={variant} size="sm">
          <Trash2 className="h-4 w-4" />
          <span className="sm:hidden">End session<span className="sr-only"> and delete my data now</span></span>
          <span className="hidden sm:inline">End session and delete my data now</span>
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete everything now?</AlertDialogTitle>
          <AlertDialogDescription>
            This permanently deletes your cleaned data, reports and download links for this session. It cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={() => end()}>Delete my data</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

/** Demo mode: clears the demo session and returns home. */
export function ExitDemoButton() {
  const end = useEndSession();
  return (
    <Button variant="outline" size="sm" onClick={() => end({ demo: true })}>
      <LogOut className="h-4 w-4" /> Exit demo
    </Button>
  );
}

function SessionActions({ isDemo }: { isDemo?: boolean | undefined }) {
  const { token } = useToken();
  if (!token) return null;
  return isDemo ? <ExitDemoButton /> : <EndSessionButton />;
}

export function SimpleShell({ children, isDemo }: { children: ReactNode; isDemo?: boolean | undefined }) {
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-20 border-b bg-card/95 backdrop-blur">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-2.5">
          <Logo />
          <div className="flex flex-wrap items-center gap-2">
            <SessionChip />
            <SessionActions isDemo={!!isDemo} />
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-4xl animate-fade-in px-4 py-8">{children}</main>
    </div>
  );
}

const STEPS = ["Upload", "Review", "Analyse", "Report"] as const;
/** Progress stepper for the upload and cleaning screens. */
export function Stepper({ current }: { current: 0 | 1 | 2 | 3 }) {
  return (
    <ol className="mb-8 flex items-center gap-2" aria-label="Progress">
      {STEPS.map((s, i) => {
        const done = i < current, active = i === current;
        return (
          <li key={s} className="flex flex-1 items-center gap-2" aria-current={active ? "step" : undefined}>
            <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-xs font-bold ${done ? "bg-success text-success-foreground" : active ? "bg-primary text-primary-foreground" : "border bg-card text-muted-foreground"}`}>
              {done ? <Check className="h-4 w-4" /> : i + 1}
            </span>
            <span className={`text-sm ${active ? "font-semibold" : "text-muted-foreground"}`}>{s}</span>
            {i < STEPS.length - 1 && <span className={`h-px flex-1 ${done ? "bg-success" : "bg-border"}`} />}
          </li>
        );
      })}
    </ol>
  );
}

export function AppShell({
  children, months, month, onMonth, isDemo, expiresAt,
}: {
  children: ReactNode; months: string[]; month: string; onMonth: (m: string) => void; isDemo?: boolean; expiresAt?: string;
}) {
  return (
    <div className="min-h-screen bg-background md:flex">
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col bg-navy px-3 py-4 text-navy-foreground md:flex">
        <Logo className="px-2" />
        <nav className="mt-8 flex flex-col gap-1 text-sm" aria-label="Main">
          {NAV.map((n) => (
            <Link key={n.to} to={n.to} className="flex items-center gap-3 rounded-lg px-3 py-2 opacity-80 transition-colors hover:bg-sidebar-accent hover:opacity-100"
              activeProps={{ className: "bg-sidebar-accent font-semibold !opacity-100" }}>
              <n.icon className="h-4 w-4" /> {n.label}
            </Link>
          ))}
        </nav>
        <p className="mt-auto px-3 text-xs opacity-60">Data is deleted automatically after 24 hours.</p>
      </aside>

      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-20 border-b bg-card/95 backdrop-blur">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-2.5 md:px-8">
            <Logo className="md:hidden" />
            <div className="flex items-center gap-2">
              <label htmlFor="month" className="sr-only">Month</label>
              <Select value={month} onValueChange={onMonth}>
                <SelectTrigger id="month" className="h-9 w-44" aria-label="Month"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL_MONTHS}>All months</SelectItem>
                  {months.map((m) => <SelectItem key={m} value={m}>{monthLabel(m)}</SelectItem>)}
                </SelectContent>
              </Select>
              {isDemo && <span className="rounded-full bg-warning-soft px-3 py-1 text-xs font-semibold text-warning-foreground">Synthetic demo data</span>}
            </div>
            <div className="ml-auto flex flex-wrap items-center gap-2">
              {expiresAt && <DeletionNotice expiresAt={expiresAt} />}
              <SessionChip />
              <SessionActions isDemo={!!isDemo} />
            </div>
          </div>
        </header>
        <main className="mx-auto max-w-6xl animate-fade-in px-4 py-6 pb-28 md:px-8 md:pb-10">{children}</main>
      </div>

      <nav aria-label="Main" className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-4 border-t bg-card md:hidden">
        {NAV.map((n) => (
          <Link key={n.to} to={n.to} className="flex flex-col items-center gap-1 py-2 text-[11px] text-muted-foreground"
            activeProps={{ className: "!text-primary font-semibold" }}>
            <n.icon className="h-5 w-5" /> {"short" in n ? n.short : n.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}

export function StateMessage({ title, body, action, icon }: { title: string; body?: string; action?: ReactNode; icon?: ReactNode }) {
  return (
    <div className="mx-auto max-w-lg animate-fade-in rounded-xl border bg-card p-8 text-center shadow-card">
      <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-full bg-primary-soft text-primary">{icon ?? <Inbox className="h-6 w-6" />}</div>
      <h2 className="text-xl font-semibold">{title}</h2>
      {body && <p className="mt-2 text-sm text-muted-foreground">{body}</p>}
      {action && <div className="mt-5 flex justify-center gap-2">{action}</div>}
    </div>
  );
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <section className={`rounded-xl border bg-card p-6 shadow-card ${className}`}>{children}</section>;
}

export function AnalysisSkeleton() {
  return (
    <div className="min-h-screen bg-background md:flex" aria-busy="true" aria-label="Loading analysis">
      <div className="hidden w-60 bg-navy md:block" />
      <div className="flex-1 space-y-5 p-4 md:p-8">
        <Skeleton className="h-9 w-64" />
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">{Array.from({ length: 8 }, (_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}</div>
        <div className="grid gap-5 lg:grid-cols-2"><Skeleton className="h-72 rounded-xl" /><Skeleton className="h-72 rounded-xl" /></div>
      </div>
    </div>
  );
}
