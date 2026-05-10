# Review Remediation — 2026-05-03

## Overview

The 2026-05-03 review of work from the previous 24 hours found several mismatches between completed track phases and actual implementation state. This track remediates the concrete issues and updates verification so future registry claims match code behavior.

## Findings To Remediate

1. **Symphony Pivot retry completion is overstated**
   - `RetryManager.calculateSymphonyBackoff()` exists, but `runProject()` still constructs `RetryManager(DEFAULT_RETRY_CONFIG)` and calls the legacy `calculateBackoff()` path.
   - The orchestrator must use the Symphony formula for the Symphony retry path or the track must stop claiming it is complete.

2. **`after_create` hooks are data-only**
   - Harness profiles carry `afterCreate`, but no orchestration path calls it.
   - The runtime needs a defined `after_create` lifecycle point or the completed task must be corrected.

3. **Analytics filters are partially no-op**
   - `AnalyticsFilterBar` exposes agent and priority filters.
   - Analytics routes forward only `days` and `projectSlug`; priority does not affect any backend query, and agent filtering is only partial UI behavior for the heatmap.

4. **Cost-per-task calculation is faulty**
   - `getCostPerTask` creates a `taskIds` set from `costRecords` and never uses it.
   - The current denominator counts all completed tasks in the time window, including tasks with no cost record, which understates cost per costed task.

5. **Verification and completion claims are inconsistent**
   - `Quality Remediation` is marked complete while its plan still has unchecked coverage, e2e, and backfill-test tasks.
   - `Execution Analytics` phase headers show complete despite deferred benchmark, e2e filter, performance, and hook-marker work.
   - Full pivot tests currently fail with 15 failures. Those failures may be pre-existing, but the track documentation must state that clearly and avoid green-suite claims.

## Functional Requirements

- Wire Symphony retry behavior into the actual orchestrator retry path, with tests proving deterministic Symphony delays.
- Implement or explicitly rescope the `after_create` hook lifecycle, with tests covering the selected behavior.
- Make analytics agent and priority filters real end-to-end filters, or remove/rename incomplete controls and update plan state honestly.
- Fix cost-per-task to divide by the intended task set and add tests covering tasks with and without cost records.
- Reconcile `measure/tracks.md`, affected `plan.md` files, and any metadata so completed status reflects actual verified state.
- Run targeted tests and the relevant broader suites; document any remaining baseline failures as out of scope with evidence.

## Acceptance Criteria

- [ ] Symphony retry tests fail before the fix and pass after the orchestrator uses deterministic Symphony backoff where claimed.
- [ ] `after_create` behavior has a runtime call site or the Symphony plan/spec is updated to mark that work deferred.
- [ ] Analytics filter tests verify agent and priority filters affect returned chart data or the UI no longer advertises unsupported filters.
- [ ] Cost-per-task tests cover at least one completed task without a cost record and prove it does not corrupt the metric.
- [ ] Track registry and affected plans no longer claim complete phases with unchecked or unverified work.
- [ ] `bun test ./convex/lib/analytics.test.ts ./convex/lib/cost.test.ts ./convex/lib/budget.test.ts` passes.
- [ ] `bun --cwd frontend test` passes or failures are documented as baseline/out of scope.
- [ ] `bun --cwd pivot test` passes or remaining failures are tied to existing tech-debt items with exact failing test names.

## Out Of Scope

- Building full-stack browser e2e coverage for every analytics chart.
- Resolving unrelated TD-033 pivot test isolation failures unless they block the remediated behavior.
- Reworking historical bulk edits to future track plans unless needed to correct false completion state.
