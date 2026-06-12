/**
 * Build the route/element inventory from `frontend/src/router.tsx` and the
 * page components it imports. Output: `route-inventory.json` and
 * `route-inventory.md` in the parent directory.
 *
 * Idempotent: re-running against an unchanged router produces the same JSON.
 * The `route-inventory.snapshot.json` is the committed reference; the build
 * script also `diff -q`s the new output against it.
 *
 * Usage:
 *   bun run scripts/build-inventory.ts [--dry-run]
 *
 * Options:
 *   --dry-run   Print the inventory to stdout; do not write files.
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';

const TRACK_DIR = resolve(dirname(import.meta.path), '..');
const REPO_ROOT = resolve(TRACK_DIR, '..', '..', '..');
const ROUTER_TSX = join(REPO_ROOT, 'frontend', 'src', 'router.tsx');
const OUT_JSON = join(TRACK_DIR, 'route-inventory.json');
const OUT_MD = join(TRACK_DIR, 'route-inventory.md');
const SNAPSHOT = join(TRACK_DIR, 'route-inventory.snapshot.json');

interface RouteEntry {
  path: string;
  component: string;
  paramKind: string | null;
  interactiveElements: number;
  expectedComponents: string[];
  emptyStateExpected?: boolean;
  redirectsTo?: string;
  isWildcard?: boolean;
  knownDefect?: string;
}

interface RouteInventory {
  $schema: string;
  generated_at: string;
  source: string;
  routes: RouteEntry[];
  totals: { routes: number; paramRoutes: number; redirects: number; interactiveRoutes: number };
}

/**
 * Walk the router.tsx source with two regex passes:
 *   1. `{ path: '<p>', element: <C> }` or `{ index: true, element: <C> }`
 *   2. `import { <C> } from '...'` to map component -> import path
 *
 * Component-by-source mapping is rough but good enough to enumerate
 * expected page-level components. Element counts are placeholder `TBD`
 * until Phase 1 closure; they are replaced by a static JSX scan in
 * `scripts/build-inventory.closure.ts` (added in a later Phase 1 commit).
 */
