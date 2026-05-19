# Test Strategy: Foundation Layer

## 1. Testing Pyramid Per Phase

| Phase | Unit | Integration | E2E |
|-------|------|-------------|-----|
| P1 Schema | Validators, index defs | `npx convex dev` typegen | — |
| P2 Agents | Handler logic, cost math | Agent CRUD ↔ schema | — |
| P3 Projects/Sprints | Status transitions, budget calc | Sprint close ↔ tasks | — |
| P4 Tasks | Status FSM, cost estimate | Task move ↔ agents | — |
| P5 PipelineRuns | Stage transitions, cost accumulate | Run ↔ task lifecycle | — |
| P6 Providers | CRUD, status toggle | Provider ↔ agent assignments | — |

**Target**: >80% unit coverage per phase. Integration tests per CRUD file. No E2E until frontend wire-up.

## 2. Shared Test Fixtures & Mocks

Reuse these across all phases:

- **`createMockCtx(overrides?)`** — In-memory Maps for `db.query().withIndex().collect()`, `db.get()`, `db.insert()`, `db.patch()`. Extend with new table Maps per phase (already proven in `convex/employees.test.ts`).
- **`createMockConvexClient(handlers)`** — For frontend-facing tests (`pivot/src/__fixtures__/convex-mock.ts`).
- **`sampleAgents`** — Default 4 agents (@alice, @bob, @carol, @frank) with canonical roles, models, costPerPoint. Share across P2–P5.
- **`sampleProject` / `sampleSprint`** — Minimal valid objects with all required fields per schema. Share across P3–P5.
- **`sampleTask`** — Valid task with assignee, projectId, sprintId. Share across P4–P5.

**Anti-pattern to avoid**: Don't duplicate fixture data in each test file. Extract to `convex/__fixtures__/foundation.ts`.

## 3. Cross-Phase Edge Cases & Dependencies

| Dependency | Edge Case | Test |
|------------|-----------|------|
| P1 → P2 | Schema typegen must produce valid types for `v.id('agents')` | `schema.test.ts`: assert `tables.agents` defined |
| P2 → P4 | Agent status blocks assignment | Task mutation rejects when agent is `blocked` or `offline` |
| P3 → P4 | Sprint must be `active` for task move to `in_progress` | Task status transition rejects if sprint is `planned` or `completed` |
| P3 → P5 | PipelineRun cost rolls into sprint `actualCost` | Sprint close aggregates all linked run costs |
| P4 → P5 | Task status `merged` must have at least one completed PipelineRun | PipelineRun query filters by taskId |
| P5 → P6 | PipelineRun references valid agentId and provider | Foreign key enforcement at schema level |

**Key guard**: Run `bun --cwd pivot typecheck` and `bun --cwd frontend check` after every phase to catch cross-phase type breaks.

## 4. Architecture Guardrails

### Patterns to Reuse

- **Handler extraction** — Export named handler functions (e.g., `listAgentsHandler`) for unit testing, then re-export as `query`/`mutation` wrappers.
- **`withIndex().collect()`** over `.filter().collect()` — Per lessons-learned, `.filter()` is banned.
- **Composite indexes** — Add `by_project` and `by_status` indexes per table for common query patterns.
- **`v.id('table')`** for all foreign keys — never `v.string()` + `as any`.
- **`v.union(v.literal(...))`** for enums — explicit type safety over `v.string()`.

### Anti-Patterns to Avoid

- **`.filter()` + `.collect()`** — Always use `withIndex` with composite indexes for filtered queries.
- **`v.optional(T)` as nullable** — Optional means field absent; use `v.union(v.null(), T)` if null is valid.
- **Mutating shared state before async** — Use local variables; rollback on failure.
- **Schema edits without `npx convex dev`** — Manual `_generated` edits cause type desync.
- **Silent `.catch(() => {})`** — Always log or propagate errors.

## 5. Per-Phase Test Approach Notes

**P1 (Schema)**: Pure validation tests. Assert each table exists, validators match spec, indexes are defined. One test per table. Run `npx convex dev` in CI to verify typegen.

**P2 (Agents)**: Unit test each handler with `createMockCtx({agents: Map, tasks: Map})`. Test `costPerPoint` calculation with edge cases (zero points, division by zero). Test `updateStatus` transitions: active→idle, idle→blocked, blocked→active. Seed function returns exactly 4 agents.

**P3 (Projects/Sprints)**: Unit test CRUD handlers. Test sprint status FSM: `planning` → `active` → `completed`. Test budget calc: sum of task costs. Test `sclose` mutation aggregates `actualCost`, `pointsDelivered`, `taskCount`. Reject sprint close if no tasks exist.

**P4 (Tasks)**: Unit test status transitions (all 6 states). Test `costEstimate = storyPoints × agentCostPerPoint`. Test assignment: reject if agent `workload >= maxWorkload`. Test `move` mutation validates sprint is active.

**P5 (PipelineRuns)**: Unit test stage transition tracking. Test cost accumulation per stage sums correctly. Test `getByTask` returns runs ordered by `startTime`. Reject duplicate `running` status per task.

**P6 (Providers)**: Unit test CRUD. Test status transitions: `active` ↔ `rate_limited` ↔ `idle`. Test provider list returns models array. Minimal phase — focus on schema correctness.

## CI Integration

```bash
# After each phase commit:
bun --cwd pivot typecheck
bun --cwd frontend check
npm run lint
bun --cwd convex schema.test.ts  # if runnable
```
