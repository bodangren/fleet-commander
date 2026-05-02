# Frontend E2E Fixes

## Overview

Systematic fix of broken frontend functions discovered during codebase audit. The current directive mandates e2e test verification because many frontend functions are broken. This track fixes known broken patterns and adds missing test coverage to prevent regressions.

## Functional Requirements

1. **Fix PipelinesPage Dead State**
   - `PipelinesPage.tsx:6` discards the `setSelectedExecutionId` setter, making `selectedExecutionId` permanently `null`
   - The `PipelineLogs` component inside `{selectedExecutionId && ...}` is dead code
   - Fix: Wire up the setter so users can select executions and view logs

2. **Fix OpsPage Duplicate Routes**
   - `OpsPage` embeds `ReconcilePanel` and `SimulatePage` inline
   - Router also defines `/ops/reconcile` and `/ops/simulate` as separate routes
   - This causes duplicated API calls and inconsistent state
   - Fix: Remove inline embedding from OpsPage; let the separate routes handle rendering

3. **Add Missing Hook Unit Tests**
   - 6 of 7 hooks in `frontend/src/hooks/` lack unit tests
   - `useProjectView`, `usePipelineData`, `useAgentForm`, `useTaskReview`, `useHarnessForm` need test coverage
   - Target: at minimum test error handling and loading states

4. **Add Missing Page Unit Tests**
   - `TaskTimelinePage`, `PipelinesPage`, `SettingsPage` have no `.test.tsx`
   - `TaskTimelinePage` has complex keyboard navigation (`j`/`k`/`Enter`) that needs testing

5. **Verify E2E Mock Coverage**
   - All e2e tests share `mockApp.ts` which returns 404 for unhandled API routes
   - Verify each e2e test actually asserts on error states when API calls fail
   - Ensure mock handlers cover all critical API paths per page

## Data Sources

- `frontend/src/pages/` — page components
- `frontend/src/hooks/` — custom React hooks
- `frontend/e2e/` — Playwright e2e tests
- `frontend/e2e/helpers/mockApp.ts` — shared mock server

## Acceptance Criteria

- [ ] PipelinesPage: execution selection works, logs panel renders when execution selected
- [ ] OpsPage: no duplicate reconcile/simulate rendering
- [ ] All hooks have at least one unit test covering error and loading states
- [ ] TaskTimelinePage has unit tests for keyboard navigation
- [ ] All e2e tests pass with `bun --cwd frontend test:e2e`
- [ ] All unit tests pass with `bun --cwd frontend test`
- [ ] Frontend builds with `bun --cwd frontend check`

## Out of Scope

- Adding new frontend features or pages
- Refactoring component architecture beyond fixes
- Adding new API endpoints
- Visual design changes
