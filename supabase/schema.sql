-- Notion-Rival, Phase 1 schema.
-- Run this in the Supabase dashboard: SQL Editor -> New query -> Run.

create table if not exists public.tasks (
  id          uuid primary key default gen_random_uuid(),
  title       text not null
              check (char_length(trim(title)) between 1 and 200),
  category    text not null default 'personal'
              check (category in ('kuliah', 'ukm', 'personal')),
  status      text not null default 'todo'
              check (status in ('todo', 'in_progress', 'done')),
  priority    text not null default 'medium'
              check (priority in ('low', 'medium', 'high')),
  due_date    date,
  created_at  timestamptz not null default now()
);

create index if not exists tasks_due_date_idx on public.tasks (due_date);
create index if not exists tasks_category_idx on public.tasks (category);

alter table public.tasks enable row level security;

-- MVP ONLY: there is no auth in Phase 1, so the anon key gets full access.
-- Anyone who has your anon key (it ships in the browser bundle) can read and
-- write this table. Before sharing the deployed URL, add Supabase Auth, a
-- user_id column (default auth.uid()), and replace this policy with
-- "using (user_id = auth.uid())" style policies for the authenticated role.
drop policy if exists "mvp_anon_full_access" on public.tasks;
create policy "mvp_anon_full_access"
  on public.tasks
  for all
  to anon
  using (true)
  with check (true);
