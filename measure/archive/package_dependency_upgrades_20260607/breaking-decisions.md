# Breaking Upgrade Decision Matrix — 2026-06-07

Each major upgrade below is evaluated as an isolated batch. A decision to
**land** means the migration is committed; **defer** means a follow-up Measure
track or tech-debt entry is recorded.

---

## 1. React Router 7

**Current:** `react-router-dom` ^6.30.1 (frontend)
**Target:** React Router 7

### Migration surface

- `react-router-dom` is replaced by `react-router` v7 (package rename).
- `<BrowserRouter>`, `<Route>`, `<Routes>` API remains but imports change.
- Data-router patterns (`loader`, `action`) become the default.
- `useLoaderData`, `useActionData` replace manual fetch patterns.
- Nested layout routes require explicit `<Outlet>` placement.

### Peer constraints

- `@types/react` and `@types/react-dom` must be ≥19 (already satisfied).
- `@remix-run/router` is no longer a separate peer; bundled in `react-router` v7.
- Vite plugin compatibility: `@vitejs/plugin-react` ^5.x supports React Router 7.

### Expected validation commands

```bash
bun --cwd frontend test
bun --cwd frontend check
bun --cwd frontend test:e2e
npm run verify
```

### Rollback point

Revert `react-router` to `react-router-dom` ^6.30.1 and restore v6 import
paths. Commit before migration is the rollback anchor.

### Decision

**Defer** — Routing migration touches every page component. Requires dedicated
track with visual regression coverage.

---

## 2. Vite 8

**Current:** `vite` ^7.3.1 (frontend)
**Target:** Vite 8

### Migration surface

- `vite` 8 drops Node 16 support (already satisfied; Bun runtime used).
- `resolve.conditions` defaults change; may affect SSR and library resolution.
- `css.modules.localsConvention` renamed to `css.modules.exportLocalsConvention`.
- Rollup upgraded to v4 with breaking AST changes.
- `@vitejs/plugin-react` must be ≥6.0 for Vite 8 compatibility.
- `vite-plugin-pwa` must be checked for Vite 8 peer support.

### Peer constraints

- `@vitejs/plugin-react` ≥6.0 (currently ^5.1.2 — requires major bump).
- `vite-plugin-pwa` must declare Vite 8 peer dependency support.
- `@vitest/ui` and `@vitest/coverage-v8` must be compatible with Vite 8.
- `vitest` ^4.x should work but needs verification.

### Expected validation commands

```bash
bun --cwd frontend test
bun --cwd frontend check
bun --cwd frontend test:e2e
npm run build
npm run verify
```

### Rollback point

Revert `vite` to ^7.3.1, `@vitejs/plugin-react` to ^5.1.2. Commit before
migration is the rollback anchor.

### Decision

**Defer** — Security-motivated (vulnerabilities in vite 7 transitive deps) but
migration is coupled with plugin ecosystem. Requires dedicated track.

---

## 3. Tailwind CSS 4

**Current:** `tailwindcss` ^3.4.1 (frontend)
**Target:** Tailwind CSS 4

### Migration surface

- Configuration moves from `tailwind.config.js` to CSS-based `@config` directive.
- `@tailwind base/components/utilities` replaced by `@import "tailwindcss"`.
- `content` array replaced by automatic content detection.
- `tailwindcss-animate` plugin requires v4-compatible version or replacement.
- PostCSS plugin changes: `@tailwindcss/postcss` replaces `tailwindcss` plugin.
- `autoprefixer` no longer needed (built into v4).

### Peer constraints

- `postcss` ≥8.4 (already satisfied at ^8.5.6).
- `tailwindcss-animate` must be replaced with `tailwindcss-animate` v2 or native v4 animations.
- `class-variance-authority` and `tailwind-merge` compatible but may need config updates.
- `autoprefixer` can be removed after migration.

### Expected validation commands

```bash
bun --cwd frontend test
bun --cwd frontend check
npm run build
npm run verify
```

### Rollback point

Revert `tailwindcss` to ^3.4.1, restore `tailwind.config.js`, restore PostCSS
plugin config. Commit before migration is the rollback anchor.

### Decision

**Defer** — Requires full CSS config rewrite and visual regression verification.
Security finding is in PostCSS transitive dep, not Tailwind itself.

---

## 4. TypeScript 6

**Current:** `typescript` ^5.9.3 (pivot and frontend)
**Target:** TypeScript 6

### Migration surface

- `verbatimModuleSyntax` becomes stricter.
- `isolatedDeclarations` may affect build pipeline.
- New `erasableSyntaxOnly` option for Node-native TS execution.
- Stricter type narrowing in conditional expressions.
- `@types/*` packages may need updates for TS 6 compatibility.

