# Test Strategy: Project Template Marketplace

## 1. Testing Pyramid Per Phase

### Phase 1 (Pure Functions) — 100% Unit
- All three functions (`instantiateProjectFromTemplate`, `extractTemplateFromProject`, `recommendBudget`) are pure.
- No I/O, no Convex context, no React. Unit tests only, co-located as `*.test.ts`.

### Phase 2 (Schema & Backend) — 70% Unit / 30% Integration
- **Unit**: Schema validation rules, mutation argument parsing, seed-data idempotency logic.
- **Integration**: Convex function tests using `createMockCtx` from `convex/__fixtures__/foundation.ts` — validates DB reads/writes through the mock context, not a live deployment.

### Phase 3 (UI Components) — 60% Unit / 30% Integration / 10% E2E
- **Unit**: `TemplateCard`, `TemplateDetailModal` rendering + prop-driven behavior via Vitest + React Testing Library.
- **Integration**: Gallery route with search/filter wired to Convex query stubs; "Create from Template" and "Save as Template" flows with mocked mutations.
- **E2E** (light): One Playwright smoke test for `/templates` gallery load; one for the create-from-template flow end-to-end.

### Phase 4 (Verification) — Manual + Regression
- Manual test checklist (per plan tasks) + full suite regression run.
- No new automated tests; validates that Phases 1–3 hold together.

## 2. Shared Test Fixtures & Mocks

| Fixture | Location | Used By |
|---|---|---|
| `createMockCtx` | `convex/__fixtures__/foundation.ts` | P2 Convex mutation/query tests |
| `sampleProject` | `convex/__fixtures__/foundation.ts` | P1 (input to extractTemplate), P2 |
| `sampleTask` | `convex/__fixtures__/foundation.ts` | P1 (template task mapping) |
| `sampleAgents` | `convex/__fixtures__/foundation.ts` | P1 (recommendBudget agent costs) |
| `sampleProjectTemplate` | **new** `convex/__fixtures__/foundation.ts` | P1, P2, P3 — a valid `projectTemplates` doc |
| `sampleProjectTemplateMinimal` | **new** `convex/__fixtures__/foundation.ts` | P1 edge cases — template with 0 tasks/agents |

- Extend `createMockCtx` to accept a `projectTemplates` table override (follow the existing `agentTemplates` pattern at line 27).
- Frontend: reuse existing Convex mock helpers from `frontend/src/__fixtures__/`.

## 3. Cross-Phase Edge Cases & Dependencies

- **P1→P2**: `instantiateProjectFromTemplate` must return a shape that `instantiateProject` mutation can persist without additional transformation. Test this contract explicitly — unit test the pure function output, then feed that output into the mutation's arg validator.
- **P2→P3**: `getProjectTemplates` query return shape must match what `TemplateCard` and `TemplateDetailModal` consume. Snapshot the query response shape in a P2 integration test; assert P3 components render against it.
- **Budget rounding**: `recommendBudget` may produce fractional cents. P1 tests for rounding; P2 `instantiateProject` must persist the rounded value; P3 `TemplateCard` must format it consistently.
- **Name uniqueness**: Agent templates enforce unique names via `by_name` index (see `convex/agentTemplates.ts:96`). Project templates must follow the same pattern — test the `by_name` uniqueness guard in P2.
- **Deletion safety**: Agent templates check for dependent agents before deletion (`agentTemplates.ts:157`). Project templates must check for instantiated projects — test this in P2.
- **Extract stripping**: `extractTemplateFromProject` must remove `description`, `assigneeId`, `sessionId`, `actualCost`, and other runtime fields from tasks — but preserve `storyPoints`, `priority`, `status` structure. Verify no PII leaks in P1.

## 4. Architecture Guardrails

