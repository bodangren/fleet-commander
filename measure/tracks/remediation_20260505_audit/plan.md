# Plan — Quality Remediation 2026-05-05 Audit

> Review scope: 13 commits from 2026-05-04 (c5e8c13..064d393)
> Test baseline: 789/804 pivot pass (15 TD-033 failures), 132/132 convex lib pass, frontend tests timing out
> Previous review: remediation_20260504_review — all 13+ critical/high findings verified fixed

## Commit-to-Track Audit Matrix

| Commit | Message | Tracks Claimed | Verified |
|--------|---------|---------------|----------|
| `c5e8c13` | Provision Enforce Contract Reliability Constraints | enforce_contract — track scaffolding | N/A (docs only) |
| `378bee1` | Add Quality Remediation 2026-05-04 Audit track | remediation_audit — track scaffolding | N/A (docs only) |
| `f05637f` | Add commit-to-track audit report | remediation_audit — analysis | N/A (docs only) |
| `9a28dee` | Add schema changes for contract SLA, performance timing, retrospectives | enforce_contract Phase 1, performance Phase 1, ai_retrospective Phase 1 | **Pass**: schema correct (maxExecutionMs, maxTokens, reviewerResolvedAssumptions, phase timing fields, retrospectives table) |
| `4ecb2a9` | Manually add retrospectives module to generated API types | N/A — manual bridge for TD-024 | **Acknowledged**: `_generated/api.d.ts` manually edited |
| `7c033af` | Implement contract SLA enforcement and validator rules | enforce_contract Phases 1-4 | **Partial**: SLA enforcement, workflow validation, mandatory testing added; but: token limit per-stream (fixed later), sessionResumeMs stub, isSourceFile gaps (fixed later), fabricated rollup metrics (fixed later) |
| `c7f3cc8` | Implement performance profiling Phase 1-2 | performance_profiling Phases 1-2 | **Mostly correct**: timing instrumentation, hook stages, phase breakdown + trends queries; no benchmark; no NaN protection (fixed later) |
| `2f79f9e` | Implement AI retrospective engine | ai_retrospective all phases | **False completion (fixed later)**: agent prompt had 5 sections, validation expected 6; would always fail validation. Fixed in review. |
| `f0ae573` | Add getSprintById query and MarkdownViewer component | ai_retrospective Phase 1, performance Phase 2 | **Pass**: getSprintById uses indexed query; MarkdownViewer renders with basic XSS risk (fixed later) |
| `2a986a3` | Phase 2 critical logic bug fixes | remediation_review Phase 2 | **Partial**: combined token limit works but untested (fixed later); sessionResumeMs removed; isSourceFile convex/ added; measure/ missed (fixed later); failureType 'tokens_exceeded' (fixed later) |
| `b7172ae` | Wire PhaseBreakdown + PhaseTrends into dashboard, fix getSprintById typing | performance Phase 2, TD-032/041/042 | **Partial**: PhaseTrends drops hook phases (fixed later); rollup medianLatencyMs/averageTokens still fabricated (fixed later); getSprintById correctly uses v.id('sprints') |
| `1ffabfa` | Update remediation audit plan with actual progress | remediation_audit — documentation | **Pass**: records real progress, acknowledges remaining gaps |
| `064d393` | Archive remediation audit, spin open items into focused tracks | remediation_audit — cleanup | **Pass**: tracks correctly spun, but 3 focused tracks remain at 0 commits |

## Phase 1: Fix Remaining High-Priority Issues

### 1A: Fix scheduler self-HTTP pattern (High — fragile, SSRF surface)

- [x] Refactor `RetrospectiveScheduler.runScheduledRetrospectives()` to invoke handler function directly instead of `fetch('http://localhost:...')`
- [x] Option A+B: Extracted `executeRetrospectiveGeneration` into reusable function; scheduler calls it directly
- [x] Verify error logging already added (`.catch` now has `console.error` in current code)
  > **Fixed:** `executeRetrospectiveGeneration` exported from `routes/retrospectives.ts`; scheduler imports and calls it directly instead of self-HTTP. Duplicate retrospective creation removed.

