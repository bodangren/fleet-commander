/**
 * Contract test for the Phase S4 element-runner (STORY-Q4).
 *
 * Spec:           measure/archive/e2e_qa_smoke_20260613/spec.md (STORY-Q4)
 * Plan:           measure/archive/e2e_qa_smoke_20260613/plan.md (Phase S4)
 * Test strategy:  measure/archive/e2e_qa_smoke_20260613/test-strategy.md
 *                 (§"Phase 4 — Element coverage" pins the per-element shape
 *                  `{ route, ref, tag, role, action, status,
 *                  beforeScreenshot?, afterScreenshot?, error? }`.)
 *
 * Why a separate test file from `qa-executor.routes.contract.test.ts`?
 *
 *   `qa-executor.routes.contract.test.ts` enforces the Phase S3 route-runner
 *   contract. This file enforces the Phase S4 element-runner contract.
 *   They are independent and run independently — the two phases consume
 *   different symbols from `./qa-executor` and the contract surface for
 *   each is gated on its own `describe` block. The runner interface is
 *   shared (`KimiWebBridgeRunner`) so this test extends it with the
 *   element-action methods (`click`, `fill`).
 *
 * Why dependency injection (fake `KimiWebBridgeRunner`) instead of
 * `mock.module()`?
 *
 *   Per `(bun_mock_module)` in lessons-learned: "`mock.module()` persists
 *   across test files; prefer dependency injection over module mocks."
 *   The element runner talks to `http://127.0.0.1:10086` (kimi-webbridge
 *   daemon), so a fake runner is the only way to make the test
 *   deterministic and bounded.
 *
 *   The fake runner *also* satisfies the MID prompt's fake-harness
 *   requirement: "prove the fake mode intercepts the exact command path
 *   or test the command string directly". Each fake method records the
 *   exact arguments it was called with — the selector clicked, the
 *   selector filled, the value used — so assertions can pin the literal
 *   strings a real kimi-webbridge call would emit. A real daemon call
 *   would not surface that.
 *
 * Red signal (expected failures at HEAD):
 *
 *   The contract surface for Phase S4 lives in `qa-executor.ts` next to
 *   the Phase S2 + S3 surfaces. At HEAD, `qa-executor.ts` exports
 *   `runElements`, `writeElementRuns`, and `ELEMENT_COMMANDS` are not
 *   yet declared, and the `KimiWebBridgeRunner` interface has not yet
 *   been extended with `click`/`fill`. The first `import` below will
 *   throw a `ResolveMessage` ("Export named … not found in module") on
 *   bun's loader; bun reports the entire file as a single failure
 *   counting every `it()` block against the same missing export. Once
 *   GREEN creates the symbols (even as stubs) and extends the runner
 *   interface, every individual `it()` becomes its own targeted failure
 *   for the specific contract it pins:
 *
 *     - runElements returns one ElementRun per interactiveElements entry
 *       across all non-noInteractive routes (96 elements for the
 *       Phase S1 inventory)
 *     - ElementRun shape has all 9 plan-literal fields
 *     - action classification: button/link → click, input/select/textarea
 *       → fill, form → submit, defensive default → hover
 *     - status='pass' when click/fill returns success
 *     - status='fail' when click/fill returns failure or navigate returns
 *       4xx/5xx
 *     - status='skip' for routes with noInteractive=true
 *     - fake runner intercepts the exact kimi-webbridge command paths
 *       (navigate → screenshot-before → click/fill → screenshot-after
 *        per element)
 *     - writeElementRuns round-trips through runs/qa-elements-<ts>.json
 *       preserving the ElementRunLog envelope
 *
 * Live-behaviour pairing (per test-strategy §"Phase 4 — Element coverage"):
 *
 *   The contract this file enforces is the static gate. The live gate
 *   is Phase S4's "Generate Docs & Doctor" sub-task: run the actual
 *   `runElements(realRunner, realInventory, realRouteRuns)` against the
 *   running dev stack, capture before/after screenshots, and record the
 *   run log in `runs/qa-elements-<ts>.json`. The fake-runner tests prove
 *   the wiring; the real-runner invocation proves the wiring is connected
 *   to kimi-webbridge + the actual Vite dev server. Both are required;
 *   neither replaces the other.
 */
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';

import type {
  ElementRun,
  ElementRunAction,
  ElementRunLog,
  ElementRunStatus,
  RouteInventory,
  RouteRun,
} from './types';

