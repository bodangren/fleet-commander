# Plan: Tag Circuit Breaker Failures by SLA Breach Type

## Phase 1: Executor Failure Typing

- [ ] Add `failureType` enum/union to executor result
- [ ] Categorize failures in `executeCommand`: sla_timeout, sla_tokens, exit_code, crash
- [ ] Update `executeTask` to pass failureType through

## Phase 2: Circuit Breaker Integration

- [ ] Update `recordCircuitFailure` mutation to accept `failureType`
- [ ] Update circuit breaker query to aggregate by failure type
- [ ] Update any pivot-side circuit breaker client code

## Phase 3: Tests & Verification

- [ ] Add circuit breaker tests for typed failures
- [ ] Run `bun test convex/lib/*.test.ts` and `bun --cwd pivot test --run`
