# Implementation plan: Frontend warning/test trust recovery

This plan closed on 2026-08-09 in implementation commit `4fed5cb7`. All 23
explicit task labels below are complete; the original estimate was 20. The
three-task expansion covered production boundaries exposed by weak tests and
the read-only real-system Chrome proof. Exact counts, the 59-versus-60 opening
replay discrepancy, and residual follow-up are in [warning-ledger.md](./warning-ledger.md)
and [closeout.md](./closeout.md).

This plan is intentionally bounded around the warning ledger. Every cluster
must classify its own warnings, write or strengthen a red contract, and leave a
small focused green proof. Clusters may run in parallel only when they do not
share the same test fixture/setup file; integration and aggregate verification
remain serialized.

## Phase 1 — Track-first baseline and contracts

- [x] Task 1.1 — Freeze the 59-warning ledger
  - Preserve the recorded 59-warning aggregate and the 12 named owner areas;
    record fresh replay cardinalities when available, without inventing
    per-area counts for the original capture.
  - Record the App unimplemented `vi.fn` warning, Kanban duplicate key, and
    expected `InsightsErrorBoundary` log as separate entries.
  - Preserve the baseline before any implementation edits; do not call a
    warning-free result until the ledger is reconciled.
- [x] Task 1.2 — Define the shared test contracts
  - Standardize per-test `userEvent.setup()` and awaited interactions.
  - Define semantic async settlement assertions and fixture/provider cleanup.
  - Define the local expected-console capture/assert/restore contract for
    `InsightsErrorBoundary`.
- [x] Task 1.3 — Lock scope and evidence boundaries
  - Require a red test or real-browser evidence before a production edit.
  - Prohibit global suppression, fixed sleeps, fake timers used as a warning
    escape, index keys, weakened assertions, credentials, and mutations.
  - Record focused/full frontend, check/build/lint, Doctor, graph, diff, and
    read-only Chrome gates as closeout requirements.

## Phase 2 — Red contracts (four bounded parallel clusters)

Run these clusters independently. Each cluster owns its listed areas and its
warning-ledger rows; it must not rewrite another cluster's fixture or global
Vitest setup without coordination.

### Cluster A — Sprint planning and project view async flows

- [x] Task 2A.1 — Add/repair red contracts for `SprintPlanningPage` and
  `useSprintPlanning`: awaited user actions, recommendation/loading transitions,
  and submitted planning state.
- [x] Task 2A.2 — Add/repair red contracts for `ProjectViewPage` save and
  performance paths plus `useProjectView`: awaited save/error transitions,
  deferred data settlement, and meaningful visible/performance assertions.

### Cluster B — Forms, templates, and project-card fixtures

- [x] Task 2B.1 — Add/repair red contracts for `AgentDefaults`,
  `ProjectTemplates`, and `useAgentForm`, keeping provider and callback
  fixtures contract-accurate.
- [x] Task 2B.2 — Add/repair red contracts for `ProjectCard`, including any
  navigation/selection async state and unique project identity fixtures.

### Cluster C — Retrospective, dependencies, and agents

- [x] Task 2C.1 — Add/repair red contracts for `Retrospective` and
  `DependencyEditor`: awaited form/dialog interactions, finite loading/error
  states, and payload/dependency assertions.
- [x] Task 2C.2 — Add/repair red contracts for `AgentsPage`, including async
  roster/provider fixtures and visible readiness/error assertions.

### Cluster D — Warning-specific test contracts

- [x] Task 2D.1 — Repair the App test's bare `vi.fn` contract with an explicit
  implementation or remove the unused mock; retain a meaningful invocation
  assertion.
- [x] Task 2D.2 — Reproduce and classify the Kanban duplicate key in
  `ProjectViewPage.typedApi.test.tsx`; repair fixture identity or add a red
  production regression if the duplicate is a real data-path defect.
- [x] Task 2D.3 — Make the `InsightsErrorBoundary` expected log a local,
  explicitly asserted capture with deterministic cleanup.

## Phase 3 — Green implementation by cluster

- [x] Task 3.1 — Green Cluster A with the smallest async/userEvent/fixture
  changes; touch production only for a proven runtime defect.
- [x] Task 3.2 — Green Cluster B with contract-accurate form/template/project
  fixtures and preserved payload/selection assertions.
