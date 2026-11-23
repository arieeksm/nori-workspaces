# NoRi Workspaces

**NoRi Workspaces** is a calm, distraction-free personal task, deadline, and weekly routine schedule workspace built with a flat editorial light aesthetic. Originally conceived as a single-user productivity tool, it evolved into a secure, invite-only multi-tenant web application with strict row-level data isolation.

---

## Key Features

- **Editorial Light Interface:** Low-contrast, tactile workspace (`#FBFBFA` paper canvas, `#F3F3F1` sunken surfaces, `#1F1F1F` ink) designed for extended daily focus without visual clutter.
- **Task & Deadline Management:** Categorized workflows (**Kuliah**, **UKM**, **Personal**), priority tagging, smart deadline grouping (_Overdue_, _Today_, _Next 7 Days_, _Upcoming_), and keyboard shortcuts (`N` to quick-add).
- **Side-Peek Detail Drawer:** Slide-over task inspector featuring live Markdown notes and interactive checklist subtasks with optimistic UI updates.
- **Weekly Routine Schedule Grid:** Structured Monday–Sunday timetable view for recurring classes, organization meetings, and personal routines.
- **Flexible Invite-Only Authentication:** Supports instant sign-in via either **short username** or **email address**, backed by a `SECURITY DEFINER` PostgreSQL RPC lookup that resolves usernames without exposing user tables.
- **Multi-Tenant Data Isolation:** Enforced at the PostgreSQL database layer via Row-Level Security (`auth.uid() = user_id`), ensuring complete privacy across invited accounts.

---

## Tech Stack

- **Frontend:** React 18, TypeScript (Strict Mode), Vite, Tailwind CSS
- **Motion & Icons:** Framer Motion (`LayoutGroup` shared-element transitions), Lucide React
- **Backend & Database:** Supabase (PostgreSQL, Row-Level Security, Pl/pgSQL RPC & Triggers, Supabase Auth)
- **Deployment:** Vercel

---

## Architecture & Security Highlights

1. **Zero-Trust Client Access:** Direct table privileges for the `anon` role are revoked. All read/write operations require an authenticated session and pass through PostgreSQL RLS policies (`tenant_isolation_policy`).
2. **Automatic Tenant Binding:** Columns `user_id` on `tasks` and `weekly_schedules` default to `auth.uid()` at the database level, preventing client-side ID spoofing.
3. **Privacy-Preserving Username Lookup:** Instead of granting public `SELECT` access to `public.profiles`, `LoginScreen` calls `public.get_email_by_username(p_username)` to safely resolve credentials prior to authentication.

---

## Version History & Development Changelog

### **v1.3.0 — Multi-Tenant Isolation & Profile Authentication**

- **Database (`phase4_multitenant.sql`):** Migrated `tasks` and `weekly_schedules` from a single-UID lock to dynamic per-user isolation (`auth.uid() = user_id`) with automatic `auth.uid()` defaults and legacy data backfill.
- **Profiles & Username Login (`phase5_profiles.sql`):** Added `public.profiles` table, automated `auth.users` insert trigger (`handle_new_user_profile`), and `SECURITY DEFINER` RPC lookup so invited users can sign in with custom short usernames.
- **UI Polish:** Updated `LoginScreen` and `AppShell` header to display `@username` identities and added a minimalist editorial footer.

### **v1.2.0 — Database Hardening & Type Strictness**

- **Security (`phase3_security.sql`):** Enabled strict Row-Level Security across all tables, revoked anonymous access, and locked down schema permissions.
- **Code Quality:** Resolved strict TypeScript (`noUnusedLocals`, `noUnusedParameters`) checks and refined JSX layout shells for clean production builds (`tsc --noEmit && vite build`).

### **v1.1.0 — Rich Task Details & Weekly Schedule Grid**

- **Database (`phase2_migration.sql`):** Extended `tasks` schema with `notes` (Markdown) and `subtasks` (`JSONB`), and introduced the `weekly_schedules` table.
- **Interactive Workspace:** Built the slide-over side-peek task drawer, subtask progress tracking, and the Monday–Sunday routine schedule grid with smooth Framer Motion tab transitions.

### **v1.0.0 — Core MVP & Editorial Design System**

- **Database (`schema.sql`):** Designed initial PostgreSQL schema for tasks, categories, priorities, and due dates.
- **Frontend Foundation:** Established the custom Tailwind design tokens (`paper`, `sunken`, `ink`, `mute`), optimistic state hooks (`useTasks`, `useSchedules`), and keyboard-driven task creation.

---
