# Frontend E2E Fixes — Implementation Plan

## Phase 1: Fix Broken Frontend Functions

- [x] Fix PipelinesPage dead state
  - [x] Restore `setSelectedExecutionId` setter in `PipelinesPage.tsx`
  - [x] Add click handler on execution list items to set `selectedExecutionId`
  - [x] Verify `PipelineLogs` renders when execution is selected
  - [ ] Write unit test for PipelinesPage with execution selection flow
- [x] Fix OpsPage duplicate routes
  - [x] Remove `ReconcilePanel` and `SimulatePage` imports from `OpsPage.tsx`
  - [x] Remove inline rendering of reconcile/simulate from OpsPage
  - [x] Verify `/ops/reconcile` and `/ops/simulate` routes still work independently
  - [x] Run e2e tests for ops, reconcile, and simulate pages
- [x] Fix ProjectViewPage test (button text changed to TRIGGER_RUN)

## Phase 2: Add Missing Unit Tests

- [ ] Write tests for `usePipelineData` hook
  - [ ] Test loading state
  - [ ] Test error state
  - [ ] Test successful data fetch
- [ ] Write tests for `useAgentForm` hook
  - [ ] Test form state initialization
  - [ ] Test validation
  - [ ] Test submit flow
- [ ] Write tests for `useHarnessForm` hook
  - [ ] Test form state initialization
  - [ ] Test validation
  - [ ] Test submit flow
- [ ] Write tests for `useProjectView` hook
  - [ ] Test project data loading
  - [ ] Test task filtering
- [ ] Write tests for `useTaskReview` hook
  - [ ] Test review data loading
  - [ ] Test error handling
- [ ] Write tests for `TaskTimelinePage`
  - [ ] Test keyboard navigation (j/k/Enter)
  - [ ] Test stage toggle state
  - [ ] Test empty state rendering
- [ ] Write tests for `SettingsPage`
  - [ ] Test settings load
  - [ ] Test settings save

## Phase 3: Verify E2E Coverage

- [ ] Audit `mockApp.ts` handlers against actual API routes
  - [ ] Ensure every page's critical API paths are mocked
  - [ ] Add missing mock handlers if any page's e2e test hits unmocked routes
- [ ] Run full e2e suite: `bun --cwd frontend test:e2e`
- [ ] Run full unit test suite: `bun --cwd frontend test`
- [ ] Run type check: `bun --cwd frontend check`
- [ ] Start dev server, verify app launches, take screenshot
- [ ] Commit checkpoint
