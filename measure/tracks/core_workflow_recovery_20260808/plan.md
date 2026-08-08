# Plan: Core workflow recovery

## Phase 1: Contract & Schema Definition

_Blast radius: DashboardPage (1 caller: `PortfolioRedirect.tsx`), useSprintPlanningRecommendation (2 callers), useFleetData (1 caller), registerSprintPlanningRoutes (3 callers). Graph lookup found the core integration files in `convex/dashboard.ts`, `convex/sprintPlanning.ts`, `pivot/src/routes/projects.ts`, and `frontend/src/hooks/useProjectView.ts`._

- [x] Task 1.1: Preserve the live audit and define the canonical recovery boundary
  - [x] Store the full route/API audit and durable fix priorities in `audit-report.md`
  - [x] Select classic bug-track format and record Convex-as-canonical ownership
  - [x] Confirm one canonical HTTP project-identity rule and one task catalog
- [x] Task 1.2: Define strict success and error contracts for core reads
  - [x] Align Dashboard, Sprint Planning, and Performance return shapes with validators
  - [x] Define slug-to-ID resolution at the Pivot boundary
  - [x] Define visible frontend error states for failed reads

## Phase 2: Test

- [x] Task 2.1: Add validator-drift regression tests
  - [x] Dashboard task objects containing imported catalog fields
  - [x] Sprint-planning backlog objects containing dependency metadata
  - [x] Performance phase summaries containing sample counts
- [x] Task 2.2: Add project navigation and catalog integration tests
  - [x] Portfolio project link resolves through Project View
  - [x] Project response exposes imported tracks/tasks
  - [x] Planning and board use the same imported task catalog
- [x] Task 2.3: Add a live, non-mocked core-route smoke
  - [x] Assert no automatic scan/import during read-only navigation
  - [x] Assert Dashboard, Project View, Planning, and Board leave loading states
  - [x] Record live server/network evidence

## Phase 3: Implement

- [x] Task 3.1: Repair core Convex response contracts
  - [x] Dashboard validator/return parity
  - [x] Sprint-planning validator/return parity
  - [x] Performance phase-breakdown validator/return parity
- [x] Task 3.2: Repair project identity and project-detail aggregation
  - [x] Resolve slug or ID safely at the HTTP boundary
  - [x] Return imported tracks/tasks required by Project View
  - [x] Remove the current slug 500 and next-task 404 path mismatch
- [x] Task 3.3: Connect Sprint Planning and Board to the canonical imported catalog
  - [x] Render all eligible imported backlog tasks
  - [x] Keep project/task counts consistent across Dashboard, Planning, Board, and Monitor
  - [x] Preserve an honest pre-sprint state without starting a sprint
- [x] Task 3.4: Remove read-side mutation and silent loading failures
  - [x] Stop automatic `scan-and-import` in `useFleetData`
  - [x] Keep explicit import/refresh behavior reachable
  - [x] Render error/retry states for core hooks
- [x] Task 3.5: Close immediate route-wiring defects
  - [x] Register provider read routes or hide Providers
  - [x] Fix the new-harness editor URL
  - [x] Remove hardcoded `demo-project` from Quality pages
  - [x] Make Project Templates fail explicitly or wire its public query

## Phase 4: Generate Docs & Doctor

- [x] Task 4.1: Run focused and project-level verification
  - [x] Focused regression tests
  - [x] `bun --cwd pivot typecheck`
  - [x] `bun run --cwd frontend test`
  - [x] `bun run --cwd frontend check`
  - [x] Live isolated-browser core-route smoke
- [x] Task 4.2: Synchronize graph and durable documentation
  - [x] Update `graph.db` for every changed source file
  - [x] Run `bash measure/doctor.sh all`
  - [x] Record exact pass/fail evidence and residual debt in this plan
  - [x] Update metadata and tracks registry only after acceptance is green

## Closeout Evidence (2026-08-08)

### Real local-stack browser acceptance

One isolated `agent-browser` Chromium session (`live-core-20260808`) exercised the running Vite -> Pivot -> Convex stack without route interception, `seedScenario`, browser-harness, or Kimi WebBridge. The session was closed after the sweep.

| Journey | Observed result |
| --- | --- |
| Portfolio | One imported project; link used `reading-advantage-llm-benchmark`; no import POST. |
| Project View | Six tracks and 67 tasks; imported task rows and Next Mission visible; no `Load error`. |
| Dashboard | Left `Loading dashboard...` and rendered `No Active Sprint`. |
| Sprint Planning | Rendered all 67 backlog tasks; tasks were honestly `Unassigned`; Start Sprint disabled because no active agent exists. |
| Board | Selected the imported project and rendered the honest `No sprints` / select-a-sprint state. |
| Providers / Performance | Provider empty state and phase breakdown rendered; no audited 404/500. |
| Templates | Finite explicit unavailable state with working Retry; no permanent spinner. |
| Harness / Quality | New Harness editor was reachable; both Quality pages used the imported slug, never `demo-project`. |

Browser instrumentation recorded zero `scan-and-import` requests, zero `demo-project` requests, zero failed core responses, and no page errors. Console output was limited to Vite/React informational messages.

### Automated verification

| Gate | Result |
| --- | --- |
| Full Pivot suite | 1,664 passed, 0 failed across 143 files. |
| Full frontend suite | 1,222 passed, 0 failed across 163 files. |
| Focused weak-test regressions | 46 passed, 0 failed. |
| Focused Convex recovery tests | 70 passed, 0 failed. |
| Pivot TypeScript | `bun --cwd pivot typecheck` passed after normalizing the script from the external `bunx` alias to `bun x`. |
| Frontend `npm run check` | Passed: Prettier, ESLint, and TypeScript. |
| Frontend production build | Passed; Vite emitted only the existing large-chunk warning. |
| Graph | Updated after every source/test batch; final stats before closeout: 5,331 nodes, 7,196 edges, 656 files. |

### Weak-test repairs

- The installed-harness contract now requires every checked-in model without rejecting additional supported models.
- The E2E seed-factory contract now requires mocks for mocked specs and forbids them for `@live` specs.
- The router guardrail now inspects executable JSX/import syntax instead of treating prose comments as router code.
- The timeline test now mounts the real parameterized route and asserts the current explicit legacy-task state.
- The live Playwright entrypoint fails closed and is separated from the mocked suite (`test:e2e:live` vs `test:e2e:mocked`).

### Residual debt (not hidden)

- Project Templates remains intentionally explicit-unavailable because its public Convex handler is still absent.
- Analytics/history redesign, wildcard 404 behavior, and larger architecture deletion remain P1/P2 work from `audit-report.md`.
- `bash measure/doctor.sh all` still exits non-zero on pre-existing debt: `qualityWorkflowRunner.ts` is 516 lines, and orphan detection reports 52 exports plus stale allowlist entries. Several reported exports are visibly wired, including the new project catalog and quality pages, so this remains the known build-graph tooling problem in [GitHub issue #2](https://github.com/bodangren/fleet-commander/issues/2) rather than deletion evidence.
- The full frontend suite still emits existing React `act(...)`, nested `vi.mock`, and missing-key warnings. Tests pass, but those warnings are retained as quality debt rather than suppressed.
