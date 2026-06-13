# Plan: E2E QA/QC Smoke Test (Kimi WebBridge)

> **Sprint:** 2026-06-13 — goal: 100% route coverage with element-level smoke test via Kimi WebBridge.
> **Stories:** Q1 (inventory), Q2 (dev stack), Q3 (routes), Q4 (elements), Q5 (nav), Q6 (findings), Q7 (report).
> **Plan shape:** one phase per story (S1–S7), Contract-First sub-task pipeline preserved.

## Phase S1: Build the route and element inventory _(STORY-Q1, M, Must)_

### Contract & Schema Definition
- [~] Task: Define `RouteInventory` and `InventoryElement` types. _(File: `scripts/types.ts`)_ — **Red landed 2026-06-13:** module created with `InventoryElement = {role, tag, testId?, ariaLabel?, text?}` and `RouteEntry.interactiveElements: InventoryElement[]` (array, not the current `number` count) so the contract test has a concrete shape to import.
- [~] Task: Document the inventory generator inputs/outputs. _(File: `scripts/build-inventory.ts` header)_ — **Deferred to GREEN:** the existing header (lines 1–15) already names the I/O at high level; the array-of-`InventoryElement` contract belongs in the GREEN rewrite of the parser since the Red role cannot modify the existing source.

### Test
- [~] Task: Write a contract test that asserts the inventory has 38 entries (one per router.tsx path) and each entry has at least one `interactiveElements` item (or zero with a `// no-interactive` marker). _(File: `scripts/build-inventory.contract.test.ts`)_ — **Red landed 2026-06-13:** added `build-inventory.contract.test.ts` next to the existing happy-path test. Asserts (a) types are importable from `./types`, (b) every route's `interactiveElements` is an `Array`, (c) every non-redirect route has `≥1` element OR `noInteractive === true`, (d) every element has string `role`+`tag` matching `InventoryElement`. Existing `build-inventory.test.ts` (5 pass) is **left untouched** so the looser-shape contract keeps protecting today's behaviour while the contract test drives the array shape needed by phases S3–S4. Red command + fail evidence below.

#### Red Phase Evidence

```
$ PATH="$HOME/.bun/bin:$PATH" bun test ./measure/tracks/e2e_qa_smoke_20260613/scripts/build-inventory.contract.test.ts
 6 pass / 6 fail (12 tests, 16 expect() calls) — bun test v1.3.14
```

**In-memory contract block** (`buildInventory()` output):
1. **`emits interactiveElements as an Array on every route (not a count number)`** — fails because `buildInventory()` emits `interactiveElements: 0 | 1` for all 38 routes (`typeof === 'number'`).
2. **`every non-redirect route has ≥1 interactiveElements OR noInteractive=true`** — fails for all 35 interactive routes because their element list is the number `1` (no items, no marker).
3. **`redirect routes (/, settings, *) carry the noInteractive marker`** — fails for the 3 redirects which currently emit `interactiveElements: 0` and no `noInteractive` flag.

**On-disk artifact block** (`route-inventory.json` + snapshot — strengthened 2026-06-13 attempt-3 so the GREEN parser fix is not the only deliverable):
4. **`route-inventory.json: every route has interactiveElements as an Array`** — fails because the committed JSON has `interactiveElements: 0 | 1` on every route. Forces GREEN to regenerate the artifact, not just the parser.
5. **`route-inventory.snapshot.json: every route has interactiveElements as an Array`** — fails identically on the committed snapshot copy. Forces GREEN to refresh `route-inventory.snapshot.json` (the idempotency reference) in the same commit.
6. **`route-inventory.json: redirect routes carry noInteractive=true`** — fails because the 3 redirect rows in the JSON omit the marker. Pairs with assertion 3 to keep the on-disk and in-memory contracts in lock-step.

The 6 passes are intentional sentinels (not vacuous Red-phase noise):
- **`exposes RouteInventory + RouteEntry + InventoryElement types from ./types`** — proves the new `scripts/types.ts` module is resolvable; the contract test depends on it.
- **`every interactiveElements item matches the InventoryElement shape`** — vacuously passes today (the value is a number, so the loop iterates zero items). Activates once GREEN populates the array.
- **`route-inventory.json exists on disk`** + **`route-inventory.snapshot.json exists on disk`** — guards against accidental deletion of the Phase S1 deliverables.
- **`route-inventory.json contains 38 routes`** — guards against accidental row-count drift.
- **`route-inventory.json and snapshot must match structurally (modulo generated_at)`** — already-green idempotency guard inherited from the existing happy-path test; mirrored here so the contract test is self-contained.

