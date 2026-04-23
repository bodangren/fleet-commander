# Implementation Plan: E2E Tests for Untested Frontend Pages

## Phase 1: SimulatePage & Reconcile Tests

- [ ] Task: Write e2e tests for SimulatePage
    - [ ] Test simulation form renders with window days input and weights textarea
    - [ ] Test form submission triggers onRun callback and displays report
    - [ ] Test empty state when no report exists
- [ ] Task: Write e2e tests for Reconcile
    - [ ] Test proposal list renders with status badges
    - [ ] Test expand/collapse shows patch details
    - [ ] Test apply/reject buttons trigger callbacks
- [ ] Task: Run tests and fix any broken functionality

## Phase 2: TaskTimelinePage & Editor Tests

- [ ] Task: Write e2e tests for TaskTimelinePage
    - [ ] Test timeline stages render (dispatch, architect, executor, reviewer, recovery)
    - [ ] Test j/k keyboard navigation between stages
    - [ ] Test loading and error states
- [ ] Task: Write e2e tests for AgentEditorPage
    - [ ] Test agent form fields render (name, model, persona)
    - [ ] Test form validation for required fields
    - [ ] Test save action submits form data
- [ ] Task: Write e2e tests for HarnessEditorPage
    - [ ] Test harness form fields render (name, capabilities)
    - [ ] Test capability toggle interactions
    - [ ] Test save action submits form data
- [ ] Task: Run tests and fix any broken functionality

## Phase 3: Verification

- [ ] Task: Run full Playwright test suite (all tests must pass)
- [ ] Task: Run frontend unit tests (no regressions)
- [ ] Task: Update tracks.md with completed track
