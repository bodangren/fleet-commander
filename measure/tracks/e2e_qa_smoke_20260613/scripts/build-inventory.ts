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
import type { InventoryElement, RouteEntry, RouteInventory } from './types';

const TRACK_DIR = resolve(dirname(import.meta.path), '..');
const REPO_ROOT = resolve(TRACK_DIR, '..', '..', '..');
const ROUTER_TSX = join(REPO_ROOT, 'frontend', 'src', 'router.tsx');
const PAGES_DIR = join(REPO_ROOT, 'frontend', 'src', 'pages');
const COMPONENTS_DIR = join(REPO_ROOT, 'frontend', 'src', 'components');
const LAYOUT_DIR = join(REPO_ROOT, 'frontend', 'src', 'layout');
const OUT_JSON = join(TRACK_DIR, 'route-inventory.json');
const OUT_MD = join(TRACK_DIR, 'route-inventory.md');
const SNAPSHOT = join(TRACK_DIR, 'route-inventory.snapshot.json');

/**
 * Map of wrapper component names defined inline in router.tsx to the
 * actual page files they render. The parser falls back to these when
 * the component name is not in COMPONENT_SOURCES.
 */
const WRAPPER_ALIASES: Record<string, string> = {
  AgentsPageWrapper: join(PAGES_DIR, 'AgentsPage.tsx'),
  HarnessesPageWrapper: join(PAGES_DIR, 'HarnessesPage.tsx'),
};

/** Map of well-known component names to their source file paths. */
const COMPONENT_SOURCES: Record<string, string> = {
  PortfolioRedirect: join(COMPONENTS_DIR, 'PortfolioRedirect.tsx'),
  PortfolioPage: join(PAGES_DIR, 'PortfolioPage.tsx'),
  AgentsPage: join(PAGES_DIR, 'AgentsPage.tsx'),
  AgentEditorPage: join(PAGES_DIR, 'AgentEditorPage.tsx'),
  LeaderboardPage: join(PAGES_DIR, 'LeaderboardPage.tsx'),
  AgentTemplatesPage: join(PAGES_DIR, 'AgentTemplatesPage.tsx'),
  AgentTemplateEditorPage: join(PAGES_DIR, 'AgentTemplateEditorPage.tsx'),
  ProjectTemplatesPage: join(PAGES_DIR, 'ProjectTemplatesPage.tsx'),
  ProvidersPage: join(PAGES_DIR, 'ProvidersPage.tsx'),
  ProjectViewPage: join(PAGES_DIR, 'ProjectViewPage.tsx'),
  TaskTimelinePage: join(PAGES_DIR, 'TaskTimelinePage.tsx'),
  SettingsLayout: join(PAGES_DIR, 'settings', 'SettingsLayout.tsx'),
  AppConfigSection: join(PAGES_DIR, 'settings', 'AppConfigSection.tsx'),
  NotificationSettingsSection: join(PAGES_DIR, 'settings', 'NotificationSettingsSection.tsx'),
  AgentDefaultsSection: join(PAGES_DIR, 'settings', 'AgentDefaultsSection.tsx'),
  ProfileSettingsSection: join(PAGES_DIR, 'settings', 'ProfileSettingsSection.tsx'),
  PipelinesPage: join(PAGES_DIR, 'PipelinesPage.tsx'),
  AnalyticsDashboard: join(PAGES_DIR, 'AnalyticsDashboard.tsx'),
  PerformanceDashboard: join(PAGES_DIR, 'PerformanceDashboard.tsx'),
  CostsPage: join(PAGES_DIR, 'CostsPage.tsx'),
  OpsPage: join(PAGES_DIR, 'OpsPage.tsx'),
  MonitorPage: join(PAGES_DIR, 'MonitorPage.tsx'),
  DiagnosePage: join(PAGES_DIR, 'DiagnosePage.tsx'),
  OptimizePage: join(PAGES_DIR, 'OptimizePage.tsx'),
  ReconcilePage: join(PAGES_DIR, 'Reconcile.tsx'),
  SimulatePage: join(PAGES_DIR, 'SimulatePage.tsx'),
  SprintPlanningPage: join(PAGES_DIR, 'SprintPlanningPage.tsx'),
  KanbanBoardPage: join(PAGES_DIR, 'KanbanBoardPage.tsx'),
  RetrospectivePage: join(PAGES_DIR, 'RetrospectivePage.tsx'),
  NotificationHistoryPage: join(PAGES_DIR, 'NotificationHistoryPage.tsx'),
  BlockersPage: join(PAGES_DIR, 'BlockersPage.tsx'),
  AlertsPage: join(PAGES_DIR, 'AlertsPage.tsx'),
  HarnessesPage: join(PAGES_DIR, 'HarnessesPage.tsx'),
  HarnessEditorPage: join(PAGES_DIR, 'HarnessEditorPage.tsx'),
  SprintsHistoryPage: join(PAGES_DIR, 'SprintsHistoryPage.tsx'),
  AgentsHistoryPage: join(PAGES_DIR, 'AgentsHistoryPage.tsx'),
  TasksHistoryPage: join(PAGES_DIR, 'TasksHistoryPage.tsx'),
  AppLayout: join(LAYOUT_DIR, 'AppLayout.tsx'),
};