### Peer constraints

- `typescript-eslint` must support TS 6 (check release notes).
- `bunx tsc --noEmit` must work with TS 6 in pivot.
- `@types/react` ^19.x compatible.
- `@types/js-yaml` ^4.x compatible.
- Convex generated types must compile under TS 6.

### Expected validation commands

```bash
bun --cwd pivot typecheck
bun --cwd frontend check
npm run lint
npm run verify
```

### Rollback point

Revert `typescript` to ^5.9.3 in pivot and frontend. Commit before migration
is the rollback anchor.

### Decision

**Defer** — Affects both workspaces. Requires full typecheck validation and
potential `@types/*` alignment. Dedicated track recommended.

---

## 5. ESLint 10

**Current:** `eslint` ^9.39.2, `@eslint/js` ^9.39.2 (frontend)
**Target:** ESLint 10

### Migration surface

- Flat config format is the only supported format (already using flat config).
- `eslint.config.js` with `@eslint/js` remains the primary API.
- Plugin API changes: `context.report` signature updates.
- `eslint-plugin-react` and `eslint-plugin-react-hooks` must support ESLint 10.
- `typescript-eslint` must support ESLint 10.
- `eslint-config-prettier` must support ESLint 10.

### Peer constraints

- `typescript-eslint` ≥9.0 (currently ^8.53.0 — may need major bump).
- `eslint-plugin-react` ≥8.0 (currently ^7.37.5).
- `eslint-plugin-react-hooks` ≥8.0 (currently ^7.0.1).
- `eslint-config-prettier` ≥11.0 (currently ^10.1.8).
- `@eslint/js` must match ESLint 10 version.

### Expected validation commands

```bash
npm run lint
bun --cwd frontend check
npm run verify
```

### Rollback point

Revert `eslint` and `@eslint/js` to ^9.39.2, restore plugin versions. Commit
before migration is the rollback anchor.

### Decision

**Defer** — Plugin ecosystem must align first. Security finding is in
`brace-expansion` transitive dep, not ESLint itself.

---

## 6. jsdom 29

**Current:** `jsdom` ^27.4.0 (frontend)
**Target:** jsdom 29

### Migration surface

- jsdom 28 drops Node 16 support (already satisfied).
- jsdom 29 may change `window.location` mock behavior.
- `whatwg-url` and `ws` transitive dependencies updated (removes moderate `ws` vulnerability).
- Vitest `jsdom` environment integration needs verification.

### Peer constraints

- Vitest ^4.x must support jsdom 29 as a test environment.
- `@testing-library/react` ^16.x compatible (no direct peer dependency).
- `ws` vulnerability path eliminated by upgrade.

### Expected validation commands

```bash
bun --cwd frontend test
npm run verify
```

### Rollback point

Revert `jsdom` to ^27.4.0. Commit before migration is the rollback anchor.

### Decision

**Evaluate** — Low-coupling upgrade that remediates the `ws` moderate
vulnerability. Test suite is the primary validation gate.

---

## 7. Lucide React 1

**Current:** `lucide-react` ^0.562.0 (frontend)
**Target:** Lucide React 1

### Migration surface

- Icon component API remains `<IconName />` (no breaking change in JSX usage).
- Some icon names may be renamed or removed in v1.
- Bundle size may change with new tree-shaking defaults.
- Import paths remain `lucide-react`.

### Peer constraints

- No peer dependency conflicts expected.
- React 19 compatible (Lucide 1 targets React 18+).

### Expected validation commands

```bash
bun --cwd frontend test
bun --cwd frontend check
npm run build
```

### Rollback point

Revert `lucide-react` to ^0.562.0. Commit before migration is the rollback
anchor.

### Decision

**Evaluate** — Low-coupling, icon-library-only change. Verify no renamed icons
break the UI.

---

## 8. concurrently 10

**Current:** `concurrently` ^9.2.1 (root)
**Target:** concurrently 10

### Migration surface

- CLI argument format remains compatible.
- `--prefix-colors` and `--names` flags unchanged.
- Programmatic API (if used) may have minor signature changes.
- Node 18+ required (already satisfied).

### Peer constraints

- No peer dependency conflicts. Standalone CLI tool.

### Expected validation commands

```bash
npm run dev
npm run verify
```

### Rollback point

Revert `concurrently` to ^9.2.1. Commit before migration is the rollback
anchor.

### Decision

**Evaluate** — Root-only dev tool. Low risk, quick verification.
