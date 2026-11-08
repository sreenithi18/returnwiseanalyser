CREATE TABLE public.rw_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token_hash text NOT NULL UNIQUE,
  is_demo boolean NOT NULL DEFAULT false,
  confirmed boolean NOT NULL DEFAULT false,
  file_count int NOT NULL DEFAULT 0,
  stats jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT now() + interval '24 hours'
);
GRANT ALL ON public.rw_sessions TO service_role;
ALTER TABLE public.rw_sessions ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.rw_order_lines (
  id bigserial PRIMARY KEY,
  session_id uuid NOT NULL REFERENCES public.rw_sessions(id) ON DELETE CASCADE,
  dedupe_key text NOT NULL,
  order_ref text NOT NULL,
  platform text NOT NULL,
  product_id text NOT NULL,
  product_name text NOT NULL,
  category text NOT NULL,
  order_date date NOT NULL,
  price numeric NOT NULL,
  quantity int NOT NULL,
  discount numeric NOT NULL DEFAULT 0,
  payment_type text,
  shipping_method text,
  returned boolean NOT NULL DEFAULT false,
  return_date date,
  returned_qty int NOT NULL DEFAULT 0,
  return_reason text,
  reason_category text,
  city text,
  flag text,
  UNIQUE (session_id, dedupe_key)
);
CREATE INDEX ON public.rw_order_lines(session_id);
GRANT ALL ON public.rw_order_lines TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.rw_order_lines_id_seq TO service_role;
ALTER TABLE public.rw_order_lines ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.rw_rejected_rows (
  id bigserial PRIMARY KEY,
  session_id uuid NOT NULL REFERENCES public.rw_sessions(id) ON DELETE CASCADE,
  file_name text NOT NULL,
  row_number int NOT NULL,
  kind text NOT NULL,
  reason text NOT NULL
);
CREATE INDEX ON public.rw_rejected_rows(session_id);
GRANT ALL ON public.rw_rejected_rows TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.rw_rejected_rows_id_seq TO service_role;
ALTER TABLE public.rw_rejected_rows ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.rw_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.rw_sessions(id) ON DELETE CASCADE,
  token text NOT NULL UNIQUE,
  pdf_base64 text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.rw_reports TO service_role;
ALTER TABLE public.rw_reports ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.rw_purge_expired()
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  DELETE FROM public.rw_sessions WHERE expires_at <= now();
$$;
REVOKE ALL ON FUNCTION public.rw_purge_expired() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.rw_purge_expired() TO service_role;