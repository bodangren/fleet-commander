# Implementation Plan: Type Deduplication

## Phase 1: Audit & Inventory

- [ ] Task: Map all duplicate types in `convex/lib/`
    - [ ] Run `grep -n "interface TaskDoc" convex/lib/*.ts`
    - [ ] Run `grep -n "interface WorkRunDoc" convex/lib/*.ts`
    - [ ] Run `grep -n "interface OrchestratorErrorDoc" convex/lib/*.ts`
    - [ ] Document field-by-field diffs (if any) between duplicate definitions
    - [ ] List all consuming files for each duplicate interface

- [ ] Task: Audit `frontend/src/lib/fleetTypes.ts` against generated types
    - [ ] Compare `Employee`, `Project`, `Task`, `HarnessRecord`, etc. with `_generated/api.d.ts`
    - [ ] Classify each as: exact match, superset, subset, or unrelated
    - [ ] Document which can be replaced with `Doc<"table">` or `DataModel` types

- [ ] Task: Audit hook return types
    - [ ] List all `Use*Return` types in `frontend/src/hooks/*.ts`
    - [ ] Identify which are reused across components/pages
    - [ ] Identify which are page-specific and should stay local

## Phase 2: Consolidate Convex Library Types

- [ ] Task: Create `convex/lib/types.ts` shared document types
    - [ ] Define canonical `TaskDoc`, `WorkRunDoc`, `OrchestratorErrorDoc`
    - [ ] Choose the most complete field set from the duplicates
    - [ ] Export all shared interfaces
    - [ ] Add JSDoc comments explaining each type's purpose

- [ ] Task: Update `convex/lib/analytics.ts`
    - [ ] Remove duplicate `TaskDoc`, `WorkRunDoc`, `OrchestratorErrorDoc`
    - [ ] Add `import { TaskDoc, WorkRunDoc, OrchestratorErrorDoc } from './types'`
    - [ ] Verify file still compiles

- [ ] Task: Update `convex/lib/retrospective.ts`
    - [ ] Remove duplicate `TaskDoc`, `WorkRunDoc`, `OrchestratorErrorDoc`
    - [ ] Add `import { TaskDoc, WorkRunDoc, OrchestratorErrorDoc } from './types'`
    - [ ] Verify file still compiles

## Phase 3: Deduplicate Frontend Fleet Types

- [ ] Task: Replace exact duplicates with generated imports
    - [ ] Update `frontend/src/lib/fleetTypes.ts` to import from `convex/_generated/api`
    - [ ] For types that are exact matches: replace definition with `export type Employee = Doc<"employees">`
    - [ ] For types that add UI fields: keep definition but extend from generated base
    - [ ] For types unrelated to Convex schema: leave unchanged

- [ ] Task: Update frontend consumers
    - [ ] Verify `frontend/src/lib/useConvexData.ts` still type-checks
    - [ ] Verify `frontend/src/lib/useFleetData.ts` still type-checks
    - [ ] Fix any import path changes

## Phase 4: Extract Reusable Hook Types

- [ ] Task: Create `frontend/src/hooks/types.ts`
    - [ ] Extract `AgentFormState`, `UseAgentFormReturn` from `useAgentForm.ts`
    - [ ] Extract shared dashboard types from `useDashboardData.ts`
    - [ ] Extract `KanbanTask`, `Sprint`, `BoardAgent`, `SprintBoard` from `useKanbanBoard.ts`
    - [ ] Keep page-specific types (e.g., `UseProjectLoaderReturn`) in their hook files

- [ ] Task: Update hook imports
    - [ ] Update `useAgentForm.ts` to import/export types from `./types`
    - [ ] Update `useDashboardData.ts` similarly
    - [ ] Update `useKanbanBoard.ts` similarly
    - [ ] Verify no circular imports introduced

## Phase 5: Verification

- [ ] Task: Type-check all packages
    - [ ] `bun --cwd pivot typecheck` — passes
    - [ ] `bun --cwd frontend check` — passes
    - [ ] `bun --cwd pivot test` — passes
    - [ ] `bun --cwd frontend test` — passes

- [ ] Task: Regression test key flows
    - [ ] Dashboard renders without type errors
    - [ ] Kanban board loads tasks
    - [ ] Agent form submits correctly

## Phase 6: Documentation & Closeout

- [ ] Task: Update lessons learned
    - [ ] Add entry about maintaining single source of truth for document types
    - [ ] Note frontend pattern: prefer `Doc<"table">` over hand-rolled duplicates

- [ ] Task: Commit and close track
    - [ ] Commit with `chore(types): Consolidate duplicate convex lib types and audit frontend fleetTypes`
    - [ ] Update `measure/tracks.md` — mark this track complete
