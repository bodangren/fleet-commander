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

- [x] Task 2.1: Add project identity and scoped-run regressions
  - [x] Prove active project loading does not require a nonexistent status field
  - [x] Prove slug resolves to the correct ID/path and `/api/projects/:slug/run` is registered and scoped
- [x] Task 2.2: Replace fabricated agent/harness confidence with behavior tests
  - [x] Execute the agent-test handler and reject absent Pi, harness/model mapping, and failed provider probe
  - [x] Prove provider/model discovery uses the Pi roster rather than the removed Convex harness table
- [x] Task 2.3: Add atomic one-task sprint regressions
  - [x] Reject empty, duplicate, cross-project, non-backlog, inactive/saturated-agent, dependency, and budget violations
  - [x] Prove every rejection leaves sprint/task state unchanged and success changes exactly one task
- [x] Task 2.4: Add a production-seam bounded-cycle integration test
  - [x] Resolve real project shape, select at most one eligible task, pass preflight, claim once, and persist one terminal run
  - [x] Prove preflight failure causes no claim or Pi spawn

## Phase 3: Implement the narrow activation path

- [x] Task 3.1: Canonicalize project identity for orchestration
  - [x] Remove phantom project-status filtering and slug/ID/name mixing
  - [x] Use the stored project path for git/quality execution
  - [x] Register the existing Project View manual-run contract for exactly one project
- [x] Task 3.2: Make Pi the truthful agent configuration source
  - [x] Replace stale harness/OpenCode discovery on the editor path with installed Pi roster/model data
  - [x] Make binary/model/readiness results real and remove hard-coded success
  - [x] Align agent save/update behavior with durable schema fields
- [x] Task 3.3: Make sprint creation atomic and one-task bounded
  - [x] Replace the two-mutation route with one validated Convex mutation
  - [x] Select no task by default and enforce a single explicit selection
  - [x] Show actionable failures without leaving an empty active sprint
- [x] Task 3.4: Execute and expose one bounded project cycle
  - [x] Run preflight before claim/spawn and cap the acceptance cycle at one task
  - [x] Return and render selected task plus terminal outcome
  - [x] Persist and re-read run/log/status/receipt/cost evidence when produced

## Phase 4: Real acceptance and closeout

- [x] Task 4.1: Run focused and full automated gates
  - [x] Focused Convex, Pivot, frontend, and integration contracts pass
  - [x] Full Pivot/frontend suites, type checks, lint/check, and production build pass
    - [x] Pivot 1,710/1,710 and Pivot typecheck are green.
    - [x] Definitive frontend Vitest passed 1,237 tests across 168 files; frontend check and production build exited 0.
- [ ] Task 4.2: Run one no-mock Chrome journey against the local stack
  - [ ] Save/read one Pi-compatible agent and verify truthful readiness
  - [ ] Create exactly one sprint assignment and prove no collateral task mutation
  - [ ] Trigger exactly one project cycle and observe a terminal result with continuous mode still off
- [~] Task 4.3: Synchronize graph and close the track truthfully
  - [x] Update `graph.db` for every changed TypeScript/TSX file
  - [x] Run Measure Doctor and preserve pre-existing/tooling failures
  - [x] Update the durable audit report, plan, and metadata before acceptance
  - [ ] Update final evidence and registry after acceptance

## Verification evidence — 2026-08-08

### Weak tests repaired

