# Plan: Quality Workflow Production Hardening

> **Atomic Phase Commits (recorded 2026-06-13):**
> - Phase 1: `c209f6c` — feat(quality): wire production QualityWorkflowHooks and remove fake runner
> - Phase 2: `bfa4ded` — feat(convex): harden profile snapshots, audit, and override validation
> - Phase 3: `4b3f732` — fix(quality): sequencing, applicability, cost recovery, and built-in required: false
> - Phase 4: `f8faafa` — feat(quality): WAL-backed persistence, idempotency, and typed resume
> - Phase 5: `68fb98c` — fix(quality,rr7): REST security, frontend defects, and RR7 cleanup
> - Phase 6: `8eacb05` — docs(measure): closeout, lessons learned, and track scaffolding

## Phase 1: Wire Production Quality Workflow & Remove Fake Runner _(c209f6c)_

### Contract & Schema Definition
- [x] Task: Extend `QualityWorkflowHooks` interface to include a production `StageExecutor` factory and snapshot recorder. _(File: `pivot/src/orchestrator/types.ts`)_
- [x] Task: Add `qualityWorkflowHooks` to `AutoRunnerDeps` and `AutoRunner` constructor. _(File: `pivot/src/orchestrator/autoRunner.ts`)_
- [x] Task: Construct real quality hooks in `server.ts` and pass them to `AutoRunner`. _(File: `pivot/src/server.ts`)_

### Test
- [x] Task: Add Red test asserting `AutoRunner` threads `qualityWorkflowHooks` into its `runAll` call. _(File: `pivot/src/orchestrator/autoRunner.qualityWiring.red.test.ts`)_
- [x] Task: Add Red test asserting `runConfiguredQualityWorkflow` fails closed when no runner is provided. _(File: `pivot/src/orchestrator/qualityWorkflowDispatch.red.test.ts`)_
- [x] Task: Add Red test asserting `loadEffectiveQualityProfile` uses the effective profile payload from Convex, not just the built-in name. _(File: `pivot/src/orchestrator/qualityWorkflowDispatch.red.test.ts`)_

### Implement
- [x] Task: Remove the inline fake default runner from `runConfiguredQualityWorkflow`; throw / fail if `hooks.runner` is missing. _(File: `pivot/src/orchestrator/qualityWorkflowDispatch.ts`)_
- [x] Task: Fix `loadEffectiveQualityProfile` to return the effective profile payload returned by `getEffectiveTaskProfile`. _(File: `pivot/src/orchestrator/qualityWorkflowDispatch.ts`)_
- [x] Task: Implement a production `StageExecutor` that uses existing agent primitives (or documents why a stub remains). _(File: `pivot/src/orchestrator/stages/qualityStageExecutor.ts`)_

### Generate Docs & Doctor
- [x] Task: Add JSDoc to new/changed exports and run `bun --cwd pivot typecheck` + `bun --cwd pivot test <phase files>`.
- [x] Task: Run `build-graph update ./graph.db` for changed TypeScript files.

## Phase 2: Harden Profile Snapshots, Selections, and Convex Handlers _(bfa4ded)_

### Contract & Schema Definition
- [x] Task: Extend `runProfileSnapshots` table schema to store the full serialized profile snapshot. _(File: `convex/schema/contracts.ts` or relevant schema file, plus `convex/__fixtures__/foundation.ts`)_
- [x] Task: Replace `v.any()` in `publishProfileVersion` args with a typed Convex object validator. _(File: `convex/qualityProfiles.ts`)_
- [x] Task: Add typed Convex context/args wrappers for quality-profile handlers (remove `ctx: any`).

### Test
- [x] Task: Add Red test asserting the snapshot row contains the full stage configuration. _(File: `convex/qualityProfiles.snapshot.red.test.ts`)_
- [x] Task: Add Red test asserting two project selections create two audit rows, not one patched row. _(File: `convex/qualityProfiles.audit.red.test.ts`)_
- [x] Task: Add Red test asserting `setTaskOverride` rejects a missing or empty reason. _(File: `convex/qualityProfiles.override.red.test.ts`)_

### Implement
- [x] Task: Update `recordClaimedRunProfileHandler` to serialize and store the effective profile snapshot. _(File: `convex/qualityProfiles.ts`)_
- [x] Task: Change `selectProjectProfileHandler` from `patch` to `insert` (append-only audit). _(File: `convex/qualityProfiles.ts`)_
- [x] Task: Fix `setTaskOverrideHandler` validation: validate `reason` separately from `actor`. _(File: `convex/qualityProfiles.ts`)_
- [x] Task: Apply typed validators and remove `ctx: any` / `v.any()` where possible. _(File: `convex/qualityProfiles.ts`)_

