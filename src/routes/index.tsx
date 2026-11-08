import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Logo } from "@/components/returnwise/AppShell";
import { openSession, startSession } from "@/lib/returnwise/server.functions";
import { setToken } from "@/lib/returnwise/client";

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

function Home() {
  const navigate = useNavigate();
  const [busy, setBusy] = useState<"start" | "demo" | "open" | null>(null);
  const [id, setId] = useState("");
  const [err, setErr] = useState("");

  async function start(demo: boolean) {
    setBusy(demo ? "demo" : "start");
    try {
      const { token } = await startSession({ data: { demo } });
      setToken(token);
      if (demo) navigate({ to: "/dashboard" });
      else { sessionStorage.setItem("returnwise_show_id", token); navigate({ to: "/session" }); }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not start");
    } finally { setBusy(null); }
  }

  async function reopen(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    const token = id.trim();
    if (token.length < 20) { setErr("Please paste your full Session ID."); return; }
    setBusy("open");
    try {
      const res = await openSession({ data: { token } });
      if (!res.ok) { setErr("Session expired, please start a new analysis."); return; }
      setToken(token);
      navigate({ to: res.info.confirmed ? "/dashboard" : res.info.fileCount ? "/review" : "/upload" });
    } catch { setErr("Session expired, please start a new analysis."); }
    finally { setBusy(null); }
  }

  return (
    <div className="min-h-screen bg-background">
      <section className="bg-navy text-navy-foreground">
        <div className="mx-auto max-w-6xl px-4 pb-16 pt-6">
          <Logo />
          <div className="mt-14 max-w-2xl">
            <p className="text-sm font-semibold uppercase tracking-widest opacity-70">For Amazon, Flipkart & Meesho sellers</p>
            <h1 className="mt-3 text-4xl font-bold leading-tight sm:text-5xl">Turn product returns into business insights.</h1>
            <p className="mt-4 text-lg opacity-80">Upload your order Excel. See which products lose you the most money to returns, why buyers return them, and what to fix first.</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button variant="hero" size="lg" onClick={() => start(false)} disabled={!!busy}>{busy === "start" ? "Starting…" : "Start Analysis"}</Button>
              <Button variant="heroOutline" size="lg" onClick={() => start(true)} disabled={!!busy}>{busy === "demo" ? "Loading demo…" : "Try demo"}</Button>
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto grid max-w-6xl gap-6 px-4 py-10 md:grid-cols-[1fr_1.2fr]">
        <form onSubmit={reopen} className="rounded-xl border bg-card p-6">
          <h2 className="text-lg font-semibold">Returning seller</h2>
          <p className="mt-1 text-sm text-muted-foreground">Paste your Session ID to reopen an analysis from the last 24 hours.</p>
          <label htmlFor="sid" className="mt-4 block text-sm font-medium">Session ID</label>
          <Input id="sid" value={id} onChange={(e) => setId(e.target.value)} placeholder="e.g. 3fK9…" className="mt-1 font-mono" autoComplete="off" />
          {err && <p role="alert" className="mt-2 text-sm text-destructive">{err}</p>}
          <Button type="submit" className="mt-4" disabled={!!busy}>{busy === "open" ? "Opening…" : "Reopen session"}</Button>
        </form>
        <div className="grid gap-4 sm:grid-cols-3 md:grid-cols-1 lg:grid-cols-3">
          {[
            ["1. Upload", "Up to 3 Excel files. Personal details are stripped before anything is saved."],
            ["2. Review", "See duplicates removed and rows flagged, then confirm."],
            ["3. Act", "Ranked loss, reason categories and a shareable PDF summary."],
          ].map(([t, b]) => (
            <div key={t} className="rounded-xl border bg-card p-5">
              <h3 className="font-semibold">{t}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{b}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
