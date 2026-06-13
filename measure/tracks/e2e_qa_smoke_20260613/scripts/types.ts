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

/**
 * Status of a single element run produced by Phase S4's `runElements()`.
 *
 * - `'pass'`  — the action (click/fill/submit/hover) returned `success: true`
 *              via kimi-webbridge and the element was reachable (the snapshot
 *              produced ≥1 ref for the selector).
 * - `'fail'`  — any of: HTTP 4xx/5xx on the parent route, the kimi-webbridge
 *              `click`/`fill` returned `success: false`, the element selector
 *              could not be resolved (`refs === 0`), or the runner threw. The
 *              `error` field carries a human-readable diagnostic.
 * - `'skip'`  — the parent `RouteRun` was skipped (e.g. `noInteractive === true`
 *              or kimi-webbridge disconnected per Phase S2
 *              `handleKimiDisconnected()` result) so the element-runner has
 *              nothing to drive. `error` is always `undefined`.
 */
export type ElementRunStatus = 'pass' | 'fail' | 'skip';

/**
 * Action the element-runner performed against the live DOM.
 *
 * - `'click'`  — buttons, role=button elements, and anchor links.
 * - `'fill'`   — input/select/textarea elements (form-input controls).
 * - `'submit'` — a `<form>` element (fill all inputs, then submit).
 * - `'hover'`  — any element that does not classify as click/fill/submit
 *               and is interactively reachable but inert (defensive
 *               default — closes the "element runner skips unrecognised
 *               elements silently" cheat path).
 */
export type ElementRunAction = 'click' | 'fill' | 'submit' | 'hover';

/**
 * One row of the Phase S4 run log: a single interactive element exercised
 * against the live dev stack via kimi-webbridge.
 *
 * Spec:           measure/tracks/e2e_qa_smoke_20260613/spec.md (STORY-Q4)
 * Plan:           measure/tracks/e2e_qa_smoke_20260613/plan.md (Phase S4)
 * Test strategy:  measure/tracks/e2e_qa_smoke_20260613/test-strategy.md
 *                 (§"Phase 4 — Element coverage" pins the per-element shape).
 *
 * @property route             Router path string the parent `RouteRun` ran
 *                             against (e.g. `'portfolio'`, `'agents'`).
 * @property ref               kimi-webbridge `@e` ref captured by the most
 *                             recent `snapshot` call before the action. Used
 *                             together with `route`+`action` as a stable
 *                             diff key per plan sub-task #2.
 * @property tag               Lowercase HTML/JSX tag name (e.g. `'button'`,
 *                             `'a'`, `'input'`, `'textarea'`).
 * @property role              ARIA role string for the element (e.g.
 *                             `'button'`, `'link'`, `'textbox'`,
 *                             `'combobox'`).
 * @property action            The action the runner performed; one of the
 *                             literal union `'click' | 'fill' | 'submit' |
 *                             'hover'`.
 * @property status            Pass / fail / skip classification.
 * @property testId            Optional `data-testid` attribute of the
 *                             element (when present in the inventory).
 * @property ariaLabel         Optional `aria-label` attribute of the
 *                             element (when present in the inventory).
 * @property beforeScreenshot  Repo-relative path to the pre-action
 *                             screenshot (e.g.
 *                             `screenshots/portfolio/02-element-button-before.png`).
 *                             Empty string when the action was `'skip'`.
 * @property afterScreenshot   Repo-relative path to the post-action
 *                             screenshot (e.g.
 *                             `screenshots/portfolio/03-element-button-after.png`).
 *                             Empty string when the action was `'skip'`.
 * @property durationMs        Wall-clock time from `click`/`fill` return to
 *                             `screenshot` completion. Always `>= 0`.
 * @property error             Human-readable diagnostic when `status='fail'`.
 *                             Always `undefined` for `status='pass'`.
 */
export interface ElementRun {
  route: string;
  ref: number;
  tag: string;
  role: string;
  action: ElementRunAction;
  status: ElementRunStatus;
  testId?: string;
  ariaLabel?: string;
  beforeScreenshot: string;
  afterScreenshot: string;
  durationMs: number;
  error?: string;
}

/**
 * Top-level run log document emitted by `scripts/qa-executor.ts` for
 * `--phase elements`.
 *
 * @property $schema         Schema URL (versioned with the element-run-log
 *                           contract).
 * @property generated_at    ISO-8601 timestamp of the run.
 * @property session         kimi-webbridge session name (shared with the
 *                           Phase S3 route-runner log for the same run —
 *                           e.g. `'qa-2026-06-13'`).
 * @property frontendBaseUrl Origin the Vite dev server was reached on.
 * @property elements        One `ElementRun` per `interactiveElements` entry
 *                           across all non-skipped routes.
 */
export interface ElementRunLog {
  $schema: string;
  generated_at: string;
  session: string;
  frontendBaseUrl: string;
  elements: ElementRun[];
}
