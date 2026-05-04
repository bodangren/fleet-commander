# Implementation Plan — Quality Remediation 2026-05-04 Review

> Review scope: 13 commits from 2026-05-04 (9a28dee..064d393)
> Test baseline: 784/799 pivot (15 TD-033 failures), 131/131 convex lib, pivot typecheck clean

## Phase 1: Fix Critical/High Findings

### 1A: Fix fabricated metrics in rollup.ts (High — False completion claim)

- [x] In `pivot/src/policy/rollup.ts:228-230`, rename `medianLatencyMs` → `medianConfidenceScaled` and `averageTokens` → `meanConfidenceScaled` (or remove fields entirely)
  > **Commit claim vs reality:** Commit `7c033af` claims "Remove incorrect executorConfidence→meanDurationMs mapping (TD-032 partial fix)" — this was fixed in `computeDispatchPolicyStats` (line 159: `meanDurationMs: 0`), but the same fabrication pattern remained in `computeHarnessReliabilityStats` (lines 228-230) where `executorConfidence * 10000` is labeled `medianLatencyMs` and `mean(confidences) * 1000` is labeled `averageTokens`. These names claim to measure latency and token count but are actually scaled confidence scores.

### 1B: Fix retrospective agent prompt — missing Priority Accuracy section (Critical)

- [x] Add `## Priority Accuracy` section to `pivot/src/agents/retrospective.md`
  > **Commit claim vs reality:** Commit `2f79f9e` says "Mark ai_retrospective_20260502 track complete" and the plan claims Phase 2 complete. But the agent prompt lists only 5 sections while `retrospectivePrompt.ts:81-88` REQUIRED_SECTIONS expects 6 sections including "Priority Accuracy". Every retrospective generation will fail validation.

### 1C: Fix XSS in MarkdownViewer (Critical)

- [x] Add `javascript:` URL sanitization in `frontend/src/components/MarkdownViewer.tsx:96-107`
  > Links from LLM-generated markdown are rendered without sanitization. `[click](javascript:alert(1))` will execute.

### 1D: Fix `as any` casts in retrospectives.ts (High)

- [x] Change `id: v.string()` → `v.id('retrospectives')` in `getRetrospective`, `completeRetrospective`, `failRetrospective`
- [x] Change `sprintId: v.string()` → `v.id('sprints')` in `getSprintAggregateData`
- [x] Remove all `as any` casts from these functions
  > **Commit claim vs reality:** Commit `b7172ae` claims "fix getSprintById typing" — this was correctly fixed in sprints.ts but the same pattern was introduced and left unfixed in retrospectives.ts in the same session.

### 1E: Fix stateful TAG_REGEX in retrospective.ts (High)

- [x] Move `/#([\w-]+):(\S+)/g` regex inside `extractTags` function or use `matchAll`
  > Module-level regex with `/g` flag has shared `lastIndex` state. Concurrent calls can miss matches.

### 1F: Fix ConvexClient WebSocket leak in useRunContract (High)

- [x] Store `ConvexClient` instance in ref and call `client.close()` (or equivalent) in cleanup
  > New ConvexClient created on every taskId change; cleanup only unsubscribes but never closes the underlying WebSocket. Orphaned connections accumulate.

## Phase 2: Fix Medium Findings

### 2A: Fix stub metrics in computeDispatchPolicyStats (Medium — acknowledged but misleading)

- [x] Remove `meanDurationMs: 0` from rollup output or replace with real workRuns duration computation
- [x] Remove `blockerCreationRate: 0` and `coverageRegressionRate: 0` or compute from available data
  > **Commit claim vs reality:** Commit `7c033af` claims "Remove incorrect executorConfidence→meanDurationMs mapping" — replaced with 0, which is semantically worse (0ms average duration misleads dashboards more than absent data). Same for blockerCreationRate and coverageRegressionRate — hardcoded 0 stubs.
  > TD-032 acknowledged but not resolved. Spin-off track `fix_mean_duration_rollup_20260504` exists but has no progress.

### 2B: Fix getSprintAggregateData full table scans (Critical performance)

