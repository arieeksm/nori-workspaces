-- Notion-Rival, Phase 5: User profiles and username-based login.
-- Run in Supabase SQL Editor after Phase 4 has been applied.
-- Public sign-up remains disabled; profiles are created for managed users.

begin;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique not null,
  full_name text,
  email text not null,
  created_at timestamptz default now(),
  constraint profiles_username_min_length
    check (char_length(trim(username)) >= 2)
);

-- Ensure the expected constraint exists if the table pre-dated this migration.
do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'profiles_username_min_length'
      and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles
      add constraint profiles_username_min_length
      check (char_length(trim(username)) >= 2);
  end if;
end
$$;

alter table public.profiles enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
drop policy if exists "profiles_update_own" on public.profiles;

create policy "profiles_select_own"
  on public.profiles
  for select
  to authenticated
  using (auth.uid() = id);

create policy "profiles_update_own"
  on public.profiles
  for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

revoke all privileges on table public.profiles from anon;
grant select, update on table public.profiles to authenticated;

-- Backfill the original owner. Existing profile details are preserved on reruns.
insert into public.profiles (id, username, full_name, email)
select
  u.id,
  'arie',
  null,
  u.email
from auth.users as u
where u.id = 'f5526f95-dd67-459a-90a3-0a200067151a'::uuid
  and u.email is not null
on conflict (id) do update
set email = excluded.email;

-- Resolve one username to one email without granting table access to anon.
create or replace function public.get_email_by_username(p_username text)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select p.email
  from public.profiles as p
  where lower(trim(p.username)) = lower(trim(p_username))
  limit 1;
$$;

revoke all on function public.get_email_by_username(text) from public;
grant execute on function public.get_email_by_username(text) to anon, authenticated;

commit;
