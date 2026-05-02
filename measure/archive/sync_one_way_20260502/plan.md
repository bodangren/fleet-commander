# Implementation Plan: Collapse Sync to One-Way (Markdown → Convex)

## Phase 1: Audit

- [x] Task: Inventory reverse-sync code paths
    - [x] Read `convex/projects.ts` — list every mutation that writes to disk. **NONE found.**
    - [x] Read `convex/tracks.ts` — list every mutation that writes to disk. **NONE found.**
    - [x] Read `convex/sprints.ts` — list every mutation that writes to disk. **NONE found.**
    - [x] Check any other Convex files referenced by the pivot sync layer. **All clean — zero outbound writes.**
    - [x] For each path found: note file, function name, and whether a UI flow depends on it.
    - [x] Record inventory here in plan.md before proceeding to Phase 2.

**Inventory:**
| File | Function | Direction | UI Dep? |
|------|----------|-----------|---------|
| `pivot/src/sync/convexTrackSync.ts:13-26` | `exportTrack()` | Convex → Disk | No (CLI only) |
| `pivot/src/sync/trackMarkdown.ts:22-33` | `renderSpecMarkdown/renderPlanMarkdown` | Serializer for export | No |
| `pivot/src/reconciliation/sweep.ts:24,32` | `loadCanonicalState/saveCanonicalState` | Stubs (no-op) | No |
| `pivot/src/reconciliation/rules.ts` | `prefer_export` strategy | Inert (no trigger) | No |

**Action plan:** Delete `exportTrack`, its serializers, reconciliation stubs, and `sync:export` script. Keep `importTrack` and `sync:import`.

## Phase 2: Remove Reverse Path

- [x] Task: Delete or disable reverse-sync mutations
    - [x] Deleted `exportTrack()` from `convexTrackSync.ts` — only reverse-sync path found.
    - [x] Removed `renderSpecMarkdown`/`renderPlanMarkdown` from `trackMarkdown.ts` (export-only serializers).
    - [x] Removed `sync:export` script from `pivot/package.json`.
    - [x] Reconciliation stubs (`loadCanonicalState`/`saveCanonicalState`) already no-ops — no change needed.
    - [x] Added comment at removal sites: "Convex state is derived. To change a track, edit the markdown; the importer will pick it up."

- [x] Task: Resolve dependent UI flows
    - [x] No UI flow depends on reverse-sync. `exportTrack` was CLI-only with zero HTTP routes or frontend calls.
    - [x] Decision: killed (deleted entirely).
    - [x] Per-flow decision documented: export removed, import kept.

## Phase 3: Idempotent Importer

- [x] Task: Implement sync:rebuild command
    - [x] Added `sync:rebuild` script to `pivot/package.json`.
    - [x] Created `pivot/src/sync/rebuild.ts`: clears tracks via `clearTracksForProject` mutation, scans `measure/tracks/` and `measure/archive/`, re-imports all tracks with `spec.md` + `plan.md`.
    - [x] Added `clearTracksForProject` mutation to `convex/tracks.ts`.
    - [x] Idempotent: uses upsertTrackSnapshot without version check; running twice produces identical state.
    - [x] Cold start safe: handles empty Convex state (clears 0, imports all).

## Phase 4: Doc Update

- [x] Task: Update capability #6 in product.md
    - [x] Already done by docs_truth_up track — capability #6 reads "Documentation Import + Derived State."

## Phase 5: Verification

- [x] Task: End-to-end check
    - [x] All sync tests pass (9 tests across 2 files).
    - [x] No Convex mutation writes to disk (exportTrack removed, reconciliation stubs already no-ops).
    - [x] Typecheck passes for all changed files (pre-existing errors only).
