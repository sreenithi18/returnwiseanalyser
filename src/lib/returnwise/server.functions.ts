import { createServerFn } from "@tanstack/react-start";
import { cleanRows, mapHeaders, projectRow, sha256, type CleanStats, type Problem } from "./cleaning";
import { MAX_FILE_BYTES, MAX_FILES_PER_SESSION } from "./config";
import { generateDemoRows } from "./demo";
import type { Line } from "./analytics";

type FileStat = CleanStats & { name: string };
export interface SessionStats { files: FileStat[] }
export interface SessionInfo {
  createdAt: string;
  expiresAt: string;
  isDemo: boolean;
  confirmed: boolean;
  fileCount: number;
  stats: SessionStats;
}

function randomToken(bytes = 32): string {
  const b = new Uint8Array(bytes);
  crypto.getRandomValues(b);
  let s = "";
  for (const x of b) s += String.fromCharCode(x);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  // Every request first deletes expired sessions and everything attached to them.
  await supabaseAdmin.rpc("rw_purge_expired");
  return supabaseAdmin;
}

const tokenInput = (i: { token: string }) => {
  if (typeof i?.token !== "string" || i.token.length < 20 || i.token.length > 200) throw new Error("Invalid Session ID");
  return { token: i.token.trim() };
};

async function loadSession(db: Awaited<ReturnType<typeof admin>>, token: string) {
  const { data } = await db.from("rw_sessions").select("*").eq("token_hash", await sha256(token)).maybeSingle();
  return data;
}
async function requireSession(db: Awaited<ReturnType<typeof admin>>, token: string) {
  const s = await loadSession(db, token);
  if (!s) throw new Error("SESSION_EXPIRED");
  return s;
}

async function insertClean(db: Awaited<ReturnType<typeof admin>>, sessionId: string, rows: Awaited<ReturnType<typeof cleanRows>>["clean"]) {
  for (let i = 0; i < rows.length; i += 500) {
    const { error } = await db.from("rw_order_lines").insert(rows.slice(i, i + 500).map((r) => ({ ...r, session_id: sessionId })));
    if (error) throw new Error("Could not save cleaned data");
  }
}
async function insertProblems(db: Awaited<ReturnType<typeof admin>>, sessionId: string, fileName: string, problems: Problem[]) {
  for (let i = 0; i < problems.length; i += 500) {
    await db.from("rw_rejected_rows").insert(problems.slice(i, i + 500).map((p) => ({ ...p, session_id: sessionId, file_name: fileName })));
  }
}

const toInfo = (s: { created_at: string; expires_at: string; is_demo: boolean; confirmed: boolean; file_count: number; stats: unknown }): SessionInfo => ({
  createdAt: s.created_at, expiresAt: s.expires_at, isDemo: s.is_demo, confirmed: s.confirmed,
  fileCount: s.file_count, stats: (s.stats as SessionStats)?.files ? (s.stats as SessionStats) : { files: [] },
});

export const startSession = createServerFn({ method: "POST" })
  .validator((i: { demo?: boolean }) => ({ demo: !!i?.demo }))
  .handler(async ({ data }) => {
    const db = await admin();
    const token = randomToken();
    const { data: s, error } = await db.from("rw_sessions")
      .insert({ token_hash: await sha256(token), is_demo: data.demo })
      .select("id").single();
    if (error || !s) throw new Error("Could not start a session");
    if (data.demo) {
      const { clean, problems, stats } = await cleanRows(generateDemoRows(600), new Set(), 2, s.id);
      await insertClean(db, s.id, clean);
      await insertProblems(db, s.id, "Synthetic demo data", problems);
      await db.from("rw_sessions").update({
        confirmed: true, file_count: 1,
        stats: { files: [{ name: "Synthetic demo data", ...stats }] },
      }).eq("id", s.id);
    }
    return { token };
  });

