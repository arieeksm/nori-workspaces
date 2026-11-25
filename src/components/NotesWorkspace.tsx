import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import type { KeyboardEvent, ReactNode } from "react";
import {
  Bold,
  CheckSquare,
  Code,
  Eye,
  FileText,
  Heading2,
  Italic,
  List,
  Loader2,
  PencilLine,
  Pin,
  Plus,
  Quote,
  Search,
  Trash2,
} from "lucide-react";
import { focusRing } from "../ui";
import type { Category, CategoryFilter, NewNote, Note, NotePatch } from "../types";

export interface NotesDataProp {
  notes: Note[];
  loading: boolean;
  error: string | null;
  createNote: (input?: NewNote) => Promise<Note | null>;
  updateNote: (id: string, patch: NotePatch) => Promise<boolean>;
  deleteNote: (id: string) => Promise<boolean>;
}

interface NotesWorkspaceProps {
  notesData: NotesDataProp;
}

const CATEGORY_OPTIONS: { value: Category; label: string }[] = [
  { value: "kuliah", label: "Kuliah" },
  { value: "ukm", label: "UKM" },
  { value: "personal", label: "Personal" },
];

const FILTER_OPTIONS: { value: CategoryFilter; label: string }[] = [
  { value: "all", label: "All" },
  ...CATEGORY_OPTIONS,
];

