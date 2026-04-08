# E2E Testing Track

## Overview

Add Playwright-based end-to-end tests to verify frontend-backend integration. The current directive flags that many frontend functions are broken, requiring e2e coverage to catch integration issues that unit tests miss.

## Functional Requirements

- Install Playwright and configure for the React/Vite frontend
- Write e2e tests covering critical user flows: project creation, agent management, harness configuration, task execution
- Verify Convex backend mutations and queries work correctly from the frontend
- Add a test script to package.json

## Non-Functional Requirements

- Tests must run headless in CI
- Tests should be fast and deterministic
- Tests must clean up after themselves

## Acceptance Criteria

- [ ] Playwright installed and configured
- [ ] E2e tests for dashboard page (project listing)
- [ ] E2e tests for agent creation flow
- [ ] E2e tests for harness setup
- [ ] `npm run test:e2e` runs all e2e tests headlessly
- [ ] All e2e tests pass

## Out of Scope

- Visual regression testing
- Performance testing
- Load testing