export const openSession = createServerFn({ method: "POST" })
  .validator(tokenInput)
  .handler(async ({ data }) => {
    const db = await admin();
    const s = await loadSession(db, data.token);
    if (!s) return { ok: false as const };
    return { ok: true as const, info: toInfo(s) };
  });

function looksLikeXlsx(bytes: Uint8Array): boolean {
  if (bytes.length < 4 || bytes[0] !== 0x50 || bytes[1] !== 0x4b || bytes[2] !== 0x03 || bytes[3] !== 0x04) return false;
  // Zip entry names are stored uncompressed; a real workbook has [Content_Types].xml and xl/workbook.xml.
  const text = new TextDecoder("latin1").decode(bytes.length > 4_000_000 ? bytes.subarray(bytes.length - 4_000_000) : bytes);
  const head = new TextDecoder("latin1").decode(bytes.subarray(0, 200_000));
  return (text.includes("xl/workbook.xml") || head.includes("xl/workbook.xml")) && (text.includes("[Content_Types].xml") || head.includes("[Content_Types].xml"));
}

export type UploadResult =
  | { ok: true; name: string; stats: CleanStats }
  | { ok: false; name: string; error: string; missing?: string[] };

export const uploadFile = createServerFn({ method: "POST" })
  .validator((i: { token: string; fileName: string; base64: string; consent: boolean }) => {
    const t = tokenInput(i);
    if (typeof i.fileName !== "string" || typeof i.base64 !== "string") throw new Error("Invalid upload");
    return { ...t, fileName: i.fileName.slice(0, 200), base64: i.base64, consent: i.consent === true };
  })
  .handler(async ({ data }): Promise<UploadResult> => {
    const name = data.fileName;
    const db = await admin();
    const s = await requireSession(db, data.token);
    if (!data.consent) return { ok: false, name, error: "Please confirm you are authorised to upload this data." };
    if (s.is_demo) return { ok: false, name, error: "The demo session cannot accept uploads. Start a new analysis instead." };
    if (s.confirmed) return { ok: false, name, error: "This analysis is already confirmed. Start a new analysis to upload more files." };
    if (s.file_count >= MAX_FILES_PER_SESSION) return { ok: false, name, error: `Maximum ${MAX_FILES_PER_SESSION} files per session.` };
    if (!name.toLowerCase().endsWith(".xlsx")) return { ok: false, name, error: "Only .xlsx files are accepted." };

    let bytes: Uint8Array;
    try {
      const bin = atob(data.base64);
      bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    } catch {
      return { ok: false, name, error: "Upload failed: the file could not be read." };
    }
    if (bytes.length > MAX_FILE_BYTES) return { ok: false, name, error: "File is larger than 10 MB." };
    if (!looksLikeXlsx(bytes)) return { ok: false, name, error: "This is not a real Excel (.xlsx) file, even though the name ends in .xlsx." };

    const XLSX = await import("xlsx");
    let rows: Record<string, unknown>[];
    let headers: string[];
    try {
      const wb = XLSX.read(bytes, { type: "array", cellDates: true });
      const ws = wb.Sheets[wb.SheetNames[0] ?? ""]!;
      const aoa = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, blankrows: false });
      headers = ((aoa[0] ?? []) as unknown[]).map((h) => String(h ?? "").trim());
      rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: null, raw: true, blankrows: true });
    } catch {
      return { ok: false, name, error: "Upload failed: the workbook could not be opened." };
    }
    const { map, missing } = mapHeaders(headers);
    if (missing.length) return { ok: false, name, error: `Missing required column(s): ${missing.join(", ")}. This file was not processed.`, missing };
    // Drop all non-standard columns before anything is saved.
    const projected = rows.map((r) => projectRow(r, map));
    rows = [];
    if (!projected.length) return { ok: false, name, error: "The file has no data rows." };

    const seen = new Set<string>();
    for (let from = 0; ; from += 1000) {
      const { data: keys } = await db.from("rw_order_lines").select("dedupe_key").eq("session_id", s.id).range(from, from + 999);
      keys?.forEach((k) => seen.add(k.dedupe_key));
      if (!keys || keys.length < 1000) break;
    }
    const { clean, problems, stats } = await cleanRows(projected, seen, 2, s.id);
    await insertClean(db, s.id, clean);
    await insertProblems(db, s.id, name, problems);
    const prev = toInfo(s).stats;
    await db.from("rw_sessions").update({
      file_count: s.file_count + 1,
      stats: { files: [...prev.files, { name, ...stats }] },
    }).eq("id", s.id);
    return { ok: true, name, stats };
  });

