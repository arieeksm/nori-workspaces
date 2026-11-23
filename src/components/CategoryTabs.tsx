import { LayoutGroup, motion } from 'framer-motion';
import type { CategoryFilter } from '../types';
import { CATEGORY_TABS } from '../constants';
import { layoutSpring } from '../lib/motion';
import { focusRing } from '../ui';

interface CategoryTabsProps {
  active: CategoryFilter;
  onChange: (filter: CategoryFilter) => void;
  /** Number of unfinished tasks per tab. */
  counts: Record<CategoryFilter, number>;
}

export function CategoryTabs({ active, onChange, counts }: CategoryTabsProps) {
  return (
    <LayoutGroup id="category-tabs">
      <div
        role="tablist"
        aria-label="Filter tasks by category"
        className="flex gap-1 overflow-x-auto"
      >
        {CATEGORY_TABS.map((tab) => {
          const isActive = tab.value === active;
          return (
            <button
              key={tab.value}
              role="tab"
              type="button"
              aria-selected={isActive}
              onClick={() => onChange(tab.value)}
              className={`relative flex items-center gap-1.5 whitespace-nowrap rounded-md px-2.5 py-1 text-sm font-medium transition-colors duration-150 ${focusRing} ${
                isActive ? 'text-ink' : 'text-neutral-500 hover:text-ink'
              }`}
            >
              {isActive && (
                <motion.span
                  layoutId="category-tab-indicator"
                  transition={layoutSpring}
                  className="absolute inset-0 rounded-md bg-sunken"
                  aria-hidden
                />
              )}
              <span className="relative z-10">{tab.label}</span>
              <span className="relative z-10 text-xs tabular-nums text-neutral-400">
                {counts[tab.value]}
              </span>
            </button>
          );
        })}
      </div>
    </LayoutGroup>
  );
}
