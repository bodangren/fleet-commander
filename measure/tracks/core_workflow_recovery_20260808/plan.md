# Plan: Core workflow recovery

## Phase 1: Contract & Schema Definition

_Blast radius: DashboardPage (1 caller: `PortfolioRedirect.tsx`), useSprintPlanningRecommendation (2 callers), useFleetData (1 caller), registerSprintPlanningRoutes (3 callers). Graph lookup found the core integration files in `convex/dashboard.ts`, `convex/sprintPlanning.ts`, `pivot/src/routes/projects.ts`, and `frontend/src/hooks/useProjectView.ts`._

- [~] Task 1.1: Preserve the live audit and define the canonical recovery boundary
  - [x] Store the full route/API audit and durable fix priorities in `audit-report.md`
  - [x] Select classic bug-track format and record Convex-as-canonical ownership
  - [ ] Confirm one canonical HTTP project-identity rule and one task catalog
- [ ] Task 1.2: Define strict success and error contracts for core reads
  - [ ] Align Dashboard, Sprint Planning, and Performance return shapes with validators
  - [ ] Define slug-to-ID resolution at the Pivot boundary
  - [ ] Define visible frontend error states for failed reads

## Phase 2: Test

- [ ] Task 2.1: Add validator-drift regression tests
  - [ ] Dashboard task objects containing imported catalog fields
  - [ ] Sprint-planning backlog objects containing dependency metadata
  - [ ] Performance phase summaries containing sample counts
- [ ] Task 2.2: Add project navigation and catalog integration tests
  - [ ] Portfolio project link resolves through Project View
  - [ ] Project response exposes imported tracks/tasks
  - [ ] Planning and board use the same imported task catalog
- [ ] Task 2.3: Add a live, non-mocked core-route smoke
  - [ ] Assert no automatic scan/import during read-only navigation
  - [ ] Assert Dashboard, Project View, Planning, and Board leave loading states
  - [ ] Record live server/network evidence

## Phase 3: Implement

- [ ] Task 3.1: Repair core Convex response contracts
  - [ ] Dashboard validator/return parity
  - [ ] Sprint-planning validator/return parity
  - [ ] Performance phase-breakdown validator/return parity
- [ ] Task 3.2: Repair project identity and project-detail aggregation
  - [ ] Resolve slug or ID safely at the HTTP boundary
  - [ ] Return imported tracks/tasks required by Project View
  - [ ] Remove the current slug 500 and next-task 404 path mismatch
- [ ] Task 3.3: Connect Sprint Planning and Board to the canonical imported catalog
  - [ ] Render all eligible imported backlog tasks
  - [ ] Keep project/task counts consistent across Dashboard, Planning, Board, and Monitor
  - [ ] Preserve an honest pre-sprint state without starting a sprint
- [ ] Task 3.4: Remove read-side mutation and silent loading failures
  - [ ] Stop automatic `scan-and-import` in `useFleetData`
  - [ ] Keep explicit import/refresh behavior reachable
  - [ ] Render error/retry states for core hooks
- [ ] Task 3.5: Close immediate route-wiring defects
  - [ ] Register provider read routes or hide Providers
  - [ ] Fix the new-harness editor URL
  - [ ] Remove hardcoded `demo-project` from Quality pages
  - [ ] Make Project Templates fail explicitly or wire its public query

## Phase 4: Generate Docs & Doctor

- [ ] Task 4.1: Run focused and project-level verification
  - [ ] Focused regression tests
  - [ ] `bun --cwd pivot typecheck`
  - [ ] `bun run --cwd frontend test`
  - [ ] `bun run --cwd frontend check`
  - [ ] Live isolated-browser core-route smoke
- [ ] Task 4.2: Synchronize graph and durable documentation
  - [ ] Update `graph.db` for every changed source file
  - [ ] Run `bash measure/doctor.sh all`
  - [ ] Record exact pass/fail evidence and residual debt in this plan
  - [ ] Update metadata and tracks registry only after acceptance is green

