# Plan: E2E QA/QC Smoke Test (Kimi WebBridge)

> **Sprint:** 2026-06-13 — goal: 100% route coverage with element-level smoke test via Kimi WebBridge.
> **Stories:** Q1 (inventory), Q2 (dev stack), Q3 (routes), Q4 (elements), Q5 (nav), Q6 (findings), Q7 (report).
> **Plan shape:** one phase per story (S1–S7), Contract-First sub-task pipeline preserved.

## Phase S1: Build the route and element inventory _(STORY-Q1, M, Must)_

### Contract & Schema Definition
- [x] Task: Define `RouteInventory` and `InventoryElement` types. _(File: `scripts/types.ts`)_ — **Red landed 2026-06-13:** module created with `InventoryElement = {role, tag, testId?, ariaLabel?, text?}` and `RouteEntry.interactiveElements: InventoryElement[]` (array, not the current `number` count) so the contract test has a concrete shape to import. **GREEN landed 2026-06-13** (`a550d1b`): types consumed by the rewritten parser; no changes to `types.ts` itself.
- [x] Task: Document the inventory generator inputs/outputs. _(File: `scripts/build-inventory.ts` header)_ — **GREEN landed 2026-06-13** (`a550d1b`): header updated with JSX element extraction docs; JSDoc on `parseInteractiveElements` and `extractJsxTags` documents the I/O contract.

### Test
- [x] Task: Write a contract test that asserts the inventory has 38 entries (one per router.tsx path) and each entry has at least one `interactiveElements` item (or zero with a `// no-interactive` marker). _(File: `scripts/build-inventory.contract.test.ts`)_ — **Red landed 2026-06-13:** added `build-inventory.contract.test.ts` next to the existing happy-path test. Asserts (a) types are importable from `./types`, (b) every route's `interactiveElements` is an `Array`, (c) every non-redirect route has `≥1` element OR `noInteractive === true`, (d) every element has string `role`+`tag` matching `InventoryElement`. Existing `build-inventory.test.ts` (5 pass) is **left untouched** so the looser-shape contract keeps protecting today's behaviour while the contract test drives the array shape needed by phases S3–S4. **Red strengthen 2026-06-13 (round 3):** added a third `describe` block, "JSX element extraction — concrete page parsing", with 5 source-rooted assertions that would still fail against a "synthetic placeholder array" GREEN cheat (e.g. emitting `[{role:'button',tag:'button'}]` for every route without parsing JSX). Each assertion is grounded in a literal attribute or tag in a specific page source file — sub-task #2 ("parse the JSX/TSX for `<button>`, `<a>`, `<input>`, `<select>`, `<textarea>`, `[role=button]`, `[role=tab]`, `[role=menu]`, `[data-testid=...]`, `[aria-label=...]`") cannot pass without an actual JSX walker. **Red strengthen 2026-06-13 (round 4, mid-attempt 4):** added a 6th source-rooted assertion to the JSX block — `<a href>` link parsing anchored to `KanbanBoardPage.tsx:191` (`<a href="/sprint-planning">Create one</a>`). Closes the largest remaining cheat path in sub-task #2's native tag list (rounds 1–3 covered `<button>` + `<textarea>` + `data-testid` + `aria-label`; `<a>` was untested and categorically distinct because it drives **navigation**, not local interaction). Pairs with Phase S5 `runNavigation()` as the live gate, not Phase S3/S4 like rounds 1–3. Red command + fail evidence below.

#### Red Phase Evidence

```
$ PATH="$HOME/.bun/bin:$PATH" bun test ./measure/tracks/e2e_qa_smoke_20260613/scripts/build-inventory.contract.test.ts
 6 pass / 12 fail (18 tests, 22 expect() calls) — bun test v1.3.14  [after round 4]
 6 pass / 11 fail (17 tests, 21 expect() calls) — bun test v1.3.14  [after round 3, historical]
```

**In-memory contract block** (`buildInventory()` output):
1. **`emits interactiveElements as an Array on every route (not a count number)`** — fails because `buildInventory()` emits `interactiveElements: 0 | 1` for all 38 routes (`typeof === 'number'`).
2. **`every non-redirect route has ≥1 interactiveElements OR noInteractive=true`** — fails for all 35 interactive routes because their element list is the number `1` (no items, no marker).
3. **`redirect routes (/, settings, *) carry the noInteractive marker`** — fails for the 3 redirects which currently emit `interactiveElements: 0` and no `noInteractive` flag.

