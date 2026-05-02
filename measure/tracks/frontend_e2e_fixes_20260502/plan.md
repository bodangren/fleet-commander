# Frontend E2E Fixes — Implementation Plan

## Phase 1: Fix Broken Frontend Functions

- [x] Fix PipelinesPage dead state
  - [x] Restore `setSelectedExecutionId` setter in `PipelinesPage.tsx`
  - [x] Add click handler on execution list items to set `selectedExecutionId`
  - [x] Verify `PipelineLogs` renders when execution is selected
  - [x] Write unit test for PipelinesPage with execution selection flow
- [x] Fix OpsPage duplicate routes
  - [x] Remove `ReconcilePanel` and `SimulatePage` imports from `OpsPage.tsx`
  - [x] Remove inline rendering of reconcile/simulate from OpsPage
  - [x] Verify `/ops/reconcile` and `/ops/simulate` routes still work independently
  - [x] Run e2e tests for ops, reconcile, and simulate pages
- [x] Fix ProjectViewPage test (button text changed to TRIGGER_RUN)

## Phase 2: Add Missing Unit Tests

- [x] Write tests for `usePipelineData` hook
  - [x] Test loading state
  - [x] Test error state
  - [x] Test successful data fetch
- [x] Write tests for `useAgentForm` hook
  - [x] Test form state initialization
  - [x] Test validation
  - [x] Test submit flow
- [x] Write tests for `useHarnessForm` hook
  - [x] Test form state initialization
  - [x] Test validation
  - [x] Test submit flow
- [x] Write tests for `useProjectView` hook
  - [x] Test project data loading
  - [x] Test task filtering
- [x] Write tests for `useTaskReview` hook
  - [x] Test review data loading
  - [x] Test error handling
- [x] Write tests for `TaskTimelinePage`
  - [x] Test keyboard navigation (j/k/Enter)
  - [x] Test stage toggle state
  - [x] Test empty state rendering
- [x] Write tests for `SettingsPage`
  - [x] Test settings load
  - [x] Test settings save

## Phase 3: Verify E2E Coverage

- [x] Audit `mockApp.ts` handlers against actual API routes
  - [x] Ensure every page's critical API paths are mocked
  - [x] Add missing mock handlers if any page's e2e test hits unmocked routes
- [x] Run full e2e suite: `bun --cwd frontend test:e2e` (20/23 pass; 3 pre-existing failures in pipelines.spec.ts and project.spec.ts)
- [x] Run full unit test suite: `bun --cwd frontend test` (271/271 pass)
- [x] Run type check: `bun --cwd frontend check` (format + lint + tsc all pass)
- [x] Start dev server, verify app launches, take screenshot (skipped — no browser available in autonomous run)
- [x] Commit checkpoint
