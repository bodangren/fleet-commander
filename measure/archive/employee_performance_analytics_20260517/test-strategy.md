# Test Strategy: Employee Performance Analytics

## 1. Testing Pyramid Per Phase

| Phase | Unit (fast, isolated) | Integration (module boundary) | E2E (browser) |
|-------|----------------------|-------------------------------|---------------|
| 1 — Data Model & Queries | Stat functions, schema validators, index correctness | Convex query returns shape, composite index hits | — |
| 2 — Regression Detection | Threshold logic, severity assignment | detectRegressions + alert creation end-to-end | — |
| 3 — Frontend Panel | Component renders, state transitions | useQuery wiring, chart data mapping | Panel loads in ProjectViewPage tab |
| 4 — Benchmark | — | 90-day query timing < 2s with synthetic data | — |

**Rule of thumb:** 80% unit, 15% integration, 5% E2E. Unit tests cover pure math; integration tests cover Convex function boundaries; one E2E test per acceptance criterion.

## 2. Shared Test Fixtures & Mocks

### Pivot (`pivot/src/__fixtures__/`)

- **`createMockConvexClient`** — reuse for `computeBaselines` and `detectRegressions` tests. Register handlers for `runs:queryByWindow`, `performanceBaselines:upsert`, `alerts:create`.
- **Synthetic run generator** — `makeFakeRun({ employeeId, taskKind, startedAt, completedAt, status })` used across Phase 1 and Phase 2 tests. Co-locate in `pivot/src/__fixtures__/performance-fixtures.ts`.
- **Window helper** — `makeWindow(90)` returns `{ start: Date, end: Date }` for consistent time ranges.

### Frontend (`frontend/src/__fixtures__/`)

- **Reuse `convex-provider.tsx`** — `setupConvexMocks()` + `setMockConvexData()` pattern for `EmployeePerformancePanel` tests.
- **Mock chart data** — factory returning `{ taskKinds: [{ name, avgMs }], completionRate, trend: [number] }`.

### Conventions

- Fixtures are `.ts` files co-located with tests, never `_generated`.
- Prefer dependency injection over `mock.module()` per lessons-learned (pivot test isolation).
- Always `vi.unstubAllGlobals()` / reset mocks in `afterEach`.

## 3. Cross-Phase Edge Cases & Dependencies

| Edge Case | Affected Phases | Test It In |
|-----------|----------------|------------|
| Empty runs table (no completed tasks) | 1, 2 | Phase 1: `getEmployeePerformance` returns `{ data: null, message }`. Phase 2: `detectRegressions` returns `[]`. |
| Single-sample window (sampleCount=1) | 1, 2 | p95 === avg; regression threshold shouldn't fire on 1-sample variance. |
| Employee with tasks across multiple projects | 1 | Query scoped to `projectSlug` — test cross-project isolation. |
| Time window boundary precision | 1, 4 | `windowStart` inclusive, `windowEnd` exclusive. Test exact boundary timestamps. |
| Alert type extension (new `performance_regression` union member) | 2, 3 | Phase 2 test validates alert shape; Phase 3 test renders it. |
| Chart component with zero task kinds | 3 | Renders empty state, not a crash. |
| Convex subscription reconnect during panel mount | 3 | Use `convex-provider` mock to simulate `undefined` → data transition (loading → loaded). |

**Phase dependencies:** Phase 2 depends on Phase 1 baseline shape. Phase 3 depends on Phase 1 query return type. Phase 4 depends on Phase 1 schema indexes.

## 4. Architecture Guardrails

### Patterns to Reuse

- **Pure functions for stat logic** — extract `computePercentiles`, `computeCompletionRate` as pure functions in `pivot/src/performance/statistics.ts`. TDD without Convex mocking (per lessons-learned: pure modulator pattern).
- **`withIndex().order().take(n)`** — never `.filter().collect()` for querying runs by window (per lessons-learned gotcha).
- **`v.id('table')` for Convex IDs** — never `v.string()` + `as any` (per lessons-learned gotcha).
- **Frontend hooks via `fetch`** — performance data fetched through pivot API, not direct Convex `useQuery`, per analytics dashboard pattern in lessons-learned.
- **Conventional Commits** — `feat(convex):`, `feat(ui):`, `chore(perf):`.

### Anti-Patterns to Avoid

- **Do not** mock Convex at module level; use `createMockConvexClient` instance injection.
- **Do not** use `.catch(() => {})` in frontend fetch — add error state and user feedback.
- **Do not** mutate shared state before async completes — use local variables with rollback.
- **Do not** mark plan tasks `[x]` before tests pass and code is committed.
- **Do not** render LLM output as raw HTML — sanitize if markdown rendering is needed.

## 5. Per-Phase Test Approach Notes

### Phase 1: Performance Data Model & Convex Queries
- Unit: `computePercentiles([100, 200, 300])` → `{ avg: 200, p50: 200, p95: 300 }`. `computeCompletionRate(8, 10)` → `0.8`. Pure functions, no mocks.
- Integration: `getEmployeePerformance` with mock Convex client returns correct shape; verify empty-data branch returns `{ data: null }`.
- Target: 6–8 unit tests, 2 integration tests.

### Phase 2: Regression Detection
- Unit: `evaluateRegression({ current: 150, baseline: 100 })` → `{ alerted: true, severity: 'high' }`. Test all threshold boundaries (19%, 20%, 21%).
- Integration: `detectRegressions` with mock runs + baseline → creates alert of type `performance_regression`.
- Edge: insufficient data (sampleCount < 5) → no alert, no crash.
- Target: 6–8 unit tests, 1 integration test.

### Phase 3: Frontend Panel
- Unit: `EmployeePerformancePanel` renders with mock data; regression badges visible; empty state message present.
- Integration: Wire into `ProjectViewPage` with `MemoryRouter` + `convex-provider` mock; verify "Performance" tab appears.
- E2E (spec requirement): Playwright test — navigate to employee detail, click Performance tab, assert chart rendered. Use `{ exact: true }` selectors per lessons-learned.
- Target: 4–5 component tests, 1 E2E test.

### Phase 4: Benchmark
- Integration: seed synthetic dataset → run `getEmployeePerformance` with 90-day window → assert timing < 2000ms.
- Add index hint test: verify composite index `(employeeId, projectSlug, taskKind)` is used (explain query plan or time with/without index).
- Target: 1 benchmark test, documented timing output.

### Phase 5: Finalize
- No new tests. Verify all prior tests still pass via `bun --cwd pivot test` and `bun --cwd frontend test`.