**On-disk artifact block** (`route-inventory.json` + snapshot — strengthened 2026-06-13 attempt-3 so the GREEN parser fix is not the only deliverable):
4. **`route-inventory.json: every route has interactiveElements as an Array`** — fails because the committed JSON has `interactiveElements: 0 | 1` on every route. Forces GREEN to regenerate the artifact, not just the parser.
5. **`route-inventory.snapshot.json: every route has interactiveElements as an Array`** — fails identically on the committed snapshot copy. Forces GREEN to refresh `route-inventory.snapshot.json` (the idempotency reference) in the same commit.
6. **`route-inventory.json: redirect routes carry noInteractive=true`** — fails because the 3 redirect rows in the JSON omit the marker. Pairs with assertion 3 to keep the on-disk and in-memory contracts in lock-step.

**JSX element extraction block** (Red round 3, 2026-06-13 — closes the synthetic-placeholder cheat path):
7. **`/ops route inventory contains an element with testId="ops-page"`** — fails because `OpsPage.tsx:107` has `<section data-testid="ops-page">` but the parser emits no elements at all (the in-memory value is a number). Forces GREEN to walk the page source and extract `data-testid` string-literal attributes — a synthetic `[{role:'button',tag:'button'}]` placeholder cannot satisfy this.
8. **`/ops route inventory contains at least one element with tag="button"`** — fails for the same reason; `OpsPage.tsx:45` has a native `<button type="button">` inside the `TabButton` component definition. Forces GREEN to detect native HTML tag names, not just data-testid attributes.
9. **`/ops/simulate route inventory contains an element with testId="simulate-page"`** — fails because `SimulatePage.tsx:113` has `<div data-testid="simulate-page">`. Proves the parser handles **multiple** page sources (not just OpsPage), preventing a one-page hard-coded GREEN.
10. **`/ops/simulate route inventory contains an element with tag="textarea"`** — fails because `SimulatePage.tsx:134` has a native `<textarea ... data-testid="weights-json-input">`. Forces GREEN to cover the full tag set from sub-task #2 (button + a + input + select + textarea), not just `<button>`.
11. **`/agents/:name/edit route inventory contains an element with ariaLabel="Name"`** — fails because `AgentEditorPage.tsx:191` has `aria-label="Name"` on the editor's name input. Closes the last attribute path from sub-task #2 (`[aria-label=...]`) and proves the parser handles `:param` route paths the same as static ones.

**JSX element extraction block — round 4 anchor** (Red round 4, 2026-06-13 mid-attempt-4 — closes the `<a href>` cheat path):
12. **`/board route inventory contains at least one element with tag="a"`** — fails because `KanbanBoardPage.tsx:191` has `<a href="/sprint-planning" className="...">Create one</a>` but the parser emits `interactiveElements: 1` (a number) for the `/board` route. `Array.isArray` guard short-circuits the filter to `[]`, so `length >= 1` fails ("Expected: >= 1, Received: 0"). Closes the largest remaining cheat path in sub-task #2's native tag list: rounds 1–3 covered `<button>`, `<textarea>`, `data-testid`, `aria-label`, but `<a>` had no anchor and a GREEN parser could skip the entire link-extraction path. Critically, `<a href>` is categorically distinct — it drives **navigation** (Phase S5 cross-route runner), not local interaction (Phase S3/S4 element runner), so a parser that only handles form-input elements would still leave Phase S5 with no link refs to drive.

The 6 passes are intentional sentinels (not vacuous Red-phase noise):
- **`exposes RouteInventory + RouteEntry + InventoryElement types from ./types`** — proves the new `scripts/types.ts` module is resolvable; the contract test depends on it.
- **`every interactiveElements item matches the InventoryElement shape`** — vacuously passes today (the value is a number, so the loop iterates zero items). Activates once GREEN populates the array.
- **`route-inventory.json exists on disk`** + **`route-inventory.snapshot.json exists on disk`** — guards against accidental deletion of the Phase S1 deliverables.
- **`route-inventory.json contains 38 routes`** — guards against accidental row-count drift.
- **`route-inventory.json and snapshot must match structurally (modulo generated_at)`** — already-green idempotency guard inherited from the existing happy-path test; mirrored here so the contract test is self-contained.

