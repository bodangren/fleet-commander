# Specification — Dispatch Hard Constraints (A3)

## Overview

The dispatcher LLM currently evaluates both eligibility (hard constraints) and ranking (soft scoring) in a single prompt. Move all hard constraints into deterministic Bun code. The LLM sees only pre-filtered candidates and is limited to tie-break / justification roles.

## Functional Requirements

- **FR1:** Implement `pivot/src/orchestrator/constraints.ts` exporting `filterEligibleTasks(tasks, context)`.
- **FR2:** Enforce these constraints deterministically:
  - dependency readiness (all deps satisfied)
  - not manually blocked
  - budget ceiling not exceeded
  - branch/worktree availability (no conflicts)
  - harness availability + capability match (uses A2 `harnessProfiles`)
  - repo cleanliness (no uncommitted conflict-blocking state)
  - review debt threshold (≤ N pending reviews per persona)
  - coverage regression gate (current coverage ≥ threshold, or task is a coverage-recovery task)
- **FR3:** Each filter produces a structured rejection reason when it excludes a task; reasons persist to `runContract.dispatchRejections[]`.
- **FR4:** Dispatcher agent prompt is reduced: receives top-N pre-filtered candidates, returns `chosenTaskId` + `justification` string only.
- **FR5:** Candidate count N is configurable (default 5).

## Acceptance Criteria

1. `constraints.ts` module implements each filter as a pure function with typed inputs.
2. Each filter has unit tests covering accept, reject, and edge cases.
3. `filterEligibleTasks` composes filters and returns `{ eligible, rejections }`.
4. Rejections are written into the run contract for the dispatch event.
5. Dispatcher prompt updated; orchestrator wires filter output as prompt input.
6. Integration test: task with unsatisfied dep is never shown to LLM.
7. Integration test: harness with `forbidden_task_classes` including the task's class is filtered out.
8. 80%+ coverage on new module; existing tests unaffected.

## Out of Scope

- Adaptive numeric scoring (B2).
- Stats rollups (B1).
- UI for inspecting rejections (A5).

## Tech Stack

- **Location:** `pivot/src/orchestrator/constraints.ts`
- **Depends on:** A2 `harnessProfiles` for capability/availability checks
- **Prompt:** Update `pivot/src/agents/dispatcher.ts` (or equivalent)
