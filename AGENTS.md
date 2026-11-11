<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.

## What Lovable manages

Rules outside this block are the project's own. Change the pieces below in
Lovable, not by hand. With the [Lovable MCP](https://mcp.lovable.dev)
connected, `send_message` asks Lovable to do it; otherwise ask the user to
use the editor.

- **Database.** Do not add or edit `supabase/migrations/` or `drizzle/`.
  Ask Lovable to change the schema.
- **Generated files.** Do not edit a file whose header says it is automatically
  generated.
- **AI gateway.** Keep model calls on Lovable's gateway, and keep
  `LOVABLE_API_KEY` out of browser code.
- **Connectors.** Lovable provides native connectors. `list_connectors` shows
  which are enabled; `add_connector` only returns the dashboard link. When a
  connector is enabled, calls go through the connector gateway and need
  `LOVABLE_API_KEY`. When Lovable does not provide one, users can bring their
  own key and store it in Secrets.
- **Secrets.** Lovable manages them. Do not put secret values in the repo.
<!-- LOVABLE:END -->

- ReturnWise: all data access goes through server functions in src/lib/returnwise/server.functions.ts using the admin client keyed by a hashed Session ID (no login; tables have RLS with no policies). Why: sessions are anonymous and each request must purge expired sessions first.
- Cleaning, classification and analytics are pure modules in src/lib/returnwise/ shared by uploads and the demo; editable keywords/settings live in config.ts. Why: one code path, testable in src/test/returnwise.test.ts.
- ReturnWise orders: "Orders" = unique order_ref, "Order lines" = stored rows; order_ref is a session-salted hash of platform+Order_ID made in cleanRows. Why: counts must match across review, dashboard, products and PDF without storing real order IDs.
- ReturnWise date/time display goes through src/lib/returnwise/format.ts (UI and PDF). Why: one consistent date format everywhere.
