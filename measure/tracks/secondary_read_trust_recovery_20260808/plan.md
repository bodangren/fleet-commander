# Plan: Secondary read trust recovery

## Phase 1: Contract & Schema Definition

_Blast radius: `useSprintHistory` (1 production page caller), `useAuditEvents` (Diagnose plus compatibility barrels/tests; 4 incoming graph edges), `AgentHeatmap` (1 dashboard caller), `useAgentUtilization` (2 incoming graph edges). `listProjectTemplatesHandler` is absent from graph symbol results despite being present in source, matching the known graph-audit limitation._

- [x] Task 1.1: Capture live failure contracts and bound the P1 recovery scope
  - [x] Probe History, Audit, Analytics, and Templates against the running local Convex backend
  - [x] Preserve exact failures and no-data semantics in `spec.md` and `test-strategy.md`
- [ ] Task 1.2: Define honest read-state and project-selection contracts
  - [ ] Loading, loaded-empty, loaded-data, and error are distinct
  - [ ] Sole imported project is selected without an empty sentinel ID/slug
  - [ ] No verification step mutates project, template, sprint, or agent state

## Phase 2: Test

_Blast radius: History spans three pages and `convex/history/*`; Diagnose spans two Convex-data hooks; Analytics spans six charts and shared pure computations; wildcard routing is centralized in `frontend/src/router.tsx`._

- [ ] Task 2.1: Add History validator and selection regressions
  - [ ] Imported task fields pass the declared return contract
  - [ ] Sprint/task pages select the sole imported project and settle finitely
- [ ] Task 2.2: Add Diagnose public-function and project-scope regressions
  - [ ] Audit hook targets `audit:listAuditEventsHandler`
  - [ ] Reconciliation proposals receive the real selected slug
- [ ] Task 2.3: Add Analytics no-data and wildcard-route regressions
  - [ ] Empty arrays render labeled empty content, not spinners
  - [ ] No-source computations do not fabricate dated zero observations
  - [ ] Unknown URL renders 404 and preserves the attempted path

## Phase 3: Implement

- [ ] Task 3.1: Repair History selection and imported task contracts
  - [ ] Resolve selected/sole project before history queries
  - [ ] Align `listTaskHistoryHandler` returns with imported task documents
  - [ ] Preserve truthful no-sprint/no-agent states
- [ ] Task 3.2: Repair Diagnose query wiring and finite states
  - [ ] Use the implemented public audit handler name
  - [ ] Scope reconciliation reads to the selected project
  - [ ] Surface loaded empty/error states without permanent loading
- [ ] Task 3.3: Repair Analytics empty-observation semantics
  - [ ] Render empty utilization and bottleneck cards honestly
  - [ ] Return no time buckets when the underlying observation set is empty
  - [ ] Preserve meaningful imported-task trend data
- [ ] Task 3.4: Replace silent wildcard redirect with a real 404
  - [ ] Show attempted path and Portfolio recovery link
  - [ ] Preserve the unknown URL for diagnosis

## Phase 4: Generate Docs & Doctor

- [ ] Task 4.1: Run focused and full automated gates
  - [ ] Focused Red/Green suites pass
  - [ ] Full Pivot and frontend tests pass
  - [ ] Pivot/frontend TypeScript, frontend check, and production build pass
- [ ] Task 4.2: Run one real-browser local-stack acceptance sweep
  - [ ] All seven changed/verified routes settle without mocks or mutations
  - [ ] No failed core responses, page errors, or permanent loading states
  - [ ] Session evidence is recorded and browser is closed
- [ ] Task 4.3: Synchronize graph and close the track truthfully
  - [ ] Update `graph.db` for every changed TS/TSX file
  - [ ] Run Measure Doctor and record residual pre-existing debt
  - [ ] Update report, plan, metadata, and track registry only after acceptance