These failures are exactly the gap test-strategy.md §"Reference Inventory Snapshot" line 164 calls out: `interactiveElements: [{ testId?, ariaLabel?, role, tag, text? }]`. The GREEN role owns lifting the parser from count-only to a JSX/TSX element walker **and** regenerating the on-disk artifacts; the LIVE coverage gate that proves the array is populated correctly is `Phase S3` (`qa-routes.json` snapshot ref count) per test-strategy §"Phase 3 — Route coverage". The existing `build-inventory.test.ts` (5 pass) is intentionally untouched so today's count-shape stays protected until GREEN lands.

**Live-behaviour pairing note for round-3 assertions (7–11):** the in-memory + on-disk assertions form the static contract; the live gate is Phase S3's `runRoutes()` which iterates `interactiveElements` against the real browser via kimi-webbridge `snapshot`/`click`/`fill`. If GREEN emits an element with `testId: 'ops-page'` that does not actually exist in the rendered DOM, the Phase S3 `snapshotRefs` count will drift and qa-routes.json will record a fail. The round-3 assertions are therefore source-static (regex/AST against the page file) while Phase S3 is runtime-live; both are required and neither replaces the other.

**Live-behaviour pairing note for round-4 assertion (12):** the `<a href>` static anchor pairs with Phase S5 `runNavigation()` (test-strategy §"Phase 5 — Cross-route nav"), **not** Phase S3/S4. Rationale: rounds 1–3 anchors target buttons/form-inputs that the **element runner** clicks/fills locally; the round-4 `<a href>` anchor targets a **navigation link** that the **navigation runner** follows to a new route, then asserts URL transition. If GREEN emits a phantom `<a>` whose `href` does not resolve in the rendered DOM, Phase S5's `expectedPath` check fails and qa-navigation.json records the defect. The two live gates (S3/S4 vs S5) are complementary: one proves the element exists and reacts, the other proves the link navigates correctly. Both are required.

**Mid-attempt 4 (round 4, 2026-06-13):** worktree was clean at MID start (`git status --porcelain` empty), branch `fix/review-36h-orchestrator-notifications`, HEAD `5489751`. Re-ran the targeted Red command and confirmed the inherited 11-fail baseline still held identically. Added exactly one new test (`/board route ... tag="a"`) inside the existing JSX extraction `describe` block; this fails for the expected reason ("Expected: >= 1, Received: 0") because the parser emits the number `1` and `elementsOf()` short-circuits to `[]`. New fail count: **12 fail / 6 pass / 22 expect()** (was 11/6/21). No other source files touched; `graph.db` deliberately not updated per `(red_phase_boundary)` + TD-251. Net diff for this mid: 2 paths — `build-inventory.contract.test.ts` (+ ~80 lines: one assertion + its JSDoc-anchored cheat-path explanation) and `plan.md` (this Red Phase Evidence block).

