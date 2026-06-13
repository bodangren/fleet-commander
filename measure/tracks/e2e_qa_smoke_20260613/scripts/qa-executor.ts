/**
 * QA executor — dev-stack probe and remediation for the E2E smoke test.
 *
 * Spec:           measure/tracks/e2e_qa_smoke_20260613/spec.md (STORY-Q2)
 * Plan:           measure/tracks/e2e_qa_smoke_20260613/plan.md (Phase S2)
 * Test strategy:  measure/tracks/e2e_qa_smoke_20260613/test-strategy.md
 *                 (§"Phase 2 — Dev stack health")
 *
 * This module probes the four dev-stack services (Vite frontend, pivot
 * backend, Convex deployment, kimi-webbridge daemon) and returns a
 * structured result.  When kimi-webbridge reports extension_connected:
 * false, it produces a Finding (Q-FIND-001) and a skip directive for
 * Phases S3–S5 so the inventory + findings infra remain useful.
 *
 * All probe I/O is injected via the `ProbeRunner` interface so tests
 * can substitute a fake runner (DI per the `(bun_mock_module)` lesson).
 */
import { spawn } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';

import type {
  ElementRun,
  ElementRunAction,
  ElementRunLog,
  Finding,
  FindingAction,
  FindingSeverity,
  NavResult,
  NavRunLog,
  NavScenario,
  RouteInventory,
  RouteRun,
  RouteRunLog,
} from './types';

// Re-export Finding so the existing qa-executor.contract.test.ts import
// (`import type { Finding } from './qa-executor'`) keeps resolving to
// the canonical strict-shape contract added to `./types` by Phase S6
// (additive contract addition — the old local `Finding` interface is
// removed because the new strict shape is a superset of the old one:
// the only new field is `element?` which is optional, and `severity`/
// `action` switch from `string` to literal unions that the existing
// `handleKimiDisconnected` finding already satisfies — it uses the
// literal `'High'` and `'probe'` values which are in the new unions).
export type { Finding, FindingAction, FindingSeverity };

/**
 * Exact command paths / URLs / env-var keys the probe touches.
 * Pinned by the contract test so any drift (port change, binary
 * relocation) breaks loudly.
 */
export const PROBE_COMMANDS = {
  frontendUrl: 'http://localhost:5173',
  pivotHealthUrl: 'http://localhost:8081/api/health',
  convexEnvKey: 'CONVEX_DEPLOYMENT',
  kimiBinary: `${process.env.HOME}/.kimi-webbridge/bin/kimi-webbridge`,
  kimiArgs: ['status'],
} as const;

/**
 * Dependency-injection interface for the probe's I/O surface.
 * Tests supply a fake implementation; the real executor supplies
 * HTTP fetch, process.env read, and child_process.spawn.
 */
export interface ProbeRunner {
  httpGet(url: string): Promise<boolean>;
  readEnv(key: string): string | undefined;
  spawnKimi(
    binary: string,
    args: readonly string[],
  ): Promise<{ running: boolean; extension_connected: boolean }>;
}

/**
 * Structured result of a dev-stack probe.
 *
 * In-memory shape uses camelCase `extensionConnected`; the on-disk
 * metadata.json wire format uses snake_case `extension_connected`
 * (matching the upstream kimi-webbridge JSON shape).
 */
export interface ProbeResult {
  frontend: boolean;
  pivot: boolean;
  convex: boolean;
  kimi: {
    running: boolean;
    extensionConnected: boolean;
  };
}

/**
 * Production `ProbeRunner` backed by fetch, process.env, and child_process.spawn.
 *
 * @returns Runner implementation for live Phase S2 dev-stack probes.
 */
