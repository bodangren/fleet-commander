# Spec: Tailwind CSS 4 Migration

## Goal

Upgrade `tailwindcss` from v3 to v4 in the **frontend** app only. Closes TD-242. Migrate the small set of `@apply` usages and move design tokens from `frontend/tailwind.config.js` into CSS-first `@theme` blocks.

## Why

Tailwind v4's CSS-first configuration simplifies build setup and unblocks later visual refresh work. Scope is intentionally narrow: frontend only, no design-token redesign.

## Current baseline (2026-08-07 audit)

| Item | Value |
| --- | --- |
| Package | `frontend` only (`tailwindcss` ^3.4.1) |
| Config file | `frontend/tailwind.config.js` (not `.ts`) |
| Entry CSS | `frontend/src/index.css` with `@tailwind base/components/utilities` |
| `@apply` count | 4 rules in `index.css` |
| Other packages | pivot / convex have no Tailwind dependency |

## Acceptance Criteria

1. `frontend` depends on `tailwindcss` v4 (and any required `@tailwindcss/postcss` / Vite plugin per official v4 Vite guide).
2. Design tokens currently in `tailwind.config.js` `theme.extend` (colors, radii, etc.) live in `@theme` (or equivalent v4 form) in entry CSS; config is removed or reduced to plugin wiring only.
3. All `@apply` usages compile under v4 (rewrite only if required).
4. `bun run --cwd frontend check` and `bun run --cwd frontend build` succeed.
5. Visual smoke: dashboard and one board route render without missing-token fallbacks (screenshot or manual note in plan).
6. `bun run --cwd frontend test` passes (use `bun run`, not bare `bun --cwd frontend test`).
7. TD-242 marked Resolved; track archived with closeout.

## Non-Goals

- Changing brand palette, spacing scale, or typography values.
- Migrating pivot, Convex, or monorepo root packages (they do not use Tailwind).
- Full visual redesign or component library rewrite.
- Package majors for Vite 8 / ESLint 10 / TS 6 (separate TDs).

## Verification

- `bun run --cwd frontend build`
- `bun run --cwd frontend check`
- `bun run --cwd frontend test`
- Visual smoke note or screenshot path
