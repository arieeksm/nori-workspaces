-- Notion-Rival, Phase 4: Multi-tenant per-user data isolation.
-- Run in Supabase: SQL Editor -> New query -> Run.
-- Safe to re-run. Existing rows are assigned to the original owner before
-- user_id is made NOT NULL.

begin;

-- Add user_id columns, then ensure their foreign-key constraints exist.
alter table public.tasks
  add column if not exists user_id uuid;

alter table public.weekly_schedules
  add column if not exists user_id uuid;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'tasks_user_id_fkey'
      and conrelid = 'public.tasks'::regclass
  ) then
    alter table public.tasks
      add constraint tasks_user_id_fkey
      foreign key (user_id) references auth.users(id) on delete cascade;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'weekly_schedules_user_id_fkey'
      and conrelid = 'public.weekly_schedules'::regclass
  ) then
    alter table public.weekly_schedules
      add constraint weekly_schedules_user_id_fkey
      foreign key (user_id) references auth.users(id) on delete cascade;
  end if;
end
$$;

-- Preserve all existing rows under the original owner's account.
update public.tasks
set user_id = 'f5526f95-dd67-459a-90a3-0a200067151a'::uuid
where user_id is null;

update public.weekly_schedules
set user_id = 'f5526f95-dd67-459a-90a3-0a200067151a'::uuid
where user_id is null;

-- Automatically associate future inserts with the authenticated user.
alter table public.tasks
  alter column user_id set default auth.uid(),
  alter column user_id set not null;

alter table public.weekly_schedules
  alter column user_id set default auth.uid(),
  alter column user_id set not null;

-- Enable RLS and remove prior policies, including Phase 3's actual policy name.
alter table public.tasks enable row level security;
alter table public.weekly_schedules enable row level security;

drop policy if exists "owner_only_access" on public.tasks;
drop policy if exists "authenticated_full_access" on public.tasks;
drop policy if exists "mvp_anon_full_access" on public.tasks;

drop policy if exists "owner_only_access" on public.weekly_schedules;
drop policy if exists "authenticated_full_access" on public.weekly_schedules;
drop policy if exists "mvp_anon_full_access" on public.weekly_schedules;

-- Users can select, insert, update, and delete only their own rows.
create policy "user_isolation"
  on public.tasks
  for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "user_isolation"
  on public.weekly_schedules
  for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Signed-out users have no table privileges.
revoke all privileges on table public.tasks from anon;
revoke all privileges on table public.weekly_schedules from anon;

-- Keep the privileges required by the authenticated application.
grant select, insert, update, delete on table public.tasks to authenticated;
grant select, insert, update, delete on table public.weekly_schedules to authenticated;

commit;

-- Optional verification:
-- select tablename, policyname, roles, cmd, qual, with_check
-- from pg_policies
-- where schemaname = 'public'
--   and tablename in ('tasks', 'weekly_schedules')
-- order by tablename, policyname;
