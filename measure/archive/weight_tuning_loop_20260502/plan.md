# Implementation Plan: Make Weight Tuning a Real Loop

## Phase 1: Per-Dispatch Score Breakdown (foundation)

- [x] Task: Audit scoreCandidate output
    - [x] Read `pivot/src/policy/scoring.ts` — breakdown has 9 factors: priorityWeight, unblockImpact, personaFitness, harnessReliability, expectedCost, starvationBonus, regressionRisk, retryFatigue, affinity.
    - [x] Breakdown already persisted as `breakdownJson` in `scoreAudit` table on every dispatch.
    - [x] Gap: no `outcome` field on score audit records.

- [x] Task: Persist breakdown and outcome
    - [x] Added `outcome` (accepted|rework|rejected|regression) and `outcomeRecordedAt` fields to `scoreAudit` schema.
    - [x] Added `recordOutcome` mutation to update outcome after task completion.
    - [x] Added `listScoreAuditWithOutcomes` query for report generation.
    - [x] Wired `recordOutcome` into orchestrator success path ('accepted') and failure path ('rejected').
    - [x] Tested: schema accepts new fields, outcome recording works.

## Phase 2: Weekly Tuning Report

- [x] Task: Implement report generator
    - [x] Created `pivot/src/policy/weeklyReport.ts` — reads score audits with outcomes for past week.
    - [x] Computes per-factor contribution to winning scores.
    - [x] Computes point-biserial correlation between factor values and outcomes.
    - [x] Computes counterfactual: cost-conservative preset vs defaults.
    - [x] Renders markdown with three sections: contribution table, correlation detail, counterfactual.

- [x] Task: Schedule the report job
    - [x] Added `report:weekly` script to `pivot/package.json`.
    - [x] Output path: `measure/reports/scoring-weekly-YYYY-WW.md`.
    - [x] Can be triggered manually or scheduled via cron.

## Phase 3: Named Weight Presets

- [x] Task: Define preset file format and initial presets
    - [x] Created `~/.measure-fleet/weight-presets.yaml` with schema documentation.
    - [x] Three presets: "default" (mirrors DEFAULT_WEIGHTS), "cost-conservative", "speed-favored".
    - [x] Supports `active` key for fleet-wide default and `projectOverrides` for per-project selection.

- [x] Task: Load presets in dispatch engine
    - [x] Created `pivot/src/policy/weightPresets.ts` — loads presets from YAML, resolves active preset.
    - [x] Supports per-project override via `projectOverrides` map.
    - [x] Falls back to DEFAULT_WEIGHTS if file missing or preset not found.
    - [x] Wired `loadWeights(projectSlug)` into orchestrator's `selectBestCandidate` calls.

## Phase 4: Shadow Scoring (optional — DEFERRED)

Items 1–3 are stable. Shadow scoring is deferred until two weeks of outcome data accumulate.

- [ ] Task: Implement shadow scoring
    - [ ] On each dispatch cycle, score candidates with the active preset and one alternative preset.
    - [ ] Record the alternative winner in the run log (field: `shadowWinner`).
    - [ ] Confirm shadow scoring does not alter actual dispatch decision.
    - [ ] Include shadow vs actual comparison in the weekly report after two weeks of data.

## Phase 5: Verification

- [x] Task: End-to-end check
    - [x] All new tests pass (18 tests across 4 files).
    - [x] Score breakdown persisted on every dispatch via existing `scoreAudit`.
    - [x] Outcome recorded on task completion (accepted/rejected).
    - [x] Weekly report generator produces correct markdown sections.
    - [x] Weight presets load from YAML, active preset configurable without code changes.