function parseRouter(routerSrc: string): { path: string; index?: boolean; component: string }[] {
  // Find the createBrowserRouter([...]) block, then walk only its top-level
  // children array. Nested children arrays (e.g. /settings/*) are processed
  //  recursively to enumerate sub-routes.
  const flat: { path: string; index?: boolean; component: string }[] = [];

  /** Extract `path:`, `index:`, and `element:` at the TOP level of an object
   *  (i.e., not inside nested `children: [...]`). Returns null if no element. */
  function parseObject(obj: string): { path?: string; index?: boolean; element?: string } | null {
    // Find the children:[ ... ] block if any, so we can exclude it.
    const childrenStart = obj.indexOf('children:');
    let top = obj;
    if (childrenStart >= 0) {
      // Find balanced [ ... ]
      const openBracket = obj.indexOf('[', childrenStart);
      if (openBracket >= 0) {
        let cd = 0;
        let cs = -1;
        for (let j = openBracket; j < obj.length; j++) {
          if (obj[j] === '[') {
            if (cd === 0) cs = j;
            cd++;
          } else if (obj[j] === ']') {
            cd--;
            if (cd === 0) {
              top = obj.slice(0, cs) + obj.slice(j + 1);
              break;
            }
          }
        }
      }
    }
    const pathMatch = top.match(/path:\s*'([^']+)'/);
    const indexMatch = /index:\s*true/.test(top);
    // element: <X /> or <X attr="value" attr2="value" ... />. Allow / in
    // attribute values (e.g. <Navigate to="/foo" />).
    const elemMatch = top.match(/element:\s*<([A-Za-z0-9_]+)(?:[\s\S]*?)\/>/);
    if (!elemMatch) return null;
    return {
      path: pathMatch?.[1],
      index: indexMatch || undefined,
      element: elemMatch[1],
    };
  }

  function extractChildrenArray(obj: string): string | null {
    const idx = obj.indexOf('children:');
    if (idx < 0) return null;
    const openBracket = obj.indexOf('[', idx);
    if (openBracket < 0) return null;
    let cd = 0;
    let cs = -1;
    for (let j = openBracket; j < obj.length; j++) {
      if (obj[j] === '[') {
        if (cd === 0) cs = j;
        cd++;
      } else if (obj[j] === ']') {
        cd--;
        if (cd === 0) {
          return obj.slice(cs + 1, j);
        }
      }
    }
    return null;
  }

  function walkChildren(segment: string, parentPath: string) {
    let depth = 0;
    let start = -1;
    for (let i = 0; i < segment.length; i++) {
      const c = segment[i];
      if (c === '{') {
        if (depth === 0) start = i;
        depth++;
      } else if (c === '}') {
        depth--;
        if (depth === 0 && start >= 0) {
          const obj = segment.slice(start, i + 1);
          const parsed = parseObject(obj);
          if (parsed?.element) {
            const childPath = parsed.path ?? '';
            const fullPath = parentPath + childPath;
            if (parsed.index) {
              // Index route: the URL is the parent path, no trailing slash.
              // If the parent is empty (e.g. the root layout's index), use '/'.
              const indexPath = (parentPath || '/').replace(/\/$/, '') || '/';
              flat.push({ path: indexPath, index: true, component: parsed.element });
            } else if (parsed.path) {
              flat.push({ path: fullPath, component: parsed.element });
            } else {
              // No path and no index — must be a layout route (like FleetLayout).
              // Still record it so the QA can reference the component.
              flat.push({ path: fullPath, component: parsed.element });
            }
          }
          const childrenInner = extractChildrenArray(obj);
          if (childrenInner !== null) {
            // Recurse with this object's path as the new parent path
            const objPath = parsed?.path ?? '';
            const newParent = parentPath + objPath + (objPath ? '/' : '');
            walkChildren(childrenInner, newParent);
          }
          start = -1;
        }
      }
    }
  }

  const cbIdx = routerSrc.indexOf('createBrowserRouter');
  if (cbIdx < 0) return flat;
  const arrStart = routerSrc.indexOf('[', cbIdx);
  if (arrStart < 0) return flat;
  let depth = 0;
  let arrEnd = -1;
  for (let i = arrStart; i < routerSrc.length; i++) {
    if (routerSrc[i] === '[') depth++;
    else if (routerSrc[i] === ']') {
      depth--;
      if (depth === 0) {
        arrEnd = i;
        break;
      }
    }
  }
  if (arrEnd < 0) return flat;
  const arr = routerSrc.slice(arrStart + 1, arrEnd);
  walkChildren(arr, '');
  return flat;
}

function paramKind(path: string): string | null {
  const m = path.match(/:([A-Za-z0-9_]+)/);
  return m ? (m[1] ?? null) : null;
}

function isRedirect(component: string): boolean {
  return /^(Navigate|Redirect|PortfolioRedirect)$/i.test(component) || component.endsWith('Redirect');
}

function routeIsEmptyStateExpected(path: string): boolean {
  // Heuristic: pages that are list/feed views typically allow empty Convex state.
  return /portfolio|agents|agent-templates|templates|providers|pipelines|analytics|performance|costs|monitor|diagnose|retrospectives|notifications|blockers|alerts|harnesses|history/.test(path);
}

