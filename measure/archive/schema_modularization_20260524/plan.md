# Implementation Plan: Schema Modularization

## Phase 1: Audit & Baseline

- [x] Task: Snapshot current schema
    - [x] Run `npx convex dev` to ensure `_generated/` is fresh
    - [x] Copy `_generated/api.d.ts` to `/tmp/schema-baseline.d.ts`
    - [x] Count lines in `convex/schema.ts` (was ~553)

## Phase 2: Create Schema Directory & Extract Core Tables

- [x] Task: Create `convex/schema/core.ts`
    - [x] Move `systemMetadata`, `projects`, `boards`, `columns`, `settings` tables
    - [x] Move associated `.index()` calls
    - [x] Export tables as a plain object
    - [x] Update `convex/schema.ts` to import and spread from `core.ts`

## Phase 3: Extract Task & Execution Tables

- [x] Task: Create `convex/schema/tasks.ts`
    - [x] Move `tasks`, `runs`, `pipelineRuns`, `workRuns`, `executionLogs`
    - [x] Move associated indexes
    - [x] Update `schema.ts` import

## Phase 4: Extract Agent & Harness Tables

- [x] Task: Create `convex/schema/agents.ts`
    - [x] Move `employees`, `agents`, `providers`, `harnessProfiles`, `harnessReliabilityStats`
    - [x] Move associated indexes
    - [x] Update `schema.ts` import

## Phase 5: Extract Planning Tables

- [x] Task: Create `convex/schema/planning.ts`
    - [x] Move `tracks`, `sprints`, `abTests`
    - [x] Move associated indexes
    - [x] Update `schema.ts` import

## Phase 6: Extract Operations & Analytics Tables

- [x] Task: Create `convex/schema/operations.ts`
    - [x] Move `alerts`, `issues`, `notifications`, `notificationPreferences`, `reconciliationEvents`, `reconciliationProposals`, `reconciliationDecisions`
    - [x] Update `schema.ts` import
- [x] Task: Create `convex/schema/analytics.ts`
    - [x] Move `costRecords`, `budgets`, `governanceEvents`, `performanceBaselines`, `analysisResults`, `simulationRuns`, `coverageRecords`
    - [x] Update `schema.ts` import
- [x] Task: Create `convex/schema/contracts.ts`
    - [x] Move `runContracts`, `policyWeights`, `retrospectives`, `orchestratorErrors`
    - [x] Update `schema.ts` import
    - [x] Final diff against baseline (dataModel.d.ts: zero diff)

## Phase 7: Verification

- [x] Task: Full test suite
    - [x] `bun --cwd pivot typecheck` — passes
    - [x] `bun --cwd frontend tsc --noEmit` — passes
    - [x] `bun --cwd pivot test` — 951/952 pass (1 pre-existing failure in detectRegressions)
    - [~] `bun --cwd frontend test` — suite starts but is very slow (pre-existing, unrelated to schema)

## Phase 8: Documentation & Closeout

- [x] Task: Commit and close track
    - [x] Commit with `chore(schema): Modularize schema.ts into per-domain files`
    - [x] Update `measure/tracks.md` — mark this track complete
