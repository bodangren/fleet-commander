# Plan: Frontend bundle splitting — TD-269

This plan is intentionally implementation-ready but remains pending. Track
setup records the RED/baseline build only; no production/test code, generated
output, or `graph.db` is edited during planning.

## Phase 1: Baseline, RED contract, and blast radius

- [ ] Task 1.1: Re-run the baseline build from the implementation checkout
  - [ ] Run `bun run --cwd frontend build` (or the approved environment's
    equivalent) and capture transformed-module count, every emitted JS/CSS
    asset size, gzip sizes, exit code, and the 500 kB advisory.
  - [ ] Preserve the baseline values: 2,800 modules; largest JS
    1,354.26 kB / 382.84 kB gzip; advisory present; default threshold 500 kB.
- [ ] Task 1.2: Add a focused RED route-splitting contract before source edits
  - [ ] Assert the production router no longer has an eager import for each
    optional route family after Green; the pre-edit assertion must fail against
    the current 34 page imports.
  - [ ] Assert the build report is treated as RED while any minified JS chunk is
    over 500 kB or Vite prints the advisory; do not make this pass by changing
    the threshold.
- [ ] Task 1.3: Record the graph blast radius
  - [ ] Query `build-graph inspect ./graph.db router.tsx` and callers for the
    exported router/AppRoutes symbols before edits.
  - [ ] Confirm the current router has 41 outgoing graph edges and heavy static
    consumers include 12 Recharts files and one React Flow file. The plan
    owns frontend router/page imports only.

## Phase 2: Route-level Green implementation

- [ ] Task 2.1: Introduce the smallest lazy route boundary
  - [ ] Keep FleetLayout, shared providers, Portfolio/Dashboard/Project/
    Sprint Planning/Board, and their existing outlet context stable.
  - [ ] Convert optional route page entries to route-level dynamic imports (or
    the equivalent React Router lazy contract), preserving names, paths,
    redirects, and settings nesting.
  - [ ] Provide one finite loading/error boundary for chunk fetch failures;
    do not add arbitrary waits or a second global scheduler/data bootstrap.
- [ ] Task 2.2: Split only measured heavy tab modules if needed
  - [ ] Rebuild after Task 2.1 and inspect which chunks still exceed 500 kB.
  - [ ] If the core path remains over the boundary, dynamically load the
    Project View coverage/dependency/performance tab modules that import
    Recharts/React Flow, with the existing tab and data contracts intact.
  - [ ] Stop when the size oracle is green; do not split unrelated shared code.
- [ ] Task 2.3: Keep manual chunking out unless proven necessary
  - [ ] First prove route/module imports cannot meet the boundary, including a
    report of the offending module and route.
  - [ ] If a narrow `manualChunks` rule is genuinely required, document its
    ownership, deterministic mapping, and before/after sizes in the plan; do
    not create a broad vendor bucket or arbitrary hash/name policy.

## Phase 3: Focused tests and core behavior

- [ ] Task 3.1: Update focused route contracts
  - [ ] Keep `router.dashboard.test.tsx`, `router.fleet-bootstrap.test.tsx`,
    App route tests, and settings/history route tests meaningful with lazy
    elements; await semantic settled UI rather than testing only import calls.
  - [ ] Add focused coverage for lazy success and finite chunk-load failure if
    the implementation introduces a new boundary.
- [ ] Task 3.2: Run focused and unit frontend gates
  - [ ] Focused route/lazy command: `bun run --cwd frontend test --
    router.dashboard.test.tsx router.fleet-bootstrap.test.tsx App.routes.test.tsx`.
  - [ ] Full frontend unit command: `bun run --cwd frontend test`.
  - [ ] Frontend quality/typecheck command: `bun run --cwd frontend check`.
- [ ] Task 3.3: Run the production build size oracle
  - [ ] Run `bun run --cwd frontend build`; require exit 0, no over-500 kB
    advisory, and every emitted JS chunk at or below 500 kB minified.
  - [ ] Record raw and gzip sizes and verify no `chunkSizeWarningLimit` increase
    or warning suppression was added to `frontend/vite.config.ts`.

## Phase 4: Full-stack read-only proof and repository gates

- [ ] Task 4.1: Run real system Chrome with no mocks
  - [ ] Use `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/google-chrome` and
    `bun run --cwd frontend test:e2e:live -- e2e/live-core.spec.ts
    e2e/secondary-read-live.spec.ts --workers=1`.
  - [ ] Exercise the core Portfolio/Dashboard/Project/Planning/Board path and
    at least one lazy route in analytics/performance/history/operations/
    settings/retrospectives as applicable.
  - [ ] Observe chunk responses, page/console errors, failed API responses,
    settled loading/error states, and methods; require zero POST/PUT/PATCH/
    DELETE, route interception, seed/import, credentials, or factory actions.
- [ ] Task 4.2: Run repository checks
  - [ ] Run `npm run lint` and `git diff --check`.
  - [ ] Run `bash measure/doctor.sh all`; classify only pre-existing
    `qualityWorkflowRunner`, orphan, stale-allowlist, and graph-tooling debt.
- [ ] Task 4.3: Synchronize and audit the graph
  - [ ] Run `build-graph update ./graph.db` for every changed TS/TSX file,
    then `build-graph stats ./graph.db` and `build-graph audit ./graph.db`.
  - [ ] Record changed-file coverage and known issue #2 audit limitations;
    never scan directly into canonical `graph.db` for this track.
- [ ] Task 4.4: Close the track truthfully
  - [ ] Validate JSON/registry links and keep `measure/tech-debt.md` at exactly
    50 lines or fewer.
  - [ ] Mark complete only after clean-checkout acceptance reproduces the size,
    test, typecheck, build, Doctor, graph, and real-Chrome evidence.

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