- [x] Task 3.3 — Green Cluster C with awaited interactions and preserved
  dependency/roster behavior.
- [x] Task 3.4 — Green Cluster D and verify the three non-`act` classifications;
  no global console or React warning suppression is allowed.
- [x] Task 3.5 — Reconcile the ledger after each cluster and require the count
  to decrease only through a classified fix, not by filtering output.

## Phase 4 — Aggregate verification and closeout

- [x] Task 4.1 — Run each focused cluster suite and record tests, warnings,
  expected Insights capture, and any residual classification.
- [x] Task 4.2 — Run the full frontend suite twice as needed for order
  independence; require zero unexpected React `act`, unimplemented-`vi.fn`,
  and duplicate-key warnings.
- [x] Task 4.3 — Run frontend check/typecheck, build, repository lint, and
  `git diff --check`; record any unrelated advisory separately.
- [x] Task 4.4 — Run `bash measure/doctor.sh all` and the required incremental
  `build-graph update ./graph.db <changed-files>`/audit after source changes.
  Do not update the graph during this documentation-only opening.
- [x] Task 4.5 — Run read-only real system Chrome over core project navigation
  and the affected planning/project/agent surfaces. Capture console and
  network evidence; fail on writes, credentials, seed/import, or factory use.
- [x] Task 4.6 — Publish the final warning ledger, exact focused/full counts,
  expected-log assertion, production-change justification (if any), Doctor,
  graph, diff, and browser evidence, then update registry/metadata only after
  all acceptance criteria are met.

## Required command families

```text
bun --cwd frontend test
cd frontend && npm run check
bun --cwd frontend build
npm run lint
bash measure/doctor.sh all
build-graph update ./graph.db <changed-files>
build-graph stats ./graph.db
build-graph audit ./graph.db
git diff --check
PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/google-chrome \
  bun --cwd frontend run test:e2e:live -- e2e/live-core.spec.ts --workers=1
```

The browser command is read-only evidence against the real local stack. No
route interception, fixture seed, credentials, factory action, or mutation may
be introduced to make a warning or UI assertion pass.

## Closeout evidence — 2026-08-09

- Implementation commit: `4fed5cb7`.
- Focused aggregate: **23 files / 154 passed**, with zero React `act`, bare
  `vi.fn`, duplicate-key, or unexplained console warning output. The expected
  `InsightsErrorBoundary` error was captured, asserted, and restored locally.
- Full frontend: **176 files / 1,285 passed in 157.87s**, zero warning output.
  Two earlier clean full runs were **1,284 passed**; the extra passing test is
  the added regression, not a baseline rewrite.
- Other suites: Pivot **148 files / 1,710 passed**; Convex runtime **21 files /
  106 passed**; remaining Convex Bun/pure **31 files / 914 passed**; focused
  route coverage **42 passed**. Frontend check, repository lint, frontend,
  Pivot, and Convex typechecks, and the 2,800-module production build passed.
  The build retains the **1,354.26kB / 382.84kB gzip** over-500k advisory.
- Read-only system Chrome: **4/4 specs in 26.9s**. `live-core` opened and
  cancelled Save as Template against the actual GET, scrubbed the path, and
  asserted exact task/agent counts. The full journey observed zero
  POST/PUT/PATCH/DELETE; services on 5173, 8081, and 3210 all returned 200.
- No credentials, seed/import, factory action, or browser/API mutation ran.
- Doctor exited 1 only for known `qualityWorkflowRunner.ts` (516 lines), 65
  orphan exports, and stale allowlist/graph noise. Graph synchronization
  covered 31 files (**94→254 nodes**, **190→358 edges**), with current stats
  **5,949 nodes / 8,307 edges / 733 files**. The audit was silent for over 90s
  and stopped; issue #2 remains the known tooling limitation.

The weak tests exposed real production boundaries: ProjectDetail omitted
description/assigned agents; a legacy imported path leaked description data;
canonical `assigneeId` was not resolved; and an optional agent failure could
produce a 500. The implementation fixed these with a deduped ID→name runtime
join, safe project roster fields, resilient detail handling, and
sanitizer/new-import paths that blank descriptions. These changes retain
product behavior and have focused coverage.

The next fix-plan priority is P1 frontend bundle splitting for the over-500k
advisory, followed by bounded Doctor god-file/orphan-debt tracks. Bounded
Factory remains approval-gated.