These failures are exactly the gap test-strategy.md §"Reference Inventory Snapshot" line 164 calls out: `interactiveElements: [{ testId?, ariaLabel?, role, tag, text? }]`. The GREEN role owns lifting the parser from count-only to a JSX/TSX element walker **and** regenerating the on-disk artifacts; the LIVE coverage gate that proves the array is populated correctly is `Phase S3` (`qa-routes.json` snapshot ref count) per test-strategy §"Phase 3 — Route coverage". The existing `build-inventory.test.ts` (5 pass) is intentionally untouched so today's count-shape stays protected until GREEN lands.

### Implement
- [ ] Task: Walk `frontend/src/router.tsx` programmatically (regex on `path:` and `element:` lines) to extract every path/component pair.
- [ ] Task: For each component path, parse the JSX/TSX for `<button>`, `<a>`, `<input>`, `<select>`, `<textarea>`, `[role=button]`, `[role=tab]`, `[role=menu]`, `[data-testid=...]`, `[aria-label=...]` and emit a list per route.
- [ ] Task: Emit `route-inventory.md` (table) and `route-inventory.json` (machine).
- [ ] Task: Copy the JSON to `route-inventory.snapshot.json` for idempotency diff.

### Generate Docs & Doctor
- [ ] Task: `bun run scripts/build-inventory.ts` and `diff -q route-inventory.json route-inventory.snapshot.json` — must be empty.

## Phase S2: Prepare the QA daemon and dev stack _(STORY-Q2, S, Must)_

### Contract & Schema Definition
- [ ] Task: Define the dev-stack probe command sequence in `scripts/qa-executor.ts`.

### Test
- [ ] Task: Contract test that the probe function returns `{ frontend: bool, pivot: bool, convex: bool, kimi: { running: bool, extensionConnected: bool } }` for a fake runner.

### Implement
- [ ] Task: `probeStack()` — curl `http://localhost:5173`, `http://localhost:8081/api/health`, read `CONVEX_DEPLOYMENT`, call `~/.kimi-webbridge/bin/kimi-webbridge status`.
- [ ] Task: Halt with a clear remediation message if any probe fails (e.g., "kimi-webbridge extension not connected — open your browser and retry").
- [ ] Task: If `kimi` reports `extension_connected: false`, file a `Q-FIND-001` finding with severity High and skip Phases S3-S5 with a recorded `skipped: true` reason. Do NOT abort the track — the inventory + findings infra are still useful for next time.

### Generate Docs & Doctor
- [ ] Task: Run the probe and record the result in `metadata.json.qa_probe`.

## Phase S3: Drive every route through the browser _(STORY-Q3, L, Must)_

### Contract & Schema Definition
- [ ] Task: Define `RouteRun` shape: `{ path, component, status: 'pass'|'fail'|'skip', httpStatus?, title, screenshotPath, snapshotRefs: number, durationMs, error? }`. _(File: `scripts/types.ts`)_

### Test
- [ ] Task: Contract test that the route-runner visits all 38 inventory entries and writes one `RouteRun` per entry.

### Implement
- [ ] Task: `runRoutes(inventory)` — for each route:
  - `kimi-webbridge navigate` with `newTab:false` (or `find_tab` for the current QA session).
  - Wait for `domcontentloaded` (poll via `evaluate`).
  - `snapshot` → record ref count.
  - `screenshot` to `screenshots/<route-slug>/01-route.png`.
  - Record `title` and compare to expected component name (substring match OK).
- [ ] Task: Per-route `RouteRun` written to `runs/qa-routes-<ts>.json`.

### Generate Docs & Doctor
- [ ] Task: Aggregate `RouteRun` statuses; print pass/fail histogram; exit 0 if ≥95% pass.

## Phase S4: Exercise every interactive element _(STORY-Q4, XL, Must)_

### Contract & Schema Definition
- [ ] Task: Define `ElementRun` shape: `{ route, ref, tag, role, action: 'click'|'fill'|'submit'|'hover', status, beforeScreenshot?, afterScreenshot?, error? }`.

### Test
- [ ] Task: Contract test that the element-runner visits every `interactiveElements` entry and produces a corresponding `ElementRun`.

