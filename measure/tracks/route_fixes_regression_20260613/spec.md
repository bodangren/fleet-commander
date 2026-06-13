# Spec: Route Fixes + Regression Tests

## Overview

Remediation track that fixes every finding from the `e2e_qa_smoke_20260613` QA pass and every ancillary issue surfaced by `build-graph` dependency analysis. The track has two halves:

1. **Fix** — resolve all 7 QA findings (Q-FIND-001 through Q-FIND-007) plus 3 graph-discovered issues (wrong Convex API paths for all history hooks, hard-coded "New Project" navigation, untested `/history/sprints` page).
2. **Prevent** — add Vitest unit tests and a Kimi WebBridge smoke-test regression pass so these classes of bug cannot ship undetected again.

The track uses **Sprint Mode** — stories map to finding categories, each with Gherkin acceptance criteria and T-shirt sizes.

## Scope

**In scope:**
- All 7 original QA findings (Q-FIND-001 through Q-FIND-007)
- Graph-discovered Convex API path mismatch (`frontend/src/lib/convex-data/history.ts` — all 3 hooks)
- Graph-discovered "New Project" button stub (`AppLayout.tsx:246`)
- `/history/sprints` page (same root as Q-FIND-001, untested by QA)
- Vitest unit tests for every fix
- Kimi WebBridge regression smoke pass covering the 38 routes + 12 workflows

**Out of scope:**
- TD-250 Playwright baseline fixes (34 pre-existing failures)
- TD-240 build-graph JSX/Convex edge tracking (graph infrastructure gap)
- Q-FIND-002 deep-link error boundary (needs a design decision on error UX — filed as separate follow-up)
- Performance/load testing

## Stories

### STORY-R1: Fix Convex history API path mismatch

**As a** user viewing any history page
**I want** agent, sprint, and task history data to load correctly
**So that** I can review historical performance and cost trends

**Acceptance Criteria:**
- Given `frontend/src/lib/convex-data/history.ts`, When the hooks call `useConvexQuery`, Then the API paths use the correct Convex module format (`history/agents:listAgentHistory`, `history/sprints:listSprintHistory`, `history/tasks:listTaskHistory`).
- Given the user navigates to `/history/agents`, When the page loads, Then agent history data renders (not an empty state or error).
- Given the user navigates to `/history/sprints`, When the page loads, Then sprint history data renders.
- Given the user navigates to `/history/tasks`, When the page loads, Then task history data renders.
- Given `build-graph search ./graph.db "listAgentHistory"`, When the query runs, Then it returns at least one result (the Convex function is discoverable).

**Estimate:** S
**Priority:** Must

### STORY-R2: Fix "New Project" header button

**As a** user on any page
**I want** the "New Project" button to open project creation
**So that** I can create new projects from anywhere in the app

**Acceptance Criteria:**
- Given the user is on any page with the header, When they click "New Project", Then a project creation modal or page opens (not `/settings`).
- Given `AppLayout.tsx`, When the "New Project" button renders, Then its `onClick` handler navigates to the project creation flow (modal or dedicated route).
- Given the project creation flow completes, When the user returns, Then they land on the page they were previously on.

**Estimate:** M
**Priority:** Must

### STORY-R3: Fix `/settings` index redirect

**As a** user navigating to `/settings`
**I want** to land on the app configuration page
**So that** I can configure the application without extra clicks

**Acceptance Criteria:**
- Given the user navigates to `/settings`, When the route resolves, Then the URL becomes `/settings/app` and the `AppConfigSection` renders.
- Given `SettingsLayout` renders, When the index route fires `<Navigate to="/settings/app" replace />`, Then the redirect works (no fallback to `/`).
- Given a unit test for the settings route, When it renders `/settings` in a `MemoryRouter`, Then the output shows `AppConfigSection` content.

**Estimate:** S
**Priority:** Must

### STORY-R4: Fix `/harnesses` route redirect

**As a** user navigating to `/harnesses`
**I want** to see the harness registry page
**So that** I can manage CLI harness definitions

**Acceptance Criteria:**
- Given the user navigates to `/harnesses`, When the route resolves, Then `HarnessesPage` renders with the fleet data from `useFleetData`.
- Given `fleet.harnesses` is empty, When the page renders, Then an empty state message appears (not a redirect to Settings/Profile).
- Given the sidebar does not list `/harnesses`, When the user navigates directly via URL, Then the page still renders correctly.

**Estimate:** S
**Priority:** Must

### STORY-R5: Fix `/history/tasks` route redirect

**As a** user navigating to `/history/tasks`
**I want** to see the task history page
**So that** I can review completed tasks and their execution logs

