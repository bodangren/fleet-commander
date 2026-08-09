# Plan: Frontend bundle splitting — TD-269

This plan closed on 2026-08-09 after the measured route/module split and
read-only acceptance gates. The original RED/baseline evidence remains below;
the final evidence and the permitted core-boundary exception are recorded in
[closeout.md](./closeout.md).

## Phase 1: Baseline, RED contract, and blast radius

- [x] Task 1.1: Re-run the baseline build from the implementation checkout
  - [x] Run `bun run --cwd frontend build` (or the approved environment's
    equivalent) and capture transformed-module count, every emitted JS/CSS
    asset size, gzip sizes, exit code, and the 500 kB advisory.
  - [x] Preserve the baseline values: 2,800 modules; largest JS
    1,354.26 kB / 382.84 kB gzip; advisory present; default threshold 500 kB.
- [x] Task 1.2: Add a focused RED route-splitting contract before source edits
  - [x] Characterize the current 34 eager page imports and verify optional
    route families are lazy after Green; preserve their existing contracts.
  - [x] Treat the baseline build itself as RED while any minified JS chunk is
    over 500 kB or Vite prints the advisory; do not make this pass by changing
    the threshold.
- [x] Task 1.3: Record the graph blast radius
  - [x] Query `build-graph inspect ./graph.db router.tsx` and callers for the
    exported router/AppRoutes symbols before edits.
  - [x] Confirm the current router has 41 outgoing graph edges and heavy static
    consumers include 12 Recharts files and one React Flow file. The plan
    owns frontend router/page imports only.

## Phase 2: Route-level Green implementation

- [x] Task 2.1: Introduce the smallest lazy route boundary
  - [x] Keep FleetLayout, shared providers, Portfolio/Dashboard/Project/
    Sprint Planning/Board, and their existing outlet context stable.
  - [x] Convert optional route page entries to route-level dynamic imports (or
    the equivalent React Router lazy contract), preserving names, paths,
    redirects, and settings nesting.
  - [x] Provide one finite loading/error boundary for chunk fetch failures;
    do not add arbitrary waits or a second global scheduler/data bootstrap.
- [x] Task 2.2: Split only measured heavy tab modules if needed
  - [x] Rebuild after Task 2.1 and inspect which chunks still exceed 500 kB.
  - [x] If the core path remains over the boundary, dynamically load the
    Project View coverage/dependency/performance tab modules that import
    Recharts/React Flow, with the existing tab and data contracts intact.
  - [x] Stop when the size oracle is green; do not split unrelated shared code.
- [x] Task 2.3: Keep manual chunking out unless proven necessary
  - [x] First prove route/module imports cannot meet the boundary, including a
    report of the offending module and route.
  - [x] Confirm measured route/module splitting met the boundary, so no
    `manualChunks` rule was required; do not create a broad vendor bucket or
    arbitrary hash/name policy.

## Phase 3: Focused tests and core behavior

- [x] Task 3.1: Update focused route contracts
  - [x] Keep `router.dashboard.test.tsx`, `router.fleet-bootstrap.test.tsx`,
    App route tests, and settings/history route tests meaningful with lazy
    elements; await semantic settled UI rather than testing only import calls.
  - [x] Add focused coverage for lazy success and finite chunk-load failure if
    the implementation introduces a new boundary.
- [x] Task 3.2: Run focused and unit frontend gates
  - [x] Focused route/lazy command: `bun run --cwd frontend test --
    router.dashboard.test.tsx router.fleet-bootstrap.test.tsx App.routes.test.tsx`.
  - [x] Full frontend unit command: `bun run --cwd frontend test`.
  - [x] Frontend quality/typecheck command: `bun run --cwd frontend check`.
- [x] Task 3.3: Run the production build size oracle
  - [x] Run `bun run --cwd frontend build`; require exit 0, no over-500 kB
    advisory, and every emitted JS chunk at or below 500 kB minified.
  - [x] Record raw and gzip sizes and verify no `chunkSizeWarningLimit` increase
    or warning suppression was added to `frontend/vite.config.ts`.

## Phase 4: Full-stack read-only proof and repository gates

- [x] Task 4.1: Run real system Chrome with no mocks
  - [x] Use `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/google-chrome` and
    `bun run --cwd frontend test:e2e:live -- e2e/live-core.spec.ts
    e2e/secondary-read-live.spec.ts --workers=1`.
  - [x] Exercise the core Portfolio/Dashboard/Project/Planning/Board path and
    at least one lazy route in analytics/performance/history/operations/
    settings/retrospectives as applicable.
  - [x] Observe chunk responses, page/console errors, failed API responses,
    settled loading/error states, and methods; require zero POST/PUT/PATCH/
    DELETE, route interception, seed/import, credentials, or factory actions.
