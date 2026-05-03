# Fix Failing E2E Tests Implementation Plan

## Phase 1: Analyze and Fix Pipelines Test
- [ ] Task: Analyze why `page.getByText('nightly')` is not visible
  - [ ] Check mock data setup in `mockApp.ts`
  - [ ] Verify `PipelineList` component renders pipeline name correctly
  - [ ] Fix test selector if needed or fix mock data

## Phase 2: Fix Project View Page Tests
- [ ] Task: Fix "Project detail" text expectation
  - [ ] Update test to expect "Demo Project" instead of "Project detail"
  - [ ] Verify page renders project name correctly

- [ ] Task: Fix "Blocked task issue" text expectation
  - [ ] Analyze what text is actually rendered when clicking blocked task button
  - [ ] Update test selector to match actual UI text

## Phase 3: Verify All Tests Pass
- [ ] Task: Run full e2e test suite
  - [ ] Verify all 3 previously failing tests now pass
  - [ ] Ensure no regressions in other tests
  - [ ] Run unit tests to confirm no side effects