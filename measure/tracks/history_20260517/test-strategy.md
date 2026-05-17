# Test Strategy — History Track

## 1. Testing Pyramid by Phase

| Phase | Unit | Integration | E2E |
|-------|------|-------------|-----|
| P1–P3 (Views) | Render + prop tests | Hook wiring | — |
| P4 (Convex queries) | Handler logic | — | — |
| P5 (Search/Filters) | URL state, query building | Filter→query integration | — |
| P6 (Detail views) | Render + drill-down | — | — |
| P7 (Data integration) | — | Hook↔query, pagination | Smoke nav |
| P8 (Polish) | Cross-cutting | Full page flows | History nav |

**Target**: >80% coverage on new files. Unit tests run first; integration tests validate wiring; e2e covers navigation smoke only.

## 2. Shared Fixtures & Mocks

### Convex layer (reuse existing)
- `convex/__fixtures__/foundation.ts` — `createMockCtx()`, `sampleProject`, `sampleSprint`, `sampleTask`, `sampleAgents`
- **Add** `sampleSprintHistory` and `sampleTaskHistory` variants with realistic timestamps, cost fields, and status transitions
- **Add** `createHistoryCtx()` wrapper that seeds 10+ sprints and 50+ tasks for perf-relevant tests

### Frontend layer (extend existing)
- `frontend/src/__fixtures__/convex-provider.tsx` — extend `MockConvexData` with `sprintHistory`, `agentHistory`, `taskHistory` fields
- `frontend/src/__fixtures__/dashboardFixtures.ts` — add `mockSprintHistory[]`, `mockAgentHistory[]`, `mockTaskHistory[]` with varying statuses, costs, dates
- `frontend/src/__fixtures__/historyFixtures.ts` — **new file** for history-specific data: search results, filter states, chart data shapes

### E2E layer
- `frontend/e2e/helpers/mockApp.ts` — add `/api/history/sprints`, `/api/history/agents`, `/api/history/tasks` route handlers with realistic payloads

## 3. Cross-Phase Edge Cases & Dependencies

| Edge Case | Phases Affected | Test Approach |
|-----------|----------------|---------------|
| Empty history (no closed sprints) | P1, P4 | Unit: render empty state; Convex: query returns `[]` |
| Large dataset (500+ sprints) | P4, P7 | Unit: pagination logic; integration: verify no OOM |
| Concurrent status transitions | P4 | Unit: sprint closed while task updates in-flight |
| Search with special characters | P5 | Unit: regex-safe query building; XSS in search input |
| URL state desync (back button) | P5 | Unit: URL→filter and filter→URL round-trip |
| Cost precision (floating point) | P1, P2 | Unit: `toFixed(2)` rendering, no `0.1 + 0.2 = 0.300000004` |
| Missing agent data (deleted agent) | P2, P4 | Unit: render "Unknown Agent" fallback; Convex: orphaned records |
| Chart data with single point | P1, P2 | Unit: velocity/cost charts render without crashing |
| Sprint with zero tasks | P1 | Unit: velocity = 0, no division-by-zero |
| Filter combinations yield empty set | P5 | Unit: "no results" state displayed |

## 4. Architecture Guardrails

### Patterns to Reuse
- **Convex query pattern**: Export `handler` + named function (e.g., `listSprintsHandler`), test via `createMockCtx()` — see `convex/sprints.test.ts`
- **Frontend mock pattern**: `setupConvexMocks()` → `setMockConvexData()` → `resetMockConvexData()` in `afterEach` — see `convex-provider.test.tsx`
- **Page test pattern**: Render with `MemoryRouter`, assert with `screen.getByText`/`getByRole` — see `DashboardPage.test.tsx`
- **E2E mock pattern**: `setupMockApp(page)` with route interception, `assertNoRuntimeErrors()` — see `e2e/helpers/mockApp.ts`
- **Fixture co-location**: All test data in `__fixtures__/` directories, never inline in test files for shared data

### Anti-Patterns to Avoid
- **Do not** mock Convex client directly — always mock the hook layer (`useConvexData`)
- **Do not** hardcode timestamps in tests — use `Date.now()` offsets relative to a base time
- **Do not** test internal component state — test rendered output and user interactions only
- **Do not** create separate Vitest config files per feature — use the existing `vitest.config.ts`
- **Do not** skip `afterEach` cleanup — stale mock data causes flaky tests
- **Do not** use `setTimeout` in tests — mock timers or use `waitFor` from testing-library
- **Do not** put business logic in page components — extract to `lib/` for testability

## 5. Per-Phase Test Approach

| Phase | Key Tests |
|-------|-----------|
| P1–P3 | Unit: render with mock data, empty state, table sort, chart with 0/1/N points. Integration: drill-down navigation. |
| P4 | Unit: each handler with `createMockCtx()`, pagination, cost/velocity calc, invalid projectId edge case. |
| P5 | Unit: `buildHistoryQuery()` URL composition, `parseFiltersFromURL()` round-trip, search sanitization. Integration: filter→query→render cycle. |
| P6 | Unit: retrospective/agent detail/task link render correctly. Integration: back nav preserves filter state. |
| P7 | Integration: `useQuery` hooks, pagination loading, error boundary retry. E2E smoke: History→Sprint→drill-down→back. |
| P8 | Unit: fixtures load. Integration: full flow with 100+ records. E2E: all three views. Check: >80% coverage. |
