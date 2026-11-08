import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { SimpleShell, StateMessage } from "@/components/returnwise/AppShell";
import { PrivacyNotice } from "./session";
import { openSession, uploadFile, type UploadResult } from "@/lib/returnwise/server.functions";
import { fileToBase64, useToken } from "@/lib/returnwise/client";
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

function UploadPage() {
  const { ready, token } = useToken();
  const navigate = useNavigate();
  const [consent, setConsent] = useState(false);
  const [results, setResults] = useState<UploadResult[]>([]);
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const info = useQuery({ queryKey: ["session", token], queryFn: () => openSession({ data: { token: token! } }), enabled: !!token, retry: false });
  useEffect(() => { if (info.data?.ok && info.data.info.confirmed) navigate({ to: "/dashboard" }); }, [info.data, navigate]);

  if (!ready || info.isLoading) return null;
  if (!token || (info.data && !info.data.ok) || info.error) {
    return <SimpleShell><StateMessage title="Session expired, please start a new analysis." action={<Button asChild><Link to="/">Go to home</Link></Button>} /></SimpleShell>;
  }
  const used = (info.data?.ok ? info.data.info.fileCount : 0);
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

  return (
    <SimpleShell>
      <h1 className="text-2xl font-bold">Upload order files</h1>
      <p className="mt-1 text-sm text-muted-foreground">Excel (.xlsx) only · up to {MAX_FILES_PER_SESSION} files · 10 MB each · {remaining} upload{remaining === 1 ? "" : "s"} left</p>

      <div className="mt-6 space-y-5">
        <PrivacyNotice />
        <div className="flex items-start gap-3 rounded-xl border bg-card p-4">
          <Checkbox id="consent" checked={consent} onCheckedChange={(v) => setConsent(v === true)} className="mt-0.5" />
          <label htmlFor="consent" className="text-sm font-medium">I confirm I am authorised to upload this data.</label>
        </div>

        <div className="rounded-xl border-2 border-dashed bg-card p-8 text-center">
          <input ref={inputRef} id="file" type="file" multiple accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            className="sr-only" disabled={!consent || busy || remaining <= 0} onChange={(e) => handleFiles(e.target.files)} />
          <Button size="lg" disabled={!consent || busy || remaining <= 0} onClick={() => inputRef.current?.click()}>
            {busy ? "Uploading and cleaning…" : "Choose .xlsx files"}
          </Button>
          {!consent && <p className="mt-3 text-sm text-muted-foreground">Tick the confirmation box above to enable upload.</p>}
          {remaining <= 0 && <p className="mt-3 text-sm text-muted-foreground">You have used all {MAX_FILES_PER_SESSION} uploads for this session.</p>}
          <p className="mt-4 text-sm">
            Need the format?{" "}
            <button type="button" className="font-semibold text-primary underline" onClick={downloadTemplate}>Download the Excel template</button>
          </p>
        </div>

        {results.length > 0 && (
          <ul className="space-y-2" aria-live="polite">
            {results.map((r, i) => (
              <li key={i} className={`rounded-lg border p-3 text-sm ${r.ok ? "bg-card" : "border-destructive/40 bg-destructive/5"}`}>
                <span className="font-semibold">{r.name}</span>{" — "}
                {r.ok ? `${r.stats.valid} valid rows, ${r.stats.duplicates} duplicates removed, ${r.stats.rejected} rejected.` : <span className="text-destructive">{r.error}</span>}
              </li>
            ))}
          </ul>
        )}

        <div className="flex justify-end">
          <Button asChild size="lg" disabled={!anyOk}>
            {anyOk ? <Link to="/review">Continue to Cleaning Review</Link> : <span aria-disabled>Continue to Cleaning Review</span>}
          </Button>
        </div>
      </div>
    </SimpleShell>
  );
}
