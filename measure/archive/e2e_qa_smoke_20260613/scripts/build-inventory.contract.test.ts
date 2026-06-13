/**
 * Contract test for the route+element inventory (Phase S1, STORY-Q1).
 *
 * Spec:           measure/archive/e2e_qa_smoke_20260613/spec.md (STORY-Q1)
 * Plan:           measure/archive/e2e_qa_smoke_20260613/plan.md (Phase S1)
 * Test strategy:  measure/archive/e2e_qa_smoke_20260613/test-strategy.md
 *                 (§"Reference Inventory Snapshot" line 164 fixes the
 *                  `interactiveElements: [{ testId?, ariaLabel?, role, tag,
 *                  text? }]` array shape this test enforces.)
 *
 * Why a separate test file from `build-inventory.test.ts`?
 *
 *   The original `build-inventory.test.ts` validates the *current* (Red-time)
 *   scaffold: 38 entries, snapshot stability, redirect counts, param counts.
 *   It treats `interactiveElements` as an opaque value (no shape check) so
 *   the scaffold-as-baseline check keeps protecting today's behaviour while
 *   we tighten the contract here.
 *
 *   This file enforces the *contract* the executor (Phases S3–S4) will rely
 *   on: an Array of `InventoryElement` objects, populated for every
 *   non-redirect route, with an explicit `noInteractive` marker on routes
 *   that intentionally have no elements (the 3 redirects).
 *
 * Red signal (expected failures at HEAD):
 *
 *   1. `interactiveElements is an array on every route` — fails because
 *      `buildInventory()` currently emits a count (`0 | 1`), not an array.
 *   2. `every non-redirect route has ≥1 element or noInteractive=true` —
 *      fails because the 35 interactive routes have no element items.
 *   3. `every element matches the InventoryElement shape` — fails because
 *      no element objects exist to inspect (the value is a number).
 *   4. `redirect routes carry noInteractive=true` — fails because the
 *      `/`, `settings`, and `*` redirects have neither items nor the marker.
 *
 * Live-behaviour pairing (per test-strategy §"Phase 3 — Route coverage"):
 *
 *   The contract this file enforces is consumed by `runRoutes()`/
 *   `runElements()` in Phase S3/S4, which iterate `interactiveElements`
 *   to drive `snapshot`/`click`/`fill` against the real browser via
 *   kimi-webbridge. The live gate that proves the array is populated
 *   *correctly* (refs are clickable, fills are accepted) is Phase S3's
 *   `qa-routes.json` snapshot ref count check, not this file.
 */
import { describe, expect, it } from 'bun:test';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { buildInventory } from './build-inventory';
import type {
  InventoryElement,
  RouteEntry,
  RouteInventory,
} from './types';

const TRACK_DIR = resolve(dirname(import.meta.path), '..');
const INVENTORY_JSON = join(TRACK_DIR, 'route-inventory.json');
const SNAPSHOT_JSON = join(TRACK_DIR, 'route-inventory.snapshot.json');

/**
 * Routes that legitimately have zero interactive elements. These must carry
 * `noInteractive: true` in the inventory so the QA executor does not flag
 * them as defects in Phase S4. Sourced from test-strategy.md
 * §"Reference Inventory Snapshot" rows 1 (`/` → PortfolioRedirect),
 * 12 (`/settings` → Navigate), and 38 (`/*` → Navigate).
 */
const REDIRECT_PATHS = new Set(['/', 'settings', '*']);

/**
 * Predicate guarding the shape declared by `InventoryElement` in `./types`.
 * Runtime guard because TypeScript types are erased before `bun test` runs.
 */
function isInventoryElement(value: unknown): value is InventoryElement {
  if (value === null || typeof value !== 'object') return false;
  const candidate = value as Record<string, unknown>;
  if (typeof candidate.role !== 'string' || candidate.role.length === 0) {
    return false;
  }
  if (typeof candidate.tag !== 'string' || candidate.tag.length === 0) {
    return false;
  }
  if (
    candidate.testId !== undefined &&
    typeof candidate.testId !== 'string'
  ) {
    return false;
  }
  if (
    candidate.ariaLabel !== undefined &&
    typeof candidate.ariaLabel !== 'string'
  ) {
    return false;
  }
  if (candidate.text !== undefined && typeof candidate.text !== 'string') {
    return false;
  }
  return true;
}