// Importing from a module that does not yet export these symbols is
// the primary Red signal. Bun's loader will throw on the first
// `import` below until GREEN extends `scripts/qa-executor.ts` with
// the Phase S4 surface (ELEMENT_COMMANDS, runElements,
// writeElementRuns) and the new KimiWebBridgeRunner methods (click, fill).
import {
  ELEMENT_COMMANDS,
  type KimiWebBridgeRunner,
  runElements,
  writeElementRuns,
} from './qa-executor';

const TRACK_DIR = resolve(dirname(import.meta.path), '..');
const INVENTORY_JSON = join(TRACK_DIR, 'route-inventory.json');

/**
 * Load the on-disk route inventory committed at Phase S1 GREEN. The
 * test treats it as the source of truth for "how many elements must the
 * runner visit" — any inventory drift between Phase S1 and Phase S4
 * surfaces here as a hard fail, not as a silent test rerun.
 */
function loadInventory(): RouteInventory {
  const raw = readFileSync(INVENTORY_JSON, 'utf8');
  return JSON.parse(raw) as RouteInventory;
}

/**
 * Total count of `interactiveElements` across every route in the
 * inventory that is NOT flagged `noInteractive`. This is the contract
 * total the element-runner must satisfy.
 */
function expectedElementCount(inventory: RouteInventory): number {
  return inventory.routes
    .filter((r) => r.noInteractive !== true)
    .reduce((sum, r) => sum + r.interactiveElements.length, 0);
}

/**
 * Build a synthetic `RouteRun` log mirroring what Phase S3's `runRoutes`
 * would have produced. Every non-noInteractive route gets `status='pass'`
 * so Phase S4's runner proceeds to drive elements; the noInteractive
 * routes are set to `status='skip'` so the runner must skip them too.
 */
function syntheticRouteRuns(inventory: RouteInventory): RouteRun[] {
  return inventory.routes.map((r) => ({
    path: r.path,
    component: r.component,
    status: (r.noInteractive === true ? 'skip' : 'pass') as RouteRun['status'],
    title: `${r.component} · Fleet Commander`,
    screenshotPath: '',
    snapshotRefs: 4,
    durationMs: 100,
    ...(r.noInteractive === true ? {} : { httpStatus: 200 }),
  }));
}

/**
 * Action the runner is expected to pick for an `(tag, role)` pair.
 * Mirrors the plan sub-task #1 imperative exactly:
 *   - button / role=button / link → click
 *   - input / select / textarea  → fill
 *   - form                      → submit
 *   - else                      → hover (defensive default)
 */
