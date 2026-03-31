# Specification - AI Sprint Planner

## Overview

Leverage the existing LLM scoring infrastructure (`internal/dispatcher/scorer.go` with `LLMScorer` and `BuildScoringPrompt`) to build an AI-assisted sprint planning feature. Given a backlog of unscheduled tasks, the system generates a sprint suggestion — grouping tasks by dependency and priority, estimating effort, and recommending duration. A human-in-the-loop workflow presents the suggestion for review and approval before creating the sprint. Depends on the Sprint Management track for sprint data model and API.

## Functional Requirements

- **FR1**: Analyze the unscheduled backlog and suggest a sprint composition — group tasks by dependency relationships and priority, propose a coherent sprint scope.
- **FR2**: Estimate task effort based on spec analysis (description length, subtask count) and historical completion data from past sprints.
- **FR3**: Recommend sprint duration based on aggregate estimated effort and configurable team capacity (tasks per week).
- **FR4**: Human-in-the-loop review — present the AI suggestion in the UI with editable fields (add/remove tasks, adjust dates, modify goal), then approve to create the sprint.
- **FR5**: Explanation of reasoning — each suggested task includes a brief rationale (why included, effort estimate basis, dependency consideration).

## Acceptance Criteria

1. `POST /api/projects/{id}/sprints/suggest` returns a sprint suggestion JSON with tasks, estimated effort, suggested duration, and per-task rationale.
2. Suggestion groups tasks that share dependencies and prioritizes critical-path tasks first.
3. Each suggested task includes an effort estimate and a one-sentence rationale.
4. Frontend displays the suggestion in an editable review form — tasks can be added/removed, dates adjusted, goal edited.
5. Approving the suggestion creates a sprint via the existing sprint creation API.
6. Rejecting or discarding returns to the backlog view with no side effects.
7. Historical sprint data (velocity from Sprint Management track) influences the effort and duration estimates.

## Out of Scope

- Autonomous sprint creation without human approval.
- Multi-sprint planning or release planning.
- Integration with external project management tools.
- Real-time streaming of LLM suggestions (batch response is sufficient).