### Implement
- [ ] Task: `runElements(inventory, routeRuns)` — for each route's element list:
  - Navigate to the route (reuse S3's session).
  - For each element:
    - **button / role=button / link** → `click` (with `evaluate` fallback for `isTrusted`-gated sites).
    - **input / select / textarea** → `fill` with `smoke-test-<timestamp>` (revert after).
    - **form** → `fill` all inputs then click submit.
    - Screenshot `before` and `after` the action.
- [ ] Task: Per-element `ElementRun` written to `runs/qa-elements-<ts>.json`. Each `ElementRun` is keyed by `(route, ref, action)` for diffing.

### Generate Docs & Doctor
- [ ] Task: Aggregate `ElementRun` statuses; print pass/fail/timeout histogram.

## Phase S5: Validate cross-route navigation and back-button _(STORY-Q5, M, Should)_

### Contract & Schema Definition
- [ ] Task: Define `NavScenario` shape: `{ name, fromPath, clickTarget, expectedPath, expectedComponent? }`.

### Test
- [ ] Task: Contract test for the 5 scenarios: portfolio→project→back, settings→app, deep-link to non-existent project, deep-link to settings, 404 wildcard.

### Implement
- [ ] Task: `runNavigation(scenarios)` — for each scenario:
  - Navigate to `fromPath`.
  - Click the target link/button.
  - Verify the resulting URL matches `expectedPath` (via `evaluate(() => location.pathname)`).
  - Verify the page component name matches.
  - Test browser back via `evaluate(() => history.back())` and verify state preservation.
- [ ] Task: Per-scenario `NavResult` written to `runs/qa-navigation-<ts>.json`.

### Generate Docs & Doctor
- [ ] Task: Aggregate pass/fail; print failed scenarios with their diff.

## Phase S6: Capture findings and file tech-debt rows _(STORY-Q6, M, Must)_

### Contract & Schema Definition
- [ ] Task: Define `Finding` shape: `{ id: 'Q-FIND-NNN', route, element?, action, severity, expected, actual, screenshotPath, reproSteps[] }`. _(File: `scripts/types.ts`)_

### Test
- [ ] Task: Contract test that any failed `RouteRun`, `ElementRun`, or `NavResult` produces a `Finding`, and any uncaught console error produces a `Finding` with severity High.

### Implement
- [ ] Task: `generateFindings(routes, elements, nav)` — for each failed status, append a `Finding` to `findings.md` with the contract shape and a deterministic ID (`Q-FIND-001`, `Q-FIND-002`, ...).
- [ ] Task: For each `Finding`, append a new row to `measure/tech-debt.md` (in the Open Tech Debt section) with `Q-FIND-NNN` ID and a description linking to the finding file.
- [ ] Task: Capture console errors via `network` cmd (kimi-webbridge exposes this) and `evaluate` listening for `window.addEventListener('error', ...)`.

### Generate Docs & Doctor
- [ ] Task: Print the finding histogram; exit 0 if no Critical findings, exit 1 if any Critical.

## Phase S7: Produce the coverage report and demo _(STORY-Q7, S, Should)_

### Contract & Schema Definition
- [ ] Task: Define the `coverage-report.md` template (sections, tables).

### Test
- [ ] Task: Contract test that the report contains: routes covered, elements exercised, pass/fail/breakdown, severity histogram, top-3 findings, screenshot index.

### Implement
- [ ] Task: `writeCoverageReport(routes, elements, nav, findings)` — render `coverage-report.md`.
- [ ] Task: `writeScreenshotIndex(screenshotsDir)` — produce `screenshots/INDEX.md` (table of `<route> | <element> | <screenshot path>`).
- [ ] Task: Update `metadata.json.qa_coverage` and `metadata.json.findings_count`.

### Generate Docs & Doctor
- [ ] Task: Print the report path; the demo-ready artifact is `coverage-report.md` + `screenshots/INDEX.md`.

## Cross-Cutting: Risk and Rollback

- The Kimi WebBridge session is a `qa-<date>` browser tab group; `close_session` is called in `finally` blocks so a Ctrl-C does not leave ghost tabs.
- The executor never modifies production code paths; it only writes to `measure/tracks/e2e_qa_smoke_20260613/`.
- If a Phase S3-S5 run is interrupted, the partial JSON files are kept and the next run uses `--resume` to pick up where it left off.