### Reuse
- **Convex CRUD pattern**: Follow `convex/agentTemplates.ts` — handler functions with explicit `args`/`returns` validators, `by_name` index for uniqueness, `createdAt`/`updatedAt` timestamps.
- **Schema file pattern**: Add `projectTemplates` to a new `convex/schema/templates.ts` and spread into `convex/schema.ts` (follow the `core`/`tasks`/`planning` split pattern).
- **Route registration**: Follow `registerAgentTemplateRoutes` in `pivot/src/routes/agentTemplates.ts` for the pivot REST layer.
- **Frontend page pattern**: Follow `AgentTemplatesPage` / `AgentTemplateEditorPage` for gallery + detail split.
- **Mock context**: Extend `createMockCtx` — do not create a separate mock utility.

### Anti-patterns to Avoid
- **Do not** use `as any` casts for template data in mutations — define and validate all fields with `v.*` validators.
- **Do not** store denormalized task content in `projectTemplates.tasks[]` — store task structure only (title, storyPoints, priority, status, dependencies).
- **Do not** skip the `by_name` index uniqueness check in create/clone mutations.
- **Do not** import Convex generated API types into pivot — use shared type files under `pivot/src/types/`.
- **Do not** put `recommendBudget` logic inside a Convex mutation — keep it pure (Phase 1) and call it from the mutation handler.

## 5. Per-Phase Test Approach Notes

### Phase 1
- Co-locate tests: `convex/lib/projectTemplates.test.ts` (or `pivot/src/lib/` if pure functions live there).
- Test each function independently: valid input, empty/missing data, boundary rounding, name anonymization.
- No mocks needed — all pure functions.

### Phase 2
- Test each mutation/query handler via `createMockCtx({ projectTemplates: ... })`.
- Cover: create (happy + duplicate name), delete (happy + dependent projects guard), instantiate (happy + invalid template ID), seed idempotency.
- Validate schema field types match spec acceptance criteria.

### Phase 3
- `TemplateCard`: snapshot + prop-based assertions (name, category, taskCount, budget display).
- `TemplateDetailModal`: test open/close, task list rendering, budget display, "Create" button calls mutation.
- Gallery: test search/filter narrows visible cards, category tab switching.
- "Create from Template" flow: mock mutation, verify correct args passed (template ID + project name).
- "Save as Template" flow: mock mutation, verify content stripping matches `extractTemplateFromProject` output.
- Navigation: assert Templates link appears in sidebar.

### Phase 4
- Run `bun --cwd pivot test && bun --cwd frontend test` before manual tests.
- Manual checklist items from plan; record pass/fail in commit message.

## 6. Build-Graph Findings That Shaped This Strategy

- **Agent template precedent**: `convex/agentTemplates.ts` (266 lines) establishes the CRUD + seed + clone pattern with `by_name` uniqueness enforcement. The `projectTemplates` table and mutations should mirror this structure — same test coverage for name-collision, delete-safety, and seed-idempotency.
- **Schema split**: `convex/schema.ts` uses a modular spread pattern (`...core`, `...tasks`, etc.). A new `templates.ts` module fits naturally; tests should verify the schema compiles without conflicts.
- **Budget utilities exist**: `convex/lib/budget.ts` provides `BudgetEntry`, `isBudgetBreached`, `computeRemainingBudget`. `recommendBudget` should reuse or compose with these — test the integration point.
- **`createMockCtx` already supports `agentTemplates` table** (line 18, 27). Adding `projectTemplates` is a one-line extension; all P2 tests should use the same fixture.
- **Frontend agent template pages** (`AgentTemplatesPage`, `AgentTemplateEditorPage`) provide the component pattern for gallery + editor. P3 tests should follow the same rendering approach.
- **No existing `projectTemplate` symbols** in graph — this is greenfield. No blast-radius risk for Phase 1. Phases 2–3 touch `projects` table (query by `projectId`), `tasks` table (bulk insert on instantiation), and navigation — each has callers that must not break.
- **4340 nodes, 551 files, 4 packages** — the codebase is substantial. Keep test scope tight to avoid runaway fixture complexity.
