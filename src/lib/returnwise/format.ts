// Shared date/time display formats (UI and PDF). Dates always read like "11 Nov 2026".
const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export const fmtDate = (d: Date) => `${d.getDate()} ${MON[d.getMonth()]} ${d.getFullYear()}`;

export function fmtTime(d: Date): string {
  const h = d.getHours();
  return `${h % 12 || 12}:${String(d.getMinutes()).padStart(2, "0")} ${h >= 12 ? "pm" : "am"}`;
}

export const fmtDateTime = (d: Date) => `${fmtDate(d)}, ${fmtTime(d)}`;

export function timeLeft(expires: Date, now: Date): string {
  const ms = expires.getTime() - now.getTime();
  if (ms <= 0) return "expired";
  const h = Math.floor(ms / 3_600_000);
  return h >= 1 ? `${h}h left` : `${Math.max(1, Math.floor(ms / 60_000))}m left`;
}

export const deletionNotice = (expires: Date, now: Date) =>
  `Data will be deleted on ${fmtDateTime(expires)} (${timeLeft(expires, now)})`;

/** Shortened Session ID for display, e.g. "3fK9aB…x7Qw". */
export const shortId = (t: string) => (t.length > 12 ? `${t.slice(0, 6)}…${t.slice(-4)}` : t);
