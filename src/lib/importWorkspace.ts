import { supabase } from "./supabase";
import type { Category, Note, Priority, ScheduleCategory, Status, Subtask, Task, WeeklySchedule } from "../types";

export interface ParsedWorkspaceBackup {
  exportedAt?: string;
  username?: string;
  tasks: Omit<Task, "id" | "user_id" | "created_at">[];
  schedules: Omit<WeeklySchedule, "id" | "user_id">[];
  notes: Omit<Note, "id" | "user_id" | "created_at" | "updated_at">[];
}

export interface RestoreSummary {
  insertedTasks: number;
  skippedTasks: number;
  insertedSchedules: number;
  skippedSchedules: number;
  insertedNotes: number;
  skippedNotes: number;
}

const VALID_CATEGORIES = new Set<Category>(["kuliah", "ukm", "personal"]);
const VALID_STATUSES = new Set<Status>(["todo", "in_progress", "done"]);
const VALID_PRIORITIES = new Set<Priority>(["low", "medium", "high"]);
const VALID_SCHEDULE_CATEGORIES = new Set<ScheduleCategory>(["kuliah", "ukm"]);

function normalizeCategory(value: unknown, fallback: Category = "personal"): Category {
  return typeof value === "string" && VALID_CATEGORIES.has(value as Category) ? (value as Category) : fallback;
}

function normalizeStatus(value: unknown): Status {
  return typeof value === "string" && VALID_STATUSES.has(value as Status) ? (value as Status) : "todo";
}

function normalizePriority(value: unknown): Priority {
  return typeof value === "string" && VALID_PRIORITIES.has(value as Priority) ? (value as Priority) : "medium";
}

function normalizeSubtasks(raw: unknown): Subtask[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((item): item is Record<string, unknown> => Boolean(item && typeof item === "object"))
    .map((item, idx) => ({
      id: typeof item.id === "string" && item.id.trim() ? item.id : `sub-${Date.now()}-${idx}`,
      title: typeof item.title === "string" ? item.title.trim() : "",
      done: Boolean(item.done),
    }))
    .filter((sub) => sub.title.length > 0);
}

export function parseWorkspaceBackupJson(rawText: string): ParsedWorkspaceBackup {
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawText);
  } catch {
    throw new Error("File tidak valid: format JSON rusak atau tidak dapat dibaca.");
  }

  if (!parsed || typeof parsed !== "object") {
    throw new Error("Struktur file backup tidak dikenali.");
  }

  const record = parsed as Record<string, unknown>;
  const metadata =
    record.metadata && typeof record.metadata === "object" ? (record.metadata as Record<string, unknown>) : undefined;

  const rawTasks = Array.isArray(record.tasks) ? record.tasks : [];
  const rawSchedules = Array.isArray(record.schedules) ? record.schedules : [];
  const rawNotes = Array.isArray(record.notes) ? record.notes : [];

  if (rawTasks.length === 0 && rawSchedules.length === 0 && rawNotes.length === 0) {
    throw new Error("File backup kosong atau tidak memiliki data tasks, schedules, maupun notes.");
  }

  const tasks: ParsedWorkspaceBackup["tasks"] = rawTasks
    .filter((item): item is Record<string, unknown> => Boolean(item && typeof item === "object"))
    .map((item) => {
      const title = typeof item.title === "string" ? item.title.trim() : "";
      const dueDate =
        typeof item.due_date === "string" && /^\d{4}-\d{2}-\d{2}/.test(item.due_date)
          ? item.due_date.slice(0, 10)
          : null;
      return {
        title,
        category: normalizeCategory(item.category, "kuliah"),
        status: normalizeStatus(item.status),
        priority: normalizePriority(item.priority),
        due_date: dueDate,
        notes: typeof item.notes === "string" && item.notes.trim() ? item.notes : null,
        subtasks: normalizeSubtasks(item.subtasks),
      };
    })
    .filter((t) => t.title.length > 0);

  const schedules: ParsedWorkspaceBackup["schedules"] = rawSchedules
    .filter((item): item is Record<string, unknown> => Boolean(item && typeof item === "object"))
    .map((item) => {
      const title = typeof item.title === "string" ? item.title.trim() : "";
      const day = Number(item.day_of_week);
      const category: ScheduleCategory =
        typeof item.category === "string" && VALID_SCHEDULE_CATEGORIES.has(item.category as ScheduleCategory)
          ? (item.category as ScheduleCategory)
          : "kuliah";
      const startTime = typeof item.start_time === "string" ? item.start_time.slice(0, 8) : "";
      const endTime = typeof item.end_time === "string" ? item.end_time.slice(0, 8) : "";
      return {
        title,
        category,
        day_of_week: Number.isInteger(day) && day >= 1 && day <= 7 ? day : 1,
        start_time: startTime.length === 5 ? `${startTime}:00` : startTime,
        end_time: endTime.length === 5 ? `${endTime}:00` : endTime,
        location: typeof item.location === "string" && item.location.trim() ? item.location.trim() : null,
      };
    })
    .filter((s) => s.title.length > 0 && s.start_time.length >= 5 && s.end_time.length >= 5);

  const notes: ParsedWorkspaceBackup["notes"] = rawNotes
    .filter((item): item is Record<string, unknown> => Boolean(item && typeof item === "object"))
    .map((item) => ({
      title: typeof item.title === "string" && item.title.trim() ? item.title.trim() : "Untitled Note",
      content: typeof item.content === "string" ? item.content : "",
      category: normalizeCategory(item.category, "personal"),
      pinned: Boolean(item.pinned),
    }));

  return {
    exportedAt: typeof metadata?.exportedAt === "string" ? metadata.exportedAt : undefined,
    username: typeof metadata?.username === "string" ? metadata.username : undefined,
    tasks,
    schedules,
    notes,
  };
}

