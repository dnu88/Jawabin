-- Additive: existing rows retain their Instagram Login token lifecycle.
alter table public.accounts
  add column auth_mode text not null default 'instagram_login'
    check (auth_mode in ('instagram_login', 'unified_login')),
  add column client_business_id text,
  add column login_config_id text;

alter table public.accounts add constraint accounts_unified_metadata check (
  auth_mode <> 'unified_login' or (
    client_business_id is not null and client_business_id ~ '^[0-9]+$' and
    login_config_id is not null and login_config_id ~ '^[0-9]+$'
  )
);

-- Service-role only. One transaction checks ALL owners before any insert or
-- update. Serialize the small, infrequent connect batches against other account
-- writers too: a select-then-upsert in JS can otherwise transfer account ownership.
-- Invoker security preserves the existing RLS boundary; never expose this RPC to
-- anon/authenticated roles (p_user_id comes from server-verified signed state).
create function public.connect_instagram_accounts(p_user_id uuid, p_accounts jsonb)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  expected_count integer;
  written_count integer;
begin
  if p_user_id is null or jsonb_typeof(p_accounts) is distinct from 'array' then
    raise exception 'invalid account batch' using errcode = '22023';
  end if;
  expected_count := jsonb_array_length(p_accounts);
  if expected_count < 1 or expected_count > 200 then
    raise exception 'invalid account batch size' using errcode = '22023';
  end if;
  if exists (
    select 1 from jsonb_array_elements(p_accounts) a
    where a->>'platform_user_id' is null or a->>'platform_user_id' !~ '^[0-9]+$'
      or coalesce(a->>'access_token_encrypted', '') = ''
      or coalesce(a->>'auth_mode', '') not in ('instagram_login', 'unified_login')
  ) or (select count(distinct a->>'platform_user_id') from jsonb_array_elements(p_accounts) a) <> expected_count then
    raise exception 'invalid or duplicate Instagram account' using errcode = '22023';
  end if;

  lock table public.accounts in share row exclusive mode;
  if exists (
    select 1 from public.accounts existing
    join jsonb_array_elements(p_accounts) a on existing.platform_user_id = a->>'platform_user_id'
    where existing.platform = 'instagram' and existing.user_id <> p_user_id
  ) then
    raise exception 'Instagram account belongs to another user' using errcode = '42501';
  end if;

  -- Initial rollout deliberately does not migrate existing connections between
  -- auth families. Until staged subscription/activation exists, fail before any
  -- write so a failed new subscription cannot destroy a working legacy token.
  if exists (
    select 1 from public.accounts existing
    join jsonb_array_elements(p_accounts) a on existing.platform_user_id = a->>'platform_user_id'
    where existing.platform = 'instagram' and existing.auth_mode is distinct from a->>'auth_mode'
  ) then
    raise exception 'Instagram login method transition is not supported' using errcode = 'P0002';
  end if;

  insert into public.accounts as existing (
    user_id, platform, platform_user_id, username, name, picture,
    access_token_encrypted, token_expires_at, auth_mode, client_business_id, login_config_id
  )
  select p_user_id, 'instagram', a.platform_user_id,
    coalesce(a.username, ''), coalesce(a.name, ''), coalesce(a.picture, ''),
    a.access_token_encrypted, a.token_expires_at, a.auth_mode, a.client_business_id, a.login_config_id
  from jsonb_to_recordset(p_accounts) as a(
    platform_user_id text, username text, name text, picture text,
    access_token_encrypted text, token_expires_at timestamptz, auth_mode text,
    client_business_id text, login_config_id text
  )
  on conflict (platform, platform_user_id) do update set
    username = excluded.username, name = excluded.name, picture = excluded.picture,
    access_token_encrypted = excluded.access_token_encrypted,
    token_expires_at = excluded.token_expires_at, auth_mode = excluded.auth_mode,
    client_business_id = excluded.client_business_id, login_config_id = excluded.login_config_id
  where existing.user_id = p_user_id and existing.auth_mode = excluded.auth_mode;
  get diagnostics written_count = row_count;
  if written_count <> expected_count then
    raise exception 'Instagram account ownership conflict' using errcode = '42501';
  end if;
end;
$$;

revoke all on function public.connect_instagram_accounts(uuid, jsonb) from public, anon, authenticated;
grant execute on function public.connect_instagram_accounts(uuid, jsonb) to service_role;
