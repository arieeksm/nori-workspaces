import type { WeeklySchedule } from '../types';

export const DAYS: { value: number; label: string }[] = [
  { value: 1, label: 'Senin' },
  { value: 2, label: 'Selasa' },
  { value: 3, label: 'Rabu' },
  { value: 4, label: 'Kamis' },
  { value: 5, label: 'Jumat' },
  { value: 6, label: 'Sabtu' },
  { value: 7, label: 'Minggu' },
];

/** "08:00:00" -> "08:00" */
export function trimTime(time: string): string {
  return time.slice(0, 5);
}

/** 1 = Monday ... 7 = Sunday (JS getDay() uses 0 = Sunday). */
export function todayDayOfWeek(now: Date = new Date()): number {
  const day = now.getDay();
  return day === 0 ? 7 : day;
}

export function sortBlocks(blocks: WeeklySchedule[]): WeeklySchedule[] {
  return [...blocks].sort((a, b) => {
    if (a.day_of_week !== b.day_of_week) return a.day_of_week - b.day_of_week;
    const byStart = trimTime(a.start_time).localeCompare(trimTime(b.start_time));
    if (byStart !== 0) return byStart;
    return trimTime(a.end_time).localeCompare(trimTime(b.end_time));
  });
}

/** Returns the ids of blocks whose time range overlaps another block on the same day. */
export function findConflicts(blocks: WeeklySchedule[]): Set<string> {
  const conflicts = new Set<string>();
  const sorted = sortBlocks(blocks);

  for (let i = 0; i < sorted.length; i++) {
    const a = sorted[i];
    for (let j = i + 1; j < sorted.length; j++) {
      const b = sorted[j];
      if (b.day_of_week !== a.day_of_week) break;
      // Sorted by start time, so once b starts at/after a ends, nothing later overlaps a.
      if (trimTime(b.start_time) >= trimTime(a.end_time)) break;
      conflicts.add(a.id);
      conflicts.add(b.id);
    }
  }
  return conflicts;
}