export async function restoreWorkspaceBackup(
  backup: ParsedWorkspaceBackup,
  existing: {
    tasks: Task[];
    schedules: WeeklySchedule[];
    notes: Note[];
  },
): Promise<RestoreSummary> {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error("Sesi login tidak ditemukan. Silakan sign in ulang sebelum restore.");
  }

  // Build deduplication keys so re-importing the same backup never duplicates existing records
  const taskSignatures = new Set(
    existing.tasks.map((t) => `${t.title.trim().toLowerCase()}|${t.category}|${t.due_date ?? ""}`),
  );
  const scheduleSignatures = new Set(
    existing.schedules.map(
      (s) => `${s.day_of_week}|${s.start_time.slice(0, 5)}|${s.end_time.slice(0, 5)}|${s.title.trim().toLowerCase()}`,
    ),
  );
  const noteSignatures = new Set(
    existing.notes.map((n) => `${n.title.trim().toLowerCase()}|${n.category}|${n.content.trim()}`),
  );

  const tasksToInsert = backup.tasks.filter(
    (t) => !taskSignatures.has(`${t.title.toLowerCase()}|${t.category}|${t.due_date ?? ""}`),
  );
  const schedulesToInsert = backup.schedules.filter(
    (s) =>
      !scheduleSignatures.has(
        `${s.day_of_week}|${s.start_time.slice(0, 5)}|${s.end_time.slice(0, 5)}|${s.title.toLowerCase()}`,
      ),
  );
  const notesToInsert = backup.notes.filter(
    (n) => !noteSignatures.has(`${n.title.toLowerCase()}|${n.category}|${n.content.trim()}`),
  );

  if (tasksToInsert.length > 0) {
    const { error } = await supabase.from("tasks").insert(
      tasksToInsert.map((t) => ({
        user_id: user.id,
        title: t.title,
        category: t.category,
        status: t.status,
        priority: t.priority,
        due_date: t.due_date,
        notes: t.notes,
        subtasks: t.subtasks,
      })),
    );
    if (error) throw new Error(`Gagal memulihkan tasks: ${error.message}`);
  }

  if (schedulesToInsert.length > 0) {
    const { error } = await supabase.from("weekly_schedules").insert(
      schedulesToInsert.map((s) => ({
        user_id: user.id,
        title: s.title,
        category: s.category,
        day_of_week: s.day_of_week,
        start_time: s.start_time,
        end_time: s.end_time,
        location: s.location,
      })),
    );
    if (error) throw new Error(`Gagal memulihkan jadwal rutin: ${error.message}`);
  }

  if (notesToInsert.length > 0) {
    const { error } = await supabase.from("notes").insert(
      notesToInsert.map((n) => ({
        user_id: user.id,
        title: n.title,
        content: n.content,
        category: n.category,
        pinned: n.pinned,
      })),
    );
    if (error) throw new Error(`Gagal memulihkan notes: ${error.message}`);
  }

  return {
    insertedTasks: tasksToInsert.length,
    skippedTasks: backup.tasks.length - tasksToInsert.length,
    insertedSchedules: schedulesToInsert.length,
    skippedSchedules: backup.schedules.length - schedulesToInsert.length,
    insertedNotes: notesToInsert.length,
    skippedNotes: backup.notes.length - notesToInsert.length,
  };
}
