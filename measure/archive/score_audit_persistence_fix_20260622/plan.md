# Plan: Score Audit Persistence Fix

## Phase 1: Red — Prove the Missing Insert

- [x] Task: Add a failing test that calls `createScoreAudit` and asserts a row is inserted. (ef6c055)
- [x] Task: Add a failing test asserting the returned value is the persisted row/ID, not `undefined`. (ef6c055)
- [x] Task: Add a failing validation test for malformed input. (ef6c055 — 4 validation tests, RED at HEAD)
- [x] Task: Run the Red tests and record the failure count. (ef6c055 — recorded: 1 pass / 4 fail / 8 expect at HEAD before the fix)

**Targeted Red command:**
```bash
bun test ./convex/scoreAudit.test.ts
```

**Expected result at HEAD:** validation tests fail because `createScoreAudit` accepts empty required strings. Recorded: 1 pass / 4 fail.

## Phase 2: Green — Implement Persistence

- [x] Task: Update `createScoreAudit` to validate input and insert a row via `ctx.db.insert`. (78ab1b6 — `createScoreAuditHandler` rejects empty required strings with `ConvexError`; insert was already present)
- [x] Task: Return the inserted row ID and/or full row from the function. (78ab1b6 — handler returns the entry)
- [x] Task: Ensure the schema/validator supports the required audit fields. (78ab1b6 — schema unchanged; required fields already declared in `convex/schema/analytics.ts`)
- [x] Task: Re-run Red tests; expect them to pass. (78ab1b6 — 5 pass / 0 fail / 16 expect after the fix)

**Targeted Green command:**
```bash
bun test ./convex/scoreAudit.test.ts
```

## Phase 3: Verify Consumers and Close Gates

- [x] Task: Add or update an integration test proving score-history queries read the persisted audit. (7c5a092 — `listScoreAuditByTaskHandler` extracted; round-trip + empty-result tests in `convex/scoreAudit.test.ts`)
- [x] Task: Run `bun --cwd pivot typecheck` and `bun --cwd frontend typecheck`. (7c5a092 — both clean)
- [x] Task: Run `build-graph update ./graph.db convex/scoreAudit.ts`. (57054b5 — also updates `scoreAudit.test.ts`; 5 → 10 nodes, 7 → 14 edges)
- [x] Task: Update `measure/tech-debt.md` to mark TD-200 resolved. (57054b5 — moved TD-200 to Resolved with commit SHAs)

**Closeout command:**
```bash
bun test ./convex/scoreAudit.test.ts && bun --cwd pivot typecheck && bun --cwd frontend typecheck
```

**Final closeout evidence:**
- `bun test ./convex/scoreAudit.test.ts`: 7 pass / 0 fail / 23 expect
- `bun --cwd pivot typecheck`: clean
- `bun --cwd pivot test`: 1809 pass / 0 fail / 4 skip
- `bun --cwd frontend tsc --noEmit` (local binary): clean (exit 0)
- graph.db updated incrementally for `convex/scoreAudit.ts` and `convex/scoreAudit.test.ts` (57054b5)
