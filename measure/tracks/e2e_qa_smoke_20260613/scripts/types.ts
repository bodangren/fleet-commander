/**
 * Contract types for the E2E QA/QC smoke-test track (Kimi WebBridge).
 *
 * Spec:           measure/tracks/e2e_qa_smoke_20260613/spec.md
 * Plan:           measure/tracks/e2e_qa_smoke_20260613/plan.md (Phase S1)
 * Test strategy:  measure/tracks/e2e_qa_smoke_20260613/test-strategy.md
 *                 (§"Reference Inventory Snapshot" line 164 fixes the
 *                  `interactiveElements: [{...}]` array shape this module
 *                  exports.)
 *
 * Module role: this file is the shared contract surface for every script
 * under `measure/tracks/e2e_qa_smoke_20260613/scripts/`. The build-inventory
 * generator must populate the array shape declared here, the qa-executor
 * consumes it to drive snapshots/clicks/fills, and the findings + coverage
 * generators read it back. It is intentionally implementation-free.
 *
 * Stability: additive only. New optional fields may be added; existing
 * required fields are frozen until the next contract revision in spec.md.
 */

/**
 * One interactive element discovered on a route's page component.
 *
 * @property role     ARIA role string (e.g. `'button'`, `'link'`, `'tab'`,
 *                    `'menu'`, `'textbox'`). For raw HTML elements without an
 *                    explicit `role` attribute, the parser derives the
 *                    implicit role (e.g. `<button>` → `'button'`,
 *                    `<a href>` → `'link'`, `<input>` → `'textbox'|'checkbox'`,
 *                    `<select>` → `'combobox'`, `<textarea>` → `'textbox'`).
 * @property tag      Lowercase HTML/JSX tag name (e.g. `'button'`, `'a'`,
 *                    `'input'`, `'select'`, `'textarea'`).
 * @property testId   Optional value of the `data-testid` attribute if present.
 * @property ariaLabel Optional value of the `aria-label` attribute if present.
 * @property text     Optional visible text (for buttons/links) used as a
 *                    fallback selector when no `testId`/`ariaLabel` exists.
 */
export interface InventoryElement {
  role: string;
  tag: string;
  testId?: string;
  ariaLabel?: string;
  text?: string;
}

/**
 * One row of the route inventory: a single route registered in
 * `frontend/src/router.tsx` plus the interactive elements its page component
 * exposes.
 *
 * @property path                 Router path string (e.g. `'portfolio'`,
 *                                `'agents/:name/edit'`, `'*'`).
 * @property component            Page component name (e.g. `'PortfolioPage'`).
 * @property paramKind            Name of the first `:param` segment or `null`
 *                                if the route has no parameters.
 * @property interactiveElements  Array of `InventoryElement` objects. **Always
 *                                an array** — never a count number. Empty
 *                                array `[]` is allowed only when
 *                                `noInteractive === true`.
 * @property expectedComponents   Components the QA executor must verify
 *                                rendered (substring match on page title or
 *                                root component name).
 * @property emptyStateExpected   If `true`, an empty Convex deployment may
 *                                render an empty state — this is not a defect.
 * @property redirectsTo          If set, the route is a `<Navigate>` redirect;
 *                                the QA executor follows it before asserting.
 * @property isWildcard           `true` for the catch-all `'*'` route.
 * @property knownDefect          Optional human-readable note linking a
 *                                pre-existing tech-debt ID (e.g. `'TD-250 ...'`).
 * @property noInteractive        The explicit `// no-interactive` marker
 *                                permitted by plan.md Phase S1: when `true`,
 *                                `interactiveElements` is allowed to be `[]`.
 *                                Redirect routes must carry this marker so
 *                                the executor does not flag them as
 *                                button-less defects.
 */
export interface RouteEntry {
  path: string;
  component: string;
  paramKind: string | null;
  interactiveElements: InventoryElement[];
  expectedComponents: string[];
  emptyStateExpected?: boolean;
  redirectsTo?: string;
  isWildcard?: boolean;
  knownDefect?: string;
  noInteractive?: boolean;
}

/**
 * Top-level inventory document emitted by `scripts/build-inventory.ts`.
 *
 * @property $schema       Schema URL (versioned; bump when `RouteEntry`
 *                         changes in a non-additive way).
 * @property generated_at  ISO-8601 timestamp of the generator run.
 * @property source        Repo-relative path to the router source file.
 * @property routes        One `RouteEntry` per route registered in the router.
 * @property totals        Aggregate counts used by coverage reporting.
 */
