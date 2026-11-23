export type Category = "kuliah" | "ukm" | "personal";
export type CategoryFilter = "all" | Category;
export type Status = "todo" | "in_progress" | "done";
export type Priority = "low" | "medium" | "high";

export interface Subtask {
  id: string;
  title: string;
  done: boolean;
}

export interface Task {
  id: string;
  user_id?: string;
  title: string;
  category: Category;
  status: Status;
  priority: Priority;
  /** ISO date string (YYYY-MM-DD) or null when there is no deadline. */
  due_date: string | null;
  created_at: string;
  /** Free-form markdown-ish notes. */
  notes: string | null;
  /** Checklist stored in a jsonb column. Always an array. */
  subtasks: Subtask[];
}

export interface NewTask {
  title: string;
  category: Category;
  priority: Priority;
  due_date: string | null;
}

/** Fields that can be edited after a task is created. */
export type TaskPatch = Partial<
  Pick<Task, "title" | "category" | "status" | "priority" | "due_date" | "notes" | "subtasks">
>;

export type ScheduleCategory = "kuliah" | "ukm";

export interface WeeklySchedule {
  id: string;
  user_id?: string;
  title: string;
  category: ScheduleCategory;
  /** 1 = Monday ... 7 = Sunday */
  day_of_week: number;
  /** Postgres time, e.g. "08:00:00" */
  start_time: string;
  end_time: string;
  location: string | null;
}

export interface NewWeeklySchedule {
  title: string;
  category: ScheduleCategory;
  day_of_week: number;
  /** "HH:MM" */
  start_time: string;
  end_time: string;
  location: string | null;
}

export interface Note {
  id: string;
  user_id?: string;
  title: string;
  content: string;
  category: Category;
  pinned: boolean;
  created_at: string;
  updated_at: string;
}

export interface NewNote {
  title?: string;
  content?: string;
  category?: Category;
  pinned?: boolean;
}

export type NotePatch = Partial<Pick<Note, "title" | "content" | "category" | "pinned">>;
