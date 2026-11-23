import type { Note, Task, WeeklySchedule } from "../types";

interface WorkspaceBackup {
  metadata: {
    exportedAt: string;
    workspace: "NoRi Workspaces";
    username?: string;
  };
  tasks: Task[];
  schedules: WeeklySchedule[];
  notes: Note[];
}

const DAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"] as const;

function localDateStamp(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function downloadFile(contents: string, filename: string, mimeType: string): void {
  const blob = new Blob([contents], { type: `${mimeType};charset=utf-8` });
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement("a");

  anchor.href = objectUrl;
  anchor.download = filename;
  anchor.style.display = "none";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 0);
}

function formatTime(value: string): string {
  return value.slice(0, 5);
}

function formatTask(task: Task): string {
  const details = [
    `**Category:** ${task.category}`,
    `**Priority:** ${task.priority}`,
    `**Status:** ${task.status === "in_progress" ? "In progress" : task.status === "todo" ? "To do" : "Completed"}`,
    `**Due:** ${task.due_date ?? "No deadline"}`,
  ];

  const lines = [`### ${task.title}`, "", details.join(" · ")];

  if (task.subtasks.length > 0) {
    lines.push("", "**Subtasks**");
    for (const subtask of task.subtasks) {
      lines.push(`- [${subtask.done ? "x" : " "}] ${subtask.title}`);
    }
  }

  if (task.notes?.trim()) {
    lines.push("", "**Notes**", "", task.notes.trim());
  }

  return lines.join("\n");
}

/**
 * Downloads a complete JSON backup of the current client-side workspace data.
 */
export function exportWorkspaceAsJson(
  tasks: Task[],
  schedules: WeeklySchedule[],
  notes: Note[] = [],
  username?: string,
): void {
  const exportedAt = new Date();
  const backup: WorkspaceBackup = {
    metadata: {
      exportedAt: exportedAt.toISOString(),
      workspace: "NoRi Workspaces",
      ...(username ? { username } : {}),
    },
    tasks,
    schedules,
    notes,
  };

  downloadFile(
    `${JSON.stringify(backup, null, 2)}\n`,
    `nori-backup-${localDateStamp(exportedAt)}.json`,
    "application/json",
  );
}

/**
 * Downloads a readable Markdown archive of tasks, notes, and the Monday–Sunday routine.
 */
export function exportWorkspaceAsMarkdown(
  tasks: Task[],
  schedules: WeeklySchedule[],
  notes: Note[] = [],
  username?: string,
): void {
  const exportedAt = new Date();
  const activeTasks = tasks.filter((task) => task.status !== "done");
  const completedTasks = tasks.filter((task) => task.status === "done");
  const lines: string[] = [
    "# NoRi Workspaces",
    "",
    `- **Exported:** ${exportedAt.toISOString()}`,
    ...(username ? [`- **User:** @${username}`] : []),
    "",
    "## Tasks",
    "",
    "### Active",
    "",
  ];

  if (activeTasks.length === 0) {
    lines.push("_No active tasks._", "");
  } else {
    for (const task of activeTasks) {
      lines.push(formatTask(task), "");
    }
  }

  lines.push("### Completed", "");
  if (completedTasks.length === 0) {
    lines.push("_No completed tasks._", "");
  } else {
    for (const task of completedTasks) {
      lines.push(formatTask(task), "");
    }
  }

  lines.push("## Notes", "");
  if (notes.length === 0) {
    lines.push("_No notes saved._", "");
  } else {
    for (const note of notes) {
      const pinTag = note.pinned ? " · Pinned" : "";
      lines.push(
        `### ${note.title || "Untitled Note"}`,
        "",
        `**Category:** ${note.category}${pinTag}`,
        "",
        note.content.trim() || "_Empty note._",
        "",
      );
    }
  }

  lines.push("## Weekly Routine Schedule", "");

  const sortedSchedules = [...schedules].sort(
    (a, b) =>
      a.day_of_week - b.day_of_week || a.start_time.localeCompare(b.start_time) || a.title.localeCompare(b.title),
  );

  for (let day = 1; day <= 7; day += 1) {
    lines.push(`### ${DAY_NAMES[day - 1]}`, "");
    const daySchedules = sortedSchedules.filter((block) => block.day_of_week === day);

    if (daySchedules.length === 0) {
      lines.push("_No routines scheduled._", "");
      continue;
    }

    for (const block of daySchedules) {
      const location = block.location ? ` · ${block.location}` : "";
      lines.push(
        `- **${formatTime(block.start_time)}–${formatTime(block.end_time)}** — ${block.title} (${block.category})${location}`,
      );
    }
    lines.push("");
  }

  downloadFile(`${lines.join("\n").trimEnd()}\n`, `nori-workspace-${localDateStamp(exportedAt)}.md`, "text/markdown");
}