/**
 * Resolve the source file path for a component name. Returns null if the
 * component is not a page-level component (e.g. Navigate, FleetLayout).
 */
function resolveComponentSource(component: string): string | null {
  return COMPONENT_SOURCES[component] ?? WRAPPER_ALIASES[component] ?? null;
}

/** Extract a string-literal attribute value from a JSX tag string. */
function extractAttr(tagStr: string, attr: string): string | undefined {
  // Match attr="value" or attr='value'
  const re = new RegExp(`${attr}\\s*=\\s*["']([^"']*)["']`);
  const m = tagStr.match(re);
  return m?.[1];
}

/** Derive the implicit ARIA role for a native HTML tag. */
function implicitRole(tag: string, attrs: string): string {
  switch (tag) {
    case 'button':
      return 'button';
    case 'a':
      return 'link';
    case 'select':
      return 'combobox';
    case 'textarea':
      return 'textbox';
    case 'input': {
      const type = extractAttr(attrs, 'type') ?? 'text';
      switch (type) {
        case 'checkbox':
          return 'checkbox';
        case 'radio':
          return 'radio';
        case 'range':
          return 'slider';
        case 'search':
          return 'searchbox';
        default:
          return 'textbox';
      }
    }
    default:
      return 'generic';
  }
}

/**
 * Scan JSX/TSX source for opening tags and return all (tag, attrs) pairs.
 * Handles balanced braces inside attribute values (e.g. `className={cn(...)}`,
 * `onChange={e => { ... }}`) so the `>` inside braces does not terminate
 * the tag prematurely.
 */
function extractJsxTags(src: string): Array<{ tag: string; attrs: string; selfClose: boolean }> {
  const results: Array<{ tag: string; attrs: string; selfClose: boolean }> = [];
  const tagRe = /<([a-zA-Z][a-zA-Z0-9.]*)\b/g;
  let m: RegExpExecArray | null;
  while ((m = tagRe.exec(src)) !== null) {
    const tag = m[1]!;
    let i = m.index + m[0].length;
    let depth = 0;
    let inStr: string | null = null;
    while (i < src.length) {
      const ch = src[i]!;
      if (inStr) {
        if (ch === inStr && src[i - 1] !== '\\') inStr = null;
      } else if (ch === '"' || ch === "'") {
        inStr = ch;
      } else if (ch === '{') {
        depth++;
      } else if (ch === '}') {
        if (depth > 0) depth--;
      } else if (depth === 0) {
        if (ch === '>') {
          const attrs = src.slice(m.index + m[0].length, i);
          const selfClose = i > 0 && src[i - 1] === '/';
          results.push({ tag, attrs, selfClose });
          break;
        }
      }
      i++;
    }
  }
  return results;
}