- [x] Replace `.query('tasks').collect()` etc. with indexed queries scoped to project
  > 5 full table scans (`tasks`, `workRuns`, `issues`, `executionLogs`, `orchestratorErrors`) will hit Convex read limits at scale.

### 2C: Fix retrospective scheduler self-HTTP (High — fragile + security)

- [x] Call handler function directly instead of `fetch('http://localhost:${PORT}/api/retrospectives/generate')`
- [x] Or add error logging and authentication
  > Silent error swallowing; no auth; SSRF potential.

### 2D: Fix token limit failureType mislabeling (Medium)

- [x] Add `'tokens_exceeded'` to `failureType` union in executor.ts
- [x] Set `failureType: 'tokens_exceeded'` when `tokensExceeded` is true (currently uses `'timeout'`)
  > **Commit claim vs reality:** Commit `2a986a3` claims "Fix readStreamWithTokenLimit to enforce combined stdout+stderr token limit" — the shared counter is correct, but the failure type is indistinguishable from timeout.

### 2E: Fix session clearing mutation without rollback (Medium)

- [x] Use local variable for effective sessionId instead of mutating `task.sessionId`
- [x] Restore sessionId in catch block if `updateTaskStatus` fails
  > **Commit claim vs reality:** Commit `7c033af` claims "enforce session continuity (retry preserves sessionId, replan/split clears it)" — logic is correct for happy path, but failure path silently loses session state.

### 2F: Fix isSourceFile missing measure/ (Medium)

- [x] Add `normalized.startsWith('measure/')` to `isSourceFile`
- [x] Add test for `.test.`/`.spec.` exclusion in isSourceFile
  > **Commit claim vs reality:** Commit `2a986a3` claims "add convex/ to isSourceFile" — this was done, but measure/ was also missed.

### 2G: Fix PhaseTrends missing hook lines (Medium — False completion)

- [x] Add `<Line>` components for `hookBeforeAvg` and `hookAfterAvg` in PhaseTrends.tsx
  > **Commit claim vs reality:** Commit `b7172ae` claims "wire PhaseBreakdown + PhaseTrends into dashboard" — PhaseBreakdown shows all 7 phases but PhaseTrends silently drops hook phases.

### 2H: Fix RetrospectiveList swallowed errors (Medium)

- [x] Add error state and display in `RetrospectiveList.tsx`

### 2I: Fix performance route NaN protection (Medium)

- [x] Validate `parseInt` results in `pivot/src/routes/performance.ts`

### 2J: Fix RetrospectiveViewer polling for pending reports (Medium)

- [x] Add polling when `retro.status` is `pending` or `running`

### 2K: Fix retrospective route missing maxTokens (Medium)

- [x] Pass `maxTokens` argument to `executeCommand` in `pivot/src/routes/retrospectives.ts:34`

## Phase 3: Fix Test Gaps

### 3A: Add combined token limit test (Medium)

- [x] Test that stdout+stderr share a budget and process is killed on combined breach
  > **Commit claim vs reality:** Commit `2a986a3` claims the fix is done but has zero test coverage for the combined-stream scenario.

### 3B: Add session clearing test (Low)

- [~] Test replan/split sessionId clearing logic with mock run contracts

### 3C: Add retrospective validation mismatch test (High)

- [x] Add test that agent prompt sections match REQUIRED_SECTIONS in retrospectivePrompt.ts
  > The critical mismatch (5 prompt sections vs 6 required sections) would have been caught by this test.

### 3D: Fix convex/lib/retrospective.test.ts using bun:test instead of vitest (High)

- [x] Change `import { describe, expect, it } from 'bun:test'` → `from 'vitest'`
  > Project convention is vitest. This test may not be picked up by the standard test runner.

### 3E: Add isSourceFile edge case tests (Low)

- [x] Test `.test.`/`.spec.` exclusion
- [x] Test `measure/` inclusion (after 2F fix)

### 3F: Add percentile edge case test (Low)

- [x] Test with 3+ data points to verify partial-run exclusion in computePhaseBreakdown

### 3G: Add RetrospectiveViewer test coverage (Low)

- [x] Test selectedId state and detail rendering in RetrospectivePage.test.tsx