describe('inventory contract — interactiveElements array shape', () => {
  it('exposes RouteInventory + RouteEntry + InventoryElement types from ./types', () => {
    // Type-only imports are erased, so this assertion proves the module is
    // resolvable at runtime — the actual structural contract is enforced by
    // the following tests against `buildInventory()` output.
    const probe: Pick<RouteInventory, '$schema'> = { $schema: 'probe' };
    const entry: Pick<RouteEntry, 'path'> = { path: 'probe' };
    const element: InventoryElement = { role: 'button', tag: 'button' };
    expect(probe.$schema).toBe('probe');
    expect(entry.path).toBe('probe');
    expect(isInventoryElement(element)).toBe(true);
  });

  it('emits interactiveElements as an Array on every route (not a count number)', () => {
    const inv = buildInventory() as unknown as RouteInventory;
    const violations = inv.routes
      .filter((route) => !Array.isArray(route.interactiveElements))
      .map((route) => ({
        path: route.path,
        actualType: typeof route.interactiveElements,
      }));
    expect(violations).toEqual([]);
  });

  it('every non-redirect route has ≥1 interactiveElements OR noInteractive=true', () => {
    const inv = buildInventory() as unknown as RouteInventory;
    const offenders = inv.routes
      .filter((route) => !REDIRECT_PATHS.has(route.path))
      .filter((route) => {
        const elements = Array.isArray(route.interactiveElements)
          ? route.interactiveElements
          : [];
        const hasElements = elements.length >= 1;
        const hasMarker = route.noInteractive === true;
        return !hasElements && !hasMarker;
      })
      .map((route) => route.path);
    expect(offenders).toEqual([]);
  });

  it('every interactiveElements item matches the InventoryElement shape', () => {
    const inv = buildInventory() as unknown as RouteInventory;
    const malformed: Array<{ path: string; index: number; value: unknown }> = [];
    for (const route of inv.routes) {
      const elements = Array.isArray(route.interactiveElements)
        ? route.interactiveElements
        : [];
      elements.forEach((element, index) => {
        if (!isInventoryElement(element)) {
          malformed.push({ path: route.path, index, value: element });
        }
      });
    }
    expect(malformed).toEqual([]);
  });

  it('redirect routes (/, settings, *) carry the noInteractive marker', () => {
    const inv = buildInventory() as unknown as RouteInventory;
    const redirects = inv.routes.filter((route) =>
      REDIRECT_PATHS.has(route.path),
    );
    expect(redirects.length).toBe(REDIRECT_PATHS.size);
    const missingMarker = redirects
      .filter((route) => route.noInteractive !== true)
      .map((route) => route.path);
    expect(missingMarker).toEqual([]);
  });
});

/**
 * On-disk artifact contract: `route-inventory.json` is the actual deliverable
 * the QA executor (Phase S3/S4) reads. The in-memory `buildInventory()`
 * contract tests above are necessary but not sufficient — GREEN must also
 * regenerate the on-disk artifact so the committed `route-inventory.json`
 * and `route-inventory.snapshot.json` match the array shape.
 *
 * Red signal (expected failures at HEAD): the committed `route-inventory.json`
 * has `interactiveElements: 0 | 1` (a number) for every route and lacks
 * `noInteractive` on the 3 redirects — identical defect to the in-memory
 * shape but at a different boundary (file system, not function call).
 *
 * Live-behaviour pairing: the QA executor in Phase S3 reads
 * `route-inventory.json` from disk and dereferences
 * `route.interactiveElements[i]` to drive `click`/`fill` against the real
 * browser; if the file holds a number, the executor crashes on first route.
 * That is the live gate; this artifact test is the static contract guard.
 */
