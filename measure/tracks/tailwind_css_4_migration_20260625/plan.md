# Plan: Tailwind CSS 4 Migration

## Phase 1: Baseline + config audit

- [ ] Task 1.1: Inventory `tailwind.config.ts` token declarations (colors, spacing, typography, custom plugins)
- [ ] Task 1.2: Inventory `@apply` usages (count per app)
- [ ] Task 1.3: Capture pre-migration visual baseline
    - [ ] Screenshot dashboard at `measure/visual-baselines/dashboard-pre-tailwind4.png`
- [ ] Task 1.4: Bump `tailwindcss` to v4 in root + per-app package.json
- [ ] Task 1.5: `bun install` (or appropriate package manager)

## Phase 2: Config + @apply migration

- [ ] Task 2.1: Move design tokens from `tailwind.config.ts` into entry CSS as `@theme` blocks
    - [ ] Brand colors
    - [ ] Spacing scale
    - [ ] Typography (fontFamily, fontSize)
    - [ ] Custom plugins (if any)
- [ ] Task 2.2: Rewrite `@apply` usages that no longer compile
    - [ ] Inline utility composition for one-off cases
    - [ ] Component classes for repeated patterns
- [ ] Task 2.3: Delete (or reduce to plugin-only) `tailwind.config.ts`
- [ ] Task 2.4: Verify build + visual
    - [ ] `bun --cwd frontend build` succeeds
    - [ ] `bun --cwd frontend check` clean
    - [ ] Visual smoke test: no missing-token fallbacks

## Phase 3: Test + closeout

- [ ] Task 3.1: `bun --cwd frontend test` + `bun --cwd pivot test` pass
- [ ] Task 3.2: `bun --cwd frontend typecheck` clean
- [ ] Task 3.3: Update graph.db
- [ ] Task 3.4: Update tech-debt.md → TD-242 Resolved
- [ ] Task 3.5: Move track to `measure/archive/`, create closeout manifest
