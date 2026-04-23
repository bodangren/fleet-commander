# Specification: E2E Tests for TaskTimelinePage

## Overview

Add Playwright e2e test coverage for TaskTimelinePage, which is the only remaining frontend page without e2e tests. The current directive emphasizes that many frontend functions are broken and e2e tests are mandatory.

## Functional Requirements

1. **TaskTimelinePage e2e tests**: Test timeline stage rendering, keyboard navigation, and run contract display
2. **Fix broken functionality**: If any tests reveal broken functions, fix them during implementation

## Acceptance Criteria

- [ ] TaskTimelinePage has at least 2 e2e test cases
- [ ] All new tests pass against mock API layer
- [ ] Tests verify both happy path and error/empty states
- [ ] No regression in existing 21 e2e tests
- [ ] Any broken functionality discovered is fixed

## Out of Scope

- Visual regression testing
- Performance testing
- Mobile viewport testing
