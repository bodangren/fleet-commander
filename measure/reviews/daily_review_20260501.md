# Daily Code Review — 2026-05-01

## Commits Reviewed (past 24 hours)

| Commit | Description |
|--------|-------------|
| `134236b` | chore(measure): Split foundational fixes into 6 focused tracks |
| `721f7a3` | test(foundation): add unit tests for git validation and logger modules |
| `208da4a` | chore(foundation): documentation, error handling, git security, config module |

## Files Reviewed (source code only)

| File | Lines | Verdict |
|------|-------|---------|
| `pivot/src/git/validation.ts` | 37 | ✅ Clean |
| `pivot/src/git/validation.test.ts` | 86 | ✅ Good coverage |
| `pivot/src/orchestrator/logger.ts` | 75 | ✅ Clean |
| `pivot/src/orchestrator/logger.test.ts` | 69 | ✅ Good coverage |
| `pivot/src/config/index.ts` | 52 | ⚠️ Minor issue |
| `pivot/src/routes/git.ts` | 185 | ✅ Secure |
| `pivot/src/orchestrator/orchestrator.ts` | 767 | ✅ Uses new logger |
| `pivot/src/policy/rollup.ts` | 298 | ⚠️ TD-032 (pre-existing) |
| `pivot/src/policy/rollup.test.ts` | 478 | ✅ Thorough |
| `convex/orchestratorErrors.ts` | 62 | ✅ Clean |
| `convex/schema.ts` | 429 | ✅ Proper indexes |

## Issues Found

### Correctness

1. **`pivot/src/config/index.ts:34`** — `convexUrl` defaults to empty string `''`. The Convex client will fail at runtime if `CONVEX_URL` is not set. Should either throw with a clear error message or document the required env var.

2. **`pivot/src/policy/rollup.ts:228-230`** — `medianLatencyMs` and `averageTokens` are computed from `executorConfidence` (0-1) using arbitrary multipliers (`*10000` and `*1000`). These fields are semantically misleading. Already tracked as **TD-032**.

### Security ✅

- `pivot/src/git/validation.ts` properly validates branch names against `[a-zA-Z0-9._/-]+`, rejects `..`, leading `-`, `//`, trailing `.`
- `pivot/src/routes/git.ts` validates all branch names and sanitizes shell input before passing to git commands
- Addresses item #4 and #10 from foundational review

### Performance

- `convex/orchestratorErrors.ts:38-39` — `listErrors` uses `.take()` then `.filter()` for severity. For queries with severity filter, a composite index `(severity, createdAt)` would be more efficient. Minor issue — acceptable for current volume.

### Tests ✅

- `validation.test.ts`: 9 tests covering all rejection cases + 3 valid cases + 5 sanitization cases
- `logger.test.ts`: 5 tests covering all severity levels, context variations, error passthrough
- **Missing**: No tests for `logOrchestratorError` or `logAndCaptureError` (requires Convex client mocking)

### Style ✅

- Follows existing conventions: single quotes, 2-space indent, explicit types
- Proper use of discriminated unions for validation results

## Pre-existing Issues (uncommitted, not from these commits)

- 4 pivot test failures in `resolver.test.ts` and `executor.test.ts` — missing `beforeEach` imports and mock setup issues
- Prettier formatting drift in 3 frontend test files
- `stats.test.ts` has a major rewrite in progress (uncommitted)

## Architectural Concerns (for tech-debt.md)

No new architectural concerns. The commits properly address items from the foundational review:
- Item #4 (Error handling) → `orchestratorErrors` table + structured logger
- Item #10 (Security) → Branch validation + shell sanitization
- Item #2 (Hardcoded constants) → Config module created

## Summary

**Quality: Good.** The 3 commits add meaningful security hardening (git validation), observability (structured error logging + Convex table), and configuration management. Code is clean, well-tested, and follows project conventions. The config module's empty-string default for `convexUrl` is the only actionable issue worth noting.
