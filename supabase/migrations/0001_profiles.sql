-- One profile row per auth user, created automatically on sign-up.
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  name text not null default '',
  phone text not null default '',
  plan text not null default 'free',
  expired_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "read own profile" on public.profiles
  for select using (auth.uid() = id);

create policy "update own profile" on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

-- Users may only change their name. Plan, expiry and phone are set by the server.
revoke insert, update, delete on public.profiles from anon, authenticated;
grant update (name) on public.profiles to authenticated;

create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'name', new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1))
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
