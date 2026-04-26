# Specification — Run Contract Protocol (A1)

## Overview

Replace implicit stage handoffs with typed, validated Run Contracts. Every dispatched task produces a `runContract` record that captures objective, scope, acceptance criteria, and per-stage structured outputs (architect, executor, reviewer, recovery). Bun validates contract shape before Convex state transitions.

This is the load-bearing track for Phase B. Historical failure classification (used by B1 `dispatchPolicyStats`) requires structured reviewer output with issue-class tags, not prose.

## Problem

- Prompts emit freeform markdown; downstream code re-parses heuristically.
- Recent tech debt (TD-003, TD-004, TD-008, TD-023) all trace to implicit handoff state.
- Recovery cannot distinguish task ambiguity from harness failure from spec conflict because the signals are unstructured.

## Functional Requirements

- **FR1:** Define TypeScript types + JSON schemas for `RunContract`, `ArchitectOutput`, `ExecutorOutput`, `ReviewerOutput`, `RecoveryOutput` in `src/shared/runContract.ts`.
- **FR2:** Persist `runContracts` table in Convex keyed by `taskId`, with one record per dispatch.
- **FR3:** Bun validator rejects invalid stage outputs before writing to Convex; invalid output creates a structured recovery event, not a silent fallback.
- **FR4:** Migrate architect, executor, reviewer prompts in `pivot/src/agents/` to request structured output matching the schemas.
- **FR5:** Reviewer output MUST include `issueClass` ∈ {correctness, security, performance, style, spec_mismatch} and `severity` ∈ {blocker, major, minor}.
- **FR6:** Executor output MUST include `changedFiles[]`, `testsRun[]`, `unresolvedAssumptions[]`, `confidence` (0–1), `branch`, `commit`.
- **FR7:** Recovery output MUST be an enum action: retry | escalate | split | replan | human_review, with `reason`.

## Acceptance Criteria

1. `src/shared/runContract.ts` exports types + Zod (or equivalent) validators for all five contract shapes.
2. Convex `runContracts` table schema exists and is indexed by `taskId` and `createdAt`.
3. `pivot/src/orchestrator/runContract.ts` module exposes `validateAndPersist(stage, output)` that throws on schema mismatch.
4. Orchestrator flow writes architect/executor/reviewer/recovery outputs through the validator on every task dispatch.
5. Existing prompts are updated; agents emit JSON blocks the validator accepts.
6. Schema mismatch produces a `recovery: human_review` event (not a crash) and logs the raw output for debugging.
7. 80%+ coverage on new validator module; integration test covers full architect→executor→reviewer→recovery round trip.
8. Existing 240+ pivot tests still pass.

## Out of Scope

- Rollup metrics (deferred to B1).
- UI rendering of contracts (deferred to A5).
- Learned policy from contract history (deferred to B2).
- Back-filling contracts for historical tasks.

## Tech Stack

- **Schema:** Zod in `src/shared/` (already used elsewhere)
- **Storage:** Convex `runContracts` table
- **Validation:** Bun-side in `pivot/src/orchestrator/`
- **Types:** Generated from Zod via `z.infer`