export interface RouteInventory {
  $schema: string;
  generated_at: string;
  source: string;
  routes: RouteEntry[];
  totals: {
    routes: number;
    paramRoutes: number;
    redirects: number;
    interactiveRoutes: number;
  };
}

/**
 * Status of a single route run produced by Phase S3's `runRoutes()`.
 *
 * - `'pass'`  — the route loaded, the snapshot returned ≥1 ref, and the
 *              page title matched an `expectedComponents` entry (substring
 *              match is sufficient per plan sub-task #1 "Record `title` and
 *              compare to expected component name").
 * - `'fail'`  — any of: HTTP 4xx/5xx, the snapshot returned 0 refs, the
 *              title did not match any expected component, or the
 *              kimi-webbridge command returned an error. The `error` field
 *              carries a human-readable diagnostic.
 * - `'skip'`  — the route was intentionally skipped, e.g. because it is
 *              a `<Navigate>` redirect already covered by another entry
 *              (per `noInteractive` / `redirectsTo` fields) or because the
 *              kimi-webbridge extension was disconnected (Phase S2's
 *              `handleKimiDisconnected()` result).
 */
export type RouteRunStatus = 'pass' | 'fail' | 'skip';

/**
 * One row of the Phase S3 run log: a single route navigated, snapshotted,
 * and screenshot-captured against the live dev stack via kimi-webbridge.
 *
 * Spec:           measure/tracks/e2e_qa_smoke_20260613/spec.md (STORY-Q3)
 * Plan:           measure/tracks/e2e_qa_smoke_20260613/plan.md (Phase S3)
 * Test strategy:  measure/tracks/e2e_qa_smoke_20260613/test-strategy.md
 *                 (§"Phase 3 — Route coverage" pins the per-route shape).
 *
 * @property path           Router path string (e.g. `'portfolio'`,
 *                          `'agents/:name/edit'`). For wildcard / redirect
 *                          routes the path is the literal registered value
 *                          (e.g. `'*'`, `'/'`).
 * @property component      Page component name (e.g. `'PortfolioPage'`).
 * @property status         Pass / fail / skip classification.
 * @property httpStatus     HTTP status returned by the Vite dev server for
 *                          the navigated URL. Undefined when the request
 *                          was resolved by the SPA data-router (no
 *                          network round-trip) or when the navigation
 *                          failed before issuing a request.
 * @property title          `document.title` captured via `kimi evaluate`
 *                          after `domcontentloaded`. Used for the
 *                          expected-component substring match.
 * @property screenshotPath Repo-relative path to the captured screenshot
 *                          (e.g. `screenshots/portfolio/01-route.png`).
 *                          Empty string when the screenshot was skipped
 *                          (e.g. status `'skip'`).
 * @property snapshotRefs   Number of `@e` refs returned by kimi-webbridge
 *                          `snapshot` for the page. Zero refs ⇒ empty
 *                          page ⇒ `'fail'`.
 * @property durationMs     Wall-clock time from `navigate` to `screenshot`
 *                          completion. Used for timeout budgeting and
 *                          pass/fail histogram weighting.
 * @property error          Human-readable diagnostic when `status='fail'`.
 *                          Always `undefined` for `status='pass'`.
 */
export interface RouteRun {
  path: string;
  component: string;
  status: RouteRunStatus;
  httpStatus?: number;
  title: string;
  screenshotPath: string;
  snapshotRefs: number;
  durationMs: number;
  error?: string;
}

/**
 * Top-level run log document emitted by `scripts/qa-executor.ts` for
 * `--phase routes`.
 *
 * @property $schema         Schema URL (versioned with the run-log
 *                           contract).
 * @property generated_at    ISO-8601 timestamp of the run.
 * @property session         kimi-webbridge session name (e.g.
 *                           `'qa-2026-06-13'`).
 * @property frontendBaseUrl Origin the Vite dev server was reached on.
 * @property routes          One `RouteRun` per inventory entry.
 */
export interface RouteRunLog {
  $schema: string;
  generated_at: string;
  session: string;
  frontendBaseUrl: string;
  routes: RouteRun[];
}
