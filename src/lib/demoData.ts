import { createContext, useContext } from "react";
import type { Task, WeeklySchedule } from "../types";

export const DemoContext = createContext<boolean>(false);

export function useIsDemoMode(): boolean {
  return useContext(DemoContext);
}

function offsetDate(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export function createInitialDemoTasks(): Task[] {
  const now = new Date().toISOString();
  return [
    {
      id: "demo-task-1",
      title: "Laporan Praktikum Struktur Data (Linked List)",
      category: "kuliah",
      status: "in_progress",
      priority: "high",
      due_date: offsetDate(0),
      created_at: now,
      notes:
        "### Catatan Pengerjaan\n- Pastikan kompleksitas waktu fungsi `insertAt()` sudah dianalisis.\n- Lampirkan screenshot output terminal.\n- Format PDF sesuai template asisten lab.",
      subtasks: [
        { id: "st-1", title: "Implementasi Double Linked List di C++", done: true },
        { id: "st-2", title: "Uji kasus edge-case saat list kosong", done: true },
        { id: "st-3", title: "Tulis analisis & upload ke e-learning", done: false },
      ],
    },
    {
      id: "demo-task-2",
      title: "Rapat Redaksi & Pembagian Liputan Kampus",
      category: "ukm",
      status: "todo",
      priority: "medium",
      due_date: offsetDate(1),
      created_at: now,
      notes: "Bawa draf angle berita acara seminar nasional minggu depan dan koordinasi dengan tim ilustrasi.",
      subtasks: [
        { id: "st-4", title: "Siapkan 3 usulan topik liputan", done: true },
        { id: "st-5", title: "Konfirmasi narasumber utama", done: false },
      ],
    },
    {
      id: "demo-task-3",
      title: "Lari sore 5K & latihan chord gitar",
      category: "personal",
      status: "todo",
      priority: "low",
      due_date: offsetDate(3),
      created_at: now,
      notes: null,
      subtasks: [],
    },
  ];
}

export function createInitialDemoSchedules(): WeeklySchedule[] {
  return [
    {
      id: "demo-sched-1",
      title: "Basis Data",
      category: "kuliah",
      day_of_week: 1,
      start_time: "08:00:00",
      end_time: "10:30:00",
      location: "Gedung D - R.103",
    },
    {
      id: "demo-sched-2",
      title: "Pemrograman Web",
      category: "kuliah",
      day_of_week: 3,
      start_time: "10:30:00",
      end_time: "13:00:00",
      location: "Lab Komputer 2",
    },
    {
      id: "demo-sched-3",
      title: "Etika Profesi",
      category: "kuliah",
      day_of_week: 5,
      start_time: "10:30:00",
      end_time: "12:10:00",
      location: "Gedung D - R.104",
    },
    {
      id: "demo-sched-4",
      title: "Rapat Rutin UKM",
      category: "ukm",
      day_of_week: 6,
      start_time: "14:00:00",
      end_time: "16:30:00",
      location: "Sekretariat UKM",
    },
  ];
}
