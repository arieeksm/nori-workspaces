-- ============================================================================
-- PHASE 6: MULTI-TENANT WORKSPACE NOTES
-- ============================================================================

create table if not exists public.notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  title text not null default 'Untitled Note',
  content text not null default '',
  category text not null default 'personal' check (category in ('kuliah', 'ukm', 'personal')),
  pinned boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_notes_user_updated
  on public.notes (user_id, pinned desc, updated_at desc);

alter table public.notes enable row level security;

drop policy if exists "Users manage own notes" on public.notes;
create policy "Users manage own notes"
  on public.notes
  for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);