**Acceptance Criteria:**
- Given the user navigates to `/history/tasks`, When the route resolves, Then `TasksHistoryPage` renders.
- Given Convex returns task history data, When the page loads, Then the `TaskHistoryTable` displays tasks with search/filter controls.
- Given Convex is unavailable or returns an error, When the page loads, Then a timeout error message appears (not a redirect to Settings/Profile).

**Estimate:** S
**Priority:** Must

### STORY-R6: Add agent creation validation for provider/model

**As a** user creating a new agent
**I want** to be prevented from saving without selecting a provider and model
**So that** I don't create broken agent configurations

**Acceptance Criteria:**
- Given the Add Agent form, When the user clicks "Save Agent" without selecting a provider, Then a visible validation error appears (not just a toast warning).
- Given the Add Agent form, When the user clicks "Save Agent" without selecting a model, Then a visible validation error appears.
- Given a validation error is shown, When the user selects the missing field, Then the error clears and the save button becomes enabled.
- Given a unit test for the agent form validation, When `saveAgent` is called with missing provider/model, Then it returns a validation error object.

**Estimate:** M
**Priority:** Should

### STORY-R7: Add Vitest regression tests for all fixes

**As a** developer
**I want** unit tests covering every fix in R1–R6
**So that** regressions are caught at test time before reaching QA

**Acceptance Criteria:**
- Given the history API path fix (R1), When `useAgentHistoryQuery`, `useSprintHistoryQuery`, and `useTaskHistoryQuery` are tested, Then each test asserts the correct Convex API path string is passed to `useConvexQuery`.
- Given the "New Project" button fix (R2), When `AppLayout` is rendered in a test, Then clicking "New Project" does not navigate to `/settings`.
- Given the settings redirect fix (R3), When `/settings` is rendered in a `MemoryRouter`, Then the output matches `AppConfigSection`.
- Given the harnesses route fix (R4), When `/harnesses` is rendered with mock fleet data, Then `HarnessesPage` renders.
- Given the task history route fix (R5), When `/history/tasks` is rendered, Then `TasksHistoryPage` renders without redirect.
- Given the validation fix (R6), When the agent form is submitted without provider/model, Then validation errors are returned.
- Given all new tests, When `bun --cwd frontend test` runs, Then all new tests pass.
- Given coverage of changed files, When `bun --cwd frontend test --coverage` runs, Then coverage for changed files is ≥80%.

**Estimate:** L
**Priority:** Must

### STORY-R8: Add Kimi WebBridge regression smoke pass

**As a** QA engineer
**I want** an automated Kimi WebBridge smoke pass that validates all 38 routes and the 12 workflows
**So that** routing bugs and broken interactions are caught before release

**Acceptance Criteria:**
- Given the Kimi WebBridge daemon is running and the extension is connected, When the smoke pass runs, Then all 38 routes from `router.tsx` are navigated to and screenshot-captured.
- Given the 12 workflows from the previous QA pass, When each workflow is exercised, Then all workflows pass (no routing redirects to wrong destinations).
- Given the history pages (`/history/agents`, `/history/sprints`, `/history/tasks`), When each is navigated to, Then data loads (not empty state from API path mismatch).
- Given the "New Project" button, When it is clicked, Then the result is NOT a navigation to `/settings`.
- Given the smoke pass completes, When the coverage report is generated, Then `coverage-report.md` shows 100% route coverage with 0 Critical findings.
- Given the smoke pass artifacts, When they are saved, Then screenshots and findings are stored under `measure/tracks/route_fixes_regression_20260613/screenshots/`.

**Estimate:** L
**Priority:** Should

## Non-Functional Requirements

- **No production regressions:** Every fix must be validated by the existing test suite (`bun --cwd frontend test`) before and after the change.
- **Graph sync:** After all fixes land, run `build-graph update ./graph.db` on every changed file so the graph reflects the corrected API paths and navigation.
- **Idempotent smoke pass:** The Kimi smoke pass (R8) must be re-runnable with the same pass rate (±5% variance).

## Dependencies and Risks

- **Depends on:** running Convex dev server for unit tests that mock Convex queries, Kimi WebBridge daemon + extension for smoke pass (R8).
- **Risk:** STORY-R2 ("New Project" fix) may require a new route or modal component — scope could grow if project creation UX doesn't exist yet. Mitigation: if no creation flow exists, wire the button to open a minimal modal that creates a project via the existing `useConvexProjectsTransformed` hook.
- **Risk:** STORY-R3 (`/settings` redirect) may be caused by `SettingsLayout` crashing at runtime. If so, the fix is in `SettingsLayout.tsx`, not the route definition. Mitigation: reproduce first with a unit test, then fix.
- **Risk:** STORY-R4 (`/harnesses` redirect) may be caused by `fleet.harnesses` being undefined in the outlet context. If so, the fix is in `FleetLayout` or `useFleetData`, not the route. Mitigation: same approach — reproduce, then fix.
