-- History of the account-level webhook subscription check. Meta delivers nothing
-- for an account whose `subscribed_apps` readback is empty, and that readback can
-- only be done with the stored (encrypted) token, so the server records what it
-- saw each time it checked or repaired the subscription.

create table public.account_checks (
  id bigint generated always as identity primary key,
  account_id uuid not null references public.accounts(id) on delete cascade,
  checked_at timestamptz not null default now(),
  subscribed boolean not null,
  fields text[] not null default '{}',
  action text not null,
  error text
);

create index account_checks_account_time_idx on public.account_checks (account_id, checked_at desc);

-- No policies: only the server (service role) reads or writes this table.
alter table public.account_checks enable row level security;
