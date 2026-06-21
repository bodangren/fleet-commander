# Plan: Auth Config and Identity

## Phase 1: Red — Prove Missing Auth

- [ ] Task: Add a failing test asserting `convex/auth.config.ts` exists and exports a valid config.
- [ ] Task: Add a failing test asserting `resolveActor` returns a real identity for a valid token.
- [ ] Task: Add a failing test asserting anonymous fallback is rejected in production mode.
- [ ] Task: Record the Red failure count.

**Targeted Red command:**
```bash
bun test ./convex/auth.test.ts
```

**Expected result at HEAD:** tests fail because `auth.config.ts` is missing and `resolveActor` falls back to anonymous.

## Phase 2: Green — Implement Auth Config

- [ ] Task: Create `convex/auth.config.ts` with the project’s provider settings.
- [ ] Task: Update `resolveActor` to use the auth config and return a real identity.
- [ ] Task: Gate the anonymous fallback behind an explicit `NODE_ENV === 'development'` check or remove it.
- [ ] Task: Re-run Red tests; expect them to pass.

**Targeted Green command:**
```bash
bun test ./convex/auth.test.ts
```

## Phase 3: Verify Production Identity Gates

- [ ] Task: Add an integration test that a protected mutation rejects an unauthenticated actor.
- [ ] Task: Run `bun --cwd pivot typecheck` and `bun --cwd frontend typecheck`.
- [ ] Task: Run `build-graph update ./graph.db convex/auth.config.ts convex/resolveActor.ts`.
- [ ] Task: Update `measure/tech-debt.md` to mark TD-201 resolved.

**Closeout command:**
```bash
bun test ./convex/auth.test.ts && bun --cwd pivot typecheck && bun --cwd frontend typecheck
```
