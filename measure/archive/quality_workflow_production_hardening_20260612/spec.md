# Quality Workflow Production Hardening

## Overview

This is a remediation track for the issues discovered while reviewing the 24-hour commit window that closed `measure_quality_workflow_integration_20260611` and `react_router_7_migration_20260611`.

The targeted test commands for both tracks are green, but the commits left critical production gaps, stubs, security holes, weak tests, and lazy code in place. This track closes those gaps before any project enables a non-`none` quality profile in production.

## Scope

- Fix the quality workflow's production wiring so it actually executes instead of using a fake pass-through runner.
- Remove hardcoded project slugs and add authorization to the quality REST routes.
- Store real immutable profile snapshots (not just name/version references).
- Fix Convex handler bugs (`setTaskOverride` validating `reason` as an actor, `selectProjectProfile` overwriting audit rows, `v.any()` usage, `ctx: any` usage).
- Make WAL-backed quality-run persistence real and idempotent.
- Fix runner logic: required non-applicable stages must fail, skipped-stage reasons must survive in failed-run logs, unsafe non-null assertions removed.
- Wire quality-stage costs into budget reconciliation.
- Fix frontend defects: invalid ARIA, fake "unknown" profile option, silent endpoint failures, missing `projectSlug` in operations requests.
- Fix RR7 migration cleanup: Prettier formatting, stale inventory path, `vitest.config.ts` timeout band-aid, inconsistent `inventory.md`.
- Restore all project-wide gates: `bun --cwd frontend check`, `bun --cwd pivot typecheck`, `bash measure/doctor.sh all`, and `build-graph audit`.

## Out of Scope

- New quality-workflow stage kinds or new profiles.
- Replacing the canonical scheduler, claimant, budget system, or recovery system.
- Rewriting the Python supervisor or adding new production entrypoints for it.
- Fixing the unrelated 34 pre-existing Playwright E2E failures tracked as TD-250.

## Functional Requirements

### FR-1: Production quality workflow wiring

- `AutoRunner` and `server.ts` must construct and pass real `QualityWorkflowHooks` into `runAllProjects`/`runProject`.
- The production runner must invoke existing agent execution/session primitives to execute quality stages.
- Missing or invalid `QualityWorkflowHooks` must fail closed; the orchestrator must not fall back to a fake runner that auto-passes every stage.

### FR-2: Effective profile resolution

- `loadEffectiveQualityProfile` must use the effective profile payload returned by Convex, honoring task overrides, project selections, and custom published profiles.
- Built-in profiles (`none`, `standard`, `strict`) remain valid, but the system must not silently drop non-built-in effective profiles.

### FR-3: Immutable profile snapshots

- When a task is claimed, the run profile snapshot must store the full serialized stage configuration (kinds, policies, applicability, attempts, timeouts, roles, gate contracts).
- The snapshot must be sufficient to replay the exact profile configuration later even if the source profile is mutated or deleted.

### FR-4: Convex handler hardening

- `setTaskOverrideHandler` must validate `reason` as a non-empty string and `actor` as a non-empty actor identifier (fix the current `assertActor(override.reason)` bug).
- `selectProjectProfileHandler` must append a new audit row on each change, not patch the existing row.
- `publishProfileVersion` must use a typed Convex object validator instead of `v.any()`.
- Handlers must use typed Convex context/argument types instead of `ctx: any`.

### FR-5: Runner sequencing and applicability

- A required stage that is not applicable must cause the quality run to fail with a clear reason.
- Skipped optional stages must remain in the run log with their reason, even when the run ultimately fails.
- The runner must not use unsafe non-null assertions (`lastResult!`).
- `evaluateQualityRecovery` must handle `maxAttempts <= 0` safely.

### FR-6: WAL-backed quality-run persistence

- `startQualityRun`, `appendStageAttempt`, and `finishQualityRun` must be issued through the existing WAL adapter so temporary Convex unavailability does not silently drop state.
- `appendStageAttempt` must include an idempotency key so WAL replay does not duplicate attempts.
- Resume planning must use the typed Convex API (`api.qualityRuns.getResumableQualityRun`) rather than a string function name.

### FR-7: Quality cost reconciliation

- `rollupQualityStageCosts` and `evaluateQualityRecovery` must be wired into the orchestrator's success/failure path.
- Quality-stage costs must be included in the cost passed to `reconcileBudgetOnComplete` exactly once.

### FR-8: REST route security

- All quality routes must derive `projectSlug` from URL parameters or the authenticated session; hardcoded `'fleet-commander'` defaults are forbidden.
- The retry endpoint must accept `stageKind` from the request body instead of hardcoding `'red'`.
- Routes must reuse the existing authorization boundary so users can only mutate projects they own.

### FR-9: Frontend defects

- `QualityStageRow` must not use the invalid `aria-status` attribute; use `data-status` or proper ARIA roles/labels.
- `QualityProfileSection` must not include a fake `<option value="unknown">unknown</option>` placeholder.
- `useQualityProfile` must surface endpoint errors in its `error` state instead of silently ignoring non-OK responses.
- `QualityOperationsPanel` must include the active `projectSlug` in disable and change-profile requests.

### FR-10: RR7 migration cleanup

- Prettier formatting must be fixed in the five flagged files so `bun --cwd frontend check` passes.
- `router-inventory.test.ts` must reference the archived track path (`measure/archive/react_router_7_migration_20260611/`) or use a live path discovery mechanism.
- `inventory.md` must document the settings children as relative paths (`app`, `notifications`, etc.) to match `router.tsx`.
- `vitest.config.ts` timeout must be reduced after the router dynamic-import slowness is fixed or isolated.

### FR-11: Project-wide gates

- `bun --cwd pivot test` must pass with zero failures.
- `bun --cwd pivot typecheck` must complete and pass.
- `bun --cwd frontend test` must pass with zero failures.
- `bun --cwd frontend check` must pass (format + lint + typecheck).
- `bash measure/doctor.sh all` must pass.
- `build-graph audit ./graph.db` must complete and pass.

## Non-Functional Requirements

- **Backward compatibility:** Existing projects with no selected profile must continue to behave identically.
- **Single control plane:** No new scheduler, claimant, or timer may be introduced.
- **No Python supervisor spawn:** Production code must not invoke `measure/automation-supervisor.py`.
- **Type safety:** New code avoids `any` and `as any`; existing `any` usage in touched files is minimized.
- **Observability:** Every skip, retry, failure, override, and closeout decision retains a machine-readable reason.

## Dependencies and Risks

- Depends on the existing `verify` gate from `quality_gate_enforcement_20260605`.
- Touches the production orchestrator hot path (`AutoRunner`, `server.ts`, `orchestrator.ts`); changes must be paired with production-import characterization tests.
- Graph caller discovery is unreliable for orchestrator symbols; rely on direct source inspection and live tests, not only `build-graph callers`.
