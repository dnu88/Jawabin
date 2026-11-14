-- Notification preferences and the activity log.

alter table public.profiles
  add column notification jsonb not null default '{"affiliate": true, "expired": true, "transaction": true, "account": true}';

create table public.activities (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  module text not null,
  action text not null,
  status text not null default 'success' check (status in ('success', 'failed')),
  source text not null default 'web',
  target_label text not null default '',
  detail jsonb not null default '{}',
  error_message text not null default '',
  user_agent text not null default '',
  ip text not null default '',
  created_at timestamptz not null default now()
);
create index activities_user_created on public.activities (user_id, created_at desc);

-- Like the other core tables: no policies, only the server reads and writes.
alter table public.activities enable row level security;
