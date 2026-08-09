# Specification: Frontend warning/test trust recovery

## Problem and baseline

The latest full frontend run is functionally passing but does not provide a
clean warning signal. It emits 59 React `act(...)` warnings across 12 legacy
areas, a Vitest warning caused by an unimplemented `vi.fn`, and a React
duplicate-key warning in the Kanban `ProjectViewPage.typedApi` test. An
`InsightsErrorBoundary` error log is expected for its intentional failure-path
test, but it is currently part of the observable console stream and must be
distinguished from an unexpected failure.

The authoritative baseline is a count and classification contract, not a claim
that every warning has the same root cause. The final ledger must map all 59
React warnings to exactly one of these 12 areas (ProjectViewPage save and
performance are distinct areas):

1. `SprintPlanningPage`
2. `ProjectViewPage` save
3. `ProjectViewPage` performance
4. `AgentDefaults`
5. `ProjectTemplates`
6. `Retrospective`
7. `DependencyEditor`
8. `useProjectView`
9. `useAgentForm`
10. `ProjectCard`
11. `AgentsPage`
12. `useSprintPlanning`

The two non-`act` warnings have independent owners: App test mock contract for
the bare `vi.fn`, and Kanban data identity contract for the duplicate key. The
expected Insights error is an intentional observable outcome, not a warning to
silence.

## Goal

Restore a trustworthy frontend signal: focused and full frontend verification
has zero unexpected React `act(...)`, unimplemented-`vi.fn`, and duplicate-key
warnings, while the intentional Insights error path is explicitly captured and
asserted. User-visible behavior and production contracts remain unchanged
unless evidence proves a real runtime defect.

## Requirements

### R1 — Exact warning classification

- Freeze the opening total of 59 React `act(...)` warnings and preserve the
  exact 12-area ledger through each cluster.
- Classify each warning as one of: unawaited async state transition, missing
  `userEvent` await, fixture/provider contract drift, real production async
  defect, or an invalid test oracle. A warning may have one primary class and
  one owning test/fixture; it may not be counted twice.
- Keep the App `vi.fn` warning and the Kanban duplicate-key warning outside the
  React `act` total and record their distinct root-cause classifications.
- Record the expected `InsightsErrorBoundary` log separately as an intentional
  error-path assertion.

### R2 — Correct async and interaction contracts

- Await every asynchronous user interaction using a per-test
  `userEvent.setup()` instance and `await` on the returned interaction.
- Await the state transition that an interaction causes, using a semantic
  `waitFor`/element assertion or the existing async test helper; do not rely on
  a fixed delay, fake clock, or incidental render.
- Keep fixture promises, provider values, Convex adapters, and callback
  implementations aligned with the production contract. A fixture must not
  resolve outside the test's awaited lifecycle or hide a required callback.
- Preserve meaningful assertions about visible state, submitted payloads,
  loading/error transitions, and callback counts. Do not make an assertion
  weaker solely to remove a warning.

### R3 — Resolve the two non-`act` warnings truthfully

- Replace a bare App-test `vi.fn()` with an explicit implementation or a
  contract-accurate spy where the test invokes the function. If the mock is
  intentionally never called, remove the unused mock rather than suppressing
  the warning.
- For the Kanban duplicate key, first decide whether the duplicate comes from
  an invalid fixture or a production identity/rendering defect. Repair the
  fixture when it violates the unique task identity contract; change
  production identity handling only with a regression proving real duplicate
  data can reach the UI. Never use array indexes or a warning filter as the
  fix.

### R4 — Preserve expected error observability

- The `InsightsErrorBoundary` failure-path test must install a local
  `console.error` capture, assert the expected boundary message/error shape,
  and restore the original console method in cleanup even when assertions
  fail.
- The expected log must be visible in the test's explicit assertion ledger and
  excluded only from the unexpected-console-warning count. No global
  `console.error`/`console.warn` suppression is permitted.

### R5 — Production-change boundary

- Test and fixture contracts are the default repair surface. A production edit
  is in scope only when a red regression or real-browser observation proves an
  actual user-visible async, identity, or error-boundary defect.
- A production edit must retain the existing product behavior and add a focused
  regression for the defect. Test-only timing repairs must not be disguised as
  production refactors.

### R6 — Safety and acceptance evidence

- Focused cluster suites and the full frontend suite are warning-free for the
  three unexpected warning classes. The expected Insights error is captured and
  asserted, not emitted as an unexplained console failure.
- From `frontend/`, `npm run check`; `npm run build`, `npm run lint`, and
  `git diff --check` pass; the relevant frontend typecheck remains part of
  `check` and is recorded explicitly.
- Real system Chrome exercises the core project journey and affected
  warning-facing surfaces read-only. It uses no credentials, seed/import,
  route interception, factory action, or POST/PUT/PATCH/DELETE mutation.
- Closeout records `bash measure/doctor.sh all`, graph synchronization/audit
  evidence, and the final diff check. This docs-only opening does not run those
  commands.

## Acceptance criteria

1. A checked-in warning ledger accounts for all 59 React `act(...)` warnings,
   each exactly once under the 12 named areas, and distinguishes the App
   `vi.fn`, Kanban duplicate-key, and expected Insights error entries.
2. Each warning cluster has a red contract or characterization evidence,
   followed by a green assertion that awaits the relevant async work and
   preserves the original behavioral oracle.
3. Every changed interaction test awaits `userEvent` work and its resulting
   semantic UI/state assertion; fixtures and providers obey the same lifecycle
   contract as production.
4. The App tests no longer invoke an unimplemented `vi.fn`, and the Kanban test
   renders unique contract-valid identities or contains a production regression
   if duplicate data is proven real. No index-key workaround is accepted.
5. The `InsightsErrorBoundary` test captures and asserts its expected error log
   locally and restores the spy; no global warning/error suppression exists.
6. Focused and full frontend runs have zero React `act`, unimplemented-`vi.fn`,
   and duplicate-key warnings. Expected Insights logging is explicitly
   captured/asserted and is not classified as unexpected output.
7. No production file changes unless a real defect is demonstrated; any such
   change has a focused regression and is called out in the closeout.
8. Frontend check/typecheck, build, repository lint, Doctor, graph update/audit,
   diff check, and read-only real-Chrome core/affected-surface evidence are
   recorded. No credentials, mutations, factory activation, seed/import, or
   commit is part of this opening task.

## Out of scope

- Suppressing all console warnings/errors globally, changing Vitest setup to
  hide warnings, monkey-patching React `act`, adding arbitrary sleeps, or
  weakening/removing behavioral assertions.
- Broad frontend refactors, performance tuning unrelated to a proven warning
  defect, product redesign, API/schema changes, or new browser journeys.
- Credentialed factory activation, task dispatch, sprint mutation, seed/import,
  external-harness writes, or any non-read-only browser acceptance.
- Updating `graph.db` while authoring these docs. Implementation must follow the
  repository graph protocol after source changes; this opening task performs no
  graph, Doctor, test, or commit action.
