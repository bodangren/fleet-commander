# Spec — Quality Remediation 2026-05-05 Audit

## Background

The 2026-05-04 remediation review (`remediation_20260504_review`) identified and fixed 13+ critical/high issues across the day's commits. This follow-up audit re-verifies those fixes against the actual committed code, runs the full test suite, and checks for any new issues or unfixed items that the previous review may have missed or that were only partially addressed.

## Audit Scope

- All 13 commits from 2026-05-04, spanning 66 files and +4790/−103 lines
- 6 tracks: enforce_contract_reliability, performance_profiling, ai_retrospective, remediation_review, and 3 spin-off fix tracks
- Cross-reference: each commit message's claimed phase completion vs. actual code changes
- Test baseline: pivot (804 tests, 15 TD-033 failures), convex lib (132 tests, 0 failures), frontend (timing out)

## Findings Summary

### Verified Fixed (from remediation_20260504_review)

| Finding | Originally | Current State |
|---|---|---|
| 1A: Fabricated metrics (latency/tokens) | `executorConfidence * 10000` labeled as `medianLatencyMs` | Replaced with `0` stubs + clear TD comments |
| 1B: Missing Priority Accuracy in agent prompt | 5 sections, validation expected 6 | 6 sections including "## Priority Accuracy" |
| 1C: XSS in MarkdownViewer | `javascript:` URLs unsanitized | `/^javascript:/i.test(token.href) ? '#blocked'` |
| 1D: `v.string()` + `as any` anti-pattern | Used in getRetrospective, completeRetrospective, etc. | Now uses `v.id('retrospectives')` and `v.id('sprints')` |
| 1E: Stateful TAG_REGEX | Module-level `/g` regex with shared lastIndex | Uses inline `matchAll()` — safe |
| 1F: ConvexClient WebSocket leak | No `.close()` in cleanup | `clientRef.current.close()` in effect cleanup |
| 2D: Token limit failureType mislabeling | `'timeout'` for tokensExceeded | Now uses `'tokens_exceeded'` |
| 2E: Session clearing without rollback | Direct mutation of `task.sessionId` | Preserves `originalSessionId`, restores on failure |
| 2F: isSourceFile missing measure/ | Only `src/`, `pivot/`, `frontend/`, `convex/` | Added `measure/` |
| 2G: PhaseTrends missing hook lines | Only Load/Score/Execute/Persist/Total | Added `hookBeforeAvg` and `hookAfterAvg` lines |
| 2H: RetrospectiveList swallowed errors | Silent catch | Added `setError()` and error display |
| 2J: RetrospectiveViewer no polling | One-shot fetch | Polls `setInterval` when status is pending/running |
| 2K: retrospective route missing maxTokens | Not passed | `RETRO_MAX_TOKENS = 8000` passed to executeCommand |
| 3A: Combined token limit test | Missing | Added `'returns tokensExceeded when output exceeds maxTokens'` |
| 3C: Retrospective validation mismatch test | Missing | Added test in retrospectivePrompt.test.ts |
| 3D: bun:test → vitest in convex tests | `import from 'bun:test'` | Now `import from 'vitest'` |
| 3E: isSourceFile edge case tests | Missing | Tests for convex/, measure/, .test./.spec. exclusion |
| 3F: Percentile edge case test | Missing | Added `'excludes partial runs with 3+ data points'` |
| 3G: RetrospectiveViewer test | Missing | RetrospectivePage.test.tsx with 210 lines |

### Remaining Issues

**High:**
- **Self-HTTP in scheduler** (partially fixed): Error logging added to `.catch()`, but still uses `fetch('http://localhost:...')` instead of calling handler directly. Fragile at scale.
- **Three pending tracks have zero progress**: `fix_token_limit_combined_20260504`, `fix_mean_duration_rollup_20260504`, `fix_circuit_breaker_sla_tags_20260504` created 24h ago, no implementation commits.
- **Frontend test suite timing out**: `bun --cwd frontend test --run` hangs at 120s. Possible infinite loop, WebSocket leak, or resource exhaustion.

**Medium:**
- **Hardcoded 0 stubs in rollup.ts**: `meanDurationMs: 0`, `medianLatencyMs: 0`, `averageTokens: 0`. Acknowledged as TD-032/TD-043 but still present.
- **`as any` casts in route handlers**: performance.ts and retrospectives.ts routes use `client.query('...' as any, ...)`. TD-024.
- **Performance route NaN protection incomplete**: `parseFloat(thresholdMultiplier)` lacks `|| 1.5` fallback.
- **Enforce contract plan markers stale**: Phase 1 `[~]` for "npx convex dev" should reflect actual state.

**Low:**
- **`_id as string` / `id as string` casts** in retrospectives.ts (lines 48, 118). Standard Convex pattern with `v.string()` returns but type-unsafe.
