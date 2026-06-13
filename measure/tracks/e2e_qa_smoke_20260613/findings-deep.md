# Findings — E2E QA/QC Smoke Test (Deep)

> Generated: 2026-06-13 | Deep workflow testing

## Summary

| Severity | Count |
|----------|-------|
| Critical | 2 |
| High | 3 |
| Medium | 2 |
| Low | 0 |
| **Total** | **7** |

---

## Q-FIND-001: Missing Convex function `history:listAgentHistory`

- **Route:** `/history/agents`
- **Severity:** High
- **Expected:** Page loads with agent history data or empty state
- **Actual:** Convex error: `Could not find public function for 'history:listAgentHistory'`
- **Repro:**
  1. Navigate to `/history/agents`
  2. Observe Convex error in console/server logs

---

## Q-FIND-002: Deep link to non-existent project shows "Load error"

- **Route:** `/project/:id` (with invalid ID)
- **Severity:** High
- **Expected:** Redirect to `/` or show user-friendly not-found page
- **Actual:** "Load error - internal_server" displayed; URL stays on broken path
- **Repro:**
  1. Navigate to `http://localhost:5173/project/non-existent-id-12345`
  2. Page shows "Load error internal_server"

---

## Q-FIND-003: `/settings` redirects to `/` instead of `/settings/app`

- **Route:** `/settings`
- **Severity:** Medium
- **Expected:** Redirect to `/settings/app`
- **Actual:** Redirects to `/` (root)
- **Repro:**
  1. Navigate to `http://localhost:5173/settings`
  2. URL becomes `/`

---

## Q-FIND-004: "New Project" header button navigates to Settings

- **Route:** Header button (all pages)
- **Severity:** Critical
- **Expected:** Open a "Create New Project" modal or navigate to project creation form
- **Actual:** Navigates to `/settings` page
- **Repro:**
  1. Click "New Project" button in top-right header
  2. Page navigates to Settings instead of project creation

---

## Q-FIND-005: `/harnesses` redirects to Settings/Profile

- **Route:** `/harnesses`
- **Severity:** Critical
- **Expected:** Harnesses management page with list of harnesses and create/edit buttons
- **Actual:** Redirects to Settings/Profile page
- **Repro:**
  1. Navigate to `http://localhost:5173/harnesses`
  2. Page shows Settings/Profile instead of Harnesses

---

## Q-FIND-006: `/history/tasks` redirects to Settings/Profile

- **Route:** `/history/tasks`
- **Severity:** High
- **Expected:** Tasks history page with list of completed tasks
- **Actual:** Redirects to Settings/Profile page
- **Repro:**
  1. Navigate to `http://localhost:5173/history/tasks`
  2. Page shows Settings/Profile instead of Tasks History

---

## Q-FIND-007: Agent creation saves without provider/model selected

- **Route:** `/agents` → Add Agent
- **Severity:** Medium
- **Expected:** Validation error requiring provider/model selection before save
- **Actual:** Agent saved successfully with warning "Select a harness before saving" but no error shown to user (toast only)
- **Repro:**
  1. Navigate to `/agents`
  2. Click "Add Agent"
  3. Fill name, description, system prompt
  4. Leave Provider/Model as "Select a provider"
  5. Click "Save Agent"
  6. Toast shows "Agent saved successfully" with hidden warning

---

## What Was Actually Tested (Deep)

| Workflow | Status | Notes |
|----------|--------|-------|
| Create agent (Add Agent → fill → save) | PASS | Saves with warning about missing harness |
| Edit agent (Edit button → form) | PARTIAL | Edit button not found via JS selector |
| Search projects | PASS | Filters correctly |
| Filter by status (All/Healthy/Degraded/Critical) | PASS | Shows correct filtered results |
| Import project (Scan workspace) | PASS | Validation works, scan completes |
| Start New Sprint | PASS | Navigates to Sprint Planning |
| Sprint Planning (Recalculate, Start Sprint) | PASS | Buttons respond, shows empty state |
| Dashboard metrics | PASS | Renders 17 agents, key metrics |
| Blockers page | PASS | Shows empty state with filters |
| Settings forms | PASS | All fields accept input |
| Back button navigation | PASS | Returns to previous page |
| Wildcard route (`/totally-made-up`) | PASS | Redirects to `/` |

## What Was NOT Tested (Due to Routing Bugs)

- Harnesses CRUD (page redirects to Settings)
- History/Tasks (page redirects to Settings)
- Provider management (requires working harnesses)
- Agent template CRUD (requires navigation testing)
- Project template creation
- Full sprint lifecycle (no tasks in backlog)
- Drag-and-drop on Board (empty board)
- Retrospective generation (button not found)
- Blockers creation/resolution (no create UI found)
- Notifications mark-as-read
- Ops actions (Monitor, Optimize, Simulate buttons)
