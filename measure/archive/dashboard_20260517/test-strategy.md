# Test Strategy: Dashboard

## Testing Pyramid

| Layer | Ratio | Where |
|-------|-------|-------|
| **Unit** | 70% | Each component in isolation; pure metric helpers |
| **Integration** | 20% | Component + Convex data flow; assembled DashboardPage |
| **E2E** | 10% | Playwright: full dashboard render, realtime updates, empty states |

Write tests **before** implementation per TDD. Target >80% coverage for new files.

---

## Shared Fixtures & Mocks

### Reuse existing
- `__fixtures__/convex-provider.tsx` — `setupConvexMocks()`, `setMockConvexData()`, `resetMockConvexData()` for Convex `useQuery` mocking
- `e2e/helpers/mockApp.ts` — `setupMockApp()` for Playwright API interception

### New fixtures needed
1. **`dashboardFixtures.ts`** — shared mock objects for:
   - `mockSprint`: `{ name, status, budget: { actual, estimated }, tasks: { done, total }, points: { delivered, estimated } }`
   - `mockAgents`: array of `{ name, displayName, status, currentTask }` with Active/Idle/Blocked variants
   - `mockActivity`: array of `{ type, agent, task, cost, timestamp }` with merge/dispatch/blocked types
   - `mockAlerts`: array of `{ type, severity, message, resolved }` covering blockers, budget warnings, A/B tests
2. **Convex data shape** — extend `MockConvexData` in `convex-provider.tsx` with `sprint`, `agentWorkload`, `recentActivity`, `alerts` fields if not already present

---

## Cross-Phase Edge Cases & Dependencies

| Edge Case | Phases Affected | Risk |
|-----------|----------------|------|
| Sprint has zero tasks or zero points | 1, 2 | Division-by-zero in cost/point; empty progress bar |
| No active agents | 3 | Empty list rendering; status badges absent |
| No blockers/alerts | 4 | Empty state vs error state ambiguity |
| Convex returns `undefined` before hydration | 6 → all | All sections must handle loading skeleton |
| Realtime update changes sprint budget mid-render | 6 → 1 | Stale closure on derived metrics |
| A/B test alert is resolved while dashboard open | 4, 5 | Item disappears without animation; layout shift |
| Agent status changes from Active→Blocked | 3, 5 | Badge update without re-fetch; activity double-count |

---

## Architecture Guardrails

### Reuse
- **Props-driven components**: Accept data via props, never fetch internally (matches `AgentCard`, `TaskCard` pattern)
- **`useFleetApi` / `useConvexData` hooks**: Data fetching lives in hooks, not components
- **`satisfies` typed fixtures**: Use `satisfies` for mock data to catch shape drift at compile time
- **CSS class approach**: Use Linear design tokens via `DESIGN.md`; no inline styles
- **`EmptyState` component**: Reuse existing `EmptyState.tsx` for zero-data scenarios

### Anti-patterns to avoid
- **`.filter().collect()` in Convex queries** — use `withIndex().order().take(n)` (lessons-learned)
- **Mutating shared state optimistically** — use local variables, rollback on failure (lessons-learned)
- **`mock.module()` across test files** — prefer dependency injection; `mock.module()` persists across files (lessons-learned)
- **Silent `.catch(() => {})`** — always surface errors with user feedback (lessons-learned)
- **Inline Convex queries in components** — keep query logic in hooks layer
- **Hardcoded sprint/task data** — derive from Convex, never hardcode (lessons-learned: derived state)

---

## Per-Phase Test Approach

### Phase 1: Sprint Status
- **Unit**: `SprintStatus.tsx` — render with mock sprint; test progress bar width calc; test budget formatting (zero, under, over); test edge case: zero points
- **Unit**: pure helper `calculateBudgetPercent(actual, estimated)` — TDD the math separately

### Phase 2: Key Metrics
- **Unit**: `KeyMetrics.tsx` — render with mock stats; test each metric label
- **Unit**: pure helpers `deliveryRate(points, cost)`, `successRate(completed, total)`, `rejectionRate(rejected, total)` — TDD with zero-divisor edge cases

### Phase 3: Agent Status
- **Unit**: `AgentStatus.tsx` — render with 0, 1, N agents; test status badges (Active/Idle/Blocked); test link href
- **Unit**: empty state when no agents returned

### Phase 4: Attention Needed
- **Unit**: `AttentionNeeded.tsx` — render with 0 and N items; test alert severity styling; test resolved items filtered out
- **Unit**: empty state ("All clear" message)

### Phase 5: Recent Activity
- **Unit**: `RecentActivity.tsx` — render activity list; test color-coding by type; test scrollable container
- **Unit**: empty state ("No recent activity")

### Phase 6: Data Integration
- **Integration**: Wire each component to mocked Convex queries via `setMockConvexData()`; verify data flows from query result to rendered output
- **Integration**: Test realtime: simulate `setMockConvexData` call with updated sprint; verify DOM updates
- **Integration**: Test loading state (`undefined` data → skeleton rendered)

### Phase 7: Layout & Styling
- **Integration**: `DashboardPage.tsx` — render all sections together; verify grid layout; test responsive breakpoints (resize viewport)
- **E2E**: Playwright — navigate to `/`, assert all 5 sections visible; verify no console errors via `assertNoRuntimeErrors()`
- **E2E**: empty-state onboarding flow preserved (existing test must still pass)
