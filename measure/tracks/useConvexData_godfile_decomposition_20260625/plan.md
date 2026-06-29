# Plan: useConvexData god-file decomposition

## Phase 1: Characterization tests + Red baseline

- [ ] Task 1.1: Inventory current exports of `useConvexData.ts`
    - [ ] List every exported hook + signature (typed return shape, query args)
    - [ ] Count call sites per hook
- [ ] Task 1.2: Write characterization tests
    - [ ] For each hook, write a test that pins: return shape on success, loading→ready transition, error path, query-key argument
    - [ ] Tests must fail at HEAD in their old location (or be skipped if the source moves first)
- [ ] Task 1.3: Capture baseline test count + coverage
    - [ ] `bun --cwd frontend test` count
    - [ ] `bun --cwd frontend test --coverage` per-file coverage
- [ ] Task 1.4: Checkpoint commit (test scaffolding only)

## Phase 2: Extract shared core + per-resource files

- [ ] Task 2.1: Create `frontend/src/lib/convex/useConvexQuery.ts` (≤120 lines)
    - [ ] Generic Convex-query core: handles loading/error transitions, refetch on key change
    - [ ] No `as any` casts
- [ ] Task 2.2: Create per-resource hooks (`useProjects`, `useSprints`, `useTasks`, `useAgents`, `useSettings`)
    - [ ] Each file owns its query arguments and return-shape typing
    - [ ] Each file calls the shared core
- [ ] Task 2.3: Update call sites to import from new locations
    - [ ] `rg "useConvexData" frontend/src` → list every importer
    - [ ] Replace each import; preserve observable behavior
- [ ] Task 2.4: Delete `frontend/src/lib/useConvexData.ts`
- [ ] Task 2.5: Verify Green
    - [ ] `bun --cwd frontend test` passes (count ≥ baseline)
    - [ ] Characterization tests pass
    - [ ] `bun --cwd frontend check` clean
    - [ ] `bun --cwd frontend typecheck` clean

## Phase 3: Update graph.db + closeout

- [ ] Task 3.1: `build-graph update ./graph.db frontend/src/lib/convex/`
- [ ] Task 3.2: Update tech-debt.md → TD-217 Resolved
- [ ] Task 3.3: Add lessons-learned entry on decomposition pattern
- [ ] Task 3.4: Move track to `measure/archive/`, create closeout manifest