describe('on-disk inventory artifact contract — route-inventory.json + snapshot', () => {
  it('route-inventory.json exists on disk (Phase S1 deliverable)', () => {
    expect(existsSync(INVENTORY_JSON)).toBe(true);
  });

  it('route-inventory.snapshot.json exists on disk (idempotency reference)', () => {
    expect(existsSync(SNAPSHOT_JSON)).toBe(true);
  });

  it('route-inventory.json contains 38 routes (one per router.tsx entry)', () => {
    const raw = readFileSync(INVENTORY_JSON, 'utf8');
    const parsed = JSON.parse(raw) as RouteInventory;
    expect(parsed.routes.length).toBe(38);
  });

  it('route-inventory.json: every route has interactiveElements as an Array', () => {
    const raw = readFileSync(INVENTORY_JSON, 'utf8');
    const parsed = JSON.parse(raw) as RouteInventory;
    const violations = parsed.routes
      .filter((route) => !Array.isArray(route.interactiveElements))
      .map((route) => ({
        path: route.path,
        actualType: typeof (route as unknown as { interactiveElements: unknown })
          .interactiveElements,
      }));
    expect(violations).toEqual([]);
  });

  it('route-inventory.snapshot.json: every route has interactiveElements as an Array', () => {
    const raw = readFileSync(SNAPSHOT_JSON, 'utf8');
    const parsed = JSON.parse(raw) as RouteInventory;
    const violations = parsed.routes
      .filter((route) => !Array.isArray(route.interactiveElements))
      .map((route) => ({
        path: route.path,
        actualType: typeof (route as unknown as { interactiveElements: unknown })
          .interactiveElements,
      }));
    expect(violations).toEqual([]);
  });

  it('route-inventory.json: redirect routes carry noInteractive=true', () => {
    const raw = readFileSync(INVENTORY_JSON, 'utf8');
    const parsed = JSON.parse(raw) as RouteInventory;
    const redirects = parsed.routes.filter((route) =>
      REDIRECT_PATHS.has(route.path),
    );
    expect(redirects.length).toBe(REDIRECT_PATHS.size);
    const missingMarker = redirects
      .filter((route) => route.noInteractive !== true)
      .map((route) => route.path);
    expect(missingMarker).toEqual([]);
  });

  it('route-inventory.json and snapshot must match structurally (modulo generated_at)', () => {
    const fresh = JSON.parse(readFileSync(INVENTORY_JSON, 'utf8')) as RouteInventory;
    const snap = JSON.parse(readFileSync(SNAPSHOT_JSON, 'utf8')) as RouteInventory;
    // Normalize the timestamp so structural drift is detectable independent
    // of the regenerator's clock.
    const normFresh = { ...fresh, generated_at: 'STABLE' };
    const normSnap = { ...snap, generated_at: 'STABLE' };
    expect(JSON.stringify(normFresh)).toBe(JSON.stringify(normSnap));
  });
});

/**
 * JSX element extraction contract (Red round 3, 2026-06-13): closes the
 * "synthetic placeholder array" cheat path.
 *
 * Why this block exists:
 *
 *   The shape contracts above (round 1 + round 2) can be satisfied by a
 *   GREEN implementation that emits `interactiveElements: [{role:'button',
 *   tag:'button'}]` for every non-redirect route — a synthetic placeholder
 *   array that never opens a single page source file. Phase S3/S4 would
 *   then dereference a phantom element and crash against the real browser.
 *
 *   Plan.md Phase S1 sub-task #2 explicitly requires walking the page
 *   sources for `<button>`, `<a>`, `<input>`, `<select>`, `<textarea>`,
 *   `[role=button]`, `[role=tab]`, `[role=menu]`, `[data-testid=...]`,
 *   `[aria-label=...]`. This block grounds five of those criteria in
 *   literal attributes/tags from three real page files so a "synthetic
 *   placeholder" GREEN cannot satisfy them.
 *
 * Red signal (expected failures at HEAD):
 *
 *   All five tests fail because the current `buildInventory()` emits
 *   `interactiveElements: 0 | 1` (a number). The `Array.isArray` guard
 *   short-circuits to `[]`, the `.find`/`.filter` calls return empty, and
 *   the `toContain` / `toBeGreaterThanOrEqual(1)` expectations fail.
 *
 *   After GREEN walks the page sources, each test passes because the
 *   referenced literal attribute/tag exists in the file cited below.
 *
 * Live-behaviour pairing:
 *
 *   This is a static-source contract (the parser reads page files at
 *   build-inventory time). The live gate is Phase S3 `runRoutes()` —
 *   if the inventory claims `testId: 'ops-page'` but the rendered DOM
 *   does not match, `qa-routes.json` records a fail. Both are required.
 *
 * Page-source anchors (relative to repo root, line numbers as of HEAD
 * 13cab3f — frozen for traceability, not for line-equality enforcement):
 *
 *   frontend/src/pages/OpsPage.tsx
 *     :45    <button type="button" ...>                  → tag='button'
 *     :107   <section ... data-testid="ops-page">         → testId='ops-page'
 *   frontend/src/pages/SimulatePage.tsx
 *     :113   <div ... data-testid="simulate-page">        → testId='simulate-page'
 *     :134   <textarea id="weights-json" ...>             → tag='textarea'
 *   frontend/src/pages/AgentEditorPage.tsx
 *     :191   <... aria-label="Name" ...>                  → ariaLabel='Name'
 */
