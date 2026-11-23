import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "../lib/supabase";
import { createInitialDemoSchedules, useIsDemoMode } from "../lib/demoData";
import type { NewWeeklySchedule, WeeklySchedule } from "../types";

function messageFrom(err: unknown): string {
  if (err && typeof err === "object" && "message" in err) {
    return String((err as { message: unknown }).message);
  }
  return "Something went wrong. Please try again.";
}

export interface UseSchedules {
  blocks: WeeklySchedule[];
  loading: boolean;
  error: string | null;
  actionError: string | null;
  clearActionError: () => void;
  refetch: () => Promise<void>;
  addBlock: (input: NewWeeklySchedule) => Promise<boolean>;
  deleteBlock: (id: string) => Promise<void>;
}

export function useSchedules(): UseSchedules {
  const isDemo = useIsDemoMode();
  const [blocks, setBlocks] = useState<WeeklySchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const blocksRef = useRef<WeeklySchedule[]>([]);
  blocksRef.current = blocks;

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);

    if (isDemo) {
      setBlocks(createInitialDemoSchedules());
      setLoading(false);
      return;
    }

    const { data, error: fetchError } = await supabase
      .from("weekly_schedules")
      .select("*")
      .order("day_of_week", { ascending: true })
      .order("start_time", { ascending: true });

    if (fetchError) {
      setError(messageFrom(fetchError));
    } else {
      setBlocks((data ?? []) as WeeklySchedule[]);
    }
    setLoading(false);
  }, [isDemo]);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  const addBlock = useCallback(
    async (input: NewWeeklySchedule): Promise<boolean> => {
      setActionError(null);

      if (isDemo) {
        const mockBlock: WeeklySchedule = {
          id: `demo-sched-${Date.now()}`,
          ...input,
        };
        setBlocks((prev) => [...prev, mockBlock]);
        return true;
      }

      const { data, error: insertError } = await supabase.from("weekly_schedules").insert(input).select().single();

      if (insertError || !data) {
        setActionError(`Could not add schedule block: ${messageFrom(insertError)}`);
        return false;
      }
      setBlocks((prev) => [...prev, data as WeeklySchedule]);
      return true;
    },
    [isDemo],
  );

  const deleteBlock = useCallback(
    async (id: string) => {
      const removed = blocksRef.current.find((b) => b.id === id);
      if (!removed) return;

      setActionError(null);
      setBlocks((prev) => prev.filter((b) => b.id !== id));

      if (isDemo) return;

      const { error: deleteError } = await supabase.from("weekly_schedules").delete().eq("id", id);

      if (deleteError) {
        setBlocks((prev) => (prev.some((b) => b.id === id) ? prev : [...prev, removed]));
        setActionError(`Could not delete schedule block: ${messageFrom(deleteError)}`);
      }
    },
    [isDemo],
  );

  const clearActionError = useCallback(() => setActionError(null), []);

  return {
    blocks,
    loading,
    error,
    actionError,
    clearActionError,
    refetch,
    addBlock,
    deleteBlock,
  };
}
