import { forwardRef, useEffect, useMemo, useState, type FormEvent } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle, Loader2, MapPin, Plus, RefreshCw, Trash2, X } from "lucide-react";
import { useSchedules } from "../hooks/useSchedules";
import { CATEGORY_META } from "../constants";
import { DAYS, findConflicts, sortBlocks, todayDayOfWeek, trimTime } from "../lib/schedule";
import { errorBanner, fieldClass, focusRing, primaryButton, surface } from "../ui";
import type { ScheduleCategory, WeeklySchedule } from "../types";
import { Select, type SelectOption } from "./Select";

const field = `${fieldClass} w-full`;

const CATEGORY_OPTIONS: SelectOption<ScheduleCategory>[] = (["kuliah", "ukm"] as ScheduleCategory[]).map((value) => ({
  value,
  label: CATEGORY_META[value].label,
}));

const DAY_OPTIONS: SelectOption<number>[] = DAYS.map((d) => ({ value: d.value, label: d.label }));

function ScheduleSkeleton() {
  return (
    <div role="status" aria-label="Loading schedule" className="grid gap-3 md:grid-cols-4 xl:grid-cols-7">
      {DAYS.map((day, i) => (
        <div
          key={day.value}
          className="h-40 animate-pulse rounded-lg bg-neutral-100"
          style={{ animationDelay: `${i * 70}ms` }}
        />
      ))}
    </div>
  );
}

interface BlockCardProps {
  block: WeeklySchedule;
  conflict: boolean;
  liveLabel: string | null;
  onDelete: (id: string) => void;
}

