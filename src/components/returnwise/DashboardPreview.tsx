// Static preview of the dashboard built from the synthetic demo figures (decorative).
const BARS = [
  { r: "Size too small", v: 92, c: "var(--chart-1)" },
  { r: "Stopped working", v: 74, c: "var(--chart-2)" },
  { r: "Damaged in transit", v: 58, c: "var(--chart-3)" },
  { r: "Not as shown", v: 31, c: "var(--chart-4)" },
];
export function DashboardPreview() {
  return (
    <div aria-hidden className="pointer-events-none select-none [transform:perspective(1400px)_rotateY(-10deg)_rotateX(4deg)_rotate(-1deg)]">
      <div className="w-full max-w-xl overflow-hidden rounded-xl border bg-background text-foreground shadow-preview">
        <div className="flex items-center gap-2 border-b bg-card px-4 py-2.5">
          <span className="h-2.5 w-2.5 rounded-full bg-destructive/70" /><span className="h-2.5 w-2.5 rounded-full bg-warning/80" /><span className="h-2.5 w-2.5 rounded-full bg-success/80" />
          <span className="ml-3 text-xs font-semibold">Dashboard · All months</span>
          <span className="ml-auto rounded-full bg-warning-soft px-2 py-0.5 text-[10px] font-semibold text-warning-foreground">Demo data</span>
        </div>
        <div className="grid grid-cols-3 gap-3 p-4">
          <div className="col-span-3 rounded-lg bg-gradient-lead p-4 text-primary-foreground sm:col-span-1">
            <div className="text-[11px] opacity-80">Est. return loss</div>
            <div className="mt-1 text-2xl font-extrabold">₹1.1L</div>
          </div>
          <div className="rounded-lg border bg-card p-3"><div className="text-[11px] text-muted-foreground">Return rate (units)</div><div className="mt-1 text-lg font-bold text-warn-text">14.0%</div></div>
          <div className="rounded-lg border bg-card p-3"><div className="text-[11px] text-muted-foreground">Orders</div><div className="mt-1 text-lg font-bold">600</div></div>
          <div className="col-span-3 rounded-lg border bg-card p-4">
            <div className="mb-3 text-xs font-semibold">Top return reasons</div>
            <div className="space-y-2">
              {BARS.map((b) => (
                <div key={b.r} className="flex items-center gap-2 text-[11px]">
                  <span className="w-28 shrink-0 text-muted-foreground">{b.r}</span>
                  <span className="h-3 rounded-r-md" style={{ width: `${b.v * 0.7}%`, background: b.c }} />
                  <span className="font-semibold">{b.v}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
