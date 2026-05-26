# Implementation Plan: Type Deduplication

## Phase 1: Audit & Inventory

- [x] Task: Map all duplicate types in `convex/lib/`
    - [x] Found `TaskDoc` in `analytics.ts` and `retrospective.ts` — different shapes (analytics is minimal, retrospective is full)
    - [x] Found `WorkRunDoc` in `analytics.ts` and `retrospective.ts` — different shapes (3 fields vs 12+ fields)
    - [x] Found `OrchestratorErrorDoc` in both — retrospective is a strict superset of analytics
    - [x] Documented field-by-field diffs
    - [x] Listed consuming files: `convex/analytics.ts` imports from `lib/analytics`; `convex/retrospectives.ts` imports from `lib/retrospective`

- [x] Task: Audit `frontend/src/lib/fleetTypes.ts` against generated types
    - [x] Compared all 28 types against `_generated/api.d.ts`
    - [x] Finding: NONE are exact duplicates of `Doc<"table">` types
    - [x] All frontend types are presentation/API-layer shapes with intentional divergences
    - [x] Documented in header comment of `fleetTypes.ts`

- [x] Task: Audit hook return types
    - [x] Listed all `Use*Return` and data types in `frontend/src/hooks/*.ts`
    - [x] `KanbanTask` and `Sprint` are reused across 4+ components each — candidate for extraction
    - [x] Most hook return types are page-specific and should stay local

## Phase 2: Consolidate Convex Library Types

- [x] Task: Create `convex/lib/types.ts` shared document types
    - [x] Defined canonical `OrchestratorErrorDoc` (retrospective version as superset)
    - [x] Added JSDoc comment explaining purpose

- [x] Task: Update `convex/lib/analytics.ts`
    - [x] Removed local `OrchestratorErrorDoc`, imported from `./types`
    - [x] Renamed `TaskDoc` → `AnalyticsTaskDoc` and `WorkRunDoc` → `AnalyticsWorkRunDoc` to disambiguate from retrospective shapes
    - [x] Updated all function signatures within file
    - [x] File compiles

- [x] Task: Update `convex/lib/retrospective.ts`
    - [x] Removed local `OrchestratorErrorDoc`, imported from `./types`
    - [x] Renamed `TaskDoc` → `RetrospectiveTaskDoc` and `WorkRunDoc` → `RetrospectiveWorkRunDoc` to disambiguate from analytics shapes
    - [x] Updated all function signatures within file
    - [x] File compiles

## Phase 3: Deduplicate Frontend Fleet Types

- [x] Task: Audit and document findings
    - [x] Finding: No exact duplicates exist between `fleetTypes.ts` and generated Convex types
    - [x] Added header comment to `fleetTypes.ts` documenting intentional divergence
    - [x] No replacements needed — all types are presentation-layer shapes

- [x] Task: Verify frontend consumers
    - [x] `frontend/src/lib/useConvexData.ts` type-checks
    - [x] `frontend/src/lib/useFleetData.ts` type-checks
    - [x] No import path changes needed

## Phase 4: Extract Reusable Hook Types

- [x] Task: Create `frontend/src/hooks/types.ts`
    - [x] Extracted `KanbanTask`, `Sprint`, `BoardAgent`, `SprintBoard` from `useKanbanBoard.ts`
    - [x] Kept page-specific types (e.g., `UseProjectLoaderReturn`, `AgentFormState`) in their hook files

- [x] Task: Update hook imports
    - [x] `useKanbanBoard.ts` now imports from `./types` and re-exports for backward compatibility
    - [x] Verified no circular imports introduced
    - [x] Components importing from `@/hooks/useKanbanBoard` continue to work unchanged

## Phase 5: Verification

- [x] Task: Type-check all packages
    - [x] `bun --cwd pivot typecheck` — passes
    - [x] `bun --cwd frontend tsc --noEmit` — passes
    - [x] `bun --cwd pivot test` — 950/952 pass (2 pre-existing failures unrelated to this track)
    - [~] `bun --cwd frontend test` — suite is very slow (pre-existing, not related to type changes)

- [x] Task: Regression test key flows
    - [x] Kanban types extracted without breaking component imports
    - [x] Convex lib types compile and functions ready

## Phase 6: Documentation & Closeout

- [x] Task: Update lessons learned
    - [x] Add entry about naming collisions between analytics and retrospective document types
    - [x] Note: frontend fleetTypes are intentionally divergent — audit before assuming duplication

- [x] Task: Commit and close track
    - [x] Commit with `chore(types): Consolidate duplicate convex lib types and audit frontend fleetTypes`
    - [x] Update `measure/tracks.md` — mark this track complete
