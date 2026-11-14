-- Direct messages (Instagram messaging). Same rule as the other tables: RLS is
-- on with no policies, so only the service-role server touches these rows and
-- every query filters by user_id.

-- A rule can target comments, direct messages, or both. Existing rows keep
-- answering comments, which is what they did before this migration.
alter table public.rules add column if not exists channel text not null default 'comment'
  check (channel in ('comment', 'chat', 'both'));

create table public.chats (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  account_id uuid not null references public.accounts (id) on delete cascade,
  platform text not null default 'instagram',
  platform_chat_id text not null,
  participant_id text not null default '',
  participant_username text not null default '',
  last_inbound_at timestamptz,
  last_message_at timestamptz not null default now(),
  last_message_text text not null default '',
  unread integer not null default 0,
  created_at timestamptz not null default now(),
  unique (account_id, platform_chat_id)
);
create index chats_user_recent on public.chats (user_id, last_message_at desc);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  chat_id uuid not null references public.chats (id) on delete cascade,
  direction text not null check (direction in ('in', 'out')),
  text text not null default '',
  platform_message_id text not null default '',
  replied_by text not null default '',
  error text not null default '',
  created_at timestamptz not null default now()
);
create index messages_chat_created on public.messages (chat_id, created_at);
-- Instagram retries deliveries; the same message id must land once.
create unique index messages_platform_unique on public.messages (platform_message_id)
  where platform_message_id <> '';

alter table public.chats enable row level security;
alter table public.messages enable row level security;