- [x] Task 4.2: Run repository checks
  - [x] Run `npm run lint` and `git diff --check`.
  - [x] Run `bash measure/doctor.sh all`; classify only pre-existing
    `qualityWorkflowRunner`, orphan, stale-allowlist, and graph-tooling debt.
- [x] Task 4.3: Synchronize and audit the graph
  - [x] Run `build-graph update ./graph.db` for every changed TS/TSX file,
    then `build-graph stats ./graph.db` and `build-graph audit ./graph.db`.
  - [x] Record changed-file coverage and known issue #2 audit limitations;
    never scan directly into canonical `graph.db` for this track.
- [x] Task 4.4: Close the track truthfully
  - [x] Validate JSON/registry links and keep `measure/tech-debt.md` at exactly
    50 lines or fewer.
  - [x] Mark complete after committed/integrated-checkout acceptance reproduced
    the size, test, typecheck, build, Doctor, graph, and real-Chrome evidence.

## Acceptance command set

```bash
bun run --cwd frontend test -- router.dashboard.test.tsx router.fleet-bootstrap.test.tsx App.routes.test.tsx
bun run --cwd frontend test
bun run --cwd frontend check
bun run --cwd frontend build
npm run lint
PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/google-chrome \
  bun run --cwd frontend test:e2e:live -- e2e/live-core.spec.ts e2e/secondary-read-live.spec.ts --workers=1
bash measure/doctor.sh all
build-graph update ./graph.db <changed-ts-files>
build-graph stats ./graph.db
build-graph audit ./graph.db
git diff --check
```

The Chrome command is observational only. It must not be replaced by mocked
E2E, route interception, seeded/imported state, or the credentialed factory
journey.

## Closeout evidence — 2026-08-09

- Baseline: because canonical `bun` was not on the shell PATH, the approved
  equivalent `cd frontend && /tmp/fleet-bun-baseline-package/package/bin/bun run build`
  transformed 2,800 modules and emitted an index asset of 1,354.26 kB
  minified / 382.84 kB gzip, with the unchanged Vite over-500 kB advisory.
- Final build: route/module lazy splitting still transformed 2,800 modules,
  emitted no advisory, and kept every JavaScript asset below 500 kB. The
  largest assets were `index` 436.04 kB / 135.39 kB gzip,
  `LineChart` 339.12 kB / 100.86 kB gzip, `DependencyGraph` 170.92 kB /
  55.17 kB gzip, and `ProjectViewPage` 70.70 kB / 16.97 kB gzip. No
  `manualChunks` rule or warning-threshold change was introduced.
- The original core-eager intent was measured rather than assumed. Dashboard,
  Project, Sprint Planning, and Board were kept eager initially; rebuilds then
  measured optional-only at approximately 1.12 MB, Project View tabs at
  approximately 563 kB, Dashboard/index at approximately 545 kB, and
  Board/Planning at approximately 518 kB. Those results justified the
  specification's permitted lazy-core exception. Existing route behavior was
  preserved, and the final Project route was reduced to approximately 436 kB.
- Frontend unit coverage passed 177 files / 1,301 tests in 145.70s with zero
  warning output. Forward/reverse route-focused coverage passed 4 files / 44;
  lazy-route coverage passed 15/15; Project View extraction coverage passed
  29/29. `npm run check` and `npm run lint` passed.
- Serial real system Chrome passed 7/7 in 26.4s across the agent-harness
  roster, fleet bootstrap, live-core, three lazy live journeys (including a
  real offline chunk failure), and secondary-read coverage. Source-aware
  telemetry recorded no mocks, interception, credentials, or writes; recovered
  `net::ERR_ABORTED` reads were counted only after matching successful reads.
- After final cleanup, `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/google-chrome npm run test:e2e:live -- e2e/route-lazy-loading-live.spec.ts --workers=1` passed 3/3 in 8.5s. The immediately prior invocation without the executable-path override failed before the browser test body because Playwright-managed Chromium is unavailable.
- Measure Doctor's new gates passed. The residual findings are pre-existing:
  one `pivot/src/orchestrator/qualityWorkflowRunner.ts` god-file at 516 lines,
  65 orphan exports plus stale-allowlist findings after concurrent final source
  cleanup, and no new `ProjectTabLoading` orphan.
- Incremental graph updates succeeded. Final stats after source cleanup were
  5,991 nodes / 8,314 edges / 744 files. `build-graph audit ./graph.db`
  produced no stdout or stderr for 90 seconds and was Ctrl-C stopped under
  known issue #2; the reproduction is recorded at [GitHub issue #2](https://github.com/bodangren/fleet-commander/issues/2#issuecomment-5229868421).
