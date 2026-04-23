# Specification: E2E Tests for Untested Frontend Pages

## Overview

Add Playwright e2e test coverage for frontend pages that currently lack e2e tests. The directive identifies broken frontend functions that need testing. Currently 13 e2e tests exist covering agents, coverage, dashboard, harnesses, ops, pipelines, project, and settings pages. Five pages remain untested: SimulatePage, Reconcile, TaskTimelinePage, AgentEditorPage, and HarnessEditorPage.

## Functional Requirements

1. **SimulatePage e2e tests**: Test policy simulation form submission, report display, delta formatting, divergence table rendering
2. **Reconcile e2e tests**: Test reconciliation proposal list, expand/collapse details, apply/reject actions
3. **TaskTimelinePage e2e tests**: Test timeline stage expansion, keyboard navigation (j/k), run contract display
4. **AgentEditorPage e2e tests**: Test agent creation/editing form, field validation, save action
5. **HarnessEditorPage e2e tests**: Test harness creation/editing form, capability configuration, save action

## Acceptance Criteria

- [ ] Each untested page has at least 2 e2e test cases
- [ ] All new tests pass against mock API layer
- [ ] Tests verify both happy path and error/empty states
- [ ] No regression in existing 13 e2e tests
- [ ] Any broken functionality discovered is fixed

## Out of Scope

- Visual regression testing
- Performance testing
- Mobile viewport testing
