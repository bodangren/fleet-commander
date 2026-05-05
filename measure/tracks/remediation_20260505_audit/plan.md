# Quality Remediation — 2026-05-05 Audit Implementation Plan

> **Scope:** 13 commits from 2026-05-04 (c5e8c13..064d393), 6 tracks, 17 find-and-fix items from remediation_20260504_review.
> **Test baseline:** 789/804 pivot pass (15 TD-033 failures), 132/132 convex lib pass, frontend tests timing out.

## Phase 1: Verify Prior Fixes (from remediation_20260504_review)

- [x] 1A: Fabricated metrics removed — `medianLatencyMs`/`averageTokens` no longer mapped from confidence
- [x] 1B: Missing Priority Accuracy section added to `retrospective.md` prompt
- [x] 1C: XSS in MarkdownViewer — `javascript:` URLs sanitized to `#blocked`
- [x] 1D: `v.string()` + `as any` anti-pattern fixed in retrospectives (now `v.id('retrospectives')`, `v.id('sprints')`)
- [x] 1E: Stateful TAG_REGEX replaced with `matchAll()`
- [x] 1F: ConvexClient WebSocket leak fixed — `.close()` in effect cleanup
- [x] 2D: Token limit failureType changed from `'timeout'` to `'tokens_exceeded'`
- [x] 2E: Session clearing rollback — preserves `originalSessionId`, restores on failure
- [x] 2F: isSourceFile expanded to include `measure/`
- [x] 2G: PhaseTrends hook lines added (hookBeforeAvg, hookAfterAvg)
- [x] 2H: RetrospectiveList error handling — `setError()` on fetch failure
- [x] 2J: RetrospectiveViewer polling — `setInterval` when status is pending/running
- [x] 2K: Retrospective route maxTokens — `RETRO_MAX_TOKENS = 8000` passed to executeCommand
- [x] 3A: Combined token limit test added to executor tests
- [x] 3C: Retrospective validation mismatch test — prompt sync assertion
- [x] 3D: `bun:test` → `vitest` import fix in convex lib tests
- [x] 3E: isSourceFile edge case tests (convex/, measure/, .test./.spec. exclusion)
- [x] 3F: Percentile edge case test — partial runs with 3+ data points
- [x] 3G: RetrospectiveViewer test — RetrospectivePage.test.tsx viewer selection test

> Commits: `33416db` `d739c0f` `82011c3` `2dbd346`

## Phase 2: Remaining High Issues

> Commit: `33416db`

- [x] Self-HTTP in scheduler: error logging added to `.catch()` (already committed)
- [x] Three pending tracks closed/archived: `fix_mean_duration_rollup_20260504` archived
- [ ] Frontend test suite timing out: `bun --cwd frontend test --run` hangs at 120s (TD-038)

## Phase 3: Medium/Low Cleanup

> Commits: `d739c0f` (pivot runtime) `4b4499f` (docs)

- [x] `meanDurationMs` made optional across all layers (fix_mean_duration_rollup track, already committed)
- [x] `medianLatencyMs`/`averageTokens` set to 0 with TD-043 comments (already committed)
- [x] `as any` casts documented as TD-024 (already committed)
- [x] Performance route NaN protection: `||` fallbacks added for parseFloat/parseInt
- [x] Enforce contract plan markers updated to reflect actual state
- [x] Lessons-learned updated with remediation patterns
- [x] Tech-debt registry reorganized (resolved items split into pre-2026-04-23 and 2026-05-04 sections)

## Phase 4: Plan Marker Cleanup

> Commit: `33416db`

- [x] remediation_20260504_audit plan updated with review status annotations
- [x] ai_retrospective_20260502 plan updated: prompt iteration `[~]`, e2e test `[~]`
- [x] performance_profiling_20260502 plan updated: benchmark deferred, SlowAgentLeaderboard marked `[x]`

## Phase 5: Verification

- [ ] `bun test ./convex/lib/*.test.ts` — verify all pass
- [ ] `bun --cwd pivot test` — verify baseline (15 TD-033 failures acceptable)
- [ ] `bun --cwd frontend check` — verify clean
- [ ] `bun --cwd pivot typecheck` — verify clean
