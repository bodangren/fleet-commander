# Implementation Plan — E2E Audit Remediation

## Phase 1: Convex Manifest & Stuck Loading States

_Fixes: FR-1, FR-2, FR-8, FR-9, FR-10, FR-17_

### Task 1.1: Deploy missing Convex functions

- [ ] Upgrade local Convex backend binary (interactive `y` prompt)
- [ ] Run `npx convex dev --once` to push missing functions
- [ ] Verify `portfolio:getPortfolioHandler`, `projects:listProjects`, `governanceEvents:getGovernanceEvents`, `agentTemplates:listTemplatesHandler`, `agentTemplates:seedDefaultTemplatesHandler`, `agentTemplates:createTemplateHandler` are queryable via curl against `/api/query`

### Task 1.2: Add loading/error/empty triage to History pages

- [ ] Add `error` and `[] → EmptyState` branches to `/history/sprints` page component
- [ ] Add `error` and `[] → EmptyState` branches to `/history/agents` page component
- [ ] Add `error` and `[] → EmptyState` branches to `/history/tasks` page component

### Task 1.3: Fix `/pipelines` error-only rendering

- [ ] Wrap existing error card in a page layout with heading, empty state, and retry button

### Task 1.4: Handle invalid task IDs on timeline

- [ ] Add not-found branch to `TaskTimelinePage.tsx` when task ID doesn't exist (return 404-like state instead of hanging)

### Task 1.5: Fix `/ops/optimize` stuck loading

- [ ] Add error and empty state branches to `/ops/optimize` page component

### Task 1.6: Fix PortfolioRedirect loading hang

- [ ] Add error branch to `PortfolioRedirect.tsx` (currently only checks `undefined`, never failure)
- [ ] Add empty-data branch to redirect to project creation

---

## Phase 2: Agent Editor & Button Wiring

_Fixes: FR-4, FR-5, FR-6, FR-13, FR-15, FR-26_

### Task 2.1: Wire Save Agent button

- [ ] Add `onClick`/`onSubmit` handler to `AgentEditorPage.tsx` that fires the create/update Convex mutation
- [ ] Handle both create (new agent) and update (existing agent) flows
- [ ] Add success/error toast feedback (FR-15 pattern)

### Task 2.2: Fix Clone infinite re-render loop

- [ ] Investigate `useEffect` dependency array in clone handler
- [ ] Fix state-update cycle that causes infinite render
- [ ] Verify clone works on existing agents (alice, bob)

### Task 2.3: Fix Agent Editor button types

- [ ] Change all non-save header buttons from `type="submit"` to `type="button"` (Sync, New Project, Clone, Delete, Test, Back)

### Task 2.4: Wire top-bar "New Project" button

- [ ] Add click handler that opens a project-creation modal or navigates to `/projects/new`

### Task 2.5: Fix "Test Agent" result display

- [ ] Parse `200 {ok:true, message:"..."}` response correctly in test-agent handler
- [ ] Render success chip with message instead of `undefined ms · FAILED · No output`

### Task 2.6: Add save-success feedback globally

- [ ] Add toast/banner on successful save for: Sync, Save Settings, Save Preferences, Save Agent
- [ ] Reuse existing toast infrastructure (if any) or add a lightweight toast component

---

## Phase 3: Sidebar, Routing & Navigation

_Fixes: FR-3, FR-14, FR-18_

### Task 3.1: Fix sidebar Task Timeline link

- [ ] Either add a `/tasks/timeline` index route showing recent tasks with links, or remove the sidebar item and add timeline entry points from individual task cards

### Task 3.2: Add CTA to `/board` empty state

- [ ] Add "Create Sprint" or "Go to Sprint Planning" button/link to the "No sprints" empty state

### Task 3.3: Add sidebar entries for orphan routes

- [ ] Add `/retrospectives` sidebar item (under History or as its own section)
- [ ] Add `/notifications` sidebar item
- [ ] Add `/alerts` sidebar item
- [ ] Add `/ops/reconcile` sidebar item (under Ops)
- [ ] Add `/ops/simulate` sidebar item (under Ops)

---

## Phase 4: Provider, Templates & Data Flow

_Fixes: FR-11, FR-12, FR-16, FR-28_

### Task 4.1: Add Provider management affordance

- [ ] Add "Sync from harness" or "Add provider" button to `/providers` page
- [ ] Implement handler that fetches/syncs provider data

### Task 4.2: Unblock Sprint Planning workflow

- [ ] Add CTA or affordance to create/add tasks to the backlog
- [ ] Ensure "Start Sprint" button becomes enabled when backlog is non-empty

### Task 4.3: Fix `/agent-templates` error handling

- [ ] Ensure "Seed Defaults" and "Save Template" show error toast on 500 (after FR-1 resolves the root cause)
- [ ] Fix simultaneous error toast + empty state — error takes precedence

---

## Phase 5: Polish — Topbar, Dates, Accessibility

_Fixes: FR-19, FR-20, FR-21, FR-22, FR-23, FR-24, FR-25, FR-27, FR-29_

### Task 5.1: Fix topbar titles

- [ ] Add `/costs` case to `viewTitle()` → "Costs"
- [ ] Add `/ops/reconcile` case → "Reconcile"
- [ ] Add `/ops/simulate` case → "Simulate"

### Task 5.2: Rename confusing card on `/ops/diagnose`

- [ ] Rename first card from "Reconcile" to "Drift Detection" or "Diagnose"

### Task 5.3: Guard epoch date on project detail

- [ ] Handle falsy `lastPulseAt` in date formatter — show "Never" or "—" instead of epoch

### Task 5.4: Show friendly not-found for invalid project IDs

- [ ] Replace raw Convex error toast with "Project not found" page on `/project/<bad-id>`

### Task 5.5: Fix sidebar refresh button accessibility

- [ ] Add `aria-label="Refresh"` to sidebar bottom refresh button

### Task 5.6: Visually distinguish disabled Start Sprint

- [ ] Add visual differentiation (opacity, color, icon) for disabled `Start Sprint` button

### Task 5.7: Add unsaved-changes guard on Agent Editor

- [ ] Track form dirty state
- [ ] Warn on Cancel/Back navigation if form has unsaved changes

### Task 5.8: Improve `/blockers` empty state

- [ ] Add explanatory text or link to where blockers originate (In Progress tasks with blocked tag)

---

## Phase 6: Verification

### Task 6.1: Run linting and type-checking

- [ ] `npm run lint` passes
- [ ] `bun --cwd frontend check` passes
- [ ] `bun --cwd pivot typecheck` passes

### Task 6.2: Run tests

- [ ] `bun --cwd pivot test` passes
- [ ] `bun --cwd frontend test` passes

### Task 6.3: Manual E2E spot-check

- [ ] `/` loads (no permanent "Loading…")
- [ ] `/agents/alice/edit` → Save fires mutation, Clone works, Test shows success
- [ ] `/history/sprints`, `/history/agents`, `/history/tasks` show empty or data (no hang)
- [ ] `/pipelines` shows page layout (not bare error card)
- [ ] All sidebar links resolve to valid routes
- [ ] All topbar titles match the active route
- [ ] No route hangs indefinitely on "Loading…"
