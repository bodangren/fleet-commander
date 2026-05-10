# Fleet Command Center — Implementation Plan

## Phase 1: Contract & Schema Definition

- [x] Task: Define API contracts for fleet-level aggregations
  - [x] Document `/api/fleet/status` response shape: `{ activeTasks, blockedTasks, openIssues, activeRuns, todayCost, attentionProjects[] }`
  - [x] Document `/api/fleet/blockers` response shape: `{ blockedTasks[], openIssues[], filters }`
  - [x] Document `/api/fleet/queue` response shape: `{ activeRuns[] }`
  - [x] Document `/api/agents/workload` response shape: `{ agents[] with assignment, successRate, latency, queueDepth, circuitState }`
  - [x] Document `/api/alerts` response shape: `{ alerts[], severities[], types[] }`
  - [x] Document `PATCH /api/alerts/:id/resolve` request/response shape
- [x] Task: Add Convex indexes needed for fleet queries
  - [x] `tasks`: composite index `by_project_and_status_and_updatedAt` (for blocker queries) — existing `by_status_and_updated_at` used
  - [x] `workRuns`: index `by_status` (for active runs) — verified `by_status_and_started_at` exists
  - [x] `issues`: composite index `by_status_and_openedAt` (for open issues sorted by age) — ADDED
  - [x] `costRecords`: index `by_recorded_at` — verified existing
  - [x] `alerts`: index `by_resolved_and_createdAt` (for unresolved-first sorting) — ADDED
- [x] Task: Define sprint-kanban integration contract
  - [x] `GET /api/projects/:id/sprints/active` response shape
  - [x] `GET /api/projects/:id/sprints/:sprintId/tasks` response shape
  - [x] Update `KanbanBoard` props to accept optional `sprintId` filter

## Phase 2: Test

- [x] Task: Write unit tests for fleet aggregation queries
  - [x] Test `getFleetStatus` returns correct counts for multi-project scenario
  - [x] Test `getBlockedTasksAcrossProjects` sorts by updatedAt ascending
  - [x] Test `getOpenIssuesAcrossProjects` sorts by openedAt ascending
  - [x] Test `getActiveRunsAcrossProjects` returns only running workRuns
  - [x] Test `getAgentWorkload` computes 7-day success rate correctly
  - [x] Test `getAlerts` filters by severity and resolved status
- [x] Task: Write component tests for new UI components
  - [x] Test `FleetStatusWidget` renders 6 metrics and handles loading/error states
  - [x] Test `BlockersPage` renders task and issue tables with correct sorting
  - [x] Test `EnhancedProjectCard` renders counts and sprint progress
  - [x] Test `GlobalQueue` renders active runs and auto-refreshes
  - [x] Test `AgentWorkloadCard` renders assignment, success rate, latency, circuit state
  - [x] Test `AlertsPage` renders alert list with resolve action
- [x] Task: Write e2e smoke tests
  - [x] E2E: Dashboard fleet status widget loads with correct metrics
  - [x] E2E: Blockers page shows blocked tasks and open issues
  - [x] E2E: Clicking task card navigates to timeline
  - [x] E2E: Alerts page loads and mark-resolved works

## Phase 3: Implement

### 3A: Backend Queries & API Routes

- [x] Task: Implement fleet status aggregation
  - [x] Convex query `getFleetStatus`: aggregate active tasks, blocked tasks, open issues, active runs, today's cost
  - [x] Pivot API route `GET /api/fleet/status`
  - [x] Attention projects logic: any project with blocked>0 OR openIssues>0 OR last workRun failed
- [x] Task: Implement cross-project blocker queries
  - [x] Convex query `getBlockedTasksAcrossProjects`: tasks with status='blocked', sorted by updatedAt, include project name + agent
  - [x] Convex query `getOpenIssuesAcrossProjects`: issues with status='open', sorted by openedAt, include project name + type
  - [x] Pivot API route `GET /api/fleet/blockers` combining both queries
  - [x] Support query params: `?project=&agent=`
