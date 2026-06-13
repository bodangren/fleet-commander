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
