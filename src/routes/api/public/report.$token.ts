import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/report/$token")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const token = String(params.token ?? "");
        if (token.length < 30 || token.length > 100) return new Response("Link not found", { status: 404 });
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        await supabaseAdmin.rpc("rw_purge_expired");
        const { data } = await supabaseAdmin.from("rw_reports").select("pdf_base64").eq("token", token).maybeSingle();
        if (!data) return new Response("This report link has expired or the session was deleted.", { status: 404, headers: { "content-type": "text/plain" } });
        const bin = atob(data.pdf_base64);
        const bytes = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
        return new Response(bytes, {
          headers: {
            "content-type": "application/pdf",
            "content-disposition": 'inline; filename="ReturnWise-Monthly-Summary.pdf"',
            "cache-control": "no-store",
          },
        });
      },
    },
  },
});
