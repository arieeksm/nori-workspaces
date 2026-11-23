import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "../lib/supabase";
import { createInitialDemoTasks, useIsDemoMode } from "../lib/demoData";
import type { NewTask, Status, Subtask, Task, TaskPatch } from "../types";

function messageFrom(err: unknown): string {
  if (err && typeof err === "object" && "message" in err) {
    return String((err as { message: unknown }).message);
  }
  return "Something went wrong. Please try again.";
}

function isSubtask(value: unknown): value is Subtask {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  return typeof v.id === "string" && typeof v.title === "string" && typeof v.done === "boolean";
}

function normalizeTask(row: unknown): Task {
  const r = row as Record<string, unknown>;
  return {
    ...(r as unknown as Task),
    notes: typeof r.notes === "string" ? r.notes : null,
    subtasks: Array.isArray(r.subtasks) ? r.subtasks.filter(isSubtask) : [],
  };
}

export interface UseTasks {
  tasks: Task[];
  loading: boolean;
  error: string | null;
  actionError: string | null;
  clearActionError: () => void;
  refetch: () => Promise<void>;
  addTask: (input: NewTask) => Promise<boolean>;
  updateTask: (id: string, patch: TaskPatch) => Promise<boolean>;
  updateStatus: (id: string, status: Status) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
}

export function useTasks(): UseTasks {
  const isDemo = useIsDemoMode();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const tasksRef = useRef<Task[]>([]);
  tasksRef.current = tasks;

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);

    if (isDemo) {
      setTasks(createInitialDemoTasks());
      setLoading(false);
      return;
    }

    const { data, error: fetchError } = await supabase
      .from("tasks")
      .select("*")
      .order("created_at", { ascending: true });

    if (fetchError) {
      setError(messageFrom(fetchError));
    } else {
      setTasks((data ?? []).map(normalizeTask));
    }
    setLoading(false);
  }, [isDemo]);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  const addTask = useCallback(
    async (input: NewTask): Promise<boolean> => {
      setActionError(null);

      if (isDemo) {
        const mockTask: Task = {
          id: `demo-${Date.now()}`,
          title: input.title,
          category: input.category,
          priority: input.priority,
          due_date: input.due_date,
          status: "todo",
          created_at: new Date().toISOString(),
          notes: null,
          subtasks: [],
        };
        setTasks((prev) => [...prev, mockTask]);
        return true;
      }

      const { data, error: insertError } = await supabase
        .from("tasks")
        .insert({
          title: input.title,
          category: input.category,
          priority: input.priority,
          due_date: input.due_date,
          status: "todo",
        })
        .select()
        .single();

      if (insertError || !data) {
        setActionError(`Could not add task: ${messageFrom(insertError)}`);
        return false;
      }
      setTasks((prev) => [...prev, normalizeTask(data)]);
      return true;
    },
    [isDemo],
  );

  const updateTask = useCallback(
    async (id: string, patch: TaskPatch): Promise<boolean> => {
      const previous = tasksRef.current.find((t) => t.id === id);
      if (!previous) return false;

      setActionError(null);
      setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)));

      if (isDemo) return true;

      const { error: updateError } = await supabase.from("tasks").update(patch).eq("id", id);

      if (updateError) {
        const revert = Object.fromEntries(
          (Object.keys(patch) as (keyof TaskPatch)[]).map((key) => [key, previous[key]]),
        ) as unknown as TaskPatch;
        setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, ...revert } : t)));
        setActionError(`Could not update task: ${messageFrom(updateError)}`);
        return false;
      }
      return true;
    },
    [isDemo],
  );

  const updateStatus = useCallback(
    async (id: string, status: Status) => {
      const previous = tasksRef.current.find((t) => t.id === id);
      if (!previous || previous.status === status) return;
      await updateTask(id, { status });
    },
    [updateTask],
  );

  const deleteTask = useCallback(
    async (id: string) => {
      const removed = tasksRef.current.find((t) => t.id === id);
      if (!removed) return;

      setActionError(null);
      setTasks((prev) => prev.filter((t) => t.id !== id));

      if (isDemo) return;

      const { error: deleteError } = await supabase.from("tasks").delete().eq("id", id);

      if (deleteError) {
        setTasks((prev) => (prev.some((t) => t.id === id) ? prev : [...prev, removed]));
        setActionError(`Could not delete task: ${messageFrom(deleteError)}`);
      }
    },
    [isDemo],
  );

  const clearActionError = useCallback(() => setActionError(null), []);

  return {
    tasks,
    loading,
    error,
    actionError,
    clearActionError,
    refetch,
    addTask,
    updateTask,
    updateStatus,
    deleteTask,
  };
}