function formatRelativeDate(iso: string): string {
  const date = new Date(iso);
  return date.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function renderInlineMarkdown(text: string): ReactNode[] {
  const tokenRegex = /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g;
  const parts = text.split(tokenRegex);

  return parts.map((part, idx) => {
    if (part.startsWith("**") && part.endsWith("**") && part.length > 4) {
      return (
        <strong key={idx} className="font-semibold text-ink">
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith("*") && part.endsWith("*") && part.length > 2) {
      return (
        <em key={idx} className="italic text-neutral-800">
          {part.slice(1, -1)}
        </em>
      );
    }
    if (part.startsWith("`") && part.endsWith("`") && part.length > 2) {
      return (
        <code
          key={idx}
          className="rounded border border-neutral-200/80 bg-sunken px-1.5 py-0.5 font-mono text-[12px] text-ink"
        >
          {part.slice(1, -1)}
        </code>
      );
    }
    return <Fragment key={idx}>{part}</Fragment>;
  });
}

interface MarkdownPreviewProps {
  content: string;
  onToggleTask: (lineIndex: number) => void;
}

function MarkdownPreview({ content, onToggleTask }: MarkdownPreviewProps) {
  if (!content.trim()) {
    return (
      <p className="mt-4 text-sm italic text-neutral-400">
        Nothing to preview yet. Switch back to Write mode to start drafting.
      </p>
    );
  }

  const lines = content.split("\n");
  const elements: ReactNode[] = [];
  let inCodeBlock = false;
  let codeLines: string[] = [];

  lines.forEach((line, index) => {
    if (line.trim().startsWith("```")) {
      if (!inCodeBlock) {
        inCodeBlock = true;
        codeLines = [];
      } else {
        inCodeBlock = false;
        elements.push(
          <pre
            key={`code-${index}`}
            className="my-2.5 overflow-x-auto rounded-lg border border-neutral-200/90 bg-sunken p-3 font-mono text-xs leading-relaxed text-ink"
          >
            <code>{codeLines.join("\n")}</code>
          </pre>,
        );
      }
      return;
    }

    if (inCodeBlock) {
      codeLines.push(line);
      return;
    }

    const taskMatch = line.match(/^(\s*)- \[([ xX])\]\s*(.*)$/);
    if (taskMatch) {
      const checked = taskMatch[2].toLowerCase() === "x";
      const label = taskMatch[3];
      elements.push(
        <label
          key={index}
          className="my-1 flex cursor-pointer items-start gap-2.5 rounded-md px-1.5 py-1 transition-colors hover:bg-sunken/80"
        >
          <input
            type="checkbox"
            checked={checked}
            onChange={() => onToggleTask(index)}
            className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer rounded border-neutral-300 accent-neutral-900"
          />
          <span className={`text-sm leading-relaxed ${checked ? "text-neutral-400 line-through" : "text-neutral-700"}`}>
            {label ? renderInlineMarkdown(label) : <span className="italic text-neutral-400">Empty task</span>}
          </span>
        </label>,
      );
      return;
    }

    if (line.startsWith("### ")) {
      elements.push(
        <h3 key={index} className="mt-4 mb-1 text-sm font-semibold tracking-tight text-ink">
          {renderInlineMarkdown(line.slice(4))}
        </h3>,
      );
      return;
    }

    if (line.startsWith("## ")) {
      elements.push(
        <h2 key={index} className="mt-5 mb-1.5 text-base font-semibold tracking-tight text-ink">
          {renderInlineMarkdown(line.slice(3))}
        </h2>,
      );
      return;
    }

    if (line.startsWith("# ")) {
      elements.push(
        <h1 key={index} className="mt-5 mb-2 text-lg font-bold tracking-tight text-ink">
          {renderInlineMarkdown(line.slice(2))}
        </h1>,
      );
      return;
    }

    if (line.startsWith("> ")) {
      elements.push(
        <blockquote key={index} className="my-2 border-l-2 border-neutral-300 pl-3 text-sm italic text-neutral-600">
          {renderInlineMarkdown(line.slice(2))}
        </blockquote>,
      );
      return;
    }

    const bulletMatch = line.match(/^(\s*)[-*]\s+(.*)$/);
    if (bulletMatch) {
      elements.push(
        <div key={index} className="my-1 flex items-start gap-2 pl-2 text-sm leading-relaxed text-neutral-700">
          <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-neutral-400" aria-hidden />
          <span>{renderInlineMarkdown(bulletMatch[2])}</span>
        </div>,
      );
      return;
    }

    if (line.trim() === "---") {
      elements.push(<hr key={index} className="my-3 border-neutral-200/80" />);
      return;
    }

    if (line.trim() === "") {
      elements.push(<div key={index} className="h-2.5" aria-hidden />);
      return;
    }

    elements.push(
      <p key={index} className="my-1 text-sm leading-relaxed text-neutral-700">
        {renderInlineMarkdown(line)}
      </p>,
    );
  });

  if (inCodeBlock && codeLines.length > 0) {
    elements.push(
      <pre
        key="code-unclosed"
        className="my-2.5 overflow-x-auto rounded-lg border border-neutral-200/90 bg-sunken p-3 font-mono text-xs leading-relaxed text-ink"
      >
        <code>{codeLines.join("\n")}</code>
      </pre>,
    );
  }

  return <div className="mt-3 flex-1 overflow-y-auto pr-1">{elements}</div>;
}

export function NotesWorkspace({ notesData }: NotesWorkspaceProps) {
  const { notes, loading, error, createNote, updateNote, deleteNote } = notesData;

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>("all");
  const [editorMode, setEditorMode] = useState<"write" | "preview">("write");

  // Local draft state for smooth typing with debounced auto-save
  const [draftTitle, setDraftTitle] = useState("");
  const [draftContent, setDraftContent] = useState("");
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">("idle");
  const hydratedNoteIdRef = useRef<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const filteredNotes = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return notes.filter((note) => {
      if (categoryFilter !== "all" && note.category !== categoryFilter) return false;
      if (!q) return true;
      return note.title.toLowerCase().includes(q) || note.content.toLowerCase().includes(q);
    });
  }, [notes, searchQuery, categoryFilter]);

  // Keep a valid note selected when notes load or change
  useEffect(() => {
    if (notes.length === 0) {
      setSelectedId(null);
      return;
    }
    if (!selectedId || !notes.some((n) => n.id === selectedId)) {
      setSelectedId(notes[0].id);
    }
  }, [notes, selectedId]);

  const activeNote = useMemo(() => notes.find((note) => note.id === selectedId) ?? null, [notes, selectedId]);

  // Sync editor fields when switching notes
  useEffect(() => {
    if (!activeNote) {
      hydratedNoteIdRef.current = null;
      setDraftTitle("");
      setDraftContent("");
      setSaveState("idle");
      return;
    }
    if (hydratedNoteIdRef.current !== activeNote.id) {
      hydratedNoteIdRef.current = activeNote.id;
      setDraftTitle(activeNote.title);
      setDraftContent(activeNote.content);
      setSaveState("idle");
    }
  }, [activeNote]);

  // Debounced auto-save (600ms after user stops typing)
  useEffect(() => {
    if (!activeNote || activeNote.id.startsWith("temp-")) return;
    if (draftTitle === activeNote.title && draftContent === activeNote.content) return;

    setSaveState("saving");
    const timer = window.setTimeout(() => {
      void updateNote(activeNote.id, {
        title: draftTitle.trim() || "Untitled Note",
        content: draftContent,
      }).then((ok) => {
        if (ok) setSaveState("saved");
      });
    }, 600);

    return () => window.clearTimeout(timer);
  }, [draftTitle, draftContent, activeNote, updateNote]);

  async function handleCreateNote() {
    const defaultCategory: Category = categoryFilter === "all" ? "personal" : categoryFilter;
    const created = await createNote({
      title: "Untitled Note",
      content: "",
      category: defaultCategory,
    });
    if (created) {
      hydratedNoteIdRef.current = created.id;
      setSelectedId(created.id);
      setDraftTitle(created.title);
      setDraftContent(created.content);
      setEditorMode("write");
      setSaveState("idle");
    }
  }

  async function handleDeleteActive() {
    if (!activeNote) return;
    const targetId = activeNote.id;
    const remaining = notes.filter((n) => n.id !== targetId);
    setSelectedId(remaining[0]?.id ?? null);
    await deleteNote(targetId);
  }

  function applyInlineWrap(prefix: string, suffix: string, placeholder: string) {
    setEditorMode("write");
    requestAnimationFrame(() => {
      const el = textareaRef.current;
      if (!el) return;
      const start = el.selectionStart ?? draftContent.length;
      const end = el.selectionEnd ?? draftContent.length;
      const selected = draftContent.slice(start, end) || placeholder;
      const next = draftContent.slice(0, start) + prefix + selected + suffix + draftContent.slice(end);
      setDraftContent(next);
      requestAnimationFrame(() => {
        el.focus();
        el.setSelectionRange(start + prefix.length, start + prefix.length + selected.length);
      });
    });
  }

  function applyLinePrefix(prefix: string) {
    setEditorMode("write");
    requestAnimationFrame(() => {
      const el = textareaRef.current;
      if (!el) return;
      const start = el.selectionStart ?? draftContent.length;
      const lineStart = draftContent.lastIndexOf("\n", start - 1) + 1;
      const next = draftContent.slice(0, lineStart) + prefix + draftContent.slice(lineStart);
      setDraftContent(next);
      requestAnimationFrame(() => {
        el.focus();
        const cursor = start + prefix.length;
        el.setSelectionRange(cursor, cursor);
      });
    });
  }

  function handleEditorKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "b") {
      e.preventDefault();
      applyInlineWrap("**", "**", "bold text");
      return;
    }
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "i") {
      e.preventDefault();
      applyInlineWrap("*", "*", "italic text");
      return;
    }
    if (e.key === "Enter") {
      const el = e.currentTarget;
      const start = el.selectionStart;
      const end = el.selectionEnd;
      if (start !== end) return;

      const lineStart = draftContent.lastIndexOf("\n", start - 1) + 1;
      const currentLine = draftContent.slice(lineStart, start);
      const listMatch = currentLine.match(/^(\s*(?:- \[[ xX]\]|-|\*)\s+)(.*)$/);

      if (listMatch) {
        e.preventDefault();
        const rawPrefix = listMatch[1];
        const body = listMatch[2];
        // If current list/task item is empty, exit list mode cleanly
        if (body.trim() === "") {
          const next = draftContent.slice(0, lineStart) + draftContent.slice(start);
          setDraftContent(next);
          requestAnimationFrame(() => {
            el.setSelectionRange(lineStart, lineStart);
          });
        } else {
          const normalizedPrefix = rawPrefix.replace(/\[[xX]\]/, "[ ]");
          const insertion = `\n${normalizedPrefix}`;
          const next = draftContent.slice(0, start) + insertion + draftContent.slice(end);
          setDraftContent(next);
          requestAnimationFrame(() => {
            const cursor = start + insertion.length;
            el.setSelectionRange(cursor, cursor);
          });
        }
      }
    }
  }

  function handleToggleChecklistItem(lineIndex: number) {
    const lines = draftContent.split("\n");
    const target = lines[lineIndex];
    if (!target) return;
    lines[lineIndex] = target.replace(/^(\s*- \[)([ xX])(\])/, (_, before, state, after) => {
      const nextState = state.toLowerCase() === "x" ? " " : "x";
      return `${before}${nextState}${after}`;
    });
    setDraftContent(lines.join("\n"));
  }

  return (
    <section aria-label="Workspace notes" className="space-y-4">
      {error && (
        <div role="alert" className="rounded-lg border border-red-200 bg-red-50/70 px-3.5 py-2.5 text-xs text-red-700">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        {/* Left Sidebar: Notes List */}
        <aside className="flex flex-col rounded-xl border border-neutral-200/90 bg-sunken/60 p-3 lg:col-span-4">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
              Notes ({filteredNotes.length})
            </h2>
            <button
              type="button"
              onClick={() => void handleCreateNote()}
              className={`inline-flex items-center gap-1 rounded-md border border-neutral-200 bg-white px-2.5 py-1 text-xs font-medium text-ink transition-colors hover:bg-neutral-50 ${focusRing}`}
            >
              <Plus aria-hidden className="h-3.5 w-3.5" />
              New note
            </button>
          </div>

          <div className="relative mt-2.5">
            <Search
              aria-hidden
              className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-neutral-400"
            />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search notes..."
              aria-label="Search notes"
              className={`w-full rounded-md border border-neutral-200 bg-white py-1.5 pl-8 pr-2.5 text-xs text-ink placeholder:text-neutral-400 ${focusRing}`}
            />
          </div>

          <div className="mt-2 flex flex-wrap gap-1">
            {FILTER_OPTIONS.map((opt) => {
              const active = categoryFilter === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setCategoryFilter(opt.value)}
                  className={`rounded-md px-2 py-0.5 text-[11px] font-medium transition-colors ${focusRing} ${
                    active
                      ? "border border-neutral-300 bg-white text-ink"
                      : "text-neutral-500 hover:bg-white/60 hover:text-ink"
                  }`}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>

          <div className="mt-3 max-h-[28rem] space-y-1.5 overflow-y-auto pr-0.5">
            {loading ? (
              <div className="flex items-center justify-center py-10 text-xs text-neutral-400">
                <Loader2 aria-hidden className="mr-2 h-3.5 w-3.5 animate-spin" />
                Loading notes...
              </div>
            ) : filteredNotes.length === 0 ? (
              <div className="rounded-lg border border-dashed border-neutral-200 bg-paper px-3 py-8 text-center">
                <FileText aria-hidden className="mx-auto h-5 w-5 text-neutral-300" />
                <p className="mt-2 text-xs font-medium text-neutral-600">
                  {notes.length === 0 ? "No notes yet" : "No matching notes"}
                </p>
                <p className="mt-0.5 text-[11px] text-neutral-400">
                  {notes.length === 0
                    ? "Create a scratchpad for lecture notes, UKM minutes, or ideas."
                    : "Try clearing your search or category filter."}
                </p>
              </div>
            ) : (
              filteredNotes.map((note) => {
                const isSelected = note.id === activeNote?.id;
                const preview = note.content.trim() || "Empty note";
                return (
                  <button
                    key={note.id}
                    type="button"
                    onClick={() => setSelectedId(note.id)}
                    className={`w-full rounded-lg border px-3 py-2.5 text-left transition-colors ${focusRing} ${
                      isSelected
                        ? "border-neutral-300 bg-white"
                        : "border-transparent bg-paper/70 hover:border-neutral-200 hover:bg-white"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="line-clamp-1 text-xs font-semibold text-ink">
                        {note.title || "Untitled Note"}
                      </span>
                      {note.pinned && <Pin aria-label="Pinned" className="mt-0.5 h-3 w-3 shrink-0 text-neutral-500" />}
                    </div>
                    <p className="mt-1 line-clamp-1 text-[11px] text-neutral-500">{preview}</p>
                    <div className="mt-1.5 flex items-center justify-between text-[10px] text-neutral-400">
                      <span className="uppercase tracking-wide">{note.category}</span>
                      <span>{formatRelativeDate(note.updated_at)}</span>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </aside>

        {/* Right Canvas: Note Editor */}
        <div className="flex min-h-[26rem] flex-col rounded-xl border border-neutral-200/90 bg-white p-4 sm:p-6 lg:col-span-8">
          {activeNote ? (
            <>
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-neutral-200/80 pb-3">
                <div className="flex items-center gap-2">
                  <label htmlFor="note-category" className="sr-only">
                    Note category
                  </label>
                  <select
                    id="note-category"
                    value={activeNote.category}
                    onChange={(e) => void updateNote(activeNote.id, { category: e.target.value as Category })}
                    className={`rounded-md border border-neutral-200 bg-sunken px-2 py-1 text-xs font-medium text-ink ${focusRing}`}
                  >
                    {CATEGORY_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>

                  <span className="text-[11px] text-neutral-400">
                    {saveState === "saving"
                      ? "Saving..."
                      : saveState === "saved"
                        ? "Saved"
                        : `Updated ${formatRelativeDate(activeNote.updated_at)}`}
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => void updateNote(activeNote.id, { pinned: !activeNote.pinned })}
                    aria-pressed={activeNote.pinned}
                    title={activeNote.pinned ? "Unpin note" : "Pin note to top"}
                    className={`inline-flex items-center gap-1 rounded-md border px-2.5 py-1 text-xs font-medium transition-colors ${focusRing} ${
                      activeNote.pinned
                        ? "border-neutral-300 bg-sunken text-ink"
                        : "border-neutral-200 bg-white text-neutral-500 hover:bg-sunken hover:text-ink"
                    }`}
                  >
                    <Pin aria-hidden className="h-3.5 w-3.5" />
                    {activeNote.pinned ? "Pinned" : "Pin"}
                  </button>

                  <button
                    type="button"
                    onClick={() => void handleDeleteActive()}
                    title="Delete note"
                    className={`inline-flex items-center gap-1 rounded-md border border-neutral-200 bg-white px-2.5 py-1 text-xs font-medium text-neutral-500 transition-colors hover:border-red-200 hover:bg-red-50/60 hover:text-red-600 ${focusRing}`}
                  >
                    <Trash2 aria-hidden className="h-3.5 w-3.5" />
                    Delete
                  </button>
                </div>
              </div>

              {/* Formatting Toolbar & Write/Preview Switcher */}
              <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-neutral-200/80 bg-sunken/70 px-2 py-1.5">
                <div className="flex flex-wrap items-center gap-0.5">
                  <button
                    type="button"
                    onClick={() => applyLinePrefix("## ")}
                    title="Heading (##)"
                    className={`rounded p-1.5 text-neutral-600 transition-colors hover:bg-white hover:text-ink ${focusRing}`}
                  >
                    <Heading2 aria-hidden className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => applyInlineWrap("**", "**", "bold text")}
                    title="Bold (Ctrl+B)"
                    className={`rounded p-1.5 text-neutral-600 transition-colors hover:bg-white hover:text-ink ${focusRing}`}
                  >
                    <Bold aria-hidden className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => applyInlineWrap("*", "*", "italic text")}
                    title="Italic (Ctrl+I)"
                    className={`rounded p-1.5 text-neutral-600 transition-colors hover:bg-white hover:text-ink ${focusRing}`}
                  >
                    <Italic aria-hidden className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => applyInlineWrap("`", "`", "code")}
                    title="Inline code"
                    className={`rounded p-1.5 text-neutral-600 transition-colors hover:bg-white hover:text-ink ${focusRing}`}
                  >
                    <Code aria-hidden className="h-3.5 w-3.5" />
                  </button>
                  <span className="mx-1 h-4 w-px bg-neutral-200" aria-hidden />
                  <button
                    type="button"
                    onClick={() => applyLinePrefix("- ")}
                    title="Bullet list"
                    className={`rounded p-1.5 text-neutral-600 transition-colors hover:bg-white hover:text-ink ${focusRing}`}
                  >
                    <List aria-hidden className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => applyLinePrefix("- [ ] ")}
                    title="Interactive checklist"
                    className={`rounded p-1.5 text-neutral-600 transition-colors hover:bg-white hover:text-ink ${focusRing}`}
                  >
                    <CheckSquare aria-hidden className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => applyLinePrefix("> ")}
                    title="Quote"
                    className={`rounded p-1.5 text-neutral-600 transition-colors hover:bg-white hover:text-ink ${focusRing}`}
                  >
                    <Quote aria-hidden className="h-3.5 w-3.5" />
                  </button>
                </div>

                <div className="inline-flex rounded-md border border-neutral-200 bg-white p-0.5 text-[11px] font-medium">
                  <button
                    type="button"
                    onClick={() => setEditorMode("write")}
                    className={`inline-flex items-center gap-1 rounded px-2 py-0.5 transition-colors ${focusRing} ${
                      editorMode === "write" ? "bg-ink text-white" : "text-neutral-500 hover:text-ink"
                    }`}
                  >
                    <PencilLine aria-hidden className="h-3 w-3" />
                    Write
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditorMode("preview")}
                    className={`inline-flex items-center gap-1 rounded px-2 py-0.5 transition-colors ${focusRing} ${
                      editorMode === "preview" ? "bg-ink text-white" : "text-neutral-500 hover:text-ink"
                    }`}
                  >
                    <Eye aria-hidden className="h-3 w-3" />
                    Preview
                  </button>
                </div>
              </div>

              <input
                type="text"
                value={draftTitle}
                onChange={(e) => setDraftTitle(e.target.value)}
                placeholder="Note title..."
                aria-label="Note title"
                className="mt-4 w-full bg-transparent text-lg font-semibold tracking-tight text-ink placeholder:text-neutral-300 focus:outline-none"
              />

              {editorMode === "write" ? (
                <textarea
                  ref={textareaRef}
                  value={draftContent}
                  onChange={(e) => setDraftContent(e.target.value)}
                  onKeyDown={handleEditorKeyDown}
                  placeholder="Write lecture summaries, meeting notes, or Markdown checklists (- [ ] task)..."
                  aria-label="Note content"
                  className="mt-3 w-full flex-1 resize-none bg-transparent text-sm leading-relaxed text-neutral-700 placeholder:text-neutral-300 focus:outline-none"
                />
              ) : (
                <MarkdownPreview content={draftContent} onToggleTask={handleToggleChecklistItem} />
              )}
            </>
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center text-center">
              <FileText aria-hidden className="h-7 w-7 text-neutral-300" />
              <p className="mt-2.5 text-sm font-medium text-neutral-700">Select or create a note</p>
              <p className="mt-1 max-w-xs text-xs text-neutral-400">
                Keep quick lecture notes, UKM drafts, and personal references synced across your devices.
              </p>
              <button
                type="button"
                onClick={() => void handleCreateNote()}
                className={`mt-4 inline-flex items-center gap-1.5 rounded-md border border-neutral-200 bg-sunken px-3 py-1.5 text-xs font-medium text-ink transition-colors hover:bg-neutral-200/70 ${focusRing}`}
              >
                <Plus aria-hidden className="h-3.5 w-3.5" />
                Create your first note
              </button>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
