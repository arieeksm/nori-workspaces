# Graph Report - notion-rival  (2026-11-23)

## Corpus Check
- 35 files · ~11,474 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 4 file(s) not represented in the graph (top: .css 2, .example 1, (none) 1)

## Summary
- 233 nodes · 449 edges · 15 communities (11 shown, 4 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 4 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- ScheduleView.tsx
- package.json
- TaskDetailPanel.tsx
- TasksWorkspace.tsx
- compilerOptions
- react
- dates.ts
- compilerOptions
- compilerOptions
- TaskDetailPanel
- Notion-Rival
- vite-env.d.ts

## God Nodes (most connected - your core abstractions)
1. `compilerOptions` - 18 edges
2. `react` - 16 edges
3. `compilerOptions` - 16 edges
4. `compilerOptions` - 15 edges
5. `TaskDetailPanel()` - 12 edges
6. `TasksWorkspace()` - 12 edges
7. `Task` - 12 edges
8. `framer-motion` - 10 edges
9. `ScheduleView()` - 10 edges
10. `lucide-react` - 9 edges

## Surprising Connections (you probably didn't know these)
- `CategoryTabsProps` --references--> `CategoryFilter`  [EXTRACTED]
  src/components/CategoryTabs.tsx → src/types.ts
- `renderPanel()` --calls--> `TaskDetailPanel()`  [EXTRACTED]
  src/components/TasksWorkspace.tsx → src/components/TaskDetailPanel.tsx
- `TaskGroup` --references--> `Task`  [EXTRACTED]
  src/lib/dates.ts → src/types.ts
- `App()` --calls--> `ScheduleView()`  [EXTRACTED]
  src/App.tsx → src/components/ScheduleView.tsx
- `App()` --calls--> `TasksWorkspace()`  [EXTRACTED]
  src/App.tsx → src/components/TasksWorkspace.tsx

## Import Cycles
- None detected.

## Communities (15 total, 4 thin omitted)

### Community 0 - "ScheduleView.tsx"
Cohesion: 0.13
Nodes (24): @supabase/supabase-js@^2.45.4, @supabase/supabase-js, BlockCard, BlockCardProps, SCHEDULE_CATEGORIES, ScheduleSkeleton(), ScheduleView(), messageFrom() (+16 more)

### Community 1 - "package.json"
Cohesion: 0.10
Nodes (26): devDependencies, autoprefixer@^10.7.0, postcss@^8.5.33, tailwindcss@^3.4.19, @types/react@^18.3.12, @types/react-dom@^18.3.1, typescript@~5.6.3, vite@^5.4.10 (+18 more)

### Community 2 - "TaskDetailPanel.tsx"
Cohesion: 0.21
Nodes (20): lucide-react, TaskDetailPanelProps, TaskFormProps, TaskItemProps, CATEGORY_META, nextStatus(), PRIORITY_META, STATUS_META (+12 more)

### Community 3 - "TasksWorkspace.tsx"
Cohesion: 0.14
Nodes (17): framer-motion, CategoryTabs(), CategoryTabsProps, TaskForm(), LoadingSkeleton(), TasksWorkspace(), renderPanel(), TasksWorkspaceProps (+9 more)

### Community 4 - "compilerOptions"
Cohesion: 0.10
Nodes (19): compilerOptions, allowArbitraryExtensions, allowImportingTsExtensions, erasableSyntaxOnly, jsx, lib, module, moduleDetection (+11 more)

### Community 5 - "react"
Cohesion: 0.15
Nodes (15): dependencies, framer-motion@^14.14.0, lucide-react@^0.460.0, react@^18.3.1, react-dom@^18.3.1, react, react-dom, App() (+7 more)

### Community 6 - "dates.ts"
Cohesion: 0.19
Nodes (15): TaskItem, TaskList(), TaskListProps, compareTasks(), diffInDays(), formatDueDate(), GROUP_LABELS, GROUP_ORDER (+7 more)

### Community 7 - "compilerOptions"
Cohesion: 0.11
Nodes (17): compilerOptions, allowImportingTsExtensions, isolatedModules, jsx, lib, module, moduleResolution, noEmit (+9 more)

### Community 8 - "compilerOptions"
Cohesion: 0.12
Nodes (16): compilerOptions, allowImportingTsExtensions, erasableSyntaxOnly, lib, module, moduleDetection, noEmit, noFallthroughCasesInSwitch (+8 more)

### Community 9 - "TaskDetailPanel"
Cohesion: 0.23
Nodes (11): combineStatus(), TaskDetailPanel(), commitSubtasks(), handleAddSubtask(), removeSubtask(), toggleSubtask(), newId(), Markdown() (+3 more)

### Community 11 - "Notion-Rival"
Cohesion: 0.33
Nodes (5): Features, Notes, Notion-Rival, Setup, UI & motion

## Knowledge Gaps
- **4 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `react` connect `react` to `ScheduleView.tsx`, `package.json`, `TaskDetailPanel.tsx`, `TasksWorkspace.tsx`, `dates.ts`, `TaskDetailPanel`?**
  _High betweenness centrality (0.109) - this node is a cross-community bridge._
- **Should `ScheduleView.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.12873563218390804 - nodes in this community are weakly interconnected._
- **Why does `framer-motion` connect `TasksWorkspace.tsx` to `ScheduleView.tsx`, `package.json`, `TaskDetailPanel.tsx`, `react`, `dates.ts`?**
  _High betweenness centrality (0.049) - this node is a cross-community bridge._
- **Should `package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.09523809523809523 - nodes in this community are weakly interconnected._
- **Why does `lucide-react` connect `TaskDetailPanel.tsx` to `ScheduleView.tsx`, `package.json`, `TasksWorkspace.tsx`, `react`?**
  _High betweenness centrality (0.045) - this node is a cross-community bridge._
- **Should `TasksWorkspace.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.14130434782608695 - nodes in this community are weakly interconnected._
- **Should `compilerOptions` be split into smaller, more focused modules?**
  _Cohesion score 0.1 - nodes in this community are weakly interconnected._