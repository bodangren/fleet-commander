# Test Strategy: Insights

## Testing Pyramid

| Phase | Unit | Integration | E2E |
|-------|------|-------------|-----|
| 1-3 (Pages) | 70% | 25% | 5% |
| 4 (Charts) | 80% | 15% | 5% |
| 5 (Queries) | 90% | 10% | — |
| 6 (Tabs) | 60% | 30% | 10% |
| 7 (Integration) | 40% | 50% | 10% |
| 8 (Final) | 50% | 30% | 20% |

Unit = pure logic/render. Integration = wired hooks + mocked Convex. E2E = Playwright.

## Shared Fixtures & Mocks

### Reuse existing (do not duplicate)
- `frontend/src/__fixtures__/convex-provider.tsx` — `setupConvexMocks()`, `setMockConvexData()`
- `frontend/src/__fixtures__/historyFixtures.ts` — `SprintHistoryItem`, `AgentHistoryItem`
- `frontend/src/__fixtures__/dashboardFixtures.ts` — `MockSprint`, `MockAgent`
- `convex/lib/analytics.test.ts` — `makeTask()`, `makeWorkRun()` helper pattern

### New fixtures needed
- `frontend/src/__fixtures__/insightsFixtures.ts` — `InsightMetrics`, `CostPointItem`, `AgentEfficiencyRow`, `PipelineCostBreakdown`
- Extend `convex-provider.tsx` with `analyticsSprints`, `performanceAgents`, `costsData` keys
- Convex query mock functions: `mockUseQuery()` returning typed data per view

## Cross-Phase Edge Cases & Dependencies

1. **Empty data states** — All three pages must handle zero sprints, zero agents, zero cost records gracefully (spec R1-R3)
2. **Chart-component coupling** — Phases 1-3 depend on Phase 4 charts; if chart API changes, all three pages break. Fix chart interface first.
3. **Query shape drift** — Phase 5 queries define the data shape consumed by Phases 1-3 pages. Lock query return types before wiring.
4. **Tab routing** — Phase 6 URL routing must preserve scroll position and query params when switching tabs. Test back/forward navigation.
5. **Loading/empty/error states** — Phase 7 introduces these; Phases 1-3 must not assume data is always present.
6. **Cost/point division by zero** — When `pointsDelivered === 0`, cost/point must not render `Infinity` or `NaN`.
7. **Date boundary bugs** — Bucket functions in `convex/lib/analytics.ts` use strict `>` for dayStart. Follow same convention.

## Architecture Guardrails

### Reuse (patterns to follow)
- **Component test pattern**: `render()` → `screen.getByText()` assertions (see `VelocityTrendChart.test.tsx`)
- **Convex mock pattern**: `setupConvexMocks()` + `setMockConvexData()` in `beforeEach`, `resetMockConvexData()` in `afterEach`
- **Pure function test pattern**: `convex/lib/*.test.ts` — import function, call with fixtures, assert output
- **Fixture factory pattern**: `makeTask()`, `makeWorkRun()` with `Partial<T>` overrides
- **Vitest for frontend**, `bun:test` for Convex — never mix

### Anti-patterns to avoid
- **No snapshot tests for charts** — Charts render SVG/DOM that changes with data; assert on text content and data points instead
- **No `vi.fn()` for Convex hooks** — Use the existing `setupConvexMocks()` infrastructure; manual mocks leak state
- **No direct DOM queries** — Use `screen.getByRole()` / `screen.getByText()`, not `container.querySelector()`
- **No test files outside `__fixtures__/`** — Keep test data centralized; no ad-hoc fixtures in test files
- **No hardcoded timestamps** — Use `BASE_TIME` offset pattern from `historyFixtures.ts`

## Per-Phase Test Approach

### Phase 1-3: Analytics, Performance, Costs Pages
- Unit: Test each page renders sub-components (charts, tables) with mock data
- Integration: Wire `useQuery` mock, verify correct Convex query is called with right args
- Edge: Empty state, single-item state, large dataset (50+ sprints)

### Phase 4: Charts Library
- Unit: Test `LineChart`, `BarChart`, `DonutChart` render correct data points
- Unit: Test tooltip content and legend labels
- Integration: Test charts respond to prop changes (re-render with new data)
- Edge: Zero values, negative values, single data point

### Phase 5: Data Queries
- Unit: Pure function tests for velocity, reliability, cost calculations
- Unit: Test query argument validation (date ranges, project filters)
- Integration: Mock Convex DB, verify query returns expected shape
- Edge: No sprints, single sprint, sprint with zero cost

### Phase 6: Tabs & Navigation
- Unit: Test tab component renders correct active tab
- Integration: Test URL sync (navigate to `/insights/performance`, verify tab active)
- E2E: Playwright test clicking tabs, verifying URL and visible content

### Phase 7: Data Integration
- Integration: Full mock chain — Convex mock → hook → page → chart
- Test loading skeleton appears before data resolves
- Test error boundary catches failed queries
- Test empty state when query returns `undefined`

### Phase 8: Final Testing Pass
- Verify >80% coverage on new files (`bun --cwd frontend test --coverage`)
- Run `bun --cwd frontend check` for lint + type-check
- Playwright smoke: navigate to each insights tab, verify no console errors
