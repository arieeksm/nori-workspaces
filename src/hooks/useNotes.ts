import { useCallback, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import type { NewNote, Note, NotePatch } from "../types";

function sortNotes(list: Note[]): Note[] {
  return [...list].sort((a, b) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
    return b.updated_at.localeCompare(a.updated_at);
  });
}

export function useNotes() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchNotes = useCallback(async () => {
    setLoading(true);
    setError(null);

    const { data, error: fetchError } = await supabase
      .from("notes")
      .select("*")
      .order("pinned", { ascending: false })
      .order("updated_at", { ascending: false });

    if (fetchError) {
      setError(fetchError.message);
      setLoading(false);
      return;
    }

    setNotes(sortNotes((data as Note[]) ?? []));
    setLoading(false);
  }, []);

  useEffect(() => {
    void fetchNotes();
  }, [fetchNotes]);

  const createNote = useCallback(async (input: NewNote = {}): Promise<Note | null> => {
    const now = new Date().toISOString();
    const optimisticId = `temp-${crypto.randomUUID()}`;
    const optimisticNote: Note = {
      id: optimisticId,
      title: input.title?.trim() || "Untitled Note",
      content: input.content ?? "",
      category: input.category ?? "personal",
      pinned: input.pinned ?? false,
      created_at: now,
      updated_at: now,
    };

    setNotes((prev) => sortNotes([optimisticNote, ...prev]));

    const { data, error: insertError } = await supabase
      .from("notes")
      .insert({
        title: optimisticNote.title,
        content: optimisticNote.content,
        category: optimisticNote.category,
        pinned: optimisticNote.pinned,
      })
      .select("*")
      .single();

    if (insertError || !data) {
      setError(insertError?.message ?? "Failed to create note");
      setNotes((prev) => prev.filter((item) => item.id !== optimisticId));
      return null;
    }

    const saved = data as Note;
    setNotes((prev) => sortNotes(prev.map((item) => (item.id === optimisticId ? saved : item))));
    return saved;
  }, []);

  const updateNote = useCallback(async (id: string, patch: NotePatch): Promise<boolean> => {
    if (id.startsWith("temp-")) return false;
    const updatedAt = new Date().toISOString();

    setNotes((prev) =>
      sortNotes(prev.map((item) => (item.id === id ? { ...item, ...patch, updated_at: updatedAt } : item))),
    );

    const { error: updateError } = await supabase
      .from("notes")
      .update({ ...patch, updated_at: updatedAt })
      .eq("id", id);

    if (updateError) {
      setError(updateError.message);
      return false;
    }
    return true;
  }, []);

  const deleteNote = useCallback(async (id: string): Promise<boolean> => {
    let snapshot: Note[] = [];
    setNotes((prev) => {
      snapshot = prev;
      return prev.filter((item) => item.id !== id);
    });

    if (id.startsWith("temp-")) return true;

    const { error: deleteError } = await supabase.from("notes").delete().eq("id", id);
    if (deleteError) {
      setError(deleteError.message);
      setNotes(snapshot);
      return false;
    }
    return true;
  }, []);

  return {
    notes,
    loading,
    error,
    createNote,
    updateNote,
    deleteNote,
    refetch: fetchNotes,
  };
}
