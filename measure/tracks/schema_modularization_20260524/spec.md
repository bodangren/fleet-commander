# Specification: Schema Modularization

## Overview

`convex/schema.ts` is 553 lines with ~30+ table definitions, no per-domain boundaries, and zero `schema`/`field` nodes detected by structural analysis. The Schema Unification track (2026-05-19) removed duplicate definitions but left the file monolithic. This track splits the schema into per-domain modules under `convex/schema/` while preserving the single exported schema object.

## Motivation

- Merge conflicts on `schema.ts` are frequent and high-risk
- No clear ownership boundaries (analytics tables, task tables, auth tables all in one file)
- Structural tools cannot extract `defineTable` shapes from a monolithic file
- Indexes and table definitions are interleaved, making schema review difficult

## Functional Requirements

1. **Create `convex/schema/` directory** with one file per domain
2. **Move table definitions** from `schema.ts` into domain modules
3. **Preserve indexes** — every `.index()` call stays with its table
4. **Preserve exports** — `schema.ts` re-exports a single `defineSchema({...})` object
5. **No behavior changes** — generated `_generated/` types must be identical before and after

## Domain Boundaries

Proposed modules:
- `core.ts` — `systemMetadata`, `projects`, `boards`, `columns`
- `tasks.ts` — `tasks`, `runs`, `taskRecovery`, `taskTimeline`, `executionLogs`
- `agents.ts` — `employees`, `harnessProfiles`, `harnessReliabilityStats`, `agents`
- `planning.ts` — `tracks`, `sprints`, `sprintPlanning`
- `operations.ts` — `alerts`, `issues`, `notifications`, `circuitBreakers`, `continuousMode`
- `analytics.ts` — `analytics`, `stats`, `costs`, `costMetrics`, `dashboard`, `insights`
- `meta.ts` — `coverageRecords`, `scoreAudit`, `dispatchPolicyStats`, `simulationRuns`, `fleetCatalog`

## Acceptance Criteria

- [ ] `convex/schema.ts` is under 50 lines (imports + `defineSchema` call only)
- [ ] All tables are defined in `convex/schema/*.ts` files
- [ ] `npx convex dev` produces identical `_generated/api.d.ts` (diff is empty)
- [ ] `bun --cwd pivot typecheck` passes
- [ ] `bun --cwd frontend check` passes
- [ ] `bun --cwd pivot test` passes
- [ ] `bun --cwd frontend test` passes
