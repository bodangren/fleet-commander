# Specification: Tech Debt Remediation

## Overview

Systematically resolve all 12 open tech debt items (TD-024 through TD-059) in the tech-debt.md registry. These items span test infrastructure, performance, schema correctness, and dead code — collectively they degrade CI reliability, developer experience, and runtime performance.

## Functional Requirements

### 1. Test Infrastructure (TD-053, TD-056, TD-057)
- Create `frontend/src/__fixtures__/convex-provider.tsx` exporting `MockConvexProvider` and `renderWithProviders` for Convex subscription testing
- Extend `pivot/src/__fixtures__/convex-mock.ts` with a mock Convex client implementing `query()`, `mutation()`, `withIndex()`, `collect()` stubs
- Align fixture `Task` type with `orchestrator/types.ts` `Task` type (add `projectSlug`, `trackId`, `taskKey`, `dependencies`; remove `projectId`, `columnId`, `priority`)

### 2. Test Reliability (TD-038, TD-059)
- Fix `ProjectViewPage.test.tsx` hanging by ensuring all hook fetch paths resolve or timeout gracefully
- Fix 16/35 E2E tests failing by adding Convex mocking infrastructure to `setupMockApp` so components using `useConvexTasks` etc. receive mock data

### 3. Schema & Type Correctness (TD-024, TD-032)
- Document the offline `npx convex dev` workaround and add a script/codegen to regenerate `convex/_generated/api.d.ts`
- Either implement real `medianLatencyMs`/`averageTokens` from `workRuns` data or remove the schema fields

### 4. Performance (TD-029, TD-035)
- Replace 9x `.collect().length` in `getBootstrapSummary` with `.count()` or index-based counting
- Add a performance benchmark test that asserts a 90-day analytics query renders in <2s

### 5. Dead Code & Missing Features (TD-034, TD-036, TD-037)
- Wire up `issueState` rendering in `ProjectViewPage` so blocked-task issue details are visible
- Add hook failure markers to the completion trend chart
- Add e2e tests for analytics dashboard filter interactions (time range, project, agent, priority)

## Non-Functional Requirements

- All fixes must follow strict TDD: write tests first, then implement
- Existing tests must continue to pass after each phase
- Code coverage should not decrease; target >80% for new code
- Commits follow Conventional Commits with `fix(...)` or `chore(...)` scopes

## Acceptance Criteria

- [ ] All 12 TD items resolved and marked as such in `tech-debt.md`
- [ ] `bun --cwd pivot typecheck` passes
- [ ] `bun --cwd frontend check` passes (lint + typecheck)
- [ ] `bun --cwd pivot test` passes
- [ ] `bun --cwd frontend test` passes
- [ ] E2E tests no longer fail due to Convex unavailability
- [ ] `measure/doctor.sh` passes

## Out of Scope

- Upgrading Convex SDK or React versions
- Refactoring the overall test architecture beyond what's needed for these fixes
- Adding new features not listed in the TD items
