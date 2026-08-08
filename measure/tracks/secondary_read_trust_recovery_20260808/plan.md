# Plan: Secondary read trust recovery

## Phase 1: Contract & Schema Definition

_Blast radius: `useSprintHistory` (1 production page caller), `useAuditEvents` (Diagnose plus compatibility barrels/tests; 4 incoming graph edges), `AgentHeatmap` (1 dashboard caller), `useAgentUtilization` (2 incoming graph edges). `listProjectTemplatesHandler` is absent from graph symbol results despite being present in source, matching the known graph-audit limitation._

- [x] Task 1.1: Capture live failure contracts and bound the P1 recovery scope
  - [x] Probe History, Audit, Analytics, and Templates against the running local Convex backend
  - [x] Preserve exact failures and no-data semantics in `spec.md` and `test-strategy.md`
- [x] Task 1.2: Define honest read-state and project-selection contracts
  - [x] Loading, loaded-empty, loaded-data, and error are distinct
  - [x] Sole imported project is selected without an empty sentinel ID/slug
  - [x] No verification step mutates project, template, sprint, or agent state

## Phase 2: Test

_Blast radius: History spans three pages and `convex/history/*`; Diagnose spans two Convex-data hooks; Analytics spans six charts and shared pure computations; wildcard routing is centralized in `frontend/src/router.tsx`._

- [x] Task 2.1: Add History validator and selection regressions
  - [x] Imported task fields pass the declared return contract
  - [x] Sprint/task pages select the sole imported project and settle finitely
- [x] Task 2.2: Add Diagnose public-function and project-scope regressions
  - [x] Audit hook targets `audit:listAuditEventsHandler`
  - [x] Reconciliation proposals receive the real selected slug
- [x] Task 2.3: Add Analytics no-data and wildcard-route regressions
  - [x] Empty arrays render labeled empty content, not spinners
  - [x] No-source computations do not fabricate dated zero observations
  - [x] Unknown URL renders 404 and preserves the attempted path

## Phase 3: Implement

- [x] Task 3.1: Repair History selection and imported task contracts
  - [x] Resolve selected/sole project before history queries
  - [x] Align `listTaskHistoryHandler` returns with imported task documents
  - [x] Preserve truthful no-sprint/no-agent states
- [x] Task 3.2: Repair Diagnose query wiring and finite states
  - [x] Use the implemented public audit handler name
  - [x] Scope reconciliation reads to the selected project
  - [x] Surface loaded empty/error states without permanent loading
- [x] Task 3.3: Repair Analytics empty-observation semantics
  - [x] Render empty utilization and bottleneck cards honestly
  - [x] Return no time buckets when the underlying observation set is empty
  - [x] Preserve meaningful imported-task trend data
- [x] Task 3.4: Replace silent wildcard redirect with a real 404
  - [x] Show attempted path and Portfolio recovery link
  - [x] Preserve the unknown URL for diagnosis

## Phase 4: Generate Docs & Doctor

- [x] Task 4.1: Run focused and full automated gates
  - [x] Focused Red/Green suites pass
  - [x] Full Pivot and frontend tests pass
  - [x] Pivot/frontend TypeScript, frontend check, and production build pass
- [x] Task 4.2: Run one real-browser local-stack acceptance sweep
  - [x] All seven changed/verified routes settle without mocks or mutations
  - [x] No failed core responses, page errors, or permanent loading states
  - [x] Session evidence is recorded and browser is closed
- [x] Task 4.3: Synchronize graph and close the track truthfully
  - [x] Update `graph.db` for every changed TS/TSX file
  - [x] Run Measure Doctor and record residual pre-existing debt
  - [x] Update report, plan, metadata, and track registry only after acceptance

## Closeout evidence — 2026-08-08

### Shipped behavior

| Surface | Real-stack result |
| --- | --- |
| Sprint History | Selects the sole imported project and settles to `No sprint history`. |
| Task History | Returns imported catalog rows through the declared Convex validator; the live table renders `Task: Full test suite and build`. |
| Agent History | Settles to `No agent history`. |
| Diagnose | Uses `audit:listAuditEventsHandler`, scopes reconciliation to the selected project, and settles both empty sections. |
| Analytics | Empty utilization, hook, and session observations are labeled; no empty-source dated series or permanent spinners remain. |
| Project Templates | Uses `projectTemplates:listProjectTemplatesHandler` and settles to `No project templates yet.` |
| Unknown route | Preserves the attempted URL and renders a recoverable 404 with a Portfolio link. |

### Weak-test repairs

- Added a production-seam History integration test from project selection through the real hooks/query adapter to rendered rows.
- Replaced Diagnose page-hook mocks with real state hooks and added a direct Convex subscription-error callback test.
- Made the 404 regression resolve the production route table and assert the router location.
- Added a no-mock `@live` journey that rejects Convex errors, failed core responses, permanent loading, console/page errors, and read-side mutations.
- Corrected three stale live locators exposed by real Chrome: repeated imported task titles and two `CardTitle` elements that are visible text but not semantic headings.

### Verification

| Gate | Result |
| --- | --- |
| Live Chrome E2E | 2/2 `@live` journeys passed with one worker, system Chrome, no interception, no browser-harness/Kimi. |
| Focused frontend regressions | 43/43 passed. |
| Focused Convex History + Analytics | 79/79 passed with anonymous bootstrap enabled for query tests. |
| Full frontend Vitest | 1,244/1,244 passed across 170 files. |
| Full Pivot Bun tests | 1,664/1,664 passed across 143 files; required normal access to `~/.measure-fleet/wal`. |
| Static gates | Frontend check, root lint, Pivot typecheck, and frontend production build passed. |
| Graph | Updated for every changed TS/TSX file; 5,385 nodes, 7,323 edges, 673 files. |

### Residual debt kept visible

- `build-graph audit` remains noisy and exits 1: 258 orphan edges are dominated by generated Convex `.d.ts` and CSS targets, plus field/route stale-symbol warnings. This is the known scanner-quality problem in GitHub issue #2, not evidence for deleting runtime code.
- The full frontend suite passes but emits many React `act(...)` warnings and four Vitest hoisted-mock deprecation warnings from `frontend/src/__fixtures__/convex-provider.tsx`. These are weak-test/tooling debt for the next cleanup sequence.
- The production build passes with a 1.36 MB main chunk warning. No code-splitting work was added to this repair track.
- The installed `agent-browser` skill has no executable on this host, and Playwright cannot download its bundled Chromium on Ubuntu 26.04. The committed config supports an explicit `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH`; acceptance used `/usr/bin/google-chrome`.