export function createNodeProbeRunner(): ProbeRunner {
  return {
    async httpGet(url: string): Promise<boolean> {
      try {
        const response = await fetch(url);
        return response.ok;
      } catch {
        return false;
      }
    },
    readEnv(key: string): string | undefined {
      return process.env[key];
    },
    spawnKimi(
      binary: string,
      args: readonly string[],
    ): Promise<{ running: boolean; extension_connected: boolean }> {
      return new Promise((resolve) => {
        const child = spawn(binary, [...args], { stdio: ['ignore', 'pipe', 'pipe'] });
        let stdout = '';

        child.stdout.setEncoding('utf8');
        child.stdout.on('data', (chunk) => {
          stdout += chunk;
        });

        child.on('error', () => {
          resolve({ running: false, extension_connected: false });
        });

        child.on('close', (code) => {
          if (code !== 0) {
            resolve({ running: false, extension_connected: false });
            return;
          }

          try {
            const parsed = JSON.parse(stdout) as Partial<{
              running: boolean;
              extension_connected: boolean;
            }>;
            resolve({
              running: parsed.running === true,
              extension_connected: parsed.extension_connected === true,
            });
          } catch {
            resolve({ running: false, extension_connected: false });
          }
        });
      });
    },
  };
}

/**
 * Finding shape compatible with Phase S6's contract:
 * `{ id: 'Q-FIND-NNN', route, element?, action, severity, expected,
 *   actual, screenshotPath, reproSteps[] }`.
 *
 * The canonical `Finding` interface now lives in `./types` (added in
 * Phase S6 with strict literal-union `severity` and `action` types).
 * The local interface was removed in favour of a `export type` re-export
 * above so the existing `qa-executor.contract.test.ts` import path
 * (`import type { Finding } from './qa-executor'`) keeps working.
 */

/**
 * Probe all four dev-stack services via the injected runner.
 *
 * @param runner  Dependency-injected I/O surface.
 * @returns       `ProbeResult` with boolean flags per service.
 */
export async function probeStack(runner: ProbeRunner): Promise<ProbeResult> {
  const [frontend, pivot, kimiStatus] = await Promise.all([
    runner.httpGet(PROBE_COMMANDS.frontendUrl),
    runner.httpGet(PROBE_COMMANDS.pivotHealthUrl),
    runner.spawnKimi(PROBE_COMMANDS.kimiBinary, PROBE_COMMANDS.kimiArgs),
  ]);

  const convexValue = runner.readEnv(PROBE_COMMANDS.convexEnvKey);
  const convex = convexValue !== undefined && convexValue !== '';

  return {
    frontend,
    pivot,
    convex,
    kimi: {
      running: kimiStatus.running,
      extensionConnected: kimiStatus.extension_connected,
    },
  };
}

/**
 * Produce a human-readable remediation message for any failing probe.
 * Returns an empty string when every probe is green.
 *
 * @param result  The `ProbeResult` to inspect.
 * @returns       Multi-line remediation guidance, or `''` if all green.
 */
export function formatRemediation(result: ProbeResult): string {
  const lines: string[] = [];

  if (!result.frontend) {
    lines.push(
      'frontend dev server is not responding on http://localhost:5173 — run `npm run dev` to start the Vite dev server.',
    );
  }
  if (!result.pivot) {
    lines.push(
      'pivot Bun server is not responding on /api/health — check that the pivot server is running on port 8081.',
    );
  }
  if (!result.convex) {
    lines.push(
      'CONVEX_DEPLOYMENT environment variable is not set — export it or add it to your .env file.',
    );
  }
  if (!result.kimi.running) {
    lines.push(
      'kimi-webbridge daemon is not running — start it with `~/.kimi-webbridge/bin/kimi-webbridge`.',
    );
  }
  if (result.kimi.running && !result.kimi.extensionConnected) {
    lines.push(
      'kimi-webbridge extension not connected — open your browser and retry.',
    );
  }

  return lines.join('\n');
}

/**
 * Handle the case where kimi-webbridge reports extension_connected: false.
 *
 * Per plan sub-task #5: "If `kimi` reports `extension_connected: false`,
 * file a `Q-FIND-001` finding with severity High and skip Phases S3-S5
 * with a recorded `skipped: true` reason. Do NOT abort the track."
 *
 * @param probeResult  The probe result (only kimi.extensionConnected matters).
 * @returns            `{ finding, skipPhases, skipped, reason }`.
 */