describe('JSX element extraction — concrete page parsing', () => {
  /**
   * Tiny helper: pick a route by its inventory `path` string. Throws if
   * not found so test failure messages point at the missing route, not at
   * a downstream `undefined.interactiveElements` crash.
   */
  function findRoute(inv: RouteInventory, path: string): RouteEntry {
    const route = inv.routes.find((r) => r.path === path);
    if (!route) {
      throw new Error(
        `route '${path}' missing from inventory (have: ${inv.routes
          .map((r) => r.path)
          .join(', ')})`,
      );
    }
    return route;
  }

  /**
   * Tiny helper: defensively coerce `interactiveElements` to an array. At
   * HEAD it is a number, so we treat any non-array as `[]` and let the
   * downstream assertion fail with a useful message.
   */
  function elementsOf(route: RouteEntry): InventoryElement[] {
    return Array.isArray(route.interactiveElements)
      ? route.interactiveElements
      : [];
  }

  it('/ops route inventory contains an element with testId="ops-page"', () => {
    const inv = buildInventory() as unknown as RouteInventory;
    const ops = findRoute(inv, 'ops');
    const testIds = elementsOf(ops)
      .map((e) => e.testId)
      .filter((t): t is string => typeof t === 'string');
    // Anchored to OpsPage.tsx line 107: <section ... data-testid="ops-page">.
    expect(testIds).toContain('ops-page');
  });

  it('/ops route inventory contains at least one element with tag="button"', () => {
    const inv = buildInventory() as unknown as RouteInventory;
    const ops = findRoute(inv, 'ops');
    const buttonElements = elementsOf(ops).filter((e) => e.tag === 'button');
    // Anchored to OpsPage.tsx line 45: <button type="button" ...> inside
    // the local TabButton component definition.
    expect(buttonElements.length).toBeGreaterThanOrEqual(1);
  });

  it('/ops/simulate route inventory contains an element with testId="simulate-page"', () => {
    const inv = buildInventory() as unknown as RouteInventory;
    const sim = findRoute(inv, 'ops/simulate');
    const testIds = elementsOf(sim)
      .map((e) => e.testId)
      .filter((t): t is string => typeof t === 'string');
    // Anchored to SimulatePage.tsx line 113: <div ... data-testid="simulate-page">.
    // Proves the parser handles multiple page sources, not just OpsPage.
    expect(testIds).toContain('simulate-page');
  });

  it('/ops/simulate route inventory contains an element with tag="textarea"', () => {
    const inv = buildInventory() as unknown as RouteInventory;
    const sim = findRoute(inv, 'ops/simulate');
    const textareaElements = elementsOf(sim).filter(
      (e) => e.tag === 'textarea',
    );
    // Anchored to SimulatePage.tsx line 134: <textarea id="weights-json" ...>.
    // Forces the parser to cover the full tag set from plan.md sub-task #2
    // (button + a + input + select + textarea), not only <button>.
    expect(textareaElements.length).toBeGreaterThanOrEqual(1);
  });

  it('/agents/:name/edit route inventory contains an element with ariaLabel="Name"', () => {
    const inv = buildInventory() as unknown as RouteInventory;
    const editor = findRoute(inv, 'agents/:name/edit');
    const ariaLabels = elementsOf(editor)
      .map((e) => e.ariaLabel)
      .filter((a): a is string => typeof a === 'string');
    // Anchored to AgentEditorPage.tsx line 191: aria-label="Name" on the
    // editor's name input. Closes the last attribute path from sub-task #2
    // (`[aria-label=...]`) and proves the parser handles :param routes
    // identically to static ones.
    expect(ariaLabels).toContain('Name');
  });

  /**
   * Round 4 anchor (2026-06-13): `<a href>` link parsing.
   *
   * Why this anchor exists:
   *
   *   Rounds 1–3 force parsing of `<button>`, `<textarea>`, `data-testid`,
   *   and `aria-label` — but the round-3 5-anchor set leaves the
   *   sub-task #2 native tag list partially uncovered: `<a>`, `<input>`,
   *   `<select>` have no source-rooted anchor. A GREEN parser could skip
   *   the entire `<a href>` extraction path and still pass rounds 1–3,
   *   leaving link-driven Phase S5 cross-route navigation scenarios with
   *   no element refs to drive (test-strategy §"Phase 5 — Cross-route nav"
   *   scenario `portfolio→project→back` is link-mediated).
   *
   *   `<a>` is also categorically distinct from rounds 1–3 anchors:
   *   button / textarea / form-input are local interactions, but `<a href>`
   *   is navigation — a different element class with a different role
   *   (`link`, not `button`/`textbox`) and a different downstream consumer
   *   (Phase S5 navigation runner, not Phase S4 element runner).
   *
   * Page-source anchor (relative to repo root, line numbers as of HEAD
   * `5489751` — frozen for traceability, not for line-equality enforcement):
   *
   *   frontend/src/pages/KanbanBoardPage.tsx
   *     :191   <a href="/sprint-planning" className="...">Create one</a>
   *
   * Red signal (expected failure at HEAD):
   *
   *   The current `buildInventory()` emits `interactiveElements: 1` (a
   *   number) for the `/board` route, so `elementsOf()` short-circuits
   *   to `[]`, the `.filter((e) => e.tag === 'a')` returns empty, and
   *   `length >= 1` fails. A synthetic placeholder of `[{role:'button',
   *   tag:'button'}]` would also fail because `tag !== 'a'`.
   *
   *   After GREEN walks `KanbanBoardPage.tsx`, the test passes once an
   *   `<a>` element with `tag: 'a'` (and implicit `role: 'link'`) is
   *   emitted for the `/board` route.
   *
   * Live-behaviour pairing (per test-strategy §"Phase 5 — Cross-route nav"):
   *
   *   Static side: this assertion enforces the parser emits the `<a>`
   *   element shape at build-inventory time.
   *
   *   Live side: Phase S5 `runNavigation()` consumes `interactiveElements`
   *   to find clickable navigation targets. If GREEN emits a phantom `<a>`
   *   element whose `href` does not resolve in the rendered DOM, the
   *   Phase S5 `runNavigation()` snapshot fails and `qa-navigation.json`
   *   records the defect. Both gates are required; neither replaces the
   *   other.
   */
  it('/board route inventory contains at least one element with tag="a"', () => {
    const inv = buildInventory() as unknown as RouteInventory;
    const board = findRoute(inv, 'board');
    const anchorElements = elementsOf(board).filter((e) => e.tag === 'a');
    // Anchored to KanbanBoardPage.tsx line 191:
    //   <a href="/sprint-planning" className="...">Create one</a>
    // Forces GREEN to cover `<a href>` from plan.md sub-task #2's native
    // tag list (button + a + input + select + textarea) and to scan
    // KanbanBoardPage.tsx (a new page source not used by rounds 1–3).
    expect(anchorElements.length).toBeGreaterThanOrEqual(1);
  });
});
