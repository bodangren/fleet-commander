# Spec: useConvexRealtime god-file decomposition

## Goal

Decompose `frontend/src/lib/useConvexRealtime.ts` (TD-218). The file is a god-file of one-line wrappers and `as any` casts around Convex subscription APIs. Consolidate into a single `useConvexSubscription` core + typed per-resource hooks, and remove `as any` casts as they appear.

## Why

Every cast hides a type-contract gap (per lessons-learned `(as_any_mask)`). Subscriptions are the most cast-heavy surface in the frontend. Cleaning them up shrinks the type hole and makes subscription behavior reviewable.

## Acceptance Criteria

1. `frontend/src/lib/useConvexRealtime.ts` no longer exists; it is replaced by `frontend/src/lib/convex/useConvexSubscription.ts` (≤120 lines) plus per-resource files (`useRealtimeProjects.ts`, `useRealtimeSprints.ts`, `useRealtimeTasks.ts`, `useRealtimeAgents.ts`, `useRealtimeSettings.ts`).
2. Zero `as any` casts in the new module (counted by `rg "as any" frontend/src/lib/convex/useConvex*` → 0).
3. Characterization tests pin observable subscription behavior per resource.
4. All call sites import from the new locations; no caller imports from `lib/useConvexRealtime`.
5. `bun --cwd frontend test` passes.
6. `bun --cwd frontend check` and `bun --cwd frontend typecheck` remain clean.

## Non-Goals

- Migrating useConvexData (covered by a separate track).
- Changing Convex subscription contracts.
- Adding new subscriptions.

## Verification

- `bun --cwd frontend test`
- `bun --cwd frontend check`
- `rg "as any" frontend/src/lib/convex/useConvex*` → 0
- `build-graph update ./graph.db frontend/src/lib/convex/`