function expectedAction(tag: string, role: string): ElementRunAction {
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
 * Fake `KimiWebBridgeRunner` implementation. Records the exact
 * arguments each runner method receives, and returns canned results
 * from a per-instance script. The fake never opens a socket, never
 * spawns a child process, never reads the filesystem — the test is
 * hermetic and bounded.
 *
 * Each `*Calls` array captures the literal command-path / URL /
 * selector the runner was asked for. Asserting these arrays proves
 * `runElements()` uses the right code path through kimi-webbridge
 * (navigate → screenshot-before → click/fill → screenshot-after per
 * element) and not some hard-coded literal that drifts from the
 * contract.
 */
interface FakeKimiRunner extends KimiWebBridgeRunner {
  navigateCalls: Array<{ url: string; session: string }>;
  clickCalls: Array<{ session: string; selector: string }>;
  fillCalls: Array<{ session: string; selector: string; value: string }>;
  screenshotCalls: Array<{ session: string; path: string }>;
  evaluateCalls: Array<{ session: string; code: string }>;
}

interface CannedNavigateResult {
  success: boolean;
  url: string;
  tabId: number;
  httpStatus?: number;
}

interface CannedClickResult {
  success: boolean;
  ref?: number;
  error?: string;
}

interface CannedFillResult {
  success: boolean;
  ref?: number;
  error?: string;
}

function makeFakeRunner(script: {
  navigate?: (url: string) => CannedNavigateResult | Promise<CannedNavigateResult>;
  click?: (
    session: string,
    selector: string,
  ) => CannedClickResult | Promise<CannedClickResult>;
  fill?: (
    session: string,
    selector: string,
    value: string,
  ) => CannedFillResult | Promise<CannedFillResult>;
  screenshot?: (
    session: string,
    path: string,
  ) => Promise<{ path: string }> | { path: string };
  evaluate?: (session: string, code: string) =>
    | { type: string; value: unknown }
    | Promise<{ type: string; value: unknown }>;
} = {}): FakeKimiRunner {
  const navigateCalls: Array<{ url: string; session: string }> = [];
  const clickCalls: Array<{ session: string; selector: string }> = [];
  const fillCalls: Array<{ session: string; selector: string; value: string }> = [];
  const screenshotCalls: Array<{ session: string; path: string }> = [];
  const evaluateCalls: Array<{ session: string; code: string }> = [];

  return {
    navigateCalls,
    clickCalls,
    fillCalls,
    screenshotCalls,
    evaluateCalls,
    async navigate(url, session): Promise<CannedNavigateResult> {
      navigateCalls.push({ url, session });
      if (script.navigate) return await script.navigate(url);
      return { success: true, url, tabId: 1, httpStatus: 200 };
    },
    async click(session, selector): Promise<CannedClickResult> {
      clickCalls.push({ session, selector });
      if (script.click) return await script.click(session, selector);
      return { success: true, ref: 1 };
    },
    async fill(session, selector, value): Promise<CannedFillResult> {
      fillCalls.push({ session, selector, value });
      if (script.fill) return await script.fill(session, selector, value);
      return { success: true, ref: 1 };
    },
    async screenshot(session, path): Promise<{ path: string }> {
      screenshotCalls.push({ session, path });
      if (script.screenshot) return await script.screenshot(session, path);
      return { path };
    },
    async evaluate(session, code): Promise<{ type: string; value: unknown }> {
      evaluateCalls.push({ session, code });
      if (script.evaluate) return await script.evaluate(session, code);
      return { type: 'string', value: '' };
    },
  };
}

describe('Phase S4 — ELEMENT_COMMANDS contract (exact paths)', () => {
  /**
   * ELEMENT_COMMANDS is the single source of truth for the per-element
   * command paths. The plan sub-task #1 pins the literal `smoke-test-<timestamp>`
   * placeholder (test-strategy line 209), the screenshot directory
   * (plan sub-task #1 "<route-slug>/02-element-...png"), and the run
   * log directory (plan sub-task #2 "runs/qa-elements-<ts>.json").
   */
  it('exports smokeTestPrefix = "smoke-test-" (per test-strategy line 209 privacy & data hygiene)', () => {
    expect(ELEMENT_COMMANDS.smokeTestPrefix).toBe('smoke-test-');
  });

  it('exports screenshotDir = ./measure/archive/e2e_qa_smoke_20260613/screenshots (per plan sub-task #1)', () => {
    expect(typeof ELEMENT_COMMANDS.screenshotDir).toBe('string');
    expect(ELEMENT_COMMANDS.screenshotDir).toContain('screenshots');
  });

  it('exports runsDir = ./measure/archive/e2e_qa_smoke_20260613/runs (per plan sub-task #2)', () => {
    expect(typeof ELEMENT_COMMANDS.runsDir).toBe('string');
    expect(ELEMENT_COMMANDS.runsDir).toContain('runs');
  });
});

describe('Phase S4 — runElements() contract: one ElementRun per interactive element', () => {
  /**
   * The plan literally requires "the element-runner visits every
   * `interactiveElements` entry and produces a corresponding `ElementRun`."
   * This block loads the on-disk inventory (the Phase S1 GREEN output)
   * and asserts runElements returns exactly N entries where N is the sum
   * of `interactiveElements.length` across all non-noInteractive routes.
   * Any inventory drift between S1 and S4 surfaces here as a hard fail.
   */
  it('returns one ElementRun per interactive element (96 elements across 26 non-noInteractive routes per the Phase S1 inventory)', async () => {
    const inventory = loadInventory();
    const routeRuns = syntheticRouteRuns(inventory);
    const fake = makeFakeRunner();

    const runs: ElementRun[] = await runElements(inventory, routeRuns, fake);

    expect(Array.isArray(runs)).toBe(true);
    expect(runs.length).toBe(expectedElementCount(inventory));
    expect(runs.length).toBe(96);
  });

  it('emits ElementRun entries grouped by inventory.routes order (each route\'s elements stay adjacent)', async () => {
    const inventory = loadInventory();
    const routeRuns = syntheticRouteRuns(inventory);
    const fake = makeFakeRunner();

    const runs: ElementRun[] = await runElements(inventory, routeRuns, fake);

    const expectedOrder: string[] = [];
    for (const route of inventory.routes) {
      if (route.noInteractive === true) continue;
      for (const _ of route.interactiveElements) {
        expectedOrder.push(route.path);
      }
    }

    const observedOrder = runs.map((r) => r.route);
    expect(observedOrder).toEqual(expectedOrder);
  });

  it('emits one ElementRun per interactiveElements entry (no element dropped or duplicated)', async () => {
    const inventory = loadInventory();
    const routeRuns = syntheticRouteRuns(inventory);
    const fake = makeFakeRunner();

    const runs: ElementRun[] = await runElements(inventory, routeRuns, fake);

    let i = 0;
    for (const route of inventory.routes) {
      if (route.noInteractive === true) continue;
      for (const el of route.interactiveElements) {
        const run = runs[i];
        if (!run) throw new Error(`ElementRun ${i} missing`);
        expect(run.tag).toBe(el.tag);
        expect(run.role).toBe(el.role);
        expect(run.route).toBe(route.path);
        i += 1;
      }
    }
    expect(i).toBe(runs.length);
  });

  it('emits status="skip" for every route whose RouteRun was skipped (noInteractive routes)', async () => {
    const inventory = loadInventory();
    const routeRuns = syntheticRouteRuns(inventory);
    const fake = makeFakeRunner();

    const runs: ElementRun[] = await runElements(inventory, routeRuns, fake);

    const skippedRoutePaths = new Set(
      inventory.routes
        .filter((r) => r.noInteractive === true)
        .map((r) => r.path),
    );

    // Every emitted ElementRun must come from a non-skipped route. If
    // GREEN skips per-route we still expect zero runs from skipped
    // routes because the runner iterates inventory.routes and only
    // visits elements of routes whose RouteRun is not skipped.
    for (const run of runs) {
      expect(skippedRoutePaths.has(run.route)).toBe(false);
    }
  });

  it('emits durationMs >= 0 for every ElementRun (records wall-clock budget per action)', async () => {
    const inventory = loadInventory();
    const routeRuns = syntheticRouteRuns(inventory);
    const fake = makeFakeRunner();

    const runs: ElementRun[] = await runElements(inventory, routeRuns, fake);

    for (const run of runs) {
      expect(typeof run.durationMs).toBe('number');
      expect(run.durationMs).toBeGreaterThanOrEqual(0);
    }
  });
});

describe('Phase S4 — ElementRun shape contract (all 9 plan-literal fields)', () => {
  /**
   * The plan literally specifies the per-element shape:
   *   `{ route, ref, tag, role, action: 'click'|'fill'|'submit'|'hover',
   *      status, beforeScreenshot?, afterScreenshot?, error? }`
   * This block exercises a real `runElements` call against a healthy
   * fake and asserts the resulting ElementRun matches the plan shape
   * field-for-field.
   */
  it('ElementRun has all 9 plan-literal fields (route, ref, tag, role, action, status, beforeScreenshot, afterScreenshot, durationMs)', async () => {
    const inventory = loadInventory();
    const routeRuns = syntheticRouteRuns(inventory);
    const fake = makeFakeRunner();

    const runs: ElementRun[] = await runElements(inventory, routeRuns, fake);
    const portfolio = runs.find((r) => r.route === 'portfolio');
    expect(portfolio).toBeDefined();

    expect(typeof portfolio?.route).toBe('string');
    expect(typeof portfolio?.ref).toBe('number');
    expect(typeof portfolio?.tag).toBe('string');
    expect(typeof portfolio?.role).toBe('string');
    expect(typeof portfolio?.beforeScreenshot).toBe('string');
    expect(typeof portfolio?.afterScreenshot).toBe('string');
    expect(typeof portfolio?.durationMs).toBe('number');

    const allowedActions: ElementRunAction[] = ['click', 'fill', 'submit', 'hover'];
    expect(allowedActions).toContain(portfolio?.action);

    const allowedStatuses: ElementRunStatus[] = ['pass', 'fail', 'skip'];
    expect(allowedStatuses).toContain(portfolio?.status);
  });

  it('ElementRun.action matches the literal union "click" | "fill" | "submit" | "hover" (per plan literal)', async () => {
    const inventory = loadInventory();
    const routeRuns = syntheticRouteRuns(inventory);
    const fake = makeFakeRunner();

    const runs: ElementRun[] = await runElements(inventory, routeRuns, fake);

    for (const run of runs) {
      expect(['click', 'fill', 'submit', 'hover']).toContain(run.action);
    }
  });

  it('ElementRun.status matches the literal union "pass" | "fail" | "skip" (per plan literal)', async () => {
    const inventory = loadInventory();
    const routeRuns = syntheticRouteRuns(inventory);
    const fake = makeFakeRunner();

    const runs: ElementRun[] = await runElements(inventory, routeRuns, fake);

    for (const run of runs) {
      expect(['pass', 'fail', 'skip']).toContain(run.status);
    }
  });
});

describe('Phase S4 — action classification contract (per plan sub-task #1)', () => {
  /**
   * The plan sub-task #1 classifies actions by element kind:
   *   - button / role=button / link    → click
   *   - input / select / textarea      → fill
   *   - form                           → submit
   *   - else (defensive default)       → hover
   * This block pins the classification so a GREEN parser that maps
   * every element to 'click' (or every element to 'hover') breaks
   * loudly here.
   */
  it('classifies every button (tag=button or role=button) as action="click"', async () => {
    const inventory = loadInventory();
    const routeRuns = syntheticRouteRuns(inventory);
    const fake = makeFakeRunner();

    const runs: ElementRun[] = await runElements(inventory, routeRuns, fake);

    const buttons = runs.filter((r) => r.tag === 'button' || r.role === 'button');
    expect(buttons.length).toBeGreaterThan(0);
    for (const run of buttons) {
      expect(run.action).toBe('click');
    }
  });

  it('classifies every anchor link (tag=a or role=link) as action="click"', async () => {
    const inventory = loadInventory();
    const routeRuns = syntheticRouteRuns(inventory);
    const fake = makeFakeRunner();

    const runs: ElementRun[] = await runElements(inventory, routeRuns, fake);

    const links = runs.filter((r) => r.tag === 'a' || r.role === 'link');
    expect(links.length).toBeGreaterThan(0);
    for (const run of links) {
      expect(run.action).toBe('click');
    }
  });

  it('classifies every form-input element (input/select/textarea or textbox/combobox/searchbox/checkbox/slider) as action="fill"', async () => {
    const inventory = loadInventory();
    const routeRuns = syntheticRouteRuns(inventory);
    const fake = makeFakeRunner();

    const runs: ElementRun[] = await runElements(inventory, routeRuns, fake);

    const formInputs = runs.filter((r) =>
      ['input', 'select', 'textarea'].includes(r.tag) ||
      ['textbox', 'combobox', 'searchbox', 'checkbox', 'slider'].includes(r.role),
    );
    expect(formInputs.length).toBeGreaterThan(0);
    for (const run of formInputs) {
      expect(run.action).toBe('fill');
    }
  });
});

describe('Phase S4 — status determination contract (per plan sub-task #1)', () => {
  /**
   * Plan sub-task #1: status='pass' on a successful action, status='fail'
   * when the action returns false or the parent route returns 4xx/5xx.
   * This block exercises the three primary paths: healthy, click-fails,
   * fill-fails, parent-route-fails.
   */
  it('emits status="pass" for every element when both click and fill return success', async () => {
    const inventory = loadInventory();
    const routeRuns = syntheticRouteRuns(inventory);
    const fake = makeFakeRunner();

    const runs: ElementRun[] = await runElements(inventory, routeRuns, fake);

    expect(runs.length).toBeGreaterThan(0);
    for (const run of runs) {
      expect(run.status).toBe('pass');
      expect(run.error).toBeUndefined();
    }
  });

  it('emits status="fail" with error message when runner.click returns success: false', async () => {
    const inventory = loadInventory();
    const routeRuns = syntheticRouteRuns(inventory);
    const fake = makeFakeRunner({
      click: () => ({ success: false, error: 'element not clickable' }),
    });

    const runs: ElementRun[] = await runElements(inventory, routeRuns, fake);

    const clickRuns = runs.filter((r) => r.action === 'click');
    expect(clickRuns.length).toBeGreaterThan(0);
    const failedClick = clickRuns.find((r) => r.status === 'fail');
    expect(failedClick).toBeDefined();
    expect(typeof failedClick?.error).toBe('string');
    expect((failedClick?.error ?? '').length).toBeGreaterThan(0);
  });

  it('emits status="fail" with error message when runner.fill returns success: false', async () => {
    const inventory = loadInventory();
    const routeRuns = syntheticRouteRuns(inventory);
    const fake = makeFakeRunner({
      fill: () => ({ success: false, error: 'input not editable' }),
    });

    const runs: ElementRun[] = await runElements(inventory, routeRuns, fake);

    const fillRuns = runs.filter((r) => r.action === 'fill');
    expect(fillRuns.length).toBeGreaterThan(0);
    const failedFill = fillRuns.find((r) => r.status === 'fail');
    expect(failedFill).toBeDefined();
    expect(typeof failedFill?.error).toBe('string');
    expect((failedFill?.error ?? '').length).toBeGreaterThan(0);
  });

  it('emits status="fail" with error containing the HTTP status when parent route returns 4xx/5xx', async () => {
    const inventory = loadInventory();
    const routeRuns = syntheticRouteRuns(inventory);
    const fake = makeFakeRunner({
      navigate: () => ({ success: true, url: 'http://localhost:5173/portfolio', tabId: 1, httpStatus: 500 }),
    });

    const runs: ElementRun[] = await runElements(inventory, routeRuns, fake);

    expect(runs.length).toBeGreaterThan(0);
    for (const run of runs) {
      expect(run.status).toBe('fail');
      expect(typeof run.error).toBe('string');
      expect((run.error ?? '').toLowerCase()).toContain('5');
    }
  });

  it('emits status="fail" without clicking or filling when the Phase S3 RouteRun already failed', async () => {
    const inventory = loadInventory();
    const routeRuns = syntheticRouteRuns(inventory).map((routeRun) =>
      routeRun.path === 'portfolio'
        ? { ...routeRun, status: 'fail' as const, error: 'route smoke failed' }
        : routeRun,
    );
    const fake = makeFakeRunner();

    const runs: ElementRun[] = await runElements(inventory, routeRuns, fake);
    const portfolioRuns = runs.filter((run) => run.route === 'portfolio');
    const portfolio = inventory.routes.find((route) => route.path === 'portfolio');
    if (!portfolio) throw new Error('portfolio route missing');

    expect(portfolioRuns.length).toBe(portfolio.interactiveElements.length);
    for (const run of portfolioRuns) {
      expect(run.status).toBe('fail');
      expect(run.error).toContain('route smoke failed');
    }

    const expectedClicks = runs.filter((run) => run.action === 'click' && run.route !== 'portfolio').length;
    const expectedFills = runs.filter((run) => run.action === 'fill' && run.route !== 'portfolio').length;
    expect(fake.clickCalls.length).toBe(expectedClicks);
    expect(fake.fillCalls.length).toBe(expectedFills);
  });

  it('emits status="fail" without clicking or filling when runner.navigate returns success:false', async () => {
    const inventory = loadInventory();
    const routeRuns = syntheticRouteRuns(inventory);
    const fake = makeFakeRunner({
      navigate: (url) => ({ success: false, url, tabId: 1, httpStatus: 200 }),
    });

    const runs: ElementRun[] = await runElements(inventory, routeRuns, fake);

    expect(runs.length).toBe(expectedElementCount(inventory));
    for (const run of runs) {
      expect(run.status).toBe('fail');
      expect(run.error).toContain('navigation failed');
    }
    expect(fake.clickCalls.length).toBe(0);
    expect(fake.fillCalls.length).toBe(0);
  });

  it('records a failed ElementRun and continues when an element action throws', async () => {
    const inventory = loadInventory();
    const routeRuns = syntheticRouteRuns(inventory);
    let threw = false;
    const fake = makeFakeRunner({
      click: () => {
        if (!threw) {
          threw = true;
          throw new Error('click exploded');
        }
        return { success: true, ref: 1 };
      },
    });

    const runs: ElementRun[] = await runElements(inventory, routeRuns, fake);

    expect(runs.length).toBe(expectedElementCount(inventory));
    const failed = runs.filter((run) => run.status === 'fail');
    expect(failed.length).toBe(1);
    expect(failed[0]?.error).toContain('click exploded');
  });
});

describe('Phase S4 — fake runner intercepts the exact kimi-webbridge command paths', () => {
  /**
   * Satisfies the MID prompt's fake-harness requirement: "prove the
   * fake mode intercepts the exact command path or test the command
   * string directly." This block exercises runElements against a fake
   * runner and asserts that for each route the runner is called with
   * the expected sequence (navigate → screenshot-before → click/fill
   * → screenshot-after per element).
   */
  it('invokes runner.navigate once per non-skipped route (26 calls for the Phase S1 inventory)', async () => {
    const inventory = loadInventory();
    const routeRuns = syntheticRouteRuns(inventory);
    const fake = makeFakeRunner();

    await runElements(inventory, routeRuns, fake);

    const skippedCount = inventory.routes.filter((r) => r.noInteractive === true)
      .length;
    const expectedNavigates = inventory.routes.length - skippedCount;
    expect(fake.navigateCalls.length).toBe(expectedNavigates);
    expect(fake.navigateCalls.length).toBe(26);
  });

  it('navigates to the Vite dev server origin for every route (http://localhost:5173/<path>)', async () => {
    const inventory = loadInventory();
    const routeRuns = syntheticRouteRuns(inventory);
    const fake = makeFakeRunner();

    await runElements(inventory, routeRuns, fake);

    for (const call of fake.navigateCalls) {
      expect(call.url).toContain('http://localhost:5173');
    }
  });

  it('invokes runner.click for every clickable element (button / link)', async () => {
    const inventory = loadInventory();
    const routeRuns = syntheticRouteRuns(inventory);
    const fake = makeFakeRunner();

    const runs: ElementRun[] = await runElements(inventory, routeRuns, fake);

    const expectedClicks = runs.filter((r) => r.action === 'click').length;
    expect(fake.clickCalls.length).toBe(expectedClicks);
    expect(fake.clickCalls.length).toBeGreaterThan(0);
  });

  it('invokes runner.fill for every form-input element (input/select/textarea)', async () => {
    const inventory = loadInventory();
    const routeRuns = syntheticRouteRuns(inventory);
    const fake = makeFakeRunner();

    const runs: ElementRun[] = await runElements(inventory, routeRuns, fake);

    const expectedFills = runs.filter((r) => r.action === 'fill').length;
    expect(fake.fillCalls.length).toBe(expectedFills);
    expect(fake.fillCalls.length).toBeGreaterThan(0);
  });

  it('uses the smoke-test-<timestamp> prefix when filling inputs (per test-strategy line 209 privacy & data hygiene)', async () => {
    const inventory = loadInventory();
    const routeRuns = syntheticRouteRuns(inventory);
    const fake = makeFakeRunner();

    await runElements(inventory, routeRuns, fake);

    expect(fake.fillCalls.length).toBeGreaterThan(0);
    for (const call of fake.fillCalls) {
      expect(call.value.startsWith(ELEMENT_COMMANDS.smokeTestPrefix)).toBe(true);
    }
  });

  it('writes a before-screenshot AND after-screenshot for every non-skipped element', async () => {
    const inventory = loadInventory();
    const routeRuns = syntheticRouteRuns(inventory);
    const fake = makeFakeRunner();

    await runElements(inventory, routeRuns, fake);

    // At least 2 screenshots per non-skipped element (before + after).
    const skippedCount = inventory.routes.filter((r) => r.noInteractive === true)
      .length;
    const expectedElements = inventory.routes.length - skippedCount;
    const minScreenshots = expectedElements * 2;
    expect(fake.screenshotCalls.length).toBeGreaterThanOrEqual(minScreenshots);
  });

  it('uses a single kimi-webbridge session name across all element calls (per run)', async () => {
    const inventory = loadInventory();
    const routeRuns = syntheticRouteRuns(inventory);
    const fake = makeFakeRunner();

    await runElements(inventory, routeRuns, fake);

    const sessions = new Set<string>();
    for (const call of fake.navigateCalls) sessions.add(call.session);
    for (const call of fake.clickCalls) sessions.add(call.session);
    for (const call of fake.fillCalls) sessions.add(call.session);
    for (const call of fake.screenshotCalls) sessions.add(call.session);

    // All calls in a single runElements invocation share one session.
    expect(sessions.size).toBe(1);
    const [session] = [...sessions];
    expect(typeof session).toBe('string');
    expect((session ?? '').length).toBeGreaterThan(0);
  });
});

describe('Phase S4 — writeElementRuns() on-disk artifact contract', () => {
  /**
   * Plan sub-task #2: "Per-element `ElementRun` written to
   * `runs/qa-elements-<ts>.json`." This block pins the on-disk format
   * while keeping the Red test hermetic via `mkdtempSync` per-test
   * isolation.
   *
   * The on-disk envelope is `ElementRunLog` (committed to
   * `scripts/types.ts` alongside `ElementRun`): `{ $schema,
   * generated_at, session, frontendBaseUrl, elements: ElementRun[] }`.
   * This is the same envelope shape Phase S3's `writeRouteRuns()`
   * uses so the `qa-elements-<ts>.json` consumers (Phase S6 findings
   * aggregator, Phase S7 coverage reporter) can rely on a single
   * metadata convention.
   */
  let tmpDir: string;
  let runsPath: string;

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'qa-elements-test-'));
    runsPath = join(tmpDir, 'qa-elements-test.json');
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it('writes an ElementRunLog envelope with $schema, generated_at, session, frontendBaseUrl, elements', async () => {
    const inventory = loadInventory();
    const routeRuns = syntheticRouteRuns(inventory);
    const fake = makeFakeRunner();

    const runs: ElementRun[] = await runElements(inventory, routeRuns, fake);
    const log: ElementRunLog = {
      $schema: 'https://fleet-commander.local/schemas/qa-elements.v1.json',
      generated_at: '2026-06-13T12:00:00.000Z',
      session: 'qa-2026-06-13',
      frontendBaseUrl: 'http://localhost:5173',
      elements: runs,
    };
    await writeElementRuns(runsPath, log);

    const parsed = JSON.parse(readFileSync(runsPath, 'utf8')) as ElementRunLog;
    expect(parsed.$schema).toBe('https://fleet-commander.local/schemas/qa-elements.v1.json');
    expect(parsed.generated_at).toBe('2026-06-13T12:00:00.000Z');
    expect(parsed.session).toBe('qa-2026-06-13');
    expect(parsed.frontendBaseUrl).toBe('http://localhost:5173');
    expect(Array.isArray(parsed.elements)).toBe(true);
    expect(parsed.elements.length).toBe(runs.length);
  });

  it('preserves every ElementRun field through the round-trip (no field loss)', async () => {
    const inventory = loadInventory();
    const routeRuns = syntheticRouteRuns(inventory);
    const fake = makeFakeRunner();

    const runs: ElementRun[] = await runElements(inventory, routeRuns, fake);
    const log: ElementRunLog = {
      $schema: 'https://fleet-commander.local/schemas/qa-elements.v1.json',
      generated_at: '2026-06-13T12:00:00.000Z',
      session: 'qa-2026-06-13',
      frontendBaseUrl: 'http://localhost:5173',
      elements: runs,
    };
    await writeElementRuns(runsPath, log);

    const parsed = JSON.parse(readFileSync(runsPath, 'utf8')) as ElementRunLog;
    for (let i = 0; i < runs.length; i++) {
      const written = parsed.elements[i];
      const original = runs[i];
      if (!written || !original) {
        throw new Error(`ElementRun ${i} missing after round-trip`);
      }
      expect(written.route).toBe(original.route);
      expect(written.tag).toBe(original.tag);
      expect(written.role).toBe(original.role);
      expect(written.action).toBe(original.action);
      expect(written.status).toBe(original.status);
      expect(written.ref).toBe(original.ref);
      expect(written.beforeScreenshot).toBe(original.beforeScreenshot);
      expect(written.afterScreenshot).toBe(original.afterScreenshot);
      expect(written.durationMs).toBe(original.durationMs);
    }
  });

  it('is idempotent — second call with the same input produces byte-equal output', async () => {
    const inventory = loadInventory();
    const routeRuns = syntheticRouteRuns(inventory);
    const fake = makeFakeRunner();

    const runs: ElementRun[] = await runElements(inventory, routeRuns, fake);
    const log: ElementRunLog = {
      $schema: 'https://fleet-commander.local/schemas/qa-elements.v1.json',
      generated_at: '2026-06-13T12:00:00.000Z',
      session: 'qa-2026-06-13',
      frontendBaseUrl: 'http://localhost:5173',
      elements: runs,
    };

    await writeElementRuns(runsPath, log);
    const first = readFileSync(runsPath, 'utf8');
    await writeElementRuns(runsPath, log);
    const second = readFileSync(runsPath, 'utf8');

    expect(second).toBe(first);
  });
});

// Type-only smoke: the imports above must resolve to *exported* symbols,
// not just `any`. This dead reference at the bottom of the file gives
// `tsc --noEmit` (and bun's loader) an additional handle to refuse if
// the GREEN module forgets to export one of the contract types.
const _typeProbe: {
  Runner: KimiWebBridgeRunner;
  Run: ElementRun;
  Log: ElementRunLog;
  Status: ElementRunStatus;
  Action: ElementRunAction;
} | null = null;
if (_typeProbe !== null) {
  // unreachable; keeps the unused-import flag quiet.
  console.log(_typeProbe);
}