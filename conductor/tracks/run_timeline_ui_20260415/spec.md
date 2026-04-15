# Specification — Run Timeline UI (A5)

## Overview

Given structured run contracts (A1) and deterministic dispatch rejections (A3), render a per-task timeline in the dashboard that is legible enough to debug an autonomous run without reading logs. This is the first concrete UX payoff from Phase A.

## Functional Requirements

- **FR1:** New route `/tasks/:taskId/timeline` in frontend.
- **FR2:** Timeline renders chronologically ordered rows, each keyed to a run contract stage: dispatch → architect → executor → reviewer → recovery.
- **FR3:** Dispatch row shows: candidate count, filter rejections (expandable), chosen task, LLM justification.
- **FR4:** Each subsequent stage row shows: stage name, status (pass/fail/retry), duration, key structured fields (e.g. executor's `changedFiles.length`, reviewer's `issueClass` + `severity`).
- **FR5:** Raw JSON output is collapsed by default, expandable per row.
- **FR6:** Live updates via Convex subscription while task is running.
- **FR7:** Empty-state handling: tasks predating A1 rollout show an "No run contract — legacy task" placeholder.

## Acceptance Criteria

1. `frontend/src/pages/TaskTimeline.tsx` component exists and is routed.
2. Convex subscription hook `useRunContract(taskId)` in `frontend/src/hooks/`.
3. Visual hierarchy distinguishes stages (icon + color per stage).
4. Filter-rejection expansion shows all rejection reasons with their constraint name.
5. Legacy tasks (no contract) render placeholder without crashing.
6. Keyboard nav: j/k moves between stages; Enter expands raw JSON (matches product-guidelines keyboard-first).
7. 72+ renderer tests still pass; new component has ≥ 80% coverage.
8. Storybook or equivalent demo entries for: happy path, rejection-heavy dispatch, reviewer failure, recovery escalation, legacy task.

## Out of Scope

- Cross-task queries (B4 Ops Console).
- Editing contract content from UI.
- Replay / re-run actions (C3).

## Tech Stack

- **React:** existing `frontend/` stack
- **Live updates:** Convex subscriptions (existing `useConvexData` pattern)
- **Styling:** existing component system; follow `product-guidelines.md` information density + keyboard-first