/**
 * Parse a JSX/TSX source file and extract interactive elements.
 *
 * Covers the tag set from plan.md Phase S1 sub-task #2:
 *   `<button>`, `<a>`, `<input>`, `<select>`, `<textarea>`,
 *   `[role=button]`, `[role=tab]`, `[role=menu]`,
 *   `[data-testid=...]`, `[aria-label=...]`
 *
 * Uses brace-aware regex parsing (not a full AST) which is sufficient for
 * the static-source contract enforced by the contract test.
 */
/** Map of common JSX component names to their semantic interactive role and implied native tag. */
const INTERACTIVE_COMPONENTS: Record<string, { role: string; tag: string }> = {
  Button: { role: 'button', tag: 'button' },
  IconButton: { role: 'button', tag: 'button' },
  Link: { role: 'link', tag: 'a' },
  NavLink: { role: 'link', tag: 'a' },
  Input: { role: 'textbox', tag: 'input' },
  Textarea: { role: 'textbox', tag: 'textarea' },
  Select: { role: 'combobox', tag: 'select' },
  TabsTrigger: { role: 'tab', tag: 'button' },
  TabButton: { role: 'tab', tag: 'button' },
};

function parseInteractiveElements(src: string): InventoryElement[] {
  const elements: InventoryElement[] = [];
  const seen = new Set<string>();
  const interactiveTags = new Set(['button', 'a', 'input', 'select', 'textarea']);

  for (const { tag, attrs } of extractJsxTags(src)) {
    const testId = extractAttr(attrs, 'data-testid');
    const ariaLabel = extractAttr(attrs, 'aria-label');
    const explicitRole = extractAttr(attrs, 'role');
    const comp = INTERACTIVE_COMPONENTS[tag];

    if (interactiveTags.has(tag)) {
      // Native interactive tag — always emit
      const role = explicitRole ?? implicitRole(tag, attrs);
      let text: string | undefined;
      if (tag === 'button' || tag === 'a') {
        const re = new RegExp(`<${tag}\\b[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i');
        const tm = src.match(re);
        if (tm?.[1]) {
          const t = tm[1].trim().replace(/\s+/g, ' ');
          if (t.length > 0 && t.length <= 100) text = t;
        }
      }
      const key = `${tag}:${role}:${testId ?? ''}:${ariaLabel ?? ''}`;
      if (!seen.has(key)) {
        seen.add(key);
        const el: InventoryElement = { role, tag };
        if (testId) el.testId = testId;
        if (ariaLabel) el.ariaLabel = ariaLabel;
        if (text) el.text = text;
        elements.push(el);
      }
    } else if (comp) {
      // Known interactive component (Button, Link, Input, etc.)
      const key = `${tag}:${comp.role}:${testId ?? ''}:${ariaLabel ?? ''}`;
      if (!seen.has(key)) {
        seen.add(key);
        const el: InventoryElement = { role: comp.role, tag: comp.tag };
        if (testId) el.testId = testId;
        if (ariaLabel) el.ariaLabel = ariaLabel;
        elements.push(el);
      }
    } else if (explicitRole) {
      // Non-interactive tag with an explicit role attribute
      const key = `${tag}:${explicitRole}:${testId ?? ''}:${ariaLabel ?? ''}`;
      if (!seen.has(key)) {
        seen.add(key);
        const el: InventoryElement = { role: explicitRole, tag };
        if (testId) el.testId = testId;
        if (ariaLabel) el.ariaLabel = ariaLabel;
        elements.push(el);
      }
    } else if (testId || ariaLabel) {
      // Non-interactive tag with data-testid or aria-label — emit with
      // implicit role 'generic' so the QA executor can locate the element.
      const key = `${tag}:generic:${testId ?? ''}:${ariaLabel ?? ''}`;
      if (!seen.has(key)) {
        seen.add(key);
        const el: InventoryElement = { role: 'generic', tag };
        if (testId) el.testId = testId;
        if (ariaLabel) el.ariaLabel = ariaLabel;
        elements.push(el);
      }
    }
  }

  return elements;
}

/**
 * Walk the router.tsx source with two regex passes:
 *   1. `{ path: '<p>', element: <C> }` or `{ index: true, element: <C> }`
 *   2. `import { <C> } from '...'` to map component -> import path
 */
function parseRouter(routerSrc: string): { path: string; index?: boolean; component: string }[] {
  const flat: { path: string; index?: boolean; component: string }[] = [];

  function parseObject(obj: string): { path?: string; index?: boolean; element?: string } | null {
    const childrenStart = obj.indexOf('children:');
    let top = obj;
    if (childrenStart >= 0) {
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
              const indexPath = (parentPath || '/').replace(/\/$/, '') || '/';
              flat.push({ path: indexPath, index: true, component: parsed.element });
            } else if (parsed.path) {
              flat.push({ path: fullPath, component: parsed.element });
            } else {
              flat.push({ path: fullPath, component: parsed.element });
            }
          }
          const childrenInner = extractChildrenArray(obj);
          if (childrenInner !== null) {
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
  return /portfolio|agents|agent-templates|templates|providers|pipelines|analytics|performance|costs|monitor|diagnose|retrospectives|notifications|blockers|alerts|harnesses|history/.test(path);
}

export function buildInventory(): RouteInventory {
  const src = readFileSync(ROUTER_TSX, 'utf8');
  const entries = parseRouter(src);
  const indexedPaths = new Set<string>();
  for (const e of entries) {
    if (e.index) indexedPaths.add((e.path || '').replace(/\/$/, ''));
  }

  const routes: RouteEntry[] = entries
    .filter((e) => !(e.path === '' && !e.index))
    .filter((e, _i, arr) => {
      if (e.index) return true;
      const dupe = arr.find((other) => other !== e && other.path === e.path && other.index);
      return !dupe;
    })
    .map((e) => {
      const isIndex = !!e.index;
      const redirect = isRedirect(e.component) || isIndex;

      let interactiveElements: InventoryElement[] = [];
      let noInteractive: boolean | undefined;

      if (redirect) {
        noInteractive = true;
      } else {
        const sourcePath = resolveComponentSource(e.component);
        if (sourcePath && existsSync(sourcePath)) {
          const pageSrc = readFileSync(sourcePath, 'utf8');
          interactiveElements = parseInteractiveElements(pageSrc);
        }
        // If no interactive elements were found on a non-redirect route,
        // mark it explicitly so the QA executor does not flag it as a defect.
        if (interactiveElements.length === 0) {
          noInteractive = true;
        }
      }

      const route: RouteEntry = {
        path: e.path,
        component: e.component,
        paramKind: paramKind(e.path),
        interactiveElements,
        expectedComponents: redirect ? [] : [e.component],
      };

      if (noInteractive) route.noInteractive = true;
      if (e.path === '*') route.isWildcard = true;

      if (redirect) {
        if (e.path === '*') route.redirectsTo = '/';
        else if (e.path === '/' || e.path === '') route.redirectsTo = '/portfolio';
        else if (e.path === 'settings') route.redirectsTo = '/settings/app';
        else route.redirectsTo = '/';
      } else {
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
      interactiveRoutes: routes.filter((r) => r.interactiveElements.length > 0).length,
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
  lines.push('| # | Path | Component | Param? | Elements | Notes |');
  lines.push('|---|---|---|---|---|---|');
  inv.routes.forEach((r, i) => {
    const notes = [r.redirectsTo ? `redirect → ${r.redirectsTo}` : '', r.emptyStateExpected ? 'empty-state OK' : '', r.knownDefect ?? ''].filter(Boolean).join('; ');
    lines.push(`| ${i + 1} | \`${r.path}\` | \`${r.component}\` | ${r.paramKind ?? '—'} | ${r.interactiveElements.length} | ${notes} |`);
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
      // Normalize generated_at for idempotency comparison
      const normSnap = snap.replace(/"generated_at"\s*:\s*"[^"]*"/, '"generated_at":"STABLE"');
      const normFresh = fresh.replace(/"generated_at"\s*:\s*"[^"]*"/, '"generated_at":"STABLE"');
      if (normSnap !== normFresh) {
        console.error(`Inventory drifted from snapshot. Re-run after committing the new snapshot.`);
        process.exit(1);
      }
    }
    console.log(`Wrote ${OUT_JSON} (${inv.routes.length} routes)`);
    console.log(`Wrote ${OUT_MD}`);
  }
}