export function handleKimiDisconnected(probeResult: ProbeResult): {
  finding: Finding;
  skipPhases: string[];
  skipped: boolean;
  reason: string;
} {
  const finding: Finding = {
    id: 'Q-FIND-001',
    route: 'kimi-webbridge',
    action: 'probe',
    severity: 'High',
    expected: 'extension_connected === true',
    actual: 'extension_connected === false',
    screenshotPath: '',
    reproSteps: [
      'Run the QA dev-stack probe',
      'Observe kimi.spawnKimi() returns extension_connected: false',
      'Verify the browser extension is installed and enabled',
    ],
  };

  return {
    finding,
    skipPhases: ['S3', 'S4', 'S5'],
    skipped: true,
    reason:
      'kimi-webbridge extension not connected — skipping browser-dependent phases S3, S4, S5.',
  };
}

/**
 * Write the probe result to a metadata.json file.
 *
 * The on-disk format uses snake_case `extension_connected` (matching
 * the kimi-webbridge wire format already present in metadata.json).
 * Every existing key is preserved; only `qa_probe` is overwritten.
 *
 * @param metadataPath  Absolute path to the metadata.json file.
 * @param result        The probe result to record.
 */
export async function writeProbeResult(
  metadataPath: string,
  result: ProbeResult,
): Promise<void> {
  const existing = JSON.parse(readFileSync(metadataPath, 'utf8'));

  existing.qa_probe = {
    frontend: result.frontend,
    pivot: result.pivot,
    convex: result.convex,
    kimi: {
      running: result.kimi.running,
      extension_connected: result.kimi.extensionConnected,
    },
  };

  writeFileSync(metadataPath, JSON.stringify(existing, null, 2) + '\n');
}

// ---------------------------------------------------------------------------
// Phase S3 — Route runner (STORY-Q3)
// ---------------------------------------------------------------------------

const TRACK_DIR = resolve(import.meta.dirname ?? dirname(import.meta.url.replace('file://', '')), '..');

/**
 * Exact command paths / URLs for the Phase S3 route-runner.
 * Pinned by the contract test so any drift (port change, screenshot
 * directory relocation) breaks loudly.
 */
export const ROUTE_COMMANDS = {
  kimiBaseUrl: 'http://127.0.0.1:10086',
  frontendBaseUrl: 'http://localhost:5173',
  screenshotDir: join(TRACK_DIR, 'screenshots'),
  runsDir: join(TRACK_DIR, 'runs'),
} as const;

/**
 * Dependency-injection interface for kimi-webbridge browser commands.
 * Tests supply a fake implementation; the real executor supplies
 * HTTP calls to the kimi-webbridge daemon.
 */
export interface KimiWebBridgeRunner {
  navigate(
    url: string,
    session: string,
  ): Promise<{ success: boolean; url: string; tabId: number; httpStatus?: number }>;
  snapshot(session: string): Promise<{ url: string; title: string; refs: number }>;
  evaluate(session: string, code: string): Promise<{ type: string; value: unknown }>;
  screenshot(session: string, path: string): Promise<{ path: string }>;
  click(session: string, selector: string): Promise<{ success: boolean; ref?: number; error?: string }>;
  fill(session: string, selector: string, value: string): Promise<{ success: boolean; ref?: number; error?: string }>;
}

/**
 * Run every inventory route through kimi-webbridge: navigate → snapshot →
 * evaluate → screenshot.  Returns one `RouteRun` per inventory entry in
 * the same order.
 *
 * @param inventory  The Phase S1 route inventory.
 * @param runner     kimi-webbridge runner (fake or real).
 * @returns          Array of `RouteRun` entries.
 */
