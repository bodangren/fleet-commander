# Implementation Plan - Go/SQLite Decommission and Cutover

## Phase 1: Gate Validation

- [x] Task: Verify prerequisite parity tracks have passed acceptance gates
  - Sub-item: Frontend Convex migration complete (archived at conductor/archive/frontend_convex_migration_20260402/)
  - Sub-item: Bun orchestrator migration complete (archived at conductor/archive/bun_orchestrator_migration_20260402/)
  - Gate: 7 frontend slices Convex-ready; Bun orchestrator has 23 passing tests
- [x] Task: Freeze decommission scope with explicit include/exclude module list
  - Sub-item: Mark modules as remove, archive, or retain (temporary)
  - Evidence: `conductor/tracks/go_sqlite_decommission_cutover_20260402/decommission-scope.md`

## Phase 2: Backup and Rollback Prep

- [ ] Task: Create and validate rollback checkpoints for runtime-critical assets
  - Sub-item: Include SQLite snapshot and pre-removal branch/tag notes
- [ ] Task: Publish operator cutover checklist and rollback trigger thresholds
  - Sub-item: Include who/when/how for rollback execution

## Phase 3: Decommission Execution

- [ ] Task: Remove or archive superseded Go/SQLite modules for migrated slices
  - Sub-item: Update imports/scripts/build logic accordingly
- [ ] Task: Remove obsolete runtime wiring and docs references
  - Sub-item: Ensure `conductor/*` and root docs represent Bun + Convex steady state

## Phase 4: Full-Stack Verification

- [ ] Task: Run full validation suite for surviving stack
  - Sub-item: Bun runtime checks, frontend checks, Convex checks, migration/sync checks
- [ ] Task: Verify no runtime codepaths for migrated slices depend on removed modules
  - Sub-item: Include command evidence and quick smoke walkthrough

## Phase 5: Closure

- [ ] Task: Update tech debt and lessons learned with final cutover findings
  - Sub-item: Remove resolved debt entries and record residual risk
- [ ] Task: Mark track complete and move to archive when acceptance is met
