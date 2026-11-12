import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, Check, Copy, FileSpreadsheet, UploadCloud } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { SimpleShell, StateMessage, Stepper } from "@/components/returnwise/AppShell";
import { PrivacyNotice } from "@/components/returnwise/PrivacyNotice";
import { openSession, uploadFile, type UploadResult } from "@/lib/returnwise/server.functions";
import { clearToken, fileToBase64, useToken } from "@/lib/returnwise/client";
import { downloadTemplate } from "@/lib/returnwise/excel-client";
import { MAX_FILE_BYTES, MAX_FILES_PER_SESSION } from "@/lib/returnwise/config";

export const Route = createFileRoute("/upload")({
  ssr: false,
  head: () => ({ meta: [
    { title: "Upload order files — ReturnWise" },
    { name: "description", content: "Upload up to 3 Excel order files for return analysis." },
    { property: "og:title", content: "Upload order files — ReturnWise" },
    { property: "og:description", content: "Upload your Amazon, Flipkart and Meesho order Excel files." },
  ] }),
  component: UploadPage,
});

function SessionIdBar({ token }: { token: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="rounded-xl border bg-card p-4 shadow-card">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <span className="text-sm font-semibold">Your Session ID</span>
        <code className="flex-1 break-all rounded-lg border bg-muted px-3 py-2 font-mono text-xs">{token}</code>
        <Button size="sm" onClick={async () => {
          try { await navigator.clipboard.writeText(token); setCopied(true); setTimeout(() => setCopied(false), 1500); toast.success("Session ID copied"); }
          catch { toast.error("Could not copy. Please select and copy it."); }
        }}>{copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />} Copy</Button>
      </div>
      <p role="note" className="mt-3 flex items-center gap-2 rounded-lg bg-warning-soft px-3 py-2 text-sm font-semibold text-warning-foreground">
        <AlertTriangle className="h-4 w-4 shrink-0" /> Save this ID. If you lose it, your data cannot be recovered.
      </p>
    </div>
  );
}

