# Spec: Tag Circuit Breaker Failures by SLA Breach Type

## Problem

When a task exceeds `maxExecutionMs` or `maxTokens`, the executor records a failure but the circuit breaker treats it as a generic failure. There is no differentiation between SLA timeout breaches, SLA token breaches, and other failure types (e.g. process crash, non-zero exit code).

## Impact

- Ops dashboard cannot distinguish SLA violations from other failures
- Auto-remediation cannot apply SLA-specific policies (e.g. extend timeout for slow tasks, switch to lighter model for token-heavy tasks)
- Retrospective analysis groups all failures together, missing actionable patterns

## Solution

1. In `executor.ts`, tag failures with `failureType`:
   - `'sla_timeout'` when `timedOut === true`
   - `'sla_tokens'` when `tokensExceeded === true`
   - `'exit_code'` when `exitCode !== 0`
   - `'crash'` for uncaught spawn errors
2. Pass `failureType` to `recordCircuitFailure` in the circuit breaker module
3. Update `circuitBreakers.ts` query to surface SLA-specific failure rates

## Acceptance Criteria

- [ ] Executor categorizes every failure into a typed `failureType`
- [ ] `recordCircuitFailure` stores `failureType` alongside existing metadata
- [ ] Circuit breaker query exposes timeout vs token vs other failure counts
- [ ] Existing circuit breaker tests still pass

## Scope

- `pivot/src/orchestrator/executor.ts`
- `convex/circuitBreakers.ts`
- `pivot/src/policy/circuitBreaker.ts` (if it exists)
