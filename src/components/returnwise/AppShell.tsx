import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useEndSession } from "@/lib/returnwise/client";
import { ALL_MONTHS, monthLabel } from "@/lib/returnwise/analytics";

const NAV = [
  { to: "/dashboard", label: "Dashboard" },
  { to: "/products", label: "Products" },
  { to: "/recommendations", label: "Recommendations" },
  { to: "/summary", label: "Monthly Summary" },
] as const;

export function Logo() {
  return (
    <Link to="/" className="flex items-center gap-2 font-display text-lg font-bold">
      <span className="grid h-8 w-8 place-items-center rounded-md bg-primary text-primary-foreground">R</span>
      ReturnWise
    </Link>
  );
}

export function EndSessionButton({ variant = "outline" as const }: { variant?: "outline" | "destructive" }) {
  const end = useEndSession();
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant={variant} size="sm">End session and delete my data now</Button>
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
          <AlertDialogAction onClick={end}>Delete my data</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export function SimpleShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
          <Logo />
          <EndSessionButton />
        </div>
      </header>
      <main className="mx-auto max-w-4xl px-4 py-8">{children}</main>
    </div>
  );
}

export function AppShell({
  children, months, month, onMonth, isDemo, expiresAt,
}: {
  children: ReactNode; months: string[]; month: string; onMonth: (m: string) => void; isDemo?: boolean; expiresAt?: string;
}) {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-navy text-navy-foreground">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <Logo />
          <nav className="flex flex-wrap gap-1 text-sm" aria-label="Main">
            {NAV.map((n) => (
              <Link key={n.to} to={n.to} className="rounded-md px-3 py-1.5 opacity-80 hover:bg-sidebar-accent hover:opacity-100"
                activeProps={{ className: "rounded-md px-3 py-1.5 bg-sidebar-accent opacity-100 font-semibold" }}>
                {n.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>
      <div className="border-b bg-card">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <div className="flex flex-wrap items-center gap-3">
            <label htmlFor="month" className="text-sm font-medium">Month</label>
            <Select value={month} onValueChange={onMonth}>
              <SelectTrigger id="month" className="w-48"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_MONTHS}>All months</SelectItem>
                {months.map((m) => <SelectItem key={m} value={m}>{monthLabel(m)}</SelectItem>)}
              </SelectContent>
            </Select>
            {isDemo && <span className="rounded-full bg-warning px-3 py-1 text-xs font-semibold text-warning-foreground">Synthetic demo data</span>}
          </div>
          <div className="flex items-center gap-3">
            {expiresAt && <span className="hidden text-xs text-muted-foreground sm:inline">Data deleted {new Date(expiresAt).toLocaleString("en-IN")}</span>}
            <EndSessionButton />
          </div>
        </div>
      </div>
      <main className="mx-auto max-w-6xl px-4 py-6">
        <p className="mb-4 text-xs text-muted-foreground">Note: Recent months may show lower return rates because returns can still arrive.</p>
        {children}
      </main>
    </div>
  );
}

export function StateMessage({ title, body, action }: { title: string; body?: string; action?: ReactNode }) {
  return (
    <div className="mx-auto max-w-lg rounded-xl border bg-card p-8 text-center">
      <h2 className="text-xl font-semibold">{title}</h2>
      {body && <p className="mt-2 text-sm text-muted-foreground">{body}</p>}
      {action && <div className="mt-5 flex justify-center gap-2">{action}</div>}
    </div>
  );
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <section className={`rounded-xl border bg-card p-5 ${className}`}>{children}</section>;
}
