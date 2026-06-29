# Spec: useConvexData god-file decomposition

## Goal

Decompose `frontend/src/lib/useConvexData.ts` (TD-217) behind characterization tests so each per-resource hook (projects, sprints, tasks, agents, settings) lives in its own focused module and the shared `useConvexQuery` core is small enough to reason about.

## Why

`useConvexData.ts` has accumulated hook boilerplate across multiple resource types and now exceeds the 500-line god-file threshold (per the lessons-learned rule "(godfile_split_threshold)"). The file mixes generic Convex-query plumbing with per-resource data shaping, so a change to any one resource can ripple through unrelated call sites.

## Acceptance Criteria

1. `frontend/src/lib/useConvexData.ts` no longer exists; it is replaced by `frontend/src/lib/convex/useConvexQuery.ts` (≤120 lines) plus per-resource files (`useProjects.ts`, `useSprints.ts`, `useTasks.ts`, `useAgents.ts`, `useSettings.ts`).
2. Characterization tests pin current observable behavior of every exported hook in the new structure (return-shape, loading/error transitions, query key args).
3. All call sites import from the new locations; no caller imports from `lib/useConvexData`.
4. `bun --cwd frontend test` passes (current count + characterization suite).
5. `bun --cwd frontend check` and `bun --cwd frontend typecheck` remain clean.
6. `bun --cwd frontend test --coverage` shows no measurable coverage regression.
7. `graph.db` is incrementally updated after the file split.

## Non-Goals

- Adding new query capabilities or changing Convex query contracts.
- Migrating useConvexRealtime (covered by a separate track).
- Touching backend Convex schemas.

## Verification

- `bun --cwd frontend test` (all suites)
- `bun --cwd frontend check` (lint + format + type)
- `bun --cwd frontend test --coverage` (no regression)
- `build-graph update ./graph.db frontend/src/lib/convex/`