## Phase 4: Reconcile Plan Markers

### 4A: enforce_contract_reliability_20260504/plan.md

- [x] Phase 1 `[~]` → `[ ]` for "Run npx convex dev" (not done — manual edit instead)
- [x] Phase 2 `[~]` → `[ ]` for isSourceFile (partially fixed — measure/ still missing) and deriveTaskKind (track-name inference works but no test for UUID edge case in original commit)
- [x] Phase 4 `[~]` → `[ ]` for circuit breaker SLA tagging (not implemented)
- [x] Phase 4 `[~]` → `[ ]` for sessionResumeMs (removed but timing data not replaced)
  > **Commit claim vs reality:** Commit `7c033af` implements Phase 2 validator but with gaps. Commit `2a986a3` fixes some but not all. Plan still shows `[~]` for items that are partially done.

### 4B: performance_profiling_20260502/plan.md

- [x] Phase 1 `[x]` benchmark task → `[ ]` (not done)
- [x] Phase 2 `[~]` SlowAgentLeaderboard → `[x]` (basic component exists, full dashboard is Phase 2 of this track)
- [x] Phase 2 `[~]` wire slow agent alerts → stays `[ ]` (notification system pending)

### 4C: ai_retrospective_20260502/plan.md

- [x] Phase 2 `[x]` "Iterate on prompt quality across 3 test sprints" → `[~]` (3-sprint simulation exists but agent prompt mismatches validation schema — will always fail)
- [x] Phase 3 `[x]` "End-to-end test: trigger → generate → view report" → `[~]` (route tests exist but end-to-end path fails at validation step)
  > **Commit claim vs reality:** Commit `2f79f9e` marks track complete but every retrospective generation will fail validation due to missing Priority Accuracy section.

### 4D: remediation_20260504_audit/plan.md (archived)

- [x] Phase 2 `[ ]` Fix readStreamWithTokenLimit → partially done in `2a986a3`, test gap remains
- [x] Phase 3 `[~]` TD-032 → still stub (`meanDurationMs: 0`)
- [x] Phase 4 `[ ]` circuit breaker differentiation → not started

## Phase 5: Cleanup

- [x] Add SIGTERM/SIGINT handler for scheduler cleanup in server.ts
- [x] Fix "N/Ams" formatting in retrospectivePrompt.ts
- [x] Add empty-Set cleanup in WebSocket close handler (server.ts)
- [x] Add `sampleCount` or `null` semantics for empty percentile buckets (performance.ts)
- [x] Update lessons-learned.md with new patterns from this review

---

## Commit-to-Track Audit Summary

| Commit | Message | Tracks Claimed | Actual Status |
|--------|---------|---------------|---------------|
| `9a28dee` | Add schema changes | enforce_contract Phase 1 | Schema correct; `sessionResumeMs` added then removed in `2a986a3` |
| `4ecb2a9` | Manual API types | — | TD-024 acknowledged; temporary bridge |
| `7c033af` | Implement contract SLA enforcement | enforce_contract Phases 1-4 | Partial: token limit per-stream (fixed later), sessionResumeMs stub, isSourceFile gaps, fabricated rollup metrics remain |
| `c7f3cc8` | Implement performance profiling Phase 1-2 | performance_profiling Phases 1-2 | Mostly correct; weak percentile tests, no benchmark, no NaN protection |
| `2f79f9e` | Implement AI retrospective engine | ai_retrospective complete | **False completion**: agent prompt has 5 sections, validation expects 6; will always fail |
| `2a986a3` | Phase 2 critical logic bug fixes | remediation Phase 2 | Partial: combined token limit works but untested; sessionResumeMs removed but not replaced |
| `b7172ae` | Wire PhaseBreakdown + PhaseTrends | performance_profiling Phase 2, TD-032/041/042 | PhaseTrends drops hook phases; rollup `medianLatencyMs`/`averageTokens` still fabricated; getSprintById fixed correctly |
| `1ffabfa` | Update remediation plan | remediation Phase 3 | Acknowledges stubs but marks some complete |
| `064d393` | Archive remediation, spin tracks | — | Spun correct focused tracks but left root causes unresolved |
