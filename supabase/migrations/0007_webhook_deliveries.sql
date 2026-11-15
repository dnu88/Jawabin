-- Audit of every delivery Meta sends to /api/webhook/meta. Vercel on the Hobby
-- plan keeps runtime logs for about an hour and gates CDN request logs behind
-- Observability Plus, so without this table an inbound that never arrives and an
-- inbound that is refused by us look exactly the same: nothing recorded.
--
-- One row per POST. Rows are small; payload is only kept when the delivery was
-- refused or could not be stored (trimmed by the server), and old rows are
-- pruned by the server.

create table public.webhook_deliveries (
  id bigint generated always as identity primary key,
  received_at timestamptz not null default now(),
  object text,
  entries integer,
  outcome text not null,
  http_status integer not null,
  auth_mode text,
  signature_present boolean not null default false,
  content_type text,
  user_agent text,
  detail text,
  payload text
);

create index webhook_deliveries_received_at_idx on public.webhook_deliveries (received_at desc);

-- No policies: only the server (service role) touches this table, same as
-- rate_limits. Nothing here is readable with the anon key.
alter table public.webhook_deliveries enable row level security;
