# Plan: useConvexRealtime god-file decomposition

## Phase 1: Inventory + characterization tests

- [ ] Task 1.1: Inventory current exports of `useConvexRealtime.ts`
    - [ ] List every exported subscription wrapper
    - [ ] Count `as any` occurrences per wrapper
- [ ] Task 1.2: Write characterization tests
    - [ ] For each subscription: return shape, push-transition behavior, cleanup on unmount
- [ ] Task 1.3: Capture baseline `as any` count in `lib/useConvexRealtime.ts`
    - [ ] `rg "as any" frontend/src/lib/useConvexRealtime.ts | wc -l`
- [ ] Task 1.4: Capture baseline test count + coverage

## Phase 2: Extract shared core + per-resource files

- [ ] Task 2.1: Create `frontend/src/lib/convex/useConvexSubscription.ts` (≤120 lines)
    - [ ] Generic Convex-subscription core: handles subscription lifecycle, cleanup, retry-on-error
- [ ] Task 2.2: Create per-resource subscriptions (`useRealtimeProjects`, etc.)
    - [ ] Each file owns its typed data shape (no `as any`)
- [ ] Task 2.3: Update call sites
- [ ] Task 2.4: Delete `frontend/src/lib/useConvexRealtime.ts`
- [ ] Task 2.5: Verify Green
    - [ ] `rg "as any" frontend/src/lib/convex/useConvex*` → 0
    - [ ] All characterization tests pass
    - [ ] `bun --cwd frontend test`, `check`, `typecheck` clean

## Phase 3: Update graph.db + closeout

- [ ] Task 3.1: `build-graph update ./graph.db frontend/src/lib/convex/`
- [ ] Task 3.2: Update tech-debt.md → TD-218 Resolved
- [ ] Task 3.3: Move track to `measure/archive/`, create closeout manifest
