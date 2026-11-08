import { useEffect, useState, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { getLines, endSession } from "./server.functions";
import { ALL_MONTHS } from "./analytics";

const KEY = "returnwise_session";
const MONTH_KEY = "returnwise_month";

export const getToken = () => (typeof window === "undefined" ? null : localStorage.getItem(KEY));
export const setToken = (t: string) => localStorage.setItem(KEY, t);
export const clearToken = () => { localStorage.removeItem(KEY); localStorage.removeItem(MONTH_KEY); };

export function useToken() {
  const [state, setState] = useState<{ ready: boolean; token: string | null }>({ ready: false, token: null });
  useEffect(() => setState({ ready: true, token: getToken() }), []);
  return state;
}

export function useMonth(): [string, (m: string) => void] {
  const [m, setM] = useState(ALL_MONTHS);
  useEffect(() => { const s = localStorage.getItem(MONTH_KEY); if (s) setM(s); }, []);
  return [m, (v: string) => { localStorage.setItem(MONTH_KEY, v); setM(v); }];
}

export const isExpiredError = (e: unknown) => e instanceof Error && e.message.includes("SESSION_EXPIRED");

export function useLines() {
  const { ready, token } = useToken();
  const q = useQuery({
    queryKey: ["lines", token],
    queryFn: () => getLines({ data: { token: token! } }),
    enabled: ready && !!token,
    retry: false,
    staleTime: 60_000,
  });
  return { ...q, ready, token };
}

export function useEndSession() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  return useCallback(async () => {
    const token = getToken();
    if (token) {
      try { await endSession({ data: { token } }); } catch { /* already gone */ }
    }
    clearToken();
    qc.clear();
    toast.success("Session ended. Your data has been deleted.");
    navigate({ to: "/" });
  }, [navigate, qc]);
}

export const inr = (n: number) => "₹" + Math.round(n).toLocaleString("en-IN");
export const pct = (n: number) => (n * 100).toFixed(1) + "%";

export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result).split(",")[1] ?? "");
    r.onerror = () => reject(new Error("Could not read the file"));
    r.readAsDataURL(file);
  });
}