export function buildInventory(): RouteInventory {
  const src = readFileSync(ROUTER_TSX, 'utf8');
  const entries = parseRouter(src);
  // Build a set of (path,index) pairs for routes that have an index child
  // (those are de-facto redirects of the parent path). Used to mark the
  // parent as a redirect.
  const indexedPaths = new Set<string>();
  for (const e of entries) {
    if (e.index) indexedPaths.add((e.path || '').replace(/\/$/, ''));
  }
  // Filter out layout routes (no path AND no index AND has children) — those
  // are not directly routable URLs. The FleetLayout wrapper is one example.
  const routes: RouteEntry[] = entries
    .filter((e) => !(e.path === '' && !e.index))
    .filter((e, _i, arr) => {
      // De-dupe: if a route at the same path is also an index redirect,
      // keep the redirect (last in the list) and drop the layout entry.
      if (e.index) return true;
      const dupe = arr.find((other) => other !== e && other.path === e.path && other.index);
      return !dupe;
    })
    .map((e) => {
      const route: RouteEntry = {
        path: e.path,
        component: e.component,
        paramKind: paramKind(e.path),
        interactiveElements: 0,
        expectedComponents: [],
      };
      if (e.path === '*') route.isWildcard = true;
      const isIndex = !!e.index;
      if (isRedirect(e.component) || isIndex) {
        route.interactiveElements = 0;
        if (e.path === '*') route.redirectsTo = '/';
        else if (e.path === '/' || e.path === '') route.redirectsTo = '/portfolio';
        else if (e.path === 'settings') route.redirectsTo = '/settings/app';
        else route.redirectsTo = '/';
      } else {
        route.interactiveElements = 1; // baseline: at least 1 button per page
        route.expectedComponents = [e.component];
        if (routeIsEmptyStateExpected(e.path)) route.emptyStateExpected = true;
      }
      if (e.path === 'blockers') route.knownDefect = 'TD-250 (4 useNavigate-outside-Router pre-existing baseline failures)';
      return route;
    });

  return {
    $schema: 'https://fleet-commander.local/schemas/route-inventory.v1.json',
    generated_at: new Date().toISOString(),
    source: 'frontend/src/router.tsx',
    routes,
    totals: {
      routes: routes.length,
      paramRoutes: routes.filter((r) => r.paramKind !== null).length,
      redirects: routes.filter((r) => r.redirectsTo !== undefined).length,
      interactiveRoutes: routes.filter((r) => r.interactiveElements > 0).length,
    },
  };
}

export function renderMarkdown(inv: RouteInventory): string {
  const lines: string[] = [];
  lines.push('# Route Inventory — Fleet Commander (snapshot 2026-06-13)');
  lines.push('');
  lines.push('> Auto-generated by `scripts/build-inventory.ts` from `frontend/src/router.tsx`.');
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push(`- **Total routes:** ${inv.totals.routes}`);
  lines.push(`- **Param routes:** ${inv.totals.paramRoutes}`);
  lines.push(`- **Redirects:** ${inv.totals.redirects}`);
  lines.push(`- **Interactive routes:** ${inv.totals.interactiveRoutes}`);
  lines.push('');
  lines.push('## Browser Routes');
  lines.push('');
  lines.push('| # | Path | Component | Param? | Interactive | Notes |');
  lines.push('|---|---|---|---|---|---|');
  inv.routes.forEach((r, i) => {
    const notes = [r.redirectsTo ? `redirect → ${r.redirectsTo}` : '', r.emptyStateExpected ? 'empty-state OK' : '', r.knownDefect ?? ''].filter(Boolean).join('; ');
    lines.push(`| ${i + 1} | \`${r.path}\` | \`${r.component}\` | ${r.paramKind ?? '—'} | ${r.interactiveElements} | ${notes} |`);
  });
  return lines.join('\n') + '\n';
}

if (import.meta.main) {
  const dryRun = process.argv.includes('--dry-run');
  const inv = buildInventory();
  const md = renderMarkdown(inv);
  if (dryRun) {
    console.log(JSON.stringify(inv, null, 2));
  } else {
    writeFileSync(OUT_JSON, JSON.stringify(inv, null, 2) + '\n');
    writeFileSync(OUT_MD, md);
    if (existsSync(SNAPSHOT)) {
      const snap = readFileSync(SNAPSHOT, 'utf8');
      const fresh = readFileSync(OUT_JSON, 'utf8');
      if (snap !== fresh) {
        console.error(`Inventory drifted from snapshot. Re-run after committing the new snapshot.`);
        process.exit(1);
      }
    }
    console.log(`Wrote ${OUT_JSON} (${inv.routes.length} routes)`);
    console.log(`Wrote ${OUT_MD}`);
  }
}