/** forwardRef so AnimatePresence (popLayout) can measure the block while it exits. */
const BlockCard = forwardRef<HTMLLIElement, BlockCardProps>(function BlockCard(
  { block, conflict, liveLabel, onDelete },
  ref,
) {
  const category = CATEGORY_META[block.category];
  return (
    <motion.li
      ref={ref}
      layout="position"
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, transition: { duration: 0.12 } }}
      transition={{
        layout: { type: "spring", stiffness: 520, damping: 42, mass: 0.8 },
        default: { duration: 0.18, ease: [0.22, 1, 0.36, 1] },
      }}
      className={`group rounded-md border p-2.5 text-xs ${
        liveLabel
          ? "border-ink/40 bg-white ring-1 ring-ink/5"
          : conflict
            ? "border-amber-300 bg-white"
            : "border-neutral-200 bg-white"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="flex items-center gap-1.5 font-medium tabular-nums text-neutral-500">
          <span className={`h-1.5 w-1.5 rounded-full ${category.dot}`} aria-hidden />
          {trimTime(block.start_time)}–{trimTime(block.end_time)}
        </span>
        <button
          type="button"
          onClick={() => onDelete(block.id)}
          aria-label={`Delete ${block.title}`}
          title="Delete"
          className={`-m-1 rounded p-1 text-neutral-400 opacity-0 transition hover:text-red-600 focus:opacity-100 group-hover:opacity-100 [@media(hover:none)]:opacity-100 ${focusRing}`}
        >
          <Trash2 className="h-3.5 w-3.5" aria-hidden />
        </button>
      </div>
      <p className="mt-1 break-words text-sm font-medium text-ink">{block.title}</p>
      {block.location && (
        <p className="mt-1 flex items-center gap-1 break-words text-neutral-500">
          <MapPin className="h-3 w-3 shrink-0" aria-hidden />
          {block.location}
        </p>
      )}
      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        <span className={`rounded px-1.5 py-0.5 font-medium ${category.badge}`}>{category.label}</span>
        {liveLabel && <span className="rounded bg-sunken px-1.5 py-0.5 font-medium text-ink">{liveLabel}</span>}
        {conflict && (
          <span className="inline-flex items-center gap-1 text-amber-700" title="Overlaps another block">
            <AlertTriangle className="h-3 w-3" aria-hidden />
            Bentrok
          </span>
        )}
      </div>
    </motion.li>
  );
});

export function ScheduleView() {
  const { blocks, loading, error, actionError, clearActionError, refetch, addBlock, deleteBlock } = useSchedules();

  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<ScheduleCategory>("kuliah");
  const [day, setDay] = useState<number>(() => todayDayOfWeek());
  const [startTime, setStartTime] = useState("08:00");
  const [endTime, setEndTime] = useState("09:40");
  const [location, setLocation] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const intervalId = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(intervalId);
  }, []);

  const today = ((now.getDay() + 6) % 7) + 1;
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const todayBlocks = useMemo(
    () =>
      blocks.filter((block) => block.day_of_week === today).sort((a, b) => a.start_time.localeCompare(b.start_time)),
    [blocks, today],
  );
  const activeBlock =
    todayBlocks.find((block) => {
      const [startHour = "0", startMinute = "0"] = block.start_time.split(":");
      const [endHour = "0", endMinute = "0"] = block.end_time.split(":");
      const start = Number(startHour) * 60 + Number(startMinute);
      const end = Number(endHour) * 60 + Number(endMinute);
      return start <= nowMinutes && nowMinutes < end;
    }) ?? null;
  const nextBlock =
    todayBlocks.find((block) => {
      const [hour = "0", minute = "0"] = block.start_time.split(":");
      return Number(hour) * 60 + Number(minute) > nowMinutes;
    }) ?? null;
  const liveBlockId = activeBlock?.id ?? nextBlock?.id ?? null;
  const liveLabel = activeBlock ? "Sedang berlangsung" : nextBlock ? "Berikutnya" : null;

  const conflicts = useMemo(() => findConflicts(blocks), [blocks]);
  const byDay = useMemo(() => {
    const map = new Map<number, WeeklySchedule[]>(DAYS.map((d) => [d.value, []]));
    for (const block of sortBlocks(blocks)) {
      map.get(block.day_of_week)?.push(block);
    }
    return map;
  }, [blocks]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = title.trim();
    if (!trimmed || submitting) return;

    if (!startTime || !endTime) {
      setFormError("Please set both a start and an end time.");
      return;
    }
    if (endTime <= startTime) {
      setFormError("End time must be after the start time.");
      return;
    }

    setFormError(null);
    setSubmitting(true);
    const ok = await addBlock({
      title: trimmed,
      category,
      day_of_week: day,
      start_time: startTime,
      end_time: endTime,
      location: location.trim() === "" ? null : location.trim(),
    });
    setSubmitting(false);

    if (ok) {
      // Keep day/time/category so recurring blocks of the same pattern are quick to enter.
      setTitle("");
      setLocation("");
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold tracking-tight text-ink">Jadwal Rutin</h2>
        <p className="mt-1 text-sm text-neutral-500">Fixed weekly classes and UKM meetings, Senin to Minggu.</p>
      </div>

      <form
        onSubmit={handleSubmit}
        className={`${surface} grid gap-3 p-2.5 sm:grid-cols-2 lg:grid-cols-[minmax(0,2fr)_repeat(2,minmax(0,1fr))_repeat(2,7rem)_minmax(0,1.3fr)_auto] lg:items-center`}
      >
        <label className="sr-only" htmlFor="sched-title">
          Title
        </label>
        <input
          id="sched-title"
          type="text"
          value={title}
          maxLength={200}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Class or meeting name…"
          autoComplete="off"
          className={`${field} sm:col-span-2 lg:col-span-1`}
        />

        <label className="sr-only" htmlFor="sched-category">
          Category
        </label>
        <Select
          id="sched-category"
          value={category}
          onChange={setCategory}
          options={CATEGORY_OPTIONS}
          className={field}
        />

        <label className="sr-only" htmlFor="sched-day">
          Day of week
        </label>
        <Select id="sched-day" value={day} onChange={setDay} options={DAY_OPTIONS} className={field} />

        <label className="sr-only" htmlFor="sched-start">
          Start time
        </label>
        <input
          id="sched-start"
          type="time"
          value={startTime}
          onChange={(e) => setStartTime(e.target.value)}
          className={field}
        />

        <label className="sr-only" htmlFor="sched-end">
          End time
        </label>
        <input
          id="sched-end"
          type="time"
          value={endTime}
          onChange={(e) => setEndTime(e.target.value)}
          className={field}
        />

        <label className="sr-only" htmlFor="sched-location">
          Location
        </label>
        <input
          id="sched-location"
          type="text"
          value={location}
          maxLength={200}
          onChange={(e) => setLocation(e.target.value)}
          placeholder="Location (optional)"
          autoComplete="off"
          className={field}
        />

        <button
          type="submit"
          disabled={title.trim() === "" || submitting}
          className={`${primaryButton} sm:col-span-2 lg:col-span-1`}
        >
          {submitting ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          ) : (
            <Plus className="h-4 w-4" aria-hidden />
          )}
          Add
        </button>

        {formError && (
          <p role="alert" className="text-sm text-red-600 sm:col-span-2 lg:col-span-full">
            {formError}
          </p>
        )}
      </form>

      <AnimatePresence initial={false}>
        {actionError && (
          <motion.div
            key="schedule-error"
            role="alert"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.18 }}
            className="overflow-hidden"
          >
            <div className={errorBanner}>
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
              <span className="flex-1">{actionError}</span>
              <button
                type="button"
                onClick={clearActionError}
                aria-label="Dismiss error"
                className={`rounded p-0.5 text-red-700 transition-colors hover:bg-red-100 ${focusRing}`}
              >
                <X className="h-4 w-4" aria-hidden />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {loading ? (
        <ScheduleSkeleton />
      ) : error ? (
        <div
          role="alert"
          className="flex flex-col items-center gap-3 rounded-lg border border-red-200 bg-red-50 px-6 py-10 text-center"
        >
          <AlertTriangle className="h-6 w-6 text-red-600" aria-hidden />
          <div>
            <p className="font-medium text-red-800">Couldn&apos;t load your schedule</p>
            <p className="mt-1 text-sm text-red-700/80">{error}</p>
            <p className="mt-1 text-xs text-red-700/70">
              If this is a new setup, make sure supabase/phase2_migration.sql has been run.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void refetch()}
            className={`inline-flex items-center gap-1.5 rounded-md border border-neutral-200 bg-white px-3 py-1.5 text-sm text-ink transition-colors hover:bg-neutral-50 ${focusRing}`}
          >
            <RefreshCw className="h-4 w-4" aria-hidden />
            Try again
          </button>
        </div>
      ) : (
        <div className="grid items-start gap-3 md:grid-cols-4 xl:grid-cols-7">
          {DAYS.map((d) => {
            const dayBlocks = byDay.get(d.value) ?? [];
            const isToday = d.value === today;
            return (
              <section
                key={d.value}
                aria-labelledby={`day-${d.value}`}
                className={`min-w-0 rounded-lg p-2 ${isToday ? "bg-sunken" : "bg-neutral-50"}`}
              >
                <h3
                  id={`day-${d.value}`}
                  className={`mb-2 flex items-center justify-between px-1 text-xs font-medium ${
                    isToday ? "text-ink" : "text-neutral-500"
                  }`}
                >
                  <span>{d.label}</span>
                  {isToday && (
                    <span className="flex items-center gap-1.5">
                      <time
                        dateTime={now.toISOString()}
                        className="font-mono text-[10px] tabular-nums text-neutral-500"
                      >
                        {new Intl.DateTimeFormat(undefined, {
                          hour: "2-digit",
                          minute: "2-digit",
                        }).format(now)}
                      </time>
                      <span className="rounded bg-ink px-1.5 py-0.5 text-[10px] font-medium text-white">Hari ini</span>
                    </span>
                  )}
                </h3>
                {dayBlocks.length === 0 ? (
                  <p className="px-2 py-4 text-center text-xs text-neutral-400">Kosong</p>
                ) : (
                  <ul className="relative space-y-2">
                    <AnimatePresence initial={false} mode="popLayout">
                      {dayBlocks.map((block) => (
                        <BlockCard
                          key={block.id}
                          block={block}
                          conflict={conflicts.has(block.id)}
                          liveLabel={block.id === liveBlockId ? liveLabel : null}
                          onDelete={(id) => void deleteBlock(id)}
                        />
                      ))}
                    </AnimatePresence>
                  </ul>
                )}
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
