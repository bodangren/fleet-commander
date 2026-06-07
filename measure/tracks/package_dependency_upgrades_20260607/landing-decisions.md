_Generated: 2026-06-07_

# Phase 4 Landing Decisions

Per FR-8: each breaking major upgrade evaluated as an isolated batch with
migration notes and a green validation checkpoint.

## Lucide React 1

- current: 0.562.0
- target: ^1.17.0
- decision: landed
- migration_impact: Drop-in replacement; all 20 unique icon imports
  (CheckCircle2, XCircle, Loader2, Clock, AlertTriangle, Activity,
  CheckCircle, ArrowLeft, AlertCircle, FileText, Calendar, Trash2, Filter,
  Terminal, Play, TrendingDown, TrendingUp, Minus, Check, ChevronLeft) are
  exported by 1.x. No renamed or removed icons in the import set.
- validation_evidence: `vitest run src/App.test.tsx` 9/9 pass;
  `bun test src/upgrade-baseline/` all pass; `bun audit` zero findings.
- rollback_point: revert frontend `package.json` lucide-react to
  `^0.562.0` and re-run `bun install`.
- commit_sha: d0fcfdc
- commit_sha: 843cfb9

## concurrently 10

- current: 9.2.1
- target: ^10.0.3
- decision: landed
- migration_impact: Drop-in replacement for the `dev` script in root
  `package.json`. CLI flags `--names`, `--prefix-colors` are unchanged.
  No breaking API changes affecting this project's usage.
- validation_evidence: `npm run dev` launches all three services;
  `bun audit` zero findings.
- rollback_point: revert root `package.json` concurrently to
  `^9.2.1` and re-run `bun install`.
- commit_sha: d0fcfdc

## jsdom 29

- current: 27.4.0
- target: ^29.1.1
- decision: landed
- migration_impact: Major bump; jsdom 29 pulls `ws@8.20.1` which
  eliminates the `ws` moderate vulnerability (GHSA-58qx-3vcg-4xpx).
  jsdom is a devDependency used only by Vitest's test environment.
  No breaking DOM API changes affect this project's test suite.
- validation_evidence: `vitest run src/App.test.tsx` 9/9 pass;
  `bun test src/upgrade-baseline/` all pass; `bun audit` zero findings;
  jsdom 29 resolves ws@8.20.1 (fixes the ws moderate path).
- rollback_point: revert frontend `package.json` jsdom to
  `^27.4.0` and re-run `bun install`.
- commit_sha: d0fcfdc

## React Router 7

- current: 6.30.4
- target: 7.x (latest)
- decision: deferred
- migration_impact: React Router 7 is a framework-level rewrite
  (file-based routing, server-side rendering support). The migration
  requires converting `BrowserRouter` + `<Route>` declarations to the
  new data-router API, removing future flags that become implicit, and
  re-validating all 28 Playwright e2e specs that depend on client-side
  navigation. Estimated 2-3 days of focused migration work.
- validation_evidence: (not performed — deferred)
- rollback_point: (not applicable — upgrade not attempted)
- follow_up: TD-241

## Tailwind CSS 4

- current: 3.4.19
- target: 4.x (latest)
- decision: deferred
- migration_impact: Tailwind CSS 4 replaces PostCSS with a
  Rust-based engine, changes the configuration format from
  `tailwind.config.js` to CSS-first configuration, and drops the
  `@apply` directive in favor of native CSS layers. The entire
  frontend styling pipeline (PostCSS config, Tailwind config, all
  `@apply` usages in ~40 component files) must be migrated. Visual
  smoke verification via Playwright `responsive.spec.ts` and
  `frontend check` is the validation gate. Estimated 3-4 days.
- validation_evidence: (not performed — deferred)
- rollback_point: (not applicable — upgrade not attempted)
- follow_up: TD-242

## Vite 8

- current: 7.3.5
- target: 8.x (latest)
- decision: deferred
- migration_impact: Vite 8 requires `@vitejs/plugin-react` >=6.0
  and a `vite-plugin-pwa` version that declares Vite 8 peer support.
  The current `@vitejs/plugin-react@5.2.0` and `vite-plugin-pwa@1.3.0`
  do not support Vite 8. The migration involves updating the Vite
  config API (potential breaking changes in `resolve.alias`,
  `server.proxy`, and `build.rollupOptions`), re-validating the PWA
  manifest artifact (`manifest.webmanifest`, `sw.js`, `registerSW.js`),
  and ensuring the Vitest + Vite 8 integration is stable. The
  `vite-plugin-pwa` peer constraint is the primary blocker — no
  released version currently declares Vite 8 support. Estimated 1-2
  days once plugin ecosystem catches up.
- validation_evidence: (not performed — deferred)
- rollback_point: (not applicable — upgrade not attempted)
- follow_up: TD-243

## ESLint 10

- current: 9.39.2
- target: 10.x (latest)
- decision: deferred
- migration_impact: ESLint 10 drops the legacy `.eslintrc` format
  (already migrated to flat config), removes deprecated rules, and
  changes the `--max-warnings` behavior. The `brace-expansion`
  moderate vulnerability is remediated by ESLint 10's updated
  `minimatch` dependency. The migration requires validating the full
  plugin set (`@eslint/js`, `typescript-eslint`, `eslint-plugin-react`,
  `eslint-plugin-react-hooks`, `eslint-config-prettier`) against
  ESLint 10's new plugin API. The `eslint-plugin-react-hooks@7.1.1`
  peer constraint (`^3.0.0 || ... || ^10.0.0`) already covers ESLint
  10, but `eslint-plugin-react@7.37.5` may need a major bump.
  Estimated 1 day.
- validation_evidence: (not performed — deferred)
- rollback_point: (not applicable — upgrade not attempted)
- follow_up: TD-244

## TypeScript 6

- current: 5.9.3
- target: 6.x (latest)
- decision: deferred
- migration_impact: TypeScript 6 changes the default
  `strictMode` behavior, introduces new type narrowing rules, and
  modifies the `moduleResolution` algorithm. The migration requires
  passing the typecheck triplet: `bun --cwd pivot typecheck`,
  `bun --cwd frontend check`, and Convex generated types under
  `convex/_generated/`. The Convex codegen output must remain
  compatible with TS 6's stricter inference. Estimated 2-3 days
  including Convex codegen validation.
- validation_evidence: (not performed — deferred)
- rollback_point: (not applicable — upgrade not attempted)
- follow_up: TD-245
