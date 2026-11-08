import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { SimpleShell, StateMessage } from "@/components/returnwise/AppShell";

export const Route = createFileRoute("/session")({
  ssr: false,
  head: () => ({ meta: [
    { title: "Your Session ID — ReturnWise" },
    { name: "description", content: "Save your ReturnWise Session ID and read the privacy notice." },
    { property: "og:title", content: "Your Session ID — ReturnWise" },
    { property: "og:description", content: "Save your Session ID and read how your data is handled." },
  ] }),
  component: SessionPage,
});

export function PrivacyNotice() {
  return (
    <div className="rounded-xl border bg-secondary p-5 text-sm text-secondary-foreground">
      <h2 className="text-base font-semibold">Privacy notice</h2>
      <ul className="mt-2 list-disc space-y-1 pl-5">
        <li>Your data is used only to produce this analysis.</li>
        <li>Columns like customer names, phone, email or address are dropped on upload, before anything is saved. Order IDs are replaced with app references.</li>
        <li>Everything is kept for 24 hours, then deleted automatically. You can delete it sooner at any time.</li>
      </ul>
    </div>
  );
}

function SessionPage() {
  const [token, setToken] = useState<string | null | undefined>(undefined);
  useEffect(() => {
    const t = sessionStorage.getItem("returnwise_show_id");
    sessionStorage.removeItem("returnwise_show_id"); // shown once
    setToken(t);
  }, []);

  if (token === undefined) return null;
  return (
    <SimpleShell>
      {token ? (
        <div className="space-y-6">
          <div className="rounded-xl border bg-card p-6">
            <h1 className="text-2xl font-bold">Your Session ID</h1>
            <p className="mt-1 text-sm text-muted-foreground">Use this to reopen your analysis within 24 hours.</p>
            <div className="mt-4 flex flex-col gap-2 sm:flex-row">
              <code className="flex-1 break-all rounded-md border bg-muted p-3 font-mono text-sm">{token}</code>
              <Button onClick={async () => { await navigator.clipboard.writeText(token); toast.success("Session ID copied"); }}>Copy</Button>
            </div>
            <p role="alert" className="mt-4 rounded-md bg-warning p-3 text-sm font-semibold text-warning-foreground">
              Save this ID. If you lose it, your data cannot be recovered.
            </p>
          </div>
          <PrivacyNotice />
          <Button asChild size="lg"><Link to="/upload">Continue to upload</Link></Button>
        </div>
      ) : (
        <StateMessage title="Your Session ID was already shown" body="For safety it is displayed only once. Continue with your upload, or start a new analysis." action={<><Button asChild><Link to="/upload">Go to upload</Link></Button><Button asChild variant="outline"><Link to="/">Home</Link></Button></>} />
      )}
    </SimpleShell>
  );
}
