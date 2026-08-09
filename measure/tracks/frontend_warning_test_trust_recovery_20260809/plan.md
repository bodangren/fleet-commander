# Implementation plan: Frontend warning/test trust recovery

This plan is intentionally bounded around the warning ledger. Every cluster
must classify its own warnings, write or strengthen a red contract, and leave a
small focused green proof. Clusters may run in parallel only when they do not
share the same test fixture/setup file; integration and aggregate verification
remain serialized.

## Phase 1 — Track-first baseline and contracts

- [ ] Task 1.1 — Freeze the 59-warning ledger
  - Capture the full frontend warning output and map every React `act(...)`
    warning exactly once to the 12 named areas.
  - Record the App unimplemented `vi.fn` warning, Kanban duplicate key, and
    expected `InsightsErrorBoundary` log as separate entries.
  - Preserve the baseline before any implementation edits; do not call a
    warning-free result until the ledger is reconciled.
- [ ] Task 1.2 — Define the shared test contracts
  - Standardize per-test `userEvent.setup()` and awaited interactions.
  - Define semantic async settlement assertions and fixture/provider cleanup.
  - Define the local expected-console capture/assert/restore contract for
    `InsightsErrorBoundary`.
- [ ] Task 1.3 — Lock scope and evidence boundaries
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

- [ ] Task 2A.1 — Add/repair red contracts for `SprintPlanningPage` and
  `useSprintPlanning`: awaited user actions, recommendation/loading transitions,
  and submitted planning state.
- [ ] Task 2A.2 — Add/repair red contracts for `ProjectViewPage` save and
  performance paths plus `useProjectView`: awaited save/error transitions,
  deferred data settlement, and meaningful visible/performance assertions.

### Cluster B — Forms, templates, and project-card fixtures

- [ ] Task 2B.1 — Add/repair red contracts for `AgentDefaults`,
  `ProjectTemplates`, and `useAgentForm`, keeping provider and callback
  fixtures contract-accurate.
- [ ] Task 2B.2 — Add/repair red contracts for `ProjectCard`, including any
  navigation/selection async state and unique project identity fixtures.

### Cluster C — Retrospective, dependencies, and agents

- [ ] Task 2C.1 — Add/repair red contracts for `Retrospective` and
  `DependencyEditor`: awaited form/dialog interactions, finite loading/error
  states, and payload/dependency assertions.
- [ ] Task 2C.2 — Add/repair red contracts for `AgentsPage`, including async
  roster/provider fixtures and visible readiness/error assertions.

### Cluster D — Warning-specific test contracts

- [ ] Task 2D.1 — Repair the App test's bare `vi.fn` contract with an explicit
  implementation or remove the unused mock; retain a meaningful invocation
  assertion.
- [ ] Task 2D.2 — Reproduce and classify the Kanban duplicate key in
  `ProjectViewPage.typedApi.test.tsx`; repair fixture identity or add a red
  production regression if the duplicate is a real data-path defect.
- [ ] Task 2D.3 — Make the `InsightsErrorBoundary` expected log a local,
  explicitly asserted capture with deterministic cleanup.

## Phase 3 — Green implementation by cluster

- [ ] Task 3.1 — Green Cluster A with the smallest async/userEvent/fixture
  changes; touch production only for a proven runtime defect.
- [ ] Task 3.2 — Green Cluster B with contract-accurate form/template/project
  fixtures and preserved payload/selection assertions.
- [ ] Task 3.3 — Green Cluster C with awaited interactions and preserved
  dependency/roster behavior.
- [ ] Task 3.4 — Green Cluster D and verify the three non-`act` classifications;
  no global console or React warning suppression is allowed.
- [ ] Task 3.5 — Reconcile the ledger after each cluster and require the count
  to decrease only through a classified fix, not by filtering output.

## Phase 4 — Aggregate verification and closeout

- [ ] Task 4.1 — Run each focused cluster suite and record tests, warnings,
  expected Insights capture, and any residual classification.
- [ ] Task 4.2 — Run the full frontend suite twice as needed for order
  independence; require zero unexpected React `act`, unimplemented-`vi.fn`,
  and duplicate-key warnings.
- [ ] Task 4.3 — Run frontend check/typecheck, build, repository lint, and
  `git diff --check`; record any unrelated advisory separately.
- [ ] Task 4.4 — Run `bash measure/doctor.sh all` and the required incremental
  `build-graph update ./graph.db <changed-files>`/audit after source changes.
  Do not update the graph during this documentation-only opening.
- [ ] Task 4.5 — Run read-only real system Chrome over core project navigation
  and the affected planning/project/agent surfaces. Capture console and
  network evidence; fail on writes, credentials, seed/import, or factory use.
- [ ] Task 4.6 — Publish the final warning ledger, exact focused/full counts,
  expected-log assertion, production-change justification (if any), Doctor,
  graph, diff, and browser evidence, then update registry/metadata only after
  all acceptance criteria are met.

## Required command families

```text
bun --cwd frontend test
bun --cwd frontend check
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
