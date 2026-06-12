# Plan: E2E QA/QC Smoke Test (Kimi WebBridge)

> **Sprint:** 2026-06-13 — goal: 100% route coverage with element-level smoke test via Kimi WebBridge.
> **Stories:** Q1 (inventory), Q2 (dev stack), Q3 (routes), Q4 (elements), Q5 (nav), Q6 (findings), Q7 (report).
> **Plan shape:** one phase per story (S1–S7), Contract-First sub-task pipeline preserved.

## Phase S1: Build the route and element inventory _(STORY-Q1, M, Must)_

### Contract & Schema Definition
- [ ] Task: Define `RouteInventory` and `InventoryElement` types. _(File: `scripts/types.ts`)_
- [ ] Task: Document the inventory generator inputs/outputs. _(File: `scripts/build-inventory.ts` header)_

### Test
- [ ] Task: Write a contract test that asserts the inventory has 38 entries (one per router.tsx path) and each entry has at least one `interactiveElements` item (or zero with a `// no-interactive` marker). _(File: `scripts/build-inventory.test.ts`)_

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
