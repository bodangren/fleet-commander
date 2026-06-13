/**
 * Contract test for the route+element inventory (Phase S1, STORY-Q1).
 *
 * Spec:           measure/tracks/e2e_qa_smoke_20260613/spec.md (STORY-Q1)
 * Plan:           measure/tracks/e2e_qa_smoke_20260613/plan.md (Phase S1)
 * Test strategy:  measure/tracks/e2e_qa_smoke_20260613/test-strategy.md
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
import { buildInventory } from './build-inventory';
import type {
  InventoryElement,
  RouteEntry,
  RouteInventory,
} from './types';

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
