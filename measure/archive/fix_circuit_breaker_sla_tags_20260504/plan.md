# Plan: Tag Circuit Breaker Failures by SLA Breach Type

## Phase 1: Executor Failure Typing

- [x] Add `failureType` enum/union to executor result _(was already present: `'exit_code' | 'timeout' | 'tokens_exceeded' | 'unknown'`)_
- [x] Categorize failures in `executeCommand` _(done: timeout→'timeout', tokensExceeded→'tokens_exceeded', exitCode→'exit_code', unresolved→'unknown')_
- [x] Update `executeTask` to pass failureType through _(done: ExecutionResult includes failureType)_

## Phase 2: Circuit Breaker Integration

- [x] Update `recordCircuitFailure` mutation to accept `failureType`
- [x] Update circuit breaker queries to return `lastFailureType`
- [x] Update pivot-side orchestrator to pass `failureType` from `lastResult`

## Phase 3: Tests & Verification

- [x] Existing circuit breaker tests pass (12/12)
- [ ] Run `bun test convex/lib/*.test.ts` and `bun --cwd pivot test --run`
