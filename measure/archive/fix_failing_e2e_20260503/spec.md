# Fix Failing E2E Tests

## Background
Three e2e tests are currently failing in the frontend test suite. These tests verify critical user flows for the Pipelines and Project View pages. Fixing these tests is essential for ensuring the application's core functionality works correctly.

## Requirements

1. **Pipelines Page Test Failure:**
   - Test: `e2e/pipelines.spec.ts:5:3` - "trigger button starts a pipeline run"
   - Issue: Test expects `page.getByText('nightly')` to be visible but it's not found
   - Root cause analysis needed: Verify mock data is properly returned and component renders correctly

2. **Project View Page Test Failures:**
   - Test: `e2e/project.spec.ts:5:3` - "project-level feature buttons and tabs execute their flows"
   - Issue: Test expects `page.getByText('Project detail')` but page shows project name "Demo Project"
   - Test: `e2e/project.spec.ts:58:3` - "board interactions trigger blocked issue, review fetch, drag update, and log clear"
   - Issue: Test expects `page.getByText('Blocked task issue')` but it's not found

## Acceptance Criteria

1. All three failing e2e tests pass
2. No regressions in existing passing tests
3. Tests verify the actual UI behavior matches expected behavior
4. Mock data is properly aligned with what components actually render

## Out of Scope

- Adding new e2e test coverage
- Changing core component functionality
- Modifying the mock server infrastructure