export async function runRoutes(
  inventory: RouteInventory,
  runner: KimiWebBridgeRunner,
): Promise<RouteRun[]> {
  const session = `qa-${new Date().toISOString().slice(0, 10)}`;
  const results: RouteRun[] = [];

  for (const route of inventory.routes) {
    const start = Date.now();

    const url = `${ROUTE_COMMANDS.frontendBaseUrl}/${route.path}`.replace(/\/+/g, '/').replace(':/', '://');

    if (route.noInteractive === true) {
      await runner.navigate(url, session);
      results.push({
        path: route.path,
        component: route.component,
        status: 'skip',
        title: '',
        screenshotPath: '',
        snapshotRefs: 0,
        durationMs: Date.now() - start,
      });
      continue;
    }
    const slug = route.path.replace(/[:/*]/g, '-').replace(/^-/, '').replace(/-$/, '') || 'root';
    const screenshotPath = join(ROUTE_COMMANDS.screenshotDir, slug, '01-route.png');

    try {
      const navResult = await runner.navigate(url, session);

      if (navResult.httpStatus !== undefined && navResult.httpStatus >= 400) {
        results.push({
          path: route.path,
          component: route.component,
          status: 'fail',
          httpStatus: navResult.httpStatus,
          title: '',
          screenshotPath,
          snapshotRefs: 0,
          durationMs: Date.now() - start,
          error: `HTTP ${navResult.httpStatus}`,
        });
        continue;
      }

      const snapResult = await runner.snapshot(session);
      const evalResult = await runner.evaluate(session, 'document.title');
      const title = String(evalResult.value ?? '');

      await runner.screenshot(session, screenshotPath);

      const titleMatchesExpected =
        route.expectedComponents.length === 0 ||
        route.expectedComponents.some((c) => title.includes(c));

      const status: 'pass' | 'fail' =
        snapResult.refs > 0 && titleMatchesExpected ? 'pass' : 'fail';

      results.push({
        path: route.path,
        component: route.component,
        status,
        httpStatus: navResult.httpStatus ?? 200,
        title,
        screenshotPath,
        snapshotRefs: snapResult.refs,
        durationMs: Date.now() - start,
        ...(status === 'fail' ? { error: snapResult.refs === 0 ? 'Page returned 0 refs (empty page)' : `Title "${title}" did not match expected components` } : {}),
      });
    } catch (err) {
      results.push({
        path: route.path,
        component: route.component,
        status: 'fail',
        title: '',
        screenshotPath,
        snapshotRefs: 0,
        durationMs: Date.now() - start,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return results;
}

/**
 * Write the route run log to a JSON file.  Idempotent — writing the
 * same log twice produces byte-equal output.
 *
 * @param filePath  Absolute path to the output JSON file.
 * @param log       The `RouteRunLog` envelope to write.
 */
export async function writeRouteRuns(filePath: string, log: RouteRunLog): Promise<void> {
  mkdirSync(dirname(filePath), { recursive: true });
  writeFileSync(filePath, JSON.stringify(log, null, 2) + '\n');
}

// ---------------------------------------------------------------------------
// Phase S4 — Element runner (STORY-Q4)
// ---------------------------------------------------------------------------

/**
 * Exact command paths / constants for the Phase S4 element-runner.
 * Pinned by the contract test so any drift (prefix change, screenshot
 * directory relocation) breaks loudly.
 */
export const ELEMENT_COMMANDS = {
  smokeTestPrefix: 'smoke-test-',
  screenshotDir: join(TRACK_DIR, 'screenshots'),
  runsDir: join(TRACK_DIR, 'runs'),
} as const;

/**
 * Derive the action for an interactive element from its tag and ARIA role.
 * Mirrors the plan sub-task #1 classification rules exactly.
 */
function classifyAction(tag: string, role: string): ElementRunAction {
  const t = tag.toLowerCase();
  const r = role.toLowerCase();
  if (t === 'button' || t === 'a' || r === 'button' || r === 'link') return 'click';
  if (
    t === 'input' ||
    t === 'select' ||
    t === 'textarea' ||
    r === 'textbox' ||
    r === 'combobox' ||
    r === 'searchbox' ||
    r === 'checkbox' ||
    r === 'slider'
  ) {
    return 'fill';
  }
  if (t === 'form') return 'submit';
  return 'hover';
}

/**
 * Derive a CSS-like selector string for an inventory element.
 * Prefers `data-testid`, then `aria-label`, then tag+text.
 */
function elementSelector(el: { testId?: string; ariaLabel?: string; tag: string; text?: string }): string {
  if (el.testId) return `[data-testid="${el.testId}"]`;
  if (el.ariaLabel) return `[aria-label="${el.ariaLabel}"]`;
  return el.tag;
}

function failedElementRunsForRoute(
  route: RouteInventory['routes'][number],
  message: string,
): ElementRun[] {
  return route.interactiveElements.map((el, idx) => ({
    route: route.path,
    ref: idx,
    tag: el.tag,
    role: el.role,
    action: classifyAction(el.tag, el.role),
    status: 'fail',
    testId: el.testId,
    ariaLabel: el.ariaLabel,
    beforeScreenshot: '',
    afterScreenshot: '',
    durationMs: 0,
    error: message,
  }));
}

/**
 * Run every interactive element across all non-skipped inventory routes
 * through kimi-webbridge: navigate → screenshot-before → click/fill →
 * screenshot-after.  Returns one `ElementRun` per interactive element in
 * inventory order.
 *
 * @param inventory   The Phase S1 route inventory.
 * @param routeRuns   The Phase S3 route-run log (used to determine which
 *                    routes were skipped).
 * @param runner      kimi-webbridge runner (fake or real).
 * @returns           Array of `ElementRun` entries.
 */
export async function runElements(
  inventory: RouteInventory,
  routeRuns: RouteRun[],
  runner: KimiWebBridgeRunner,
): Promise<ElementRun[]> {
  const session = `qa-${new Date().toISOString().slice(0, 10)}`;
  const results: ElementRun[] = [];

  const routeRunByPath = new Map<string, RouteRun>();
  for (const rr of routeRuns) routeRunByPath.set(rr.path, rr);

  for (const route of inventory.routes) {
    const routeRun = routeRunByPath.get(route.path);
    if (routeRun?.status === 'skip' || route.noInteractive === true) continue;

    if (routeRun?.status === 'fail') {
      results.push(
        ...failedElementRunsForRoute(
          route,
          `Parent route failed: ${routeRun.error ?? 'route smoke failed'}`,
        ),
      );
      continue;
    }

    const slug = route.path.replace(/[:/*]/g, '-').replace(/^-/, '').replace(/-$/, '') || 'root';
    const url = `${ROUTE_COMMANDS.frontendBaseUrl}/${route.path}`.replace(/\/+/g, '/').replace(':/', '://');

    let navResult: Awaited<ReturnType<KimiWebBridgeRunner['navigate']>>;
    try {
      navResult = await runner.navigate(url, session);
    } catch (err) {
      results.push(
        ...failedElementRunsForRoute(
          route,
          `navigation failed: ${err instanceof Error ? err.message : String(err)}`,
        ),
      );
      continue;
    }

    if (navResult.success === false) {
      results.push(...failedElementRunsForRoute(route, 'navigation failed'));
      continue;
    }

    if (navResult.httpStatus !== undefined && navResult.httpStatus >= 400) {
      results.push(...failedElementRunsForRoute(route, `HTTP ${navResult.httpStatus}`));
      continue;
    }

    for (let idx = 0; idx < route.interactiveElements.length; idx++) {
      const el = route.interactiveElements[idx]!;
      const action = classifyAction(el.tag, el.role);
      const selector = elementSelector(el);
      const start = Date.now();

      const beforeScreenshot = join(
        ELEMENT_COMMANDS.screenshotDir,
        slug,
        `02-element-${idx}-before.png`,
      );
      const afterScreenshot = join(
        ELEMENT_COMMANDS.screenshotDir,
        slug,
        `03-element-${idx}-after.png`,
      );

      let success = true;
      let error: string | undefined;

      try {
        await runner.screenshot(session, beforeScreenshot);

        if (action === 'click') {
          const res = await runner.click(session, selector);
          success = res.success;
          if (!success) error = res.error || 'click failed';
        } else if (action === 'fill') {
          const value = `${ELEMENT_COMMANDS.smokeTestPrefix}${Date.now()}`;
          const res = await runner.fill(session, selector, value);
          success = res.success;
          if (!success) error = res.error || 'fill failed';
        }

        await runner.screenshot(session, afterScreenshot);
      } catch (err) {
        success = false;
        error = err instanceof Error ? err.message : String(err);
      }

      results.push({
        route: route.path,
        ref: idx,
        tag: el.tag,
        role: el.role,
        action,
        status: success ? 'pass' : 'fail',
        testId: el.testId,
        ariaLabel: el.ariaLabel,
        beforeScreenshot,
        afterScreenshot,
        durationMs: Date.now() - start,
        ...(success ? {} : { error }),
      });
    }
  }

  return results;
}

/**
 * Write the element run log to a JSON file.  Idempotent — writing the
 * same log twice produces byte-equal output.
 *
 * @param filePath  Absolute path to the output JSON file.
 * @param log       The `ElementRunLog` envelope to write.
 */
export async function writeElementRuns(filePath: string, log: ElementRunLog): Promise<void> {
  mkdirSync(dirname(filePath), { recursive: true });
  writeFileSync(filePath, JSON.stringify(log, null, 2) + '\n');
}

// ---------------------------------------------------------------------------
// Phase S5 — Navigation runner (STORY-Q5)
// ---------------------------------------------------------------------------

/**
 * Exact command paths / constants for the Phase S5 navigation-runner.
 * Pinned by the contract test so any drift (screenshot directory
 * relocation, history.back script change) breaks loudly.
 */
export const NAV_COMMANDS = {
  screenshotDir: join(TRACK_DIR, 'screenshots'),
  runsDir: join(TRACK_DIR, 'runs'),
  historyBackScript: 'history.back()',
} as const;

/**
 * Derive a CSS-like selector string for a NavClickTarget.
 * Prefers `data-testid`, then `aria-label`, then text, then tag.
 */
function navSelector(target: { testId?: string; ariaLabel?: string; text?: string; tag: string }): string {
  if (target.testId) return `[data-testid="${target.testId}"]`;
  if (target.ariaLabel) return `[aria-label="${target.ariaLabel}"]`;
  if (target.text) return `${target.tag}:has-text("${target.text}")`;
  return target.tag;
}

/**
 * Run cross-route navigation scenarios through kimi-webbridge.
 *
 * For each scenario:
 *   1. Navigate to `fromPath`.
 *   2. If `clickTarget` is set, click the target link/button.
 *   3. Evaluate `location.pathname` and compare to `expectedPath`.
 *   4. If `expectedComponent` is set, evaluate the rendered component name.
 *   5. If `verifyBack` is true, evaluate `history.back()` then read
 *      `location.pathname` again to verify state preservation.
 *   6. Take a screenshot.
 *
 * @param scenarios  The list of navigation scenarios to drive.
 * @param runner     kimi-webbridge runner (fake or real).
 * @returns          Array of `NavResult` entries, one per scenario.
 */
export async function runNavigation(
  scenarios: NavScenario[],
  runner: KimiWebBridgeRunner,
): Promise<NavResult[]> {
  const session = `qa-${new Date().toISOString().slice(0, 10)}`;
  const results: NavResult[] = [];

  for (const scenario of scenarios) {
    const start = Date.now();
    const slug = scenario.name.replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-|-$/g, '');
    const screenshotPath = join(NAV_COMMANDS.screenshotDir, 'nav', `${slug}.png`);

    const url = `${ROUTE_COMMANDS.frontendBaseUrl}/${scenario.fromPath}`.replace(/\/+/g, '/').replace(':/', '://');

    let actualPath = '';
    let actualComponent = '';
    let backVerified = false;
    let status: NavResultStatus = 'pass';
    let error: string | undefined;

    try {
      // Step 1: Navigate to fromPath.
      const navResult = await runner.navigate(url, session);

      // Early exit on HTTP error (matches runRoutes pattern).
      if (navResult.httpStatus !== undefined && navResult.httpStatus >= 400) {
        status = 'fail';
        error = `HTTP ${navResult.httpStatus}`;
        await runner.screenshot(session, screenshotPath);
        results.push({
          name: scenario.name,
          fromPath: scenario.fromPath,
          clickTarget: scenario.clickTarget,
          expectedPath: scenario.expectedPath,
          actualPath,
          expectedComponent: scenario.expectedComponent,
          actualComponent,
          backVerified,
          status,
          screenshotPath,
          durationMs: Date.now() - start,
          ...(error !== undefined ? { error } : {}),
        });
        continue;
      }

      // Step 2: Click the target if present.
      if (scenario.clickTarget) {
        const selector = navSelector(scenario.clickTarget);
        const clickResult = await runner.click(session, selector);
        if (!clickResult.success) {
          status = 'fail';
          error = clickResult.error || 'click failed';
        }
      }

      // Step 3: Read the resulting pathname.
      const pathResult = await runner.evaluate(session, 'location.pathname');
      actualPath = String(pathResult.value ?? '');

      // Step 4: Read the rendered component name.
      const compResult = await runner.evaluate(session, 'document.querySelector("[data-component]")?.getAttribute("data-component") || document.title || ""');
      actualComponent = String(compResult.value ?? '');

      // Step 5: Verify path and component match expectations.
      if (status === 'pass') {
        if (actualPath !== scenario.expectedPath) {
          status = 'fail';
          error = `expected path "${scenario.expectedPath}" but got "${actualPath}"`;
        } else if (
          scenario.expectedComponent &&
          !actualComponent.includes(scenario.expectedComponent)
        ) {
          status = 'fail';
          error = `expected component "${scenario.expectedComponent}" but got "${actualComponent}"`;
        }
      }

      // Step 6: Back-button verification (only for scenarios with verifyBack=true).
      if (scenario.verifyBack && status === 'pass') {
        await runner.evaluate(session, NAV_COMMANDS.historyBackScript);
        const backPathResult = await runner.evaluate(session, 'location.pathname');
        const backPath = String(backPathResult.value ?? '');
        backVerified = backPath === scenario.fromPath || backPath === ('/' + scenario.fromPath);
        if (!backVerified) {
          status = 'fail';
          error = `back-button returned to "${backPath}" instead of "${scenario.fromPath}"`;
        }
      }

      // Step 7: Screenshot.
      await runner.screenshot(session, screenshotPath);
    } catch (err) {
      status = 'fail';
      error = err instanceof Error ? err.message : String(err);
    }

    results.push({
      name: scenario.name,
      fromPath: scenario.fromPath,
      clickTarget: scenario.clickTarget,
      expectedPath: scenario.expectedPath,
      actualPath,
      expectedComponent: scenario.expectedComponent,
      actualComponent,
      backVerified,
      status,
      screenshotPath,
      durationMs: Date.now() - start,
      ...(error !== undefined ? { error } : {}),
    });
  }

  return results;
}

/**
 * Write the navigation run log to a JSON file.  Idempotent — writing the
 * same log twice produces byte-equal output.
 *
 * @param filePath  Absolute path to the output JSON file.
 * @param log       The `NavRunLog` envelope to write.
 */
export async function writeNavResults(filePath: string, log: NavRunLog): Promise<void> {
  mkdirSync(dirname(filePath), { recursive: true });
  writeFileSync(filePath, JSON.stringify(log, null, 2) + '\n');
}
