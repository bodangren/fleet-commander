# Implementation Plan - Fix stats.ts Type Errors

## Phase 1: Fix Type Errors

- [ ] Task: Change `'completed'` to `'succeeded'` on line 60 in `getAgentStats`
- [ ] Task: Change `blocked` field to `triaged` in `getIssueStats` return type and handler (lines 79, 87)
- [ ] Task: Verify frontend build passes: `cd frontend && npm run build`
- [ ] Task: Verify frontend tests pass: `cd frontend && npm test`

## Phase 2: Verification

- [ ] Task: Run full `npm run check` from project root
- [ ] Task: Update plan.md checkboxes
