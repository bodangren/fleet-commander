# Plan: Auth Config and Identity

## Phase 1: Red — Prove Missing Auth

- [x] Task: Add a failing test asserting `convex/auth.config.ts` rejects loading with localhost defaults under `NODE_ENV=production` when provider env vars are unset. ([13cd00f](../../commit/13cd00f))
- [x] Task: Add a failing test asserting `resolveActor` returns a real identity for a valid token. ([13cd00f](../../commit/13cd00f))
- [x] Task: Add a failing test asserting anonymous fallback is rejected unless `FLEET_ALLOW_ANON_BOOTSTRAP=1` is set explicitly. ([13cd00f](../../commit/13cd00f))
- [x] Task: Record the Red failure count. **Result: 2 failures** (auth.config defaults allowed in production; resolveActor allowed anonymous bootstrap in development without `FLEET_ALLOW_ANON_BOOTSTRAP=1`). ([13cd00f](../../commit/13cd00f))

**Targeted Red command:**
```bash
bun test ./convex/lib/auth.test.ts ./convex/auth.config.test.ts
```

**Actual result at HEAD:** 4 pass, 2 fail — tests fail because `auth.config.ts` silently uses localhost defaults in production and `resolveActor` falls back to anonymous in non-production without the opt-in flag.

## Phase 2: Green — Implement Auth Config

- [x] Task: Update `convex/auth.config.ts` to throw when `CONVEX_AUTH_PROVIDER_DOMAIN` or `CONVEX_AUTH_APPLICATION_ID` are unset under `NODE_ENV=production`.
- [x] Task: Keep `resolveActor` returning a real identity for a valid token.
- [x] Task: Gate the anonymous bootstrap fallback behind `process.env.FLEET_ALLOW_ANON_BOOTSTRAP === '1'`.
- [x] Task: Re-run Red tests; expect them to pass.

**Targeted Green command:**
```bash
bun test ./convex/lib/auth.test.ts ./convex/auth.config.test.ts
```

## Phase 3: Verify Production Identity Gates

- [ ] Task: Add an integration test that a protected mutation rejects an unauthenticated actor under `NODE_ENV=production`.
- [ ] Task: Run `bun --cwd pivot typecheck` and `bun --cwd frontend typecheck`.
- [ ] Task: Run `build-graph update ./graph.db convex/auth.config.ts convex/lib/auth.ts`.
- [ ] Task: Rewrite and resolve TD-201 in `measure/tech-debt.md`.

**Closeout command:**
```bash
bun test ./convex/lib/auth.test.ts ./convex/auth.config.test.ts ./convex/issues.auth.test.ts && bun --cwd pivot typecheck && bun --cwd frontend typecheck
```
