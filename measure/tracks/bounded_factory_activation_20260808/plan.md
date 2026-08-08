# Plan: Bounded factory activation

## Phase 1: Freeze the production contracts

- [x] Task 1.1: Audit the live agent, sprint, project, and Pi execution paths
  - [x] Capture current live state: one project, 67 backlog tasks, zero agents, zero sprints, continuous mode off
  - [x] Trace the production one-shot path through project resolution, claim, Pi spawn, and persistence
  - [x] Identify passing tests that mock or skip each broken boundary
- [x] Task 1.2: Bound the recovery to one project, one agent, one task, and one explicit run
  - [x] Keep continuous mode disabled
  - [x] Require fail-closed readiness and a clean/disposable execution target

## Phase 2: Red tests at real seams

- [ ] Task 2.1: Add project identity and scoped-run regressions
  - [ ] Prove active project loading does not require a nonexistent status field
  - [ ] Prove slug resolves to the correct ID/path and `/api/projects/:slug/run` is registered and scoped
- [ ] Task 2.2: Replace fabricated agent/harness confidence with behavior tests
  - [ ] Execute the agent-test handler and reject absent Pi, harness/model mapping, and failed provider probe
  - [ ] Prove provider/model discovery uses the Pi roster rather than the removed Convex harness table
- [ ] Task 2.3: Add atomic one-task sprint regressions
  - [ ] Reject empty, duplicate, cross-project, non-backlog, inactive/saturated-agent, dependency, and budget violations
  - [ ] Prove every rejection leaves sprint/task state unchanged and success changes exactly one task
- [ ] Task 2.4: Add a production-seam bounded-cycle integration test
  - [ ] Resolve real project shape, select at most one eligible task, pass preflight, claim once, and persist one terminal run
  - [ ] Prove preflight failure causes no claim or Pi spawn

## Phase 3: Implement the narrow activation path

- [ ] Task 3.1: Canonicalize project identity for orchestration
  - [ ] Remove phantom project-status filtering and slug/ID/name mixing
  - [ ] Use the stored project path for git/quality execution
  - [ ] Register the existing Project View manual-run contract for exactly one project
- [ ] Task 3.2: Make Pi the truthful agent configuration source
  - [ ] Replace stale harness/OpenCode discovery on the editor path with installed Pi roster/model data
  - [ ] Make binary/model/readiness results real and remove hard-coded success
  - [ ] Align agent save/update behavior with durable schema fields
- [ ] Task 3.3: Make sprint creation atomic and one-task bounded
  - [ ] Replace the two-mutation route with one validated Convex mutation
  - [ ] Select no task by default and enforce a single explicit selection
  - [ ] Show actionable failures without leaving an empty active sprint
- [ ] Task 3.4: Execute and expose one bounded project cycle
  - [ ] Run preflight before claim/spawn and cap the acceptance cycle at one task
  - [ ] Return and render selected task plus terminal outcome
  - [ ] Persist and re-read run/log/status/receipt/cost evidence when produced

## Phase 4: Real acceptance and closeout

- [ ] Task 4.1: Run focused and full automated gates
  - [ ] Focused Convex, Pivot, frontend, and integration suites pass
  - [ ] Full Pivot/frontend suites, type checks, lint/check, and production build pass
- [ ] Task 4.2: Run one no-mock Chrome journey against the local stack
  - [ ] Save/read one Pi-compatible agent and verify truthful readiness
  - [ ] Create exactly one sprint assignment and prove no collateral task mutation
  - [ ] Trigger exactly one project cycle and observe a terminal result with continuous mode still off
- [ ] Task 4.3: Synchronize graph and close the track truthfully
  - [ ] Update `graph.db` for every changed TypeScript/TSX file
  - [ ] Run Measure Doctor and preserve pre-existing/tooling failures
  - [ ] Update the durable audit report, plan, metadata, and registry after acceptance
