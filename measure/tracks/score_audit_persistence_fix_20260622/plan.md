# Plan: Score Audit Persistence Fix

## Phase 1: Red — Prove the Missing Insert

- [ ] Task: Add a failing test that calls `createScoreAudit` and asserts a row is inserted.
- [ ] Task: Add a failing test asserting the returned value is the persisted row/ID, not `undefined`.
- [ ] Task: Add a failing validation test for malformed input.
- [ ] Task: Run the Red tests and record the failure count.

**Targeted Red command:**
```bash
bun test ./convex/scoreAudit.test.ts
```

**Expected result at HEAD:** tests fail because `createScoreAudit` returns without inserting.

## Phase 2: Green — Implement Persistence

- [ ] Task: Update `createScoreAudit` to validate input and insert a row via `ctx.db.insert`.
- [ ] Task: Return the inserted row ID and/or full row from the function.
- [ ] Task: Ensure the schema/validator supports the required audit fields.
- [ ] Task: Re-run Red tests; expect them to pass.

**Targeted Green command:**
```bash
bun test ./convex/scoreAudit.test.ts
```

## Phase 3: Verify Consumers and Close Gates

- [ ] Task: Add or update an integration test proving score-history queries read the persisted audit.
- [ ] Task: Run `bun --cwd pivot typecheck` and `bun --cwd frontend typecheck`.
- [ ] Task: Run `build-graph update ./graph.db convex/scoreAudit.ts`.
- [ ] Task: Update `measure/tech-debt.md` to mark TD-200 resolved.

**Closeout command:**
```bash
bun test ./convex/scoreAudit.test.ts && bun --cwd pivot typecheck && bun --cwd frontend typecheck
```