function UploadPage() {
  const { ready, token } = useToken();
  const navigate = useNavigate();
  const [consent, setConsent] = useState(false);
  const [results, setResults] = useState<UploadResult[]>([]);
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const info = useQuery({ queryKey: ["session", token], queryFn: () => openSession({ data: { token: token! } }), enabled: !!token, retry: false });
  useEffect(() => { if (info.data?.ok && info.data.info.confirmed) navigate({ to: "/dashboard" }); }, [info.data, navigate]);
  const expired = !!token && ((info.data && !info.data.ok) || !!info.error);
  useEffect(() => { if (expired) clearToken(); }, [expired]);

  if (!ready || (token && info.isLoading)) return <SimpleShell><Skeleton className="h-10 w-72" /><Skeleton className="mt-6 h-40 rounded-xl" /></SimpleShell>;
  if (!token || expired) {
    return <SimpleShell><StateMessage title={token ? "Session expired, please start a new analysis." : "No active session"} body="Start a new analysis from the home page." action={<Button asChild><Link to="/">Go to home</Link></Button>} /></SimpleShell>;
  }
  const used = info.data?.ok ? info.data.info.fileCount : 0;
  const remaining = MAX_FILES_PER_SESSION - used;
  const anyOk = used > 0;

  async function handleFiles(list: FileList | null) {
    if (!list || !list.length || !token) return;
    const files = Array.from(list);
    const out: UploadResult[] = [];
    let slots = remaining;
    setBusy(true);
    for (const f of files) {
      if (slots <= 0) { out.push({ ok: false, name: f.name, error: `Maximum ${MAX_FILES_PER_SESSION} files per session. This file was not uploaded.` }); continue; }
      if (!f.name.toLowerCase().endsWith(".xlsx")) { out.push({ ok: false, name: f.name, error: "Only .xlsx files are accepted." }); continue; }
      if (f.size > MAX_FILE_BYTES) { out.push({ ok: false, name: f.name, error: `File is ${(f.size / 1048576).toFixed(1)} MB. Maximum is 10 MB.` }); continue; }
      try {
        const base64 = await fileToBase64(f);
        const r = await uploadFile({ data: { token, fileName: f.name, base64, consent } });
        out.push(r);
        if (r.ok) slots--;
      } catch (e) {
        out.push({ ok: false, name: f.name, error: e instanceof Error && e.message.includes("SESSION_EXPIRED") ? "Session expired, please start a new analysis." : "Upload failed. Please try again." });
      }
    }
    setResults((p) => [...out, ...p]);
    setBusy(false);
    info.refetch();
    if (inputRef.current) inputRef.current.value = "";
  }

  const disabled = !consent || busy || remaining <= 0;
  return (
    <SimpleShell>
      <Stepper current={0} />
      <h1 className="text-2xl font-bold">Upload order files</h1>
      <p className="mt-1 text-sm text-muted-foreground">Excel (.xlsx) only · up to {MAX_FILES_PER_SESSION} files · 10 MB each</p>

      <div className="mt-6 space-y-5">
        <SessionIdBar token={token} />
        <PrivacyNotice />
        <div className="flex items-start gap-3 rounded-xl border bg-card p-4 shadow-card">
          <Checkbox id="consent" checked={consent} onCheckedChange={(v) => setConsent(v === true)} className="mt-0.5" />
          <label htmlFor="consent" className="text-sm font-medium">I confirm I am authorised to upload this data <span className="text-destructive">*</span></label>
        </div>

        <div className={`rounded-xl border-2 border-dashed bg-card p-10 text-center transition-opacity ${disabled && !busy ? "opacity-60" : ""}`}>
          <UploadCloud className="mx-auto h-10 w-10 text-primary" />
          <input ref={inputRef} id="file" type="file" multiple accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            className="sr-only" disabled={disabled} onChange={(e) => handleFiles(e.target.files)} />
          <Button size="lg" className="mt-4" disabled={disabled} onClick={() => inputRef.current?.click()}>
            {busy ? "Uploading and cleaning…" : "Choose .xlsx files"}
          </Button>
          <p className="mt-3 text-sm font-medium">{used} of {MAX_FILES_PER_SESSION} files used (rejected files don't count)</p>
          {!consent && <p className="mt-1 text-sm text-muted-foreground">Tick the confirmation box above to enable upload.</p>}
          {remaining <= 0 && <p className="mt-1 text-sm text-muted-foreground">You have used all {MAX_FILES_PER_SESSION} uploads for this session.</p>}
          <p className="mt-4 text-sm">
            Need the format?{" "}
            <button type="button" className="font-semibold text-primary underline" onClick={downloadTemplate}>Download the Excel template</button>
          </p>
        </div>

        {results.length > 0 && (
          <ul className="space-y-2" aria-live="polite">
            {results.map((r, i) => (
              <li key={i} className={`flex items-start gap-2 rounded-lg border p-3 text-sm animate-fade-in ${r.ok ? "bg-card" : "border-destructive/40 bg-destructive/5"}`}>
                <FileSpreadsheet className={`mt-0.5 h-4 w-4 shrink-0 ${r.ok ? "text-success" : "text-destructive"}`} />
                <span>
                  <span className="font-semibold">{r.name}</span>{" — "}
                  {r.ok ? `${r.stats.valid} valid rows, ${r.stats.duplicates} duplicates removed, ${r.stats.rejected} rejected.` : (
                    <span className="text-destructive">{r.error}{r.templateMismatch && <> <button type="button" className="font-semibold underline" onClick={downloadTemplate}>Download the ReturnWise template</button></>}</span>
                  )}
                </span>
              </li>
            ))}
          </ul>
        )}

        <div className="flex justify-end">
          {anyOk ? <Button asChild size="lg"><Link to="/review">Continue to Cleaning Review</Link></Button>
            : <Button size="lg" disabled>Continue to Cleaning Review</Button>}
        </div>
      </div>
    </SimpleShell>
  );
}
