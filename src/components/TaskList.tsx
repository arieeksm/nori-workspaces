import { useMemo } from 'react';
import { AnimatePresence, LayoutGroup, motion } from 'framer-motion';
import type { Status, Task } from '../types';
import { groupTasksByDueDate } from '../lib/dates';
import { sectionLabel } from '../ui';
import { TaskItem } from './TaskItem';

interface TaskListProps {
  tasks: Task[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onStatusChange: (id: string, status: Status) => void;
  onDelete: (id: string) => void;
}

export function TaskList({ tasks, selectedId, onSelect, onStatusChange, onDelete }: TaskListProps) {
  const groups = useMemo(() => groupTasksByDueDate(tasks), [tasks]);

  return (
    <LayoutGroup id="task-list">
      <div className="space-y-6">
        {/*
          Groups fade in/out as they gain or lose tasks. Inside each group, rows animate
          in/out (add, delete, filter, move to "Completed") while siblings glide to their
          new positions via layout animations.
        */}
        <AnimatePresence initial={false}>
          {groups.map((group) => (
            <motion.section
              key={group.key}
              layout="position"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{
                layout: { type: 'spring', stiffness: 520, damping: 42, mass: 0.8 },
                opacity: { duration: 0.18 },
              }}
              aria-labelledby={`group-${group.key}`}
            >
              <h2
                id={`group-${group.key}`}
                className={`mb-1 flex items-baseline gap-2 border-b border-neutral-200 px-2.5 pb-1.5 ${sectionLabel} ${
                  group.key === 'overdue' ? '!text-red-600' : ''
                }`}
              >
                {group.label}
                <span className="font-normal tabular-nums text-neutral-400">{group.tasks.length}</span>
              </h2>
              {/* popLayout needs a positioned parent to measure exiting items against */}
              <ul className="relative">
                <AnimatePresence initial={false} mode="popLayout">
                  {group.tasks.map((task) => (
                    <TaskItem
                      key={task.id}
                      task={task}
                      selected={task.id === selectedId}
                      onSelect={onSelect}
                      onStatusChange={onStatusChange}
                      onDelete={onDelete}
                    />
                  ))}
                </AnimatePresence>
              </ul>
            </motion.section>
          ))}
        </AnimatePresence>
      </div>
    </LayoutGroup>
  );
}
