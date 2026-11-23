-- Notion-Rival, Phase 3: Auth & security lock.
-- Run this in the Supabase dashboard: SQL Editor -> New query -> Run.
-- Safe to re-run. Do the dashboard steps in README.md ("Lock it down") first:
-- create your user, and turn OFF "Allow new users to sign up".

begin;

-- 1) public.tasks -----------------------------------------------------------
alter table public.tasks enable row level security;

drop policy if exists "mvp_anon_full_access" on public.tasks;
drop policy if exists "authenticated_full_access" on public.tasks;

create policy "authenticated_full_access"
  on public.tasks
  for all
  to authenticated
  using (true)
  with check (true);

-- 2) public.weekly_schedules ------------------------------------------------
alter table public.weekly_schedules enable row level security;

drop policy if exists "mvp_anon_full_access" on public.weekly_schedules;
drop policy if exists "authenticated_full_access" on public.weekly_schedules;

create policy "authenticated_full_access"
  on public.weekly_schedules
  for all
  to authenticated
  using (true)
  with check (true);

-- 3) Defense in depth: signed-out visitors (role "anon") get no table access at all,
--    and signed-in users keep the privileges they need.
revoke all on table public.tasks from anon;
revoke all on table public.weekly_schedules from anon;

grant select, insert, update, delete on table public.tasks to authenticated;
grant select, insert, update, delete on table public.weekly_schedules to authenticated;

commit;

-- Optional check: each table should list exactly one policy, for {authenticated}.
-- select tablename, policyname, roles, cmd
-- from pg_policies
-- where schemaname = 'public' and tablename in ('tasks', 'weekly_schedules');
