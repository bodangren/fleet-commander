# Implementation Plan: Kanban Board

## Phase 1: Board Layout

- [ ] Task: Create kanban board layout
    - [ ] Create `frontend/src/components/kanban/KanbanBoard.tsx`
    - [ ] Build `frontend/src/components/kanban/KanbanColumn.tsx`
    - [ ] Implement 5-column grid layout
    - [ ] Add column headers with task counts
    - [ ] Style with Linear design tokens

## Phase 2: Task Cards

- [ ] Task: Build task card component
    - [ ] Create `frontend/src/components/kanban/TaskCard.tsx`
    - [ ] Display story points and estimated cost
    - [ ] Add pipeline stage badge
    - [ ] Show assigned agent
    - [ ] Show duration for active tasks
    - [ ] Add priority badge
    - [ ] Add blocked tag styling
    - [ ] Style with Linear design tokens

## Phase 3: Sprint Info Bar

- [ ] Task: Build sprint info display
    - [ ] Create `frontend/src/components/kanban/SprintInfoBar.tsx`
    - [ ] Show sprint name and status
    - [ ] Display budget: actual / estimated
    - [ ] Add progress bar for budget spent
    - [ ] Show cost/point comparison
    - [ ] Style with Linear design tokens

## Phase 4: Project & Sprint Selectors

- [ ] Task: Build project and sprint selection
    - [ ] Create `frontend/src/components/kanban/ProjectSelector.tsx`
    - [ ] Build `frontend/src/components/kanban/SprintSelector.tsx`
    - [ ] Implement sprint chips with active state
    - [ ] Add "Set Active" and "Close Sprint" buttons
    - [ ] Style with Linear design tokens

## Phase 5: Drag and Drop

- [ ] Task: Implement drag and drop
    - [ ] Add `draggable` attribute to task cards
    - [ ] Implement `onDragStart` to set task ID
    - [ ] Add `onDragOver` to highlight drop target
    - [ ] Implement `onDrop` to update task status
    - [ ] Validate column transitions
    - [ ] Add optimistic UI updates
    - [ ] Test drag and drop flow

## Phase 6: Data Integration

- [ ] Task: Wire board to Convex
    - [ ] Add `useQuery` for sprint tasks
    - [ ] Add `useMutation` for task status updates
    - [ ] Implement realtime updates
    - [ ] Add loading states
    - [ ] Handle empty states

## Phase 7: Blocked Task Handling

- [ ] Task: Implement blocked task display
    - [ ] Add blocked tag component
    - [ ] Show yellow border for blocked tasks
    - [ ] Display blocker reason
    - [ ] Add unblock action
    - [ ] Test blocked task flow

## Phase 8: Merged Task Display

- [ ] Task: Implement merged task display
    - [ ] Show reduced opacity for merged tasks
    - [ ] Display agent chain (executor → reviewer → merger)
    - [ ] Show final cost
    - [ ] Add click to view timeline

## Phase 9: Responsive Design

- [ ] Task: Make board responsive
    - [ ] Stack columns on mobile
    - [ ] Adjust card sizes for small screens
    - [ ] Test on different viewports
    - [ ] Optimize touch interactions

## Phase 10: Testing

- [ ] Task: Write comprehensive tests
    - [ ] Unit tests for task card
    - [ ] Unit tests for kanban column
    - [ ] Integration tests for drag and drop
    - [ ] Test sprint info bar
    - [ ] Test project/sprint selectors
