-- Core tables for AI settings, connected accounts, comments and reply rules.
-- Row level security is on with no policies: only the server (service role)
-- reads and writes these tables; the browser goes through /api.

create table public.ai_settings (
  user_id uuid primary key references auth.users (id) on delete cascade,
  type text not null default 'gemini',
  url text not null default '',
  model text not null default '',
  token_encrypted text not null default '',
  token_hint text not null default '',
  updated_at timestamptz not null default now()
);

create table public.ai_usage (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  type text not null check (type in ('validate', 'content', 'chat')),
  token integer not null default 0,
  data jsonb not null default '{}',
  created_at timestamptz not null default now()
);
create index ai_usage_user_created on public.ai_usage (user_id, created_at desc);

create table public.accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  platform text not null,
  platform_user_id text not null,
  username text not null default '',
  name text not null default '',
  picture text not null default '',
  access_token_encrypted text not null,
  token_expires_at timestamptz,
  created_at timestamptz not null default now(),
  unique (platform, platform_user_id)
);
create index accounts_user on public.accounts (user_id);

create table public.rules (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  account_id uuid references public.accounts (id) on delete cascade,
  name text not null,
  type text not null check (type in ('keyword', 'ai')),
  keywords text[] not null default '{}',
  reply text not null default '',
  prompt text not null default '',
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);
create index rules_user on public.rules (user_id, created_at);

create table public.comments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  account_id uuid not null references public.accounts (id) on delete cascade,
  platform_comment_id text not null unique,
  media_id text not null default '',
  text text not null default '',
  from_id text not null default '',
  from_username text not null default '',
  status text not null default 'pending' check (status in ('pending', 'resolved', 'ignored')),
  reply_text text not null default '',
  replied_by text not null default '',
  error text not null default '',
  created_at timestamptz not null default now()
);
create index comments_user_created on public.comments (user_id, created_at desc);

alter table public.ai_settings enable row level security;
alter table public.ai_usage enable row level security;
alter table public.accounts enable row level security;
alter table public.rules enable row level security;
alter table public.comments enable row level security;