export const getReview = createServerFn({ method: "POST" })
  .validator(tokenInput)
  .handler(async ({ data }) => {
    const db = await admin();
    const s = await requireSession(db, data.token);
    const problems: { file_name: string; row_number: number; kind: string; reason: string }[] = [];
    for (let from = 0; ; from += 1000) {
      const { data: p } = await db.from("rw_rejected_rows").select("file_name,row_number,kind,reason")
        .eq("session_id", s.id).order("id").range(from, from + 999);
      if (p) problems.push(...p);
      if (!p || p.length < 1000) break;
    }
    // Same definitions as the analysis pages: orders = unique order refs, order lines = stored rows.
    const refs = new Set<string>();
    let orderLines = 0;
    for (let from = 0; ; from += 1000) {
      const { data: r } = await db.from("rw_order_lines").select("order_ref").eq("session_id", s.id).order("id").range(from, from + 999);
      r?.forEach((x) => refs.add(x.order_ref));
      orderLines += r?.length ?? 0;
      if (!r || r.length < 1000) break;
    }
    return { info: toInfo(s), problems, counts: { orders: refs.size, orderLines } };
  });

export const confirmAnalysis = createServerFn({ method: "POST" })
  .validator(tokenInput)
  .handler(async ({ data }) => {
    const db = await admin();
    const s = await requireSession(db, data.token);
    const { count } = await db.from("rw_order_lines").select("id", { count: "exact", head: true }).eq("session_id", s.id);
    if (!count) throw new Error("There are no valid rows to analyse. Upload a file with valid data first.");
    await db.from("rw_sessions").update({ confirmed: true }).eq("id", s.id);
    return { ok: true };
  });

export const getLines = createServerFn({ method: "POST" })
  .validator(tokenInput)
  .handler(async ({ data }) => {
    const db = await admin();
    const s = await requireSession(db, data.token);
    const lines: Line[] = [];
    for (let from = 0; ; from += 1000) {
      const { data: rows } = await db.from("rw_order_lines")
        .select("order_ref,platform,product_id,product_name,category,order_date,price,quantity,discount,payment_type,returned,returned_qty,reason_category")
        .eq("session_id", s.id).order("id").range(from, from + 999);
      if (rows) lines.push(...rows.map((r) => ({ ...r, price: Number(r.price), discount: Number(r.discount) })));
      if (!rows || rows.length < 1000) break;
    }
    return { info: toInfo(s), lines };
  });

export const endSession = createServerFn({ method: "POST" })
  .validator(tokenInput)
  .handler(async ({ data }) => {
    const db = await admin();
    await db.from("rw_sessions").delete().eq("token_hash", await sha256(data.token));
    return { ok: true };
  });

export const saveReport = createServerFn({ method: "POST" })
  .validator((i: { token: string; pdfBase64: string }) => {
    const t = tokenInput(i);
    if (typeof i.pdfBase64 !== "string" || i.pdfBase64.length > 8_000_000) throw new Error("Invalid report");
    return { ...t, pdfBase64: i.pdfBase64 };
  })
  .handler(async ({ data }) => {
    const db = await admin();
    const s = await requireSession(db, data.token);
    const reportToken = randomToken(32);
    const { error } = await db.from("rw_reports").insert({ session_id: s.id, token: reportToken, pdf_base64: data.pdfBase64 });
    if (error) throw new Error("Could not create the link");
    return { reportToken, expiresAt: s.expires_at };
  });