### Generate Docs & Doctor
- [x] Task: Run `bun test ./convex/qualityProfiles.test.ts` and all new Red test files.
- [x] Task: Run `bun --cwd pivot typecheck` and `bash measure/doctor.sh all`.
- [x] Task: Run `build-graph update ./graph.db` for changed files.

## Phase 3: Fix Sequencing, Applicability, and Cost Recovery _(4b3f732)_

### Contract & Schema Definition
- [x] Task: Update `QualityStageSpec`/`StageResult` types to support skip preservation in failed logs. _(File: `pivot/src/orchestrator/qualityWorkflowRunner.ts`)_

### Test
- [x] Task: Add Red test asserting a required non-applicable stage fails the run. _(File: `pivot/src/orchestrator/qualityWorkflowRunner.red.test.ts`)_
- [x] Task: Add Red test asserting skipped-stage reasons survive in a failed run log. _(File: `pivot/src/orchestrator/qualityWorkflowRunner.red.test.ts`)_
- [x] Task: Add Red test asserting `evaluateQualityRecovery` handles `maxAttempts <= 0`. _(File: `pivot/src/orchestrator/qualityCostRollup.red.test.ts`)_
- [x] Task: Add characterization test asserting quality costs reach `reconcileBudgetOnComplete`. _(File: `pivot/src/orchestrator/orchestrator.characterization.test.ts`)_

### Implement
- [x] Task: Refactor `sequenceQualityStages` to fail required non-applicable stages. _(File: `pivot/src/orchestrator/qualityWorkflowRunner.ts`)_
- [x] Task: Refactor `runQualityWorkflow` to preserve skipped-stage entries in failed logs. _(File: `pivot/src/orchestrator/qualityWorkflowRunner.ts`)_
- [x] Task: Remove `lastResult!` non-null assertions and handle empty results safely. _(File: `pivot/src/orchestrator/qualityWorkflowRunner.ts`)_
- [x] Task: Guard `evaluateQualityRecovery` against zero/negative `maxAttempts`. _(File: `pivot/src/orchestrator/qualityCostRollup.ts`)_
- [x] Task: Wire quality-stage cost rollup into `orchestrator.ts` before budget reconciliation. _(File: `pivot/src/orchestrator/orchestrator.ts`)_

### Generate Docs & Doctor
- [x] Task: Run `bun --cwd pivot test src/orchestrator/qualityWorkflowRunner.test.ts src/orchestrator/qualityCostRollup.test.ts src/orchestrator/orchestrator.characterization.test.ts`.
- [x] Task: Run `bun --cwd pivot typecheck` and `bash measure/doctor.sh all`.
- [x] Task: Run `build-graph update ./graph.db` for changed files.

## Phase 4: WAL, Resume, and Idempotency _(f8faafa)_

### Contract & Schema Definition
- [x] Task: Add `idempotencyKey` to `appendStageAttempt` args and schema. _(File: `convex/qualityRuns.ts`, `convex/schema/contracts.ts`)_
- [x] Task: Define a typed `QualityRunLifecycle` interface that wraps WAL + Convex mutations. _(File: `pivot/src/orchestrator/stages/qualityRunLifecycle.ts`)_

### Test
- [x] Task: Add Red test asserting quality-run mutations are WAL-appended and replayed exactly once. _(File: `pivot/src/failover/wal.qualityRuns.red.test.ts`)_
- [x] Task: Add Red test asserting `planQualityRunResume` uses the typed Convex API. _(File: `pivot/src/orchestrator/qualityResume.integration.red.test.ts`)_
- [x] Task: Add Red test asserting duplicate `idempotencyKey` on `appendStageAttempt` does not create duplicate rows. _(File: `convex/qualityRuns.red.test.ts`)_

### Implement
- [x] Task: Create `qualityRunLifecycle.ts` that uses `walAdapter` for `startQualityRun`, `appendStageAttempt`, `finishQualityRun`. _(File: `pivot/src/orchestrator/stages/qualityRunLifecycle.ts`)_
- [x] Task: Update `runConfiguredQualityWorkflow` to use the new lifecycle instead of direct `client.mutation` calls. _(File: `pivot/src/orchestrator/qualityWorkflowDispatch.ts`)_
- [x] Task: Update `appendStageAttemptHandler` to enforce idempotency. _(File: `convex/qualityRuns.ts`)_
- [x] Task: Replace string function name with typed `api.qualityRuns.getResumableQualityRun` in `planQualityRunResume`. _(File: `pivot/src/orchestrator/qualityRunResume.ts`)_
- [x] Task: Type `applicability` properly in `ResumeStage` instead of `Record<string, unknown>`. _(File: `pivot/src/orchestrator/qualityRunResume.ts`)_