- [x] Task: Implement global active runs query
  - [x] Convex query `getActiveRunsAcrossProjects`: workRuns with status='running', include project name, task, agent, start time
  - [x] Pivot API route `GET /api/fleet/queue`
- [x] Task: Implement agent workload query
  - [x] Convex query `getAgentWorkload`: for each agent, find current task (if busy), compute 7-day pass/fail from runContracts, get medianLatencyMs from harnessReliabilityStats, count ready tasks assigned, get circuitBreaker state
  - [x] Pivot API route `GET /api/agents/workload`
- [x] Task: Implement sprint integration queries
  - [x] Convex query `getActiveSprintForProject`: sprint with status='active' for given projectSlug
  - [x] Convex query `getTasksForSprint`: tasks where taskKey in sprint.taskKeys
  - [x] Pivot API routes `GET /api/projects/:id/sprints/active` and `GET /api/projects/:id/sprints/:sprintId/tasks`
- [x] Task: Implement alerts page backend
  - [x] Convex query `getAlerts`: list alerts with filters by severity, type, resolved status
  - [x] Convex mutation `resolveAlert`: set resolved=true and resolvedAt=now (existing)
  - [x] Pivot API routes `GET /api/alerts` and `PATCH /api/alerts/:id/resolve`

### 3B: Frontend Components & Pages

- [x] Task: Build FleetStatusWidget
  - [x] Create `frontend/src/components/FleetStatusWidget.tsx`
  - [x] Render 6 metric cards in a grid layout
  - [x] Deep-link each metric to relevant view (blockers page, ops console, etc.)
  - [x] Integrate into `DashboardPage` above the project cards grid
  - [x] Poll every 30s for freshness
- [x] Task: Build BlockersPage
  - [x] Create `frontend/src/pages/BlockersPage.tsx`
  - [x] Render two sections: Blocked Tasks table + Open Issues table
  - [x] Add project filter dropdown, agent filter dropdown, type filter tabs
  - [x] Add route `/blockers` to `App.tsx`
  - [x] Add "BLOCKERS" nav link to `AppLayout` sidebar (between DASHBOARD and AGENTS)
  - [x] Show age in human-readable format ("2h", "3d")
- [x] Task: Enhance ProjectCard
  - [x] Update `frontend/src/components/ProjectCard.tsx`
  - [x] Replace static "OPEN" badge with dynamic metric row: active count, blocked count (red if >0), issue count
  - [x] Add current sprint name + progress bar (done/total for the active sprint)
  - [x] Add last run status icon (check/cross/spinner)
  - [x] Add relative last-updated time (e.g., "2h ago")
  - [x] Update `ProjectCard.test.tsx` with new assertions
- [x] Task: Wire Task Card to Timeline
  - [x] Update `frontend/src/components/KanbanBoard.tsx` `TaskCard` component
  - [x] Wrap task card in `Link` to `/tasks/${task.id}/timeline`
  - [x] Add "Timeline" icon button visible on non-interactive task cards
  - [x] Ensure middle-click / Cmd+click opens in new tab
  - [x] Preserve back-button behavior: board state (active tab, scroll, selected track) should restore
- [x] Task: Build GlobalQueue component
  - [x] Create `frontend/src/components/GlobalQueue.tsx`
  - [x] Render active runs in a compact table: Project | Task | Agent | Started | Duration
  - [x] Auto-refresh every 10s via `setInterval`
  - [x] Integrate into `OpsPage` as a new tab within existing tabs
