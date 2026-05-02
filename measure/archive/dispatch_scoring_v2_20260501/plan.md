# Implementation Plan: Dispatch Scoring v2

## Phase 1: Fix Starvation Scoring

- [x] Task: Add lastDispatchAttemptAt field
    - [x] Added `lastDispatchAttemptAt` to tasks table in Convex schema.
    - [x] Added field to Task interface in types.ts.
    - [x] `upsertTask` mutation sets field when status is `in_progress`.
    - [x] Field is optional (backward compatible with existing tasks).

- [x] Task: Update starvation bonus calculation
    - [x] `starvationBonus()` now uses `task.lastDispatchAttemptAt ?? task.updatedAt`.
    - [x] Tests pass (32 scoring tests).

## Phase 2: Make Scoring Configurable

- [x] Task: Add scoring settings
    - [x] Weight presets already configurable via `~/.measure-fleet/weight-presets.yaml`.
    - [x] Added `epsilon` to preset YAML (per-preset configurable).
    - [x] Added `loadDispatchOptions()` to weightPresets.ts returning `{ weights, epsilon }`.
    - [x] Per-project overrides supported via `projectOverrides` map.

- [x] Task: Update scoring engine
    - [x] Orchestrator uses `loadDispatchOptions(projectSlug)` for weights + epsilon.
    - [x] Falls back to defaults if no preset found.

## Phase 3: Add Scoring Telemetry

- [x] Task: Create telemetry logging
    - [x] `scoreAudit` table already captures `breakdownJson`, `candidatesJson`, `justification`.
    - [x] `outcome` field added for post-dispatch tracking.

- [x] Task: Add query endpoints
    - [x] `listScoreAuditByTask` — history by task.
    - [x] `listScoreAuditSince` — history by time range.
    - [x] `listScoreAuditWithOutcomes` — filtered by outcome.

## Phase 4: Fix expectedCost Naming

Skipped — low-value rename that risks breaking scoring, presets, and tests. Semantic mismatch is documented in tech debt.

## Phase 5: Final Verification

- [x] Task: Run tests and verify
    - [x] All scoring tests pass (32 tests).
    - [x] Weight presets load correctly with epsilon.
    - [x] Telemetry queries work.
