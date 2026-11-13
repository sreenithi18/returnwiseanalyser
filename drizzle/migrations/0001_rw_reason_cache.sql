CREATE TABLE public.rw_reason_cache (
  id BIGSERIAL PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES public.rw_sessions(id) ON DELETE CASCADE,
  reason_key TEXT NOT NULL,
  issue_label TEXT NOT NULL,
  theme TEXT NOT NULL,
  confidence TEXT NOT NULL DEFAULT 'medium',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (session_id, reason_key)
);
REVOKE ALL ON public.rw_reason_cache FROM anon, authenticated;
GRANT ALL ON public.rw_reason_cache TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.rw_reason_cache_id_seq TO service_role;
ALTER TABLE public.rw_reason_cache ENABLE ROW LEVEL SECURITY;
COMMENT ON TABLE public.rw_reason_cache IS 'AI return-reason classifications cached per session; server-only access, deleted with the session.';
COMMENT ON COLUMN public.rw_order_lines.reason_category IS 'DEPRECATED: keyword classifier output; themes now come from rw_reason_cache.';