- `live-core.spec.ts` now waits for a positive, data-backed settled state before asserting that loading and error UI are absent. The former negative-first checks could pass before React mounted and therefore passed while Dashboard and Project View were broken.
- The live project, planning, board, provider, templates, and quality checks now wait on imported task text, realtime readiness, honest board content, a real provider-health response, the real templates empty state, or project-scoped quality content.
- Exact-task UI tests now exercise refresh, failure, and double-trigger behavior instead of only asserting the happy path. Run receipts bind by `runId` and time window, with explicit `timeout`/`maxTokens` bounds.
- The harness tests no longer expect the deleted editable Convex harness model. They assert installed Pi catalog data, a read-only label, no edit action, and redirects from both obsolete editor URLs.
- The factory acceptance follows the same rule: it waits for the selected imported task before checking that loading/error states are gone. It is tagged `@live @factory-acceptance` and skips unless `RUN_LIVE_FACTORY=1`, preventing ordinary live-suite runs from creating state.
- Production project-run tests cross the real resolver and `runProject` entry point. A test-only helper exposes the lower-level seam to unit tests, and an architecture guard prevents production imports or a second scheduler seam.
- Unit tests initially leaked into the live Convex WebSocket and produced unhandled errors even when assertions passed. Deterministic offline boundaries now isolate those tests: the focused suite is 13/13, three consecutive Luna runs completed with zero unhandled errors.
- A live harness race showed the UI rendering an empty state while the request was still loading. The harness surface now distinguishes loading, error, and settled-empty states; strengthened E2E binds the success path to HTTP 200 from `/api/harnesses`. Three focused runs passed 7/7, and the combined root run passed 9/9.

### Automated gates

- Pivot: 1,710/1,710 tests passed; Pivot typecheck passed.
- Focused Convex identity/sprint/task coverage passed 40/40, with direct-call warnings recorded as warnings rather than failures. Deterministic offline boundary coverage passed 13/13; three consecutive Luna runs completed with zero unhandled WebSocket errors.
- Restart contract coverage passed 2/2. An actual SIGKILL recovery restarted Pivot from PID 261372 to PID 261731 while Vite PID 261430 and Convex PID 261494 survived; the API returned 200 after recovery.
- Definitive frontend Vitest: 1,237 tests passed across 168 files, exit 0, with zero unhandled Convex, undici, or WebSocket errors. Existing nonfatal `vi.mock`/`vi.fn`/`act`/error-boundary warnings remain.
- Frontend check exited 0. The production build exited 0 with the existing 1.35162 MB JavaScript chunk warning.
- The broader pre-existing Convex quarantine remains red with 146 failures under TD-263 and is not represented as green. Direct-call and other test-infrastructure warnings remain visible P2 follow-up.

### Graph and Doctor evidence — 2026-08-08

- Follow-up commits `c56b928d` and `4c8a8773` completed the source changes and incremental graph update. Final graph stats are 5,396 nodes, 7,604 edges, and 652 files. The graph audit exits 1 with 529 `orphan_edges`, dominated by generated Convex `.d.ts`/dependency targets plus schema/field/route noise; this remains tracked under issue #2.
- Final Measure Doctor passes the as-any, boundary, stub-mutation, and status-vocabulary checks. The remaining failures are the pre-existing `pivot/src/orchestrator/qualityWorkflowRunner.ts` line 516, pre-existing stale allowlist entries, and 63 reported orphan exports including `ProjectNextMission`, which is production-imported by `ProjectViewPage` and further demonstrates the known false-positive graph noise. `ProjectViewPage` was fixed from line 523 to 479.
- Graph synchronization and Doctor execution are complete and residual failures are preserved; the final evidence/registry item remains open until the bounded credentialed acceptance is authorized.

### Real browser evidence

- System Chrome (`/usr/bin/google-chrome`) passed the no-mock `live-core.spec.ts` against the running Vite -> Pivot -> Convex stack before recovery (1 passed, 54.0 seconds) and after recovery (1 passed, 35.2 seconds), including `/portfolio` -> imported project.
- System Chrome also passed `secondary-read-live.spec.ts` against the same real stack. Browser Harness and Kimi WebBridge were not used.
- Final real-Chrome `--grep @live --workers=1` aggregate after the exact fixes: 2 passed and 1 bounded-factory journey skipped in 1.0 minute. The bounded factory was skipped because `RUN_LIVE_FACTORY` was absent; the passing journeys were `live-core` and `secondary-read`.
- The credentialed factory acceptance has not run. It would create `factory-acceptance-luna`, atomically assign `Write schema validation tests for FrontendTask type`, invoke Pi with the configured OpenAI Codex credentials, and may modify/commit the imported repository. That requires explicit user approval.
- Current state remains unchanged: target repository clean, `agents=[]`, `activeSprint=null`, continuous mode `false`, zero dispatched tasks, and no mutating factory acceptance performed.
