# Implementation Plan: Kanban Board

## Phase 1: Board Layout

- [x] Task: Create kanban board layout
    - [x] Create `frontend/src/components/kanban/KanbanBoard.tsx`
    - [x] Build `frontend/src/components/kanban/KanbanColumn.tsx`
    - [x] Implement 5-column grid layout
    - [x] Add column headers with task counts
    - [x] Style with Linear design tokens
    - Committed: 02873c8

## Phase 2: Task Cards

- [x] Task: Build task card component
    - [x] Create `frontend/src/components/kanban/TaskCard.tsx`
    - [x] Display story points and estimated cost
    - [x] Add pipeline stage badge
    - [x] Show assigned agent
    - [~] Show duration for active tasks (deferred; see TD-125)
    - [x] Add priority badge
    - [x] Add blocked tag styling
    - [x] Style with Linear design tokens
    - Committed: 02873c8

## Phase 3: Sprint Info Bar

- [x] Task: Build sprint info display
    - [x] Create `frontend/src/components/kanban/SprintInfoBar.tsx`
    - [x] Show sprint name and status
    - [x] Display budget: actual / estimated
    - [x] Add progress bar for budget spent
    - [~] Show cost/point comparison (actual vs estimated deferred; see TD-125)
    - [x] Style with Linear design tokens
    - Committed: 02873c8

## Phase 4: Project & Sprint Selectors

- [x] Task: Build project and sprint selection
    - [x] Integrated into `KanbanBoardPage.tsx` (no separate components)
    - [x] Implement sprint chips with active state
    - [x] Add "Set Active" and "Close Sprint" buttons
    - [x] Style with Linear design tokens
    - Committed: 02873c8

## Phase 5: Drag and Drop

- [x] Task: Implement drag and drop
    - [x] Add `draggable` attribute to task cards
    - [x] Implement `onDragStart` to set task ID
    - [x] Add `onDragOver` to highlight drop target
    - [x] Implement `onDrop` to update task status
    - [x] Validate column transitions
    - [x] Add optimistic UI updates (pendingTaskId opacity; no rollback on failure)
    - [x] Test drag and drop flow
    - Committed: 02873c8

## Phase 6: Data Integration

- [x] Task: Wire board to Convex
    - [x] Data fetched via pivot REST API (not Convex realtime subscriptions; deviation from plan)
    - [x] Implement `updateTaskStatus`, `updateSprintStatus`, `closeSprint` mutations
    - [x] Add loading states
    - [x] Handle empty states
    - Committed: 02873c8

## Phase 7: Blocked Task Handling

- [x] Task: Implement blocked task display
    - [x] Add blocked tag component
    - [x] Show yellow border for blocked tasks
    - [~] Display blocker reason (deferred; see TD-125)
    - [~] Add unblock action (deferred; see TD-125)
    - Committed: 02873c8

## Phase 8: Merged Task Display

- [x] Task: Implement merged task display
    - [x] Show reduced opacity for merged tasks
    - [~] Display agent chain (executor → reviewer → merger) (only assignee shown; deferred to TD-125)
    - [x] Show final cost
    - [~] Add click to view timeline (onClick prop exists but no timeline link wired; deferred to TD-125)
    - Committed: 02873c8

## Phase 9: Responsive Design

- [x] Task: Make board responsive
    - [x] Stack columns on mobile (`grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5`)
    - [x] Adjust card sizes for small screens
    - [ ] Test on different viewports (manual testing only)
    - Committed: 02873c8

## Phase 10: Testing

- [x] Task: Write comprehensive tests
    - [x] Unit tests for task card (11 tests in TaskCard.test.tsx)
    - [x] Unit tests for kanban column (4 tests in KanbanColumn.test.tsx)
    - [x] Integration tests for drag and drop (KanbanBoard.test.tsx)
    - [x] Test sprint info bar (6 tests in SprintInfoBar.test.tsx)
    - [x] Test project/sprint selectors (KanbanBoardPage.test.tsx — 7 tests)
    - [x] Convex function tests (convex/kanban.test.ts — 7 tests)
    - [x] Hook tests (useKanbanBoard.test.ts — 12 tests; useProjectList.test.ts — 3 tests)
    - Committed: 02873c8, 585f3c8
