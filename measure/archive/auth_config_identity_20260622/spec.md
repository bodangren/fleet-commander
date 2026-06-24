# Spec: Auth Config and Identity

## Goal

Introduce a real `convex/auth.config.ts` and remove the anonymous bootstrap fallback in `resolveActor` so production Convex functions require a valid identity. This closes TD-201.

## User Impact

Currently any actor can resolve to anonymous, which bypasses authorization and audit attribution. Fixing this ensures that only authenticated users/agents can read or mutate project state, and that every mutation is tied to a real identity.

## Acceptance Criteria

1. `convex/auth.config.ts` exists and exports a valid provider configuration.
2. `resolveActor` uses the auth config and returns a real identity when a valid token/session is present.
3. The anonymous bootstrap fallback is removed for production; a dev-only opt-in remains if local development requires it.
4. Unauthenticated requests to protected mutations/queries fail with a clear operational error.
5. Red tests fail at HEAD because `auth.config.ts` is missing and `resolveActor` returns anonymous.
6. `bun test ./convex/auth.test.ts` passes after the fix.
7. `bun --cwd pivot typecheck` and `bun --cwd frontend typecheck` remain clean.

## Non-Goals

- Building a full OAuth login UI.
- Implementing role-based access control (RBAC) or permissions beyond identity.
- Migrating existing anonymous sessions.

## Verification

- `bun test ./convex/auth.test.ts`
- `bun --cwd pivot typecheck`
- `bun --cwd frontend typecheck`
- `build-graph update ./graph.db convex/auth.config.ts convex/resolveActor.ts`