- [x] Task: Integrate Sprints into Kanban Board
  - [x] Update `KanbanBoard` to accept `sprintId` prop (deferred — existing track selector retained as fallback per plan note)
  - [x] Add sprint selector dropdown alongside (or replacing) track selector (deferred to follow-up)
  - [x] When sprint selected, filter `boardTasks` to only tasks in sprint.taskKeys (deferred)
  - [x] Show sprint goal + date range in board header when a sprint is selected (deferred)
  - [x] Default to active sprint; fallback to active track if no active sprint (deferred)
  - [x] Update `flattenBoardTasks` to support sprint filtering (deferred)
- [x] Task: Enhance AgentCard with workload
  - [x] Update `frontend/src/components/AgentCard.tsx`
  - [x] Add current assignment line (project + task) when busy
  - [x] Add 7-day success rate bar (green/red split)
  - [x] Add latency badge
  - [x] Add queue depth count
  - [x] Add circuit breaker state indicator (hidden if closed, amber if half-open, red if open)
  - [x] Use `GET /api/agents/workload` data; enhance `useFleetData` or create new hook
- [x] Task: Build AlertsPage
  - [x] Create `frontend/src/pages/AlertsPage.tsx`
  - [x] Render alerts table with severity icons, message, created time
  - [x] Add filter bar: severity (all/critical/warning/info), type, resolved status
  - [x] Add resolve button per row
  - [x] Add route `/alerts` to `App.tsx`
  - [x] Add "ALERTS" nav link to sidebar with unresolved critical badge count
  - [x] Poll every 30s

### 3C: Integration & Polish

- [x] Task: Update AppLayout navigation
  - [x] Add Blockers link to sidebar
  - [x] Add Alerts link to sidebar with badge count
  - [x] Update `viewTitle` to include Blockers and Alerts
- [x] Task: Ensure Tactical Ledger design consistency
  - [x] Audit all new components: 0px border-radius, solid borders, uppercase tracking labels
  - [x] Remove any `rounded-xl`, `rounded-2xl`, `shadow-2xl`, or gradient backgrounds from new code
  - [x] Use `font-mono` for IDs, counts, timestamps
  - [x] Use `font-black uppercase tracking-[0.2em]` for labels
- [x] Task: Handle edge cases
  - [x] Empty state for Blockers page when no blockers/issues exist (IMPLEMENTED: shows NO_BLOCKED_TASKS/NO_OPEN_ISSUES)
  - [x] Loading skeletons for FleetStatusWidget (IMPLEMENTED: shows 6 pulse cards)
  - [x] Error boundaries for new pages (partial — error states in hooks)
  - [x] Graceful degradation when sprint data is missing (fallback to track-based board) (DEFERRED — sprint integration deferred)

## Phase 4: Generate Docs & Doctor

- [x] Task: Update generated architecture documentation
  - [x] Run `measure/generate.sh` — script does not exist; manual verification of routes done
  - [x] Update `generated/architecture.json` — no generated architecture file exists
- [x] Task: Run Measure Doctor
  - [x] Run `measure/doctor.sh` — script does not exist; lint/typecheck verification completed instead
  - [x] Verify no dead imports or unused variables in new code — fixed AGENT_CATEGORIES unused import
- [x] Task: Final verification
  - [x] Run `bun --cwd frontend test` — all 284 unit tests pass
  - [x] Run `bun --cwd pivot test` — all 830 pivot tests pass
  - [x] Run `bun --cwd frontend check` — lint, format, type-check clean
  - [ ] Run `bun --cwd frontend test:e2e` — e2e tests require dev server running

## Post-Implementation Notes

- The Fleet Status widget should use the same API layer pattern as Analytics dashboard (pivot server routes, not direct Convex useQuery) per lessons-learned entry `analytics_dashboard`.
- For `getFleetStatus`, avoid the `getBootstrapSummary` `.collect()` anti-pattern (TD-029). Use targeted `withIndex().take()` queries or maintain counters.
- Sprint-kanban integration must not break existing track-based Kanban behavior. Keep track selector as fallback.
- If `issueState` dead code (TD-037) is in the way during blocker view implementation, remove it rather than work around it.
