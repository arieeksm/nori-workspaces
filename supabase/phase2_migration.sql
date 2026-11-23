-- Notion-Rival, Phase 2 migration.
-- Run this in the Supabase dashboard: SQL Editor -> New query -> Run.
-- Safe to re-run: every statement is idempotent and existing tasks are untouched.

-- 1) New columns on public.tasks -------------------------------------------
alter table public.tasks
  add column if not exists notes text;

alter table public.tasks
  add column if not exists subtasks jsonb not null default '[]'::jsonb;

-- Subtasks must always be a JSON array: [{ "id": "...", "title": "...", "done": false }]
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'tasks_subtasks_is_array'
      and conrelid = 'public.tasks'::regclass
  ) then
    alter table public.tasks
      add constraint tasks_subtasks_is_array
      check (jsonb_typeof(subtasks) = 'array');
  end if;
end
$$;

-- 2) Fixed weekly schedule (classes and UKM meetings) ------------------------
create table if not exists public.weekly_schedules (
  id           uuid primary key default gen_random_uuid(),
  title        text not null
               check (char_length(trim(title)) between 1 and 200),
  category     text not null
               check (category in ('kuliah', 'ukm')),
  day_of_week  int  not null
               check (day_of_week between 1 and 7),  -- 1 = Monday ... 7 = Sunday
  start_time   time not null,
  end_time     time not null,
  location     text,
  constraint weekly_schedules_time_order check (end_time > start_time)
);

create index if not exists weekly_schedules_day_start_idx
  on public.weekly_schedules (day_of_week, start_time);

alter table public.weekly_schedules enable row level security;

-- MVP ONLY: same temporary anon policy as public.tasks (no auth yet).
-- Replace with per-user policies when Supabase Auth is added.
drop policy if exists "mvp_anon_full_access" on public.weekly_schedules;
create policy "mvp_anon_full_access"
  on public.weekly_schedules
  for all
  to anon
  using (true)
  with check (true);
