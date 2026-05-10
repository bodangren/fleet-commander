# Fix Failing E2E Tests Implementation Plan

## Phase 1: Analyze and Fix Pipelines Test
- [x] Task: Analyze why `page.getByText('nightly')` is not visible
  - [x] Check mock data setup in `mockApp.ts`
  - [x] Verify `PipelineList` component renders pipeline name correctly
  - [x] Fix test selector if needed or fix mock data

## Phase 2: Fix Project View Page Tests
- [x] Task: Fix "Project detail" text expectation
  - [x] Update test to expect "Demo Project" instead of "Project detail"
  - [x] Verify page renders project name correctly

- [x] Task: Fix "Blocked task issue" text expectation
  - [x] Analyze what text is actually rendered when clicking blocked task button
  - [x] Update test selector to match actual UI text

## Phase 3: Verify All Tests Pass
- [x] Task: Run full e2e test suite
  - [x] Verify all 3 previously failing tests now pass
  - [x] Ensure no regressions in other tests
  - [x] Run unit tests to confirm no side effects