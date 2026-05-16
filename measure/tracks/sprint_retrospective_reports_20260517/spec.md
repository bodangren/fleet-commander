# Sprint Retrospective Reports

## Problem

Fleet Commander supports sprint planning and execution but has no retrospective capability. After closing a sprint, managers have no automated summary of what was accomplished, what went wrong, or how velocity changed. This is a core Scrum workflow gap.

## Goals

1. Auto-generate retrospective report when sprint is closed
2. Include: completed tasks, carry-over items, velocity comparison, blocker summary
3. Per-employee contribution breakdown
4. Actionable recommendations for next sprint based on patterns

## Non-Goals

- AI-generated narrative summaries (structured data only, no LLM calls)
- Cross-project retrospective aggregation
- Real-time report updates (generated once at sprint close)

## Acceptance Criteria

- [ ] `convex/sprints.ts` has `generateRetrospective` mutation triggered on sprint close
- [ ] Report includes: completed count, carry-over count, velocity delta, top blockers
- [ ] Frontend `SprintRetrospective` component renders report in a readable format
- [ ] Report is persisted as a document (re-viewable later)
- [ ] 10+ unit tests for retrospective generation logic
- [ ] E2E test: close sprint → report appears → data is accurate
