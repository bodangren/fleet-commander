# Spec: Tailwind CSS 4 Migration

## Goal

Upgrade `tailwindcss` from v3 to v4 across the fleet-commander monorepo. Closes TD-242. Migrate `@apply` usage, reconfigure from `tailwind.config.ts` to the CSS-first `@theme` directive, validate that all custom design tokens (brand colors, spacing scale, typography) still resolve at runtime.

## Why

Tailwind v4's CSS-first configuration removes a layer of indirection and improves build performance. We're blocked on the config + `@apply` migration; doing this now unblocks subsequent visual refreshes.

## Acceptance Criteria

1. `tailwindcss` is upgraded to v4 in root + per-app package.json.
2. `tailwind.config.ts` is removed (or reduced to plugin wiring only); token declarations move to `@theme` blocks in the entry CSS files.
3. All `@apply` references that no longer compile are rewritten as inline utility compositions or extracted to component classes.
4. `bun --cwd frontend check` and `bun --cwd frontend build` succeed.
5. Visual smoke test: dashboard renders without missing-token fallbacks (compare snapshot at `measure/visual-baselines/dashboard-pre-tailwind4.png` to a fresh build screenshot).
6. `bun --cwd frontend test` and `bun --cwd pivot test` pass.
7. `graph.db` is updated after the migration.

## Non-Goals

- Refactoring design tokens themselves (palette changes, spacing scale changes).
- Migrating to Tailwind's new oxide engine in detail (just upgrade; oxide is automatic).
- Touching Convex or backend packages.

## Verification

- `bun --cwd frontend build`
- `bun --cwd frontend check`
- `bun --cwd frontend test`
- `bun --cwd pivot test`
- Visual smoke test screenshot
- `build-graph update ./graph.db`
