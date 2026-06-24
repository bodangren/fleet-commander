# Spec: Score Audit Persistence Fix

## Goal

Make `convex/scoreAudit.ts:createScoreAudit` actually persist score audit rows so that downstream score history, debugging, and compliance views have reliable data. This closes TD-200.

## User Impact

Without persisted audits, score-related history is silently empty and users cannot trace how agent scores were derived. Fixing this restores trust in the score history pages and any cost/quality analytics that depend on audit records.

## Acceptance Criteria

1. `createScoreAudit` inserts a row into the `scoreAudits` table (or equivalent table) with all required fields.
2. The function returns the persisted audit row ID and/or the full row.
3. Input validation rejects malformed payloads with a clear error.
4. Existing consumers that read score audits receive the persisted data.
5. New Red tests fail at HEAD because the insert is missing and pass after the fix.
6. `bun test ./convex/scoreAudit.test.ts` passes after the fix.
7. `bun --cwd pivot typecheck` and `bun --cwd frontend typecheck` remain clean.

## Non-Goals

- Redesigning the scoring algorithm or score interpretation.
- Adding a UI for score audit administration.
- Migrating historical score data (this track only fixes the write path).

## Verification

- `bun test ./convex/scoreAudit.test.ts`
- `bun --cwd pivot typecheck`
- `bun --cwd frontend typecheck`
- `build-graph update ./graph.db convex/scoreAudit.ts`
