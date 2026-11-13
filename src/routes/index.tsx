import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { ArrowRight, FileDown, FileSpreadsheet, ListChecks, MessageSquareText, ShieldCheck, CheckCircle2, TrendingDown, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Logo, SessionChip } from "@/components/returnwise/AppShell";
import { DashboardPreview } from "@/components/returnwise/DashboardPreview";
import { openSession, startSession } from "@/lib/returnwise/server.functions";
import { clearToken, setToken } from "@/lib/returnwise/client";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "ReturnWise — Turn product returns into business insights" },
      { name: "description", content: "Return reason analyser for Amazon, Flipkart and Meesho sellers. Upload Excel, find costly returns, get clear actions." },
      { property: "og:title", content: "ReturnWise — Return reason analyser" },
      { property: "og:description", content: "Turn product returns into business insights." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Home,
});

function ReturningDialog() {
  const navigate = useNavigate();
  const [id, setId] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  async function reopen(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    const token = id.trim();
    if (token.length < 20) { setErr("Please paste your full Session ID."); return; }
    setBusy(true);
    try {
      const res = await openSession({ data: { token } });
      if (!res.ok) { setErr("Session expired, please start a new analysis."); return; }
      setToken(token);
      navigate({ to: res.info.confirmed ? "/dashboard" : res.info.fileCount ? "/review" : "/upload" });
    } catch { setErr("Session expired, please start a new analysis."); }
    finally { setBusy(false); }
  }
  return (
    <Dialog>
      <DialogTrigger asChild>
        <button type="button" className="text-sm underline underline-offset-4 opacity-80 hover:opacity-100">Returning seller? Reopen your session</button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reopen your analysis</DialogTitle>
          <DialogDescription>Paste the Session ID you saved. Sessions last 24 hours.</DialogDescription>
        </DialogHeader>
        <form onSubmit={reopen} className="space-y-3">
          <label htmlFor="sid" className="block text-sm font-medium">Session ID</label>
          <Input id="sid" value={id} onChange={(e) => setId(e.target.value)} placeholder="e.g. 3fK9…" className="font-mono" autoComplete="off" />
          {err && <p role="alert" className="text-sm text-destructive">{err}</p>}
          <Button type="submit" className="w-full" disabled={busy}>{busy ? "Opening…" : "Reopen session"}</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

const STEPS = [
  { icon: FileSpreadsheet, t: "Upload", b: "Up to 3 Excel files from Amazon, Flipkart or Meesho." },
  { icon: ListChecks, t: "Review", b: "See duplicates removed and problem rows, then confirm." },
  { icon: Zap, t: "Act", b: "Ranked losses, reasons and clear next steps." },
];
const BENEFITS = [
  { icon: TrendingDown, t: "Return loss ranking", b: "See which products cost you the most money in returns — not just which return most often." },
  { icon: MessageSquareText, t: "Return reason analysis", b: "Buyer comments, typos and Hinglish grouped into clear themes like size, damage or defects." },
  { icon: FileDown, t: "PDF report", b: "A monthly summary you can download or share on WhatsApp with your team or supplier." },
];

function Home() {
  const navigate = useNavigate();
  const [busy, setBusy] = useState<"start" | "demo" | null>(null);

  async function start(demo: boolean) {
    setBusy(demo ? "demo" : "start");
    try {
      clearToken();
      const { token } = await startSession({ data: { demo } });
      setToken(token);
      navigate({ to: demo ? "/dashboard" : "/upload" });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not start");
    } finally { setBusy(null); }
  }

  return (
    <div className="min-h-screen bg-background">
      <section className="overflow-hidden bg-gradient-hero text-navy-foreground">
        <div className="mx-auto max-w-6xl px-4 pb-20 pt-5 md:px-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Logo />
            <SessionChip dark />
          </div>
          <div className="mt-14 grid items-center gap-12 lg:grid-cols-2">
            <div className="animate-fade-in">
              <p className="text-sm font-semibold uppercase tracking-widest opacity-70">For Amazon, Flipkart & Meesho sellers</p>
              <h1 className="mt-3 text-4xl font-extrabold leading-tight sm:text-5xl">Turn product returns into business insights.</h1>
              <p className="mt-4 max-w-xl text-lg opacity-80">Upload your order Excel. See which products lose you the most money to returns, why buyers return them, and what to fix first.</p>
              <div className="mt-8 flex flex-wrap items-center gap-4">
                <Button variant="hero" size="lg" onClick={() => start(false)} disabled={!!busy}>
                  {busy === "start" ? "Starting…" : <>Start Analysis <ArrowRight className="h-4 w-4" /></>}
                </Button>
                <button type="button" onClick={() => start(true)} disabled={!!busy} className="text-sm font-medium underline underline-offset-4 opacity-90 hover:opacity-100 disabled:opacity-50">
                  {busy === "demo" ? "Loading demo…" : "Try the demo with sample data"}
                </button>
              </div>
              <div className="mt-6"><ReturningDialog /></div>
            </div>
            <div className="hidden justify-center lg:flex"><DashboardPreview /></div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 md:px-8">
        <ol className="-mt-10 grid gap-4 rounded-xl border bg-card p-6 shadow-card sm:grid-cols-3">
          {STEPS.map((s, i) => (
            <li key={s.t} className="flex gap-4">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary"><s.icon className="h-5 w-5" /></span>
              <div>
                <h2 className="font-semibold">{i + 1}. {s.t}</h2>
                <p className="mt-0.5 text-sm text-muted-foreground">{s.b}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16 md:px-8">
        <h2 className="text-2xl font-bold">What you get</h2>
        <div className="mt-6 grid gap-5 md:grid-cols-3">
          {BENEFITS.map((b) => (
            <article key={b.t} className="rounded-xl border bg-card p-6 shadow-card">
              <span className="grid h-10 w-10 place-items-center rounded-lg bg-accent text-accent-foreground"><b.icon className="h-5 w-5" /></span>
              <h3 className="mt-4 text-lg font-semibold">{b.t}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{b.b}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="border-t bg-card">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-8 md:flex-row md:items-center md:px-8">
          <span className="flex items-center gap-2 font-semibold"><ShieldCheck className="h-5 w-5 text-success" /> Private by design</span>
          <ul className="grid flex-1 gap-2 text-sm text-muted-foreground sm:grid-cols-3">
            <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 shrink-0 text-success" /> No login. Your data is used only for your analysis.</li>
            <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 shrink-0 text-success" /> Names, phones and addresses are dropped before saving.</li>
            <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 shrink-0 text-success" /> Everything is deleted automatically after 24 hours.</li>
          </ul>
        </div>
      </section>
    </div>
  );
}
