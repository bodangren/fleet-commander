# Fleet Command Center — Multi-Project Operational Dashboard

## Overview

Fleet Commander's backend and data models already support multiple concurrent projects, but the UI forces users to drill into individual project silos to get any actionable operational picture. This track transforms the dashboard and key surfaces into a true **fleet command center** where a scrum lead can see cross-project health, prioritize interventions, and manage agent capacity without visiting every project board.

The goal is **horizontal visibility across projects** over vertical depth within any single one.

## Functional Requirements

### FR-1: Fleet Status Widget (Dashboard)
Add a persistent fleet-status summary to the dashboard (`/`) showing:
- **Total active tasks** across all projects (count of `status === 'in_progress'`)
- **Total blocked tasks** across all projects (count of `status === 'blocked'`)
- **Total open issues** across all projects (count of `status === 'open'`)
- **Active runs** count (workRuns with `status === 'running'`)
- **Today's cost** (sum of `costUSD` from costRecords where `recordedAt` is today)
- **Projects needing attention** list — any project with `blocked > 0 || openIssues > 0 || lastRunFailed`

Each metric must be clickable and deep-link to the relevant filtered view.

### FR-2: Cross-Project Blocker View
Create a new top-level page `/blockers` (add to sidebar nav) showing:
- All tasks with `status === 'blocked'` across all projects, sorted by `updatedAt` ascending (oldest first)
- All issues with `status === 'open'` across all projects, sorted by `openedAt` ascending
- Columns: Project name, task/issue title, agent assignee, age (hours/days), status badge
- One-click jump to the relevant project's board or issue detail
- Filters: by project, by agent, by type (blocker vs issue)

This is the #1 operational screen for a multi-project scrum lead.

### FR-3: Enhanced Project Cards
Extend the existing `ProjectCard` on the dashboard to show:
- Active task count (e.g., "3 LIVE")
- Blocked task count, highlighted in destructive color if > 0
- Open issue count
- Current sprint name + completion percentage (done/total for the active sprint)
- Last run status icon (success/failure/pending)
- Last updated relative time (e.g., "2h ago")

Remove the static "OPEN" badge which provides no signal.

### FR-4: Task Card → Timeline Link
Make task cards on the Kanban board clickable:
- Clicking any task card navigates to `/tasks/:taskId/timeline`
- The existing `TaskTimelinePage` already exists and is well-designed; it just has no inbound links
- Add a "View Timeline" action to the task card context (visible on hover or as a small icon button)
- Ensure the browser back button returns to the project board preserving scroll position and active tab

### FR-5: Global Active Runs View
Add a "Global Queue" section to the Ops Console (`/ops`) or Dashboard showing:
- Currently executing workRuns across all projects
- Columns: Project, Task ID, Agent, Started At, Duration so far, Phase (load/score/execute/etc.)
- Auto-refreshes every 10s while visible
- Ability to cancel a run (if API supports it; otherwise display-only)

### FR-6: Sprint-Kanban Integration
Connect the SprintPanel's sprint concept to the Kanban board:
- The Kanban "CURRENT_SPRINT" selector should offer **sprints** in addition to (or instead of) tracks
- When a sprint is selected, the board shows only tasks whose `taskKey` is in that sprint's `taskKeys` array
- The sprint selector should default to the project's active sprint (status === 'active')
- Show sprint goal and date range in the board header when a sprint is selected
- Sprint completion percentage should drive the board header progress indicator

### FR-7: Agent Workload Context
Enhance the Agents page (`/agents`) so each `AgentCard` shows:
- Current assignment: "Running: Task X on Project Y" (if `busyAgent === agent.name`)
- Recent success rate: passed runs / total runs in last 7 days
- Average latency: `medianLatencyMs` from `harnessReliabilityStats`
- Queue depth: number of ready tasks assigned to this agent across all projects
- Circuit breaker state (closed/open/half-open) if not closed

This turns the Agents page from a static org chart into an operational resource map.

### FR-8: Alerts Page
Create a top-level `/alerts` page (add to sidebar nav) backed by the existing `alerts` table:
- List all alerts sorted by `createdAt` descending
- Filters: by severity (critical/warning/info), by type, by resolved status
- Ability to mark alerts as resolved
- Unresolved critical alerts shown as a red badge count on the sidebar nav icon

## Non-Functional Requirements

- **Performance:** Fleet Status widget must load within 1s for ≤20 projects. Use denormalized counters or indexed aggregations; avoid full table scans (see TD-029).
- **Real-time:** Global Queue view must auto-refresh. Use Convex subscription if possible, otherwise 10s polling.
- **Consistency:** All new pages must follow the "Tactical Ledger" design system (0px radius, solid borders, uppercase tracking labels). No rounded corners or soft gradients.
- **Accessibility:** Keyboard navigation for Blocker view table (arrow keys, Enter to open). Focus states visible.

## Acceptance Criteria

- [ ] Dashboard shows Fleet Status widget with 6 metrics (active, blocked, open issues, active runs, today's cost, attention-needed projects)
- [ ] `/blockers` page renders all blocked tasks and open issues across projects with correct sorting and filters
- [ ] Project Cards show active/blocked/issue counts, sprint progress, and last run status
- [ ] Clicking any Kanban task card navigates to its timeline page
- [ ] Global Queue shows currently executing runs across all projects with auto-refresh
- [ ] Kanban board can filter by sprint; sprint selector defaults to active sprint
- [ ] Agent Cards show current assignment, 7-day success rate, latency, queue depth, and circuit breaker state
- [ ] `/alerts` page renders alerts table with severity filters and resolve action
- [ ] All new features have unit tests (≥80% coverage) and at least one e2e smoke test per new page
- [ ] No regression in existing e2e tests

## Out of Scope

- Per-project settings (different orchestrator intervals per project) — requires deeper config refactor
- Cross-project dependency visualization (graph of inter-project dependencies)
- Predictive health scoring (ML-based risk prediction)
- Real-time WebSocket streaming for all fleet metrics (use polling for now)
- Batch operations (trigger all / pause all) — can be added later once global queue exists
- Mobile-responsive optimizations

## Related Tech Debt

- TD-029: `fleetCatalog.ts:getBootstrapSummary` does full table scans — the Fleet Status widget must NOT replicate this pattern; use targeted indexed queries or maintain counters.
- TD-037: `issueState` from `useIssuePreview` is dead code — evaluate whether to wire it up as part of FR-2 or remove it.
- TD-034: Analytics dashboard missing e2e tests — this track must include e2e tests as acceptance criteria.
