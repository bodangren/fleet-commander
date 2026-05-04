# Specification — Enforce Contract Reliability Constraints

## Background
Following the "Symphony Pivot" (ADR-003) and recent codebase audits, the orchestration loop successfully uses opencode as the exclusive execution harness and provisions contracts for every task. However, the system relies on the *honor system* to fulfill these contracts, allowing budget-burning hallucination loops, skipped tests, and spec drift. Contracts must act as strict cryptographic boundary enforcers.

## Objectives
1. **Context Continuity Enforcement:** Enforce the reuse of `sessionId` across recovery/retry cycles to eliminate context bloat.
2. **Assumption Binding:** Force the Reviewer to explicitly resolve the Architect's and Executor's blind spots.
3. **Strict SLAs:** Add and enforce `maxExecutionMs` and `maxTokens` at the contract creation level, forcefully terminating opencode if breached.
4. **Workflow Enforcement:** Reject executor outputs that modify code without modifying the `plan.md` (or `lessons-learned.md`), strictly binding the LLM to the "Measure" spec-driven workflow.
5. **Mandatory Testing:** Dynamically enforce test execution for `feat` and `bug` task types if non-test source files were changed.

## Acceptance Criteria
- **AC1:** Convex schema (`runContracts.ts`) includes `maxExecutionMs`, `maxTokens`, and `reviewerResolvedAssumptions: boolean`.
- **AC2:** If a `recoveryAction` is `retry`, the dispatcher validates that `sessionId` is preserved in the next iteration. If `split` or `replan`, `sessionId` is cleared.
- **AC3:** The Reviewer prompt natively interpolates `architectAssumptions` and `executorUnresolvedAssumptions`, requiring a explicit boolean output.
- **AC4:** Opencode execution terminates via `AbortController` (or equivalent OS kill signal) if `maxExecutionMs` or `maxTokens` is exceeded, immediately tripping the circuit breaker for that agent.
- **AC5:** A Bun-side validation layer in `orchestrator.ts` automatically rejects `appendExecutorOutput` if `changedFiles` contains source code but no test commands were run (for `feat`/`bug`), OR if `plan.md` was not updated.
- **AC6:** TD-032 is fixed (`executorConfidence` no longer mapped to duration in rollup stats).