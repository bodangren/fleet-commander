# Plan: Tailwind CSS 4 Migration (refreshed 2026-08-07)

Scope: **frontend only**. Estimate: **S–M** (~8 tasks). Prior plan assumed monorepo root + `tailwind.config.ts`; those were incorrect for this repo.

## Phase 1: Baseline

- [ ] Task 1.1: Inventory `frontend/tailwind.config.js` tokens (colors, radii, fonts, plugins)
- [ ] Task 1.2: Confirm `@apply` sites (expect 4 in `frontend/src/index.css`)
- [ ] Task 1.3: Capture one pre-migration screenshot or note of dashboard + kanban
- [ ] Task 1.4: Read current official Tailwind v4 + Vite migration guide; pin exact packages

## Phase 2: Upgrade + migrate

- [ ] Task 2.1: Bump `tailwindcss` to v4 in `frontend/package.json`; add required PostCSS/Vite plugin deps; reinstall with Bun
- [ ] Task 2.2: Move tokens into `@theme` in `frontend/src/index.css`; switch entry directives to v4 form
- [ ] Task 2.3: Fix any broken `@apply` or class composition
- [ ] Task 2.4: Delete or minimize `tailwind.config.js`; update `postcss.config.js` if required
- [ ] Task 2.5: `bun run --cwd frontend build` + `bun run --cwd frontend check` green

## Phase 3: Closeout

- [ ] Task 3.1: `bun run --cwd frontend test` green
- [ ] Task 3.2: Visual smoke vs baseline note
- [ ] Task 3.3: Mark TD-242 Resolved; archive track with closeout