### Generate Docs & Doctor
- [x] Task: Run `bun --cwd pivot test src/failover/wal.qualityRuns.test.ts src/orchestrator/qualityResume.integration.test.ts` and `bun test ./convex/qualityRuns.test.ts`.
- [x] Task: Run `bun --cwd pivot typecheck` and `bash measure/doctor.sh all`.
- [x] Task: Run `build-graph update ./graph.db` for changed files.

## Phase 5: REST Security, Frontend Fixes, and RR7 Cleanup _(68fb98c)_

### Contract & Schema Definition
- [x] Task: Document the expected request/response shapes for quality REST routes. _(File: `pivot/src/routes/quality.ts`)_
- [x] Task: Document the correct ARIA pattern for `QualityStageRow`. _(File: `frontend/src/components/timeline/QualityStageRow.tsx`)_

### Test
- [x] Task: Add Red test asserting hardcoded project slug and missing auth are rejected. _(File: `pivot/src/routes/quality.red.test.ts`)_
- [x] Task: Add Red test asserting retry endpoint uses request-body `stageKind`. _(File: `pivot/src/routes/quality.red.test.ts`)_
- [x] Task: Add Red test asserting `QualityStageRow` does not render `aria-status`. _(File: `frontend/src/components/timeline/QualityStageRow.red.test.tsx`)_
- [x] Task: Add Red test asserting `QualityProfileSection` does not render the "unknown" option. _(File: `frontend/src/pages/settings/QualityProfileSection.red.test.tsx`)_

### Implement
- [x] Task: Harden `pivot/src/routes/quality.ts`: derive `projectSlug` from params/session, remove hardcoded `'fleet-commander'`, reuse auth boundary, accept `stageKind` in retry body. _(File: `pivot/src/routes/quality.ts`)_
- [x] Task: Update `QualityOperationsPanel` to include `projectSlug` in disable/change-profile requests. _(File: `frontend/src/pages/operations/QualityOperationsPanel.tsx`)_
- [x] Task: Update `useQualityProfile` to set `error` on non-OK project/task profile responses. _(File: `frontend/src/hooks/useQualityProfile.ts`)_
- [x] Task: Replace `aria-status` with `data-status` or proper ARIA in `QualityStageRow`. _(File: `frontend/src/components/timeline/QualityStageRow.tsx`)_
- [x] Task: Remove the fake "unknown" option from `QualityProfileSection`. _(File: `frontend/src/pages/settings/QualityProfileSection.tsx`)_
- [x] Task: Run Prettier on the five flagged frontend files. _(Files listed in FR-10)_
- [x] Task: Fix `router-inventory.test.ts` archive-path reference. _(File: `frontend/src/__tests__/router-inventory.test.ts`)_
- [x] Task: Align `inventory.md` settings paths with relative children in `router.tsx`. _(File: `measure/archive/react_router_7_migration_20260611/inventory.md`)_
- [x] Task: Reduce `vitest.config.ts` timeout after isolating router dynamic imports (or document why the higher timeout remains). _(File: `frontend/vitest.config.ts`)_

### Generate Docs & Doctor
- [x] Task: Run `bun --cwd frontend check` and ensure it passes.
- [x] Task: Run `bun --cwd frontend test --run src/components/timeline/QualityStageRow.test.tsx src/pages/operations/QualityOperationsPanel.test.tsx src/pages/settings/QualityProfileSection.test.tsx src/hooks/useQualityProfile.test.tsx`.
- [x] Task: Run `bun --cwd pivot typecheck` and `bash measure/doctor.sh all`.
- [x] Task: Run `build-graph update ./graph.db` for changed files.

## Phase 6: Verify, Doctor, Graph, and Closeout _(8eacb05)_

### Contract & Schema Definition
- [x] Task: Confirm all new exported functions have JSDoc and typed signatures.

### Test
- [x] Task: Run full pivot suite: `bun --cwd pivot test`.
- [x] Task: Run full frontend suite: `bun --cwd frontend test`.
- [x] Task: Run `npm run verify` in real mode (no `VERIFY_FAKE_GATE_DIR`).

### Implement
- [x] Task: Fix any remaining failures from the full-suite runs.
- [x] Task: Update `measure/tech-debt.md` if any new deferred work is identified (with TD IDs).

### Generate Docs & Doctor
- [x] Task: Run `bash measure/doctor.sh all` and confirm 6/6 pass.
- [x] Task: Run `build-graph audit ./graph.db` with a long timeout and confirm pass.
- [x] Task: Run `build-graph update ./graph.db` for all changed files.
- [x] Task: Update `measure/tracks.md` to mark this track complete and archive it.