**Supervisor fix (mid-attempts 2–3, 2026-06-13):** mid-attempt-1 was blocked because it appended a follow-up `chore(graph): update graph.db ...` commit to its own Red commit. Mid-attempt-2 dropped that commit but the supervisor still flagged `graph.db` because its diff window started at the previous Red test commit (`685dcb1`) and a second `chore(graph): ...` commit (`13cab3f`, from the prior role's round-2 mid) was still inside the window. Mid-attempt-3 rebased to drop `13cab3f` as well (`git rebase --onto 685dcb1 13cab3f HEAD`); the two test+docs commits replayed cleanly on top (`3ef0044` test + new docs commit). The Red test commit's 5 source-rooted JSX-extraction assertions and the plan evidence above are unchanged across all three attempts. Net diff vs `685dcb1` now lists exactly four paths — `build-inventory.contract.test.ts`, `plan.md`, `lessons-learned.md`, `tech-debt.md` — all test/Measure. Graph sync is permanently deferred to GREEN/REVIEW per new lesson `(red_phase_boundary)` + TD-251.

### Implement
- [x] Task: Walk `frontend/src/router.tsx` programmatically (regex on `path:` and `element:` lines) to extract every path/component pair. — **GREEN landed 2026-06-13** (`a550d1b`): `parseRouter()` unchanged; brace-aware `extractJsxTags()` added for page parsing.
- [x] Task: For each component path, parse the JSX/TSX for `<button>`, `<a>`, `<input>`, `<select>`, `<textarea>`, `[role=button]`, `[role=tab]`, `[role=menu]`, `[data-testid=...]`, `[aria-label=...]` and emit a list per route. — **GREEN landed 2026-06-13** (`a550d1b`): `parseInteractiveElements()` with brace-aware tag extraction, native + component-level interactive detection, and `data-testid`/`aria-label` on any element.
- [x] Task: Emit `route-inventory.md` (table) and `route-inventory.json` (machine). — **GREEN landed 2026-06-13** (`a550d1b`): both regenerated with `InventoryElement[]` arrays.
- [x] Task: Copy the JSON to `route-inventory.snapshot.json` for idempotency diff. — **GREEN landed 2026-06-13** (`a550d1b`): snapshot regenerated; idempotency check normalized for `generated_at`.

### Generate Docs & Doctor
- [x] Task: `bun run scripts/build-inventory.ts` and `diff -q route-inventory.json route-inventory.snapshot.json` — must be empty. — **GREEN landed 2026-06-13** (`a550d1b`): build script runs cleanly; snapshot idempotency verified.

## Phase S2: Prepare the QA daemon and dev stack _(STORY-Q2, S, Must)_

### Contract & Schema Definition
- [x] Task: Define the dev-stack probe command sequence in `scripts/qa-executor.ts`. — **Red landed 2026-06-13:** contract test imports `PROBE_COMMANDS` constant + `ProbeRunner` interface from `./qa-executor`; both fail to resolve until GREEN creates the module. **GREEN landed 2026-06-13** (`06cf94d`): `PROBE_COMMANDS` object with exact URL/env/binary literals; `ProbeRunner` interface with `httpGet`/`readEnv`/`spawnKimi`.

### Test
- [x] Task: Contract test that the probe function returns `{ frontend: bool, pivot: bool, convex: bool, kimi: { running: bool, extensionConnected: bool } }` for a fake runner. — **Red landed 2026-06-13:** `qa-executor.contract.test.ts` injects a fake `ProbeRunner` (DI per `(bun_mock_module)` lesson) and asserts the exact return shape. **GREEN landed 2026-06-13** (`06cf94d`): 35 pass / 0 fail / 77 expect() calls.

### Implement
- [x] Task: `probeStack()` — curl `http://localhost:5173`, `http://localhost:8081/api/health`, read `CONVEX_DEPLOYMENT`, call `~/.kimi-webbridge/bin/kimi-webbridge status`. — **Red landed 2026-06-13:** fake-runner assertions pin the exact command paths (URL strings + binary path). **GREEN landed 2026-06-13** (`06cf94d`): `probeStack(runner)` calls `runner.httpGet`/`readEnv`/`spawnKimi` with `PROBE_COMMANDS` literals; returns `ProbeResult` with camelCase `extensionConnected`.
- [x] Task: Halt with a clear remediation message if any probe fails (e.g., "kimi-webbridge extension not connected — open your browser and retry"). — **Red landed 2026-06-13:** `formatRemediation()` contract test pins the per-probe remediation strings. **GREEN landed 2026-06-13** (`06cf94d`): `formatRemediation(result)` returns per-probe messages containing anchor phrases; empty string when all green.
- [x] Task: If `kimi` reports `extension_connected: false`, file a `Q-FIND-001` finding with severity High and skip Phases S3-S5 with a recorded `skipped: true` reason. Do NOT abort the track — the inventory + findings infra are still useful for next time. — **Red landed 2026-06-13:** `handleKimiDisconnected()` contract test asserts the finding shape + `skipPhases: ['S3','S4','S5']` + `skipped: true` marker. **GREEN landed 2026-06-13** (`06cf94d`): `handleKimiDisconnected(result)` returns `{ finding, skipPhases, skipped, reason }` conforming to Phase S6 `Finding` shape; does not throw.

### Generate Docs & Doctor
- [x] Task: Run the probe and record the result in `metadata.json.qa_probe`. — **Red landed 2026-06-13:** `writeProbeResult()` contract test exercises the writer against a tmpfile metadata target (snake_case `extension_connected` on disk, camelCase in-memory). **GREEN landed 2026-06-13** (`06cf94d`): `writeProbeResult(path, result)` reads existing metadata, sets `qa_probe` with snake_case `extension_connected`, writes back preserving all keys; idempotent.

#### Red Phase Evidence

```
$ PATH="$HOME/.bun/bin:$PATH" bun test ./measure/tracks/e2e_qa_smoke_20260613/scripts/qa-executor.contract.test.ts
 0 pass / 1 fail / 1 error — bun test v1.3.14
 error: Cannot find module './qa-executor' from '.../scripts/qa-executor.contract.test.ts'
```

The single aggregate failure is the strongest possible Red signal: **30 individual contract assertions across 7 `describe` blocks all block on the module's existence.** Bun's loader counts a missing-module import as one test failure regardless of how many `it()` blocks the file declares — there is no executable shape for the per-test assertions to discriminate against until GREEN creates `scripts/qa-executor.ts`.

Contract surface pinned by the file (all 30 assertions will turn into individual targeted fails the moment GREEN adds a stub module, even before any logic is implemented):

**Block 1 — `PROBE_COMMANDS contract (exact paths)` — 5 assertions.** Pins the literal probe targets per test-strategy.md §"Phase 2 — Dev stack health" and plan sub-task #3: `frontendUrl='http://localhost:5173'`, `pivotHealthUrl='http://localhost:8081/api/health'`, `convexEnvKey='CONVEX_DEPLOYMENT'`, `kimiBinary` path ends with `/.kimi-webbridge/bin/kimi-webbridge`, `kimiArgs=['status']`. Closes the "GREEN ships hard-coded literals that drift from the contract" cheat path — any future port/binary change breaks loudly here.

**Block 2 — `probeStack() contract shape` — 7 assertions.** Pins the plan-literal return shape `{ frontend: bool, pivot: bool, convex: bool, kimi: { running: bool, extensionConnected: bool } }` plus four behavioural axes: happy-path all-true; `convex=false` when `CONVEX_DEPLOYMENT` is unset OR empty string (test-strategy: `test -n "$CONVEX_DEPLOYMENT"`); `frontend=false` only when the Vite URL fails; `pivot=false` only when the health URL fails; `kimi.{running, extensionConnected}` propagates snake→camel from the spawn JSON.

**Block 3 — `fake runner intercepts the exact command paths` — 5 assertions.** Satisfies the MID prompt's fake-harness requirement: "prove the fake mode intercepts the exact command path or test the command string directly." Each fake method records its arguments in a per-instance array (`httpGetCalls`, `readEnvCalls`, `spawnCalls`); assertions check that probeStack invokes each URL/env-key/binary path **exactly once** and that **no extra** URLs or env keys leak through (set-membership check). This prevents a GREEN that "smoke-falls-back" to real network calls and a GREEN that accidentally double-calls.

**Block 4 — `formatRemediation() halt messages` — 6 assertions.** Pins one remediation string per failure mode (`frontend`, `pivot`, `convex`, `kimi-not-running`, `extension-not-connected`) plus an empty-string return when every probe is green. Anchored to the plan literal "kimi-webbridge extension not connected — open your browser and retry" via `toContain('extension not connected')` + `toContain('browser')`. Closes the "GREEN ships a generic 'probe failed' toast with no recovery path" cheat.

**Block 5 — `handleKimiDisconnected() filing Q-FIND-001 and skipping S3–S5` — 6 assertions.** Pins the plan sub-task #5 contract literal-for-literal: `finding.id === 'Q-FIND-001'`, `finding.severity === 'High'`, `finding.route.toLowerCase().includes('kimi')`, `(finding.expected + finding.actual).includes('extension_connected')`, `skipPhases === ['S3','S4','S5']` (declaration order, not sorted), `skipped === true` with non-empty `reason`, and **does NOT throw** (the plan requires graceful skip, not hard abort — "Do NOT abort the track"). Closes the "GREEN throws an exception on disconnect" cheat that would violate the do-not-abort clause.

**Block 6 — `writeProbeResult() metadata.json writer` — 4 assertions.** Pins the on-disk artifact contract while keeping the Red test hermetic via `mkdtempSync` per-test isolation. Assertions: snake_case `extension_connected` on disk (matches the kimi-webbridge wire format already present in `metadata.json`); preserves every unrelated key (`track_id`, `status`, `existing_field`); byte-equal idempotency on re-run; overwrites a stale `qa_probe` field rather than merging. The committed `measure/tracks/e2e_qa_smoke_20260613/metadata.json` is **never touched** by the test — satisfies the MID prompt: "Artifact or markdown assertions are allowed only when the phase deliverable is that artifact" + tmpfile pairing for hermetic execution.

**Block 7 — `Finding shape compatibility with Phase S6 contract` — 2 assertions.** Cross-phase compatibility guard: the `Finding` produced by Phase S2's `handleKimiDisconnected` must already conform to Phase S6's `{ id, route, action, severity, expected, actual, screenshotPath, reproSteps[] }` contract (plan Phase S6 sub-task #1) so the Phase S6 findings aggregator does not need to post-fill missing fields. Anchored to `id.match(/^Q-FIND-\d{3}$/)` to fix the literal Q-FIND-NNN ID format.

**Why this Red is failure-for-missing-behavior, not failure-for-stale-record** (per the MID prompt: "Red tests must fail because the current implementation is missing or wrong, not merely because a durable record is stale"):

- `scripts/qa-executor.ts` does not exist on disk (verified: `ls scripts/` shows only `build-inventory.{ts,test.ts,contract.test.ts}` + `types.ts` + the new `qa-executor.contract.test.ts`). The Red is **module-absent**, not field-stale.
- The pre-existing `metadata.json.qa_probe` block was hand-written outside any executor and serves only as a historical artifact; the writer-contract tests (block 6) use a `mkdtempSync` tmpfile so they do not reference the committed metadata.
- The pre-existing `Q-FIND-001` row in `findings.md` + `tech-debt.md` is about `history:listAgentHistory` (a Convex function gap from the prior manual QA pass), **not** about kimi-not-connected. The Red test asserts the *behaviour* of `handleKimiDisconnected()` (it produces a Finding with `id='Q-FIND-001'`), not that any particular line of `findings.md` says so. Resolving the ID collision is GREEN/REVIEW work (re-numbering the manual finding, or namespacing executor-produced findings under a distinct prefix); the Red test does not block on it.

**Build-graph baseline:** `build-graph stats ./graph.db` reports 5464 nodes / 7799 edges / 669 files. `build-graph search ./graph.db "qa-executor"`, `search "probeStack"`, `search "writeProbe"`, and `search "kimi"` all return **no results** — confirms the Red is greenfield (zero existing callers / no blast radius to manage). Per `(red_phase_boundary)` lesson, `graph.db` is NOT updated in this Red commit; the new test file produces no production callers and adding test-file entries to the graph during Red would violate TD-251's strict file-set check.

**Live-behaviour pairing note:** the contract surface above is the static gate. The live gate is the Phase S2 "Generate Docs & Doctor" sub-task: GREEN/REVIEW runs the actual `probeStack(realRunner)` against the running dev stack and records the result in the committed `metadata.json.qa_probe`. The fake-runner tests prove the wiring; the real-runner invocation proves the wiring is connected to the actual ports/binaries on the user's machine. Both are required; neither replaces the other.

**Sentinel pass count:** zero. Every assertion is gated on the same missing import, so this Red has no vacuous sentinels. Once GREEN adds a stub `qa-executor.ts` (e.g., `export const PROBE_COMMANDS = {} as any; export async function probeStack(): Promise<any> { throw 'unimplemented'; }`), the assertions will fan out into 30 individual targeted fails covering each contract clause — that fan-out is the moment Block 1 ("PROBE_COMMANDS exists") starts passing and Blocks 2–7 each fail with a specific shape/value mismatch.

**Dirty worktree context at MID start:** worktree clean (`git status --porcelain` empty), HEAD `562e68d` on branch `fix/review-36h-orchestrator-notifications`. No unrelated user work to preserve. Net diff for this Red commit: exactly two paths — `scripts/qa-executor.contract.test.ts` (new test) and `plan.md` (this Red Phase Evidence block + 6 `[~]` task markers). No source files modified; `build-graph update` deliberately skipped per `(red_phase_boundary)` + TD-251.

**Non-regression evidence:**

```
$ PATH="$HOME/.bun/bin:$PATH" bun test ./measure/tracks/e2e_qa_smoke_20260613/scripts/build-inventory.test.ts ./measure/tracks/e2e_qa_smoke_20260613/scripts/build-inventory.contract.test.ts
 23 pass / 0 fail / 29 expect() calls — bun test v1.3.14
```

The Phase S1 contract surface (already GREEN at `a550d1b`) is unaffected by adding the Phase S2 Red file.

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
