# Plan: Unify Convex Clients

## Phase 1: Red — Prove Parallel Client Drift

- [ ] Task: Add a failing contract test asserting only one canonical client module exists.
- [ ] Task: Add a failing static-import test listing callers of the deprecated client path.
- [ ] Task: Add a failing behavior test that the canonical client supports the same mock injection and error handling.
- [ ] Task: Record the Red failure count.

**Targeted Red command:**
```bash
bun --cwd pivot test src/convexClient.unify.test.ts
```

**Expected result at HEAD:** tests fail because both `convexClient.ts` and `typedConvexClient.ts` exist and imports are split.

## Phase 2: Green — Merge and Migrate

- [ ] Task: Merge the two implementations into the canonical typed client module.
- [ ] Task: Migrate all imports across `pivot/src/` to the canonical module.
- [ ] Task: Preserve mock-client injection and environment-selection behavior.
- [ ] Task: Re-run Red tests; expect them to pass.

**Targeted Green command:**
```bash
bun --cwd pivot test src/convexClient.unify.test.ts
```

## Phase 3: Remove Deprecated Module and Close Gates

- [ ] Task: Delete the deprecated client file once all imports are migrated.
- [ ] Task: Run `bun --cwd pivot test` and `bun --cwd pivot typecheck`.
- [ ] Task: Run `build-graph update ./graph.db <changed files>`.
- [ ] Task: Update `measure/tech-debt.md` to mark TD-204 resolved.

**Closeout command:**
```bash
bun --cwd pivot test && bun --cwd pivot typecheck
```
