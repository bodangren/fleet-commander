/**
 * Contract test for build-inventory.ts:
 *   - parses 38 routes from frontend/src/router.tsx
 *   - emits 3 redirects (PortfolioRedirect, /settings index, /* wildcard)
 *   - emits 5 param routes (one per :name/:id/:taskId segment)
 *   - the snapshot file matches the freshly-generated JSON
 */
import { describe, expect, it } from 'bun:test';
import { readFileSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { buildInventory, renderMarkdown } from './build-inventory';

const TRACK_DIR = resolve(dirname(import.meta.path), '..');
const SNAPSHOT = join(TRACK_DIR, 'route-inventory.snapshot.json');

describe('buildInventory — router.tsx contract', () => {
  it('parses 38 routes from the production router', () => {
    const inv = buildInventory();
    expect(inv.routes.length).toBe(38);
  });

  it('identifies the 3 redirect routes (portfolio root, /settings index, /*)', () => {
    const inv = buildInventory();
    const redirects = inv.routes.filter((r) => r.redirectsTo !== undefined);
    expect(redirects.length).toBe(3);
    expect(redirects.map((r) => r.path).sort()).toEqual(['*', '/', 'settings'].sort());
  });

  it('identifies 5 routes with :param segments', () => {
    const inv = buildInventory();
    const paramRoutes = inv.routes.filter((r) => r.paramKind !== null);
    expect(paramRoutes.length).toBe(5);
    const params = paramRoutes.map((r) => r.paramKind).sort();
    expect(params).toEqual(['id', 'id', 'name', 'name', 'taskId'].sort());
  });

  it('matches the committed snapshot JSON structurally (ignoring generated_at)', () => {
    if (!existsSync(SNAPSHOT)) {
      throw new Error(`Missing snapshot at ${SNAPSHOT}`);
    }
    const inv = buildInventory();
    const fresh = { ...inv, generated_at: 'STABLE' };
    const snap = { ...JSON.parse(readFileSync(SNAPSHOT, 'utf8')), generated_at: 'STABLE' };
    expect(JSON.stringify(fresh, null, 2)).toBe(JSON.stringify(snap, null, 2));
  });

  it('renders a markdown table with one row per route', () => {
    const inv = buildInventory();
    const md = renderMarkdown(inv);
    const tableRows = md.split('\n').filter((l) => l.startsWith('| ') && !l.startsWith('| #') && !l.startsWith('|---'));
    expect(tableRows.length).toBe(inv.routes.length);
  });
});
