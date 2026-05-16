# Test Strategy — Virtual Software House MVP

> Written by Tech Lead. Companion to `spec.md` and `plan.md`.

---

## 1. Testing Pyramid Per Phase

| Phase | Unit (70%) | Integration (20%) | E2E (10%) |
|-------|-----------|-------------------|-----------|
| **1. Schema** | Migration logic, seed data shape, type checks | Convex schema validation via `npx convex dev` | — |
| **2. Kanban** | Component renders, drag state logic | Convex subscription wiring, column-task CRUD | Board loads, task moves between columns |
| **3. Roster** | Employee card render, workload calc | Assign/unassign mutations, filter by skill | Add employee, assign task, verify card |
| **4. Auto-Execution** | Scheduler matching, retry logic, skill matching | Bun.spawn capture, task status transitions | Full cycle: Ready → In Progress → Done/Blocked |
| **5. Polish** | — | — | Full user journey smoke test |

---

## 2. Shared Test Fixtures

**Convex Mocks** (`pivot/src/__fixtures__/convex-mock.ts`):
- Mock Convex client with `query`, `mutation`, `withIndex`, `collect` stubs
- Factory functions: `createTask(overrides?)`, `createEmployee(overrides?)`, `createProject(overrides?)`
- **Reuse from**: `pivot/src/orchestrator/executor.test.ts` pattern (dependency injection, never `mock.module()`)

**React/Convex Provider Mock** (`frontend/src/__fixtures__/convex-provider.tsx`):
- `MockConvexProvider` wrapping `ConvexProvider` with in-memory query/mutation registry
- `renderWithProviders(ui, options?)` helper combining MemoryRouter + MockConvex

**Playwright Shared Setup** (`frontend/e2e/fixtures.ts`):
- `baseURL` from env or `http://localhost:5173`
- Seed project + tasks before each test via Convex mutation helper

---

## 3. Cross-Phase Edge Cases & Dependencies

| Edge Case | Affected Phases | Test Approach |
|-----------|----------------|---------------|
| Schema migration drops tables with live subscriptions | 1 → 2 | Integration test: subscribe before migration, verify subscription resets gracefully |
| Task created without assigned employee | 2 → 4 | Unit test scheduler: Ready task with `assignee = null` must NOT be picked up |
| Employee marked "Away" mid-execution | 3 → 4 | Unit test: executor must complete run even if employee goes Away during execution |
| Kanban drag emits wrong column state | 2 → 3 | E2E: drag task, verify Convex state matches UI state |
| Retry exhaustion leaves task in "In Progress" | 4 → 5 | Unit test: max retries exceeded → status must be "Blocked" not "In Progress" |
| Concurrent schedule picks same task twice | 4 | Unit test: idempotency guard — task already "In Progress" skips pickup |

---

## 4. Architecture Guardrails

**Reuse Existing Patterns:**
- Factory function pattern for test data (see `executor.test.ts:4-33`)
- Dependency injection for Convex client, never `mock.module()` (TD-033 resolved pattern)
- `vi.stubGlobal` / `vi.unstubAllGlobals` for fetch mocking in hooks
- Vitest for frontend (`vitest.config.ts`), Bun test for pivot (`bun:test`)

**Anti-Patterns to Avoid:**
- ❌ `mock.module()` — causes cross-file state leaks (TD-033)
- ❌ `v.string() + as any` for Convex IDs — always `v.id('table')` (lessons-learned)
- ❌ `.filter()` + `.collect()` — use `withIndex().order().take(n)` or `.first()` (lessons-learned)
- ❌ Marking plan tasks `[x]` before tests pass (lessons-learned)
- ❌ `silent .catch(() => {})` — always surface errors (lessons-learned)

---

## 5. Per-Phase Test Approach

### Phase 1: Schema Simplification
- **Unit**: Validate seed data matches schema shape; migration function preserves target data
- **Integration**: Run `npx convex dev` — schema compiles without errors; generated types reflect new tables
- **No E2E** — schema changes are verified by Convex type generation

### Phase 2: Kanban Board
- **Unit**: `KanbanColumn` renders correct task count; `TaskCard` displays assignee + priority; drag state hooks return valid transitions
- **Integration**: Convex subscription delivers task updates to board; column filter by project ID
- **E2E (1 test)**: Create task via modal, drag to different column, verify Convex document updated

### Phase 3: Employee Roster
- **Unit**: `EmployeeCard` renders workload bar; skill tag filter returns correct subset
- **Integration**: Assign mutation links task to employee; status toggle updates workload count
- **E2E (1 test)**: Add employee, assign to task, verify assignment appears on board

### Phase 4: Auto-Execution
- **Unit**: `matchTaskToEmployee` by skill intersection; retry counter increments on failure; status transitions: Ready→In Progress→Done/Blocked
- **Integration**: Mock `Bun.spawn` captures stdout/stderr into run log; max 3 retries before Blocked
- **E2E (1 test)**: Seed Ready task + available employee → scheduler runs → task lands in Done or Blocked

### Phase 5: Polish & Quality Gates
- **No new tests** — run full existing suite: `bun --cwd pivot test && bun --cwd frontend test`
- **E2E smoke**: Full user journey (create project → add task → assign → run scheduler → verify result)
- Verify responsive layout at 768px and 1024px widths