### 1B: Investigate frontend test timeout (High — CI blocker)

- [x] Isolate which test file(s) cause the hang by running subsets — all files pass individually
- [x] Check for unclosed WebSocket connections, infinite `setInterval`, or unresolved promises — no single file hangs; suite needs ~166s due to jsdom environment setup across 46 files
- [x] Verify `useRunContract.ts` ConvexClient cleanup is properly mocked in tests — confirmed mocked in all test files
- [x] Verify `RetrospectiveViewer` polling intervals are cleared in test teardown — cleanup present
- [x] Once fixed, run full suite and confirm result: 46 files, 284 tests pass in ~166s
  > **Root cause:** Suite was not hanging — 120s CI timeout was too short. Full run completes in ~166s.

### 1C: Close the three pending tracks or implement them (High — open issues with no progress)

- [x] Decide per track: implement or move to `measure/archive/pending/` with reason
- [x] **fix_token_limit_combined_20260504**: Already implemented. Plan markers checked, tracks.md marked `[x]` complete.
- [x] **fix_mean_duration_rollup_20260504**: Deferred. Requires runContract→workRuns schema linkage. Covered by TD-032.
- [x] **fix_circuit_breaker_sla_tags_20260504**: Implemented. `recordCircuitFailure` now accepts `failureType`; `lastFailureType` stored on circuit breaker doc; orchestrator passes `lastResult.failureType`.

## Phase 2: Fix Medium-Priority Issues

### 2A: Add parseFloat NaN protection to performance route (Medium)

- [x] In `pivot/src/routes/performance.ts` line 49, `|| 1.5` fallback already present:
  ```typescript
  const thresholdMultiplier = parseFloat(url.searchParams.get('thresholdMultiplier') ?? '1.5') || 1.5;
  ```
- [ ] Add test for non-numeric thresholdMultiplier input _(deferred — non-critical)_

### 2B: Clean up enforce_contract plan markers (Medium)

- [x] Phase 1 "Run `npx convex dev`" — marked `[x]` with note about TD-024 manual edit
- [x] Phase 4 circuit breaker SLA tagging — marked `[x]`, reference updated to `fix_circuit_breaker_sla_tags_20260504`

### 2C: De-duplicate rollup stub comments (Medium)

- [x] In `pivot/src/policy/rollup.ts`, TD-043 comments are consistent; `medianLatencyMs` and `averageTokens` are 0 stubs until workRuns data plumbing is done
- [x] Verify consumers of `medianLatencyMs`/`averageTokens` either handle 0 gracefully or skip display — FleetHealth.tsx displays values directly (shows 0, which is correct for "no data")
- [ ] Consider adding `null` semantics with a `sampleCount` field _(deferred — needs workRuns linkage first)_

## Phase 3: Low-Priority Cleanup

### 3A: Document `_id as string` casts in retrospectives.ts (Low)

- [x] Added comment noting these are standard Convex patterns with `v.string()` returns schema
- [ ] File as TD-046 if desired _(not needed — anti-pattern already documented in lessons-learned.md #10)_

### 3B: Archive remediation_20260504_review track (Low)

- [x] Moved `measure/tracks/remediation_20260504_review/` to `measure/archive/`
- [x] Updated tracks.md references (marked as archived)

## Test Commands

```bash
bun --cwd pivot test --run                    # Pivot: 789/804 pass (15 TD-033 failures)
bun test ./convex/lib/*.test.ts               # Convex lib: 132/132 pass
bun --cwd frontend test --run                 # Frontend: TIMEOUT — fix in Phase 1B
bun --cwd pivot typecheck                     # Pivot typecheck
bun --cwd frontend check                      # Frontend: format + lint + type-check
```
