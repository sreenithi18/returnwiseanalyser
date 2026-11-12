import { ShieldCheck } from "lucide-react";

/** The full privacy notice. Shown once in the app: on the Upload page. */
export function PrivacyNotice() {
  return (
    <div className="rounded-xl border bg-card p-5 text-sm shadow-card">
      <h2 className="flex items-center gap-2 text-base font-semibold"><ShieldCheck className="h-5 w-5 text-success" /> Privacy notice</h2>
      <ul className="mt-2 list-disc space-y-1 pl-5 text-muted-foreground">
        <li>Your data is used only to produce this analysis.</li>
        <li>Columns like customer names, phone, email or address are dropped on upload, before anything is saved. Order IDs are replaced with app references.</li>
        <li>Everything is kept for 24 hours, then deleted automatically. You can delete it sooner at any time.</li>
      </ul>
    </div>
  );
}
