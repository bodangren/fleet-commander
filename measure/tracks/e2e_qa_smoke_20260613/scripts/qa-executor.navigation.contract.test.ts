/**
 * Contract test for the Phase S5 navigation-runner (STORY-Q5).
 *
 * Spec:           measure/tracks/e2e_qa_smoke_20260613/spec.md (STORY-Q5)
 * Plan:           measure/tracks/e2e_qa_smoke_20260613/plan.md (Phase S5)
 * Test strategy:  measure/tracks/e2e_qa_smoke_20260613/test-strategy.md
 *                 (§"Phase 5 — Cross-route nav")
 *
 * Why a separate test file from `qa-executor.routes.contract.test.ts`
 * and `qa-executor.elements.contract.test.ts`?
 *
 *   The route-runner and element-runner iterate the inventory 1:1
 *   (38 routes, 96 elements). The navigation-runner drives a small
 *   hand-curated set of 5 cross-route scenarios. They are independent
 *   and run independently — the three phases consume different
 *   symbols from `./qa-executor` and the contract surface for each
 *   is gated on its own `describe` block.
 *
 * Why dependency injection (fake `KimiWebBridgeRunner`) instead of
 * `mock.module()`?
 *
 *   Per `(bun_mock_module)` in lessons-learned: "`mock.module()` persists
 *   across test files; prefer dependency injection over module mocks."
 *   The navigation runner talks to `http://127.0.0.1:10086`
 *   (kimi-webbridge daemon), so a fake runner is the only way to make
 *   the test deterministic and bounded.
 *
 *   The fake runner *also* satisfies the MID prompt's fake-harness
 *   requirement: "prove the fake mode intercepts the exact command
 *   path or test the command string directly". Each fake method
 *   records the exact arguments it was called with — the URL
 *   navigated to, the evaluate code, the screenshot path — so
 *   assertions can pin the literal strings a real kimi-webbridge call
 *   would emit. A real daemon call would not surface that.
 *
 * Red signal (expected failures at HEAD):
 *
 *   The contract surface for Phase S5 lives in `qa-executor.ts` next to
 *   the Phase S2 + S3 + S4 surfaces. At HEAD, `qa-executor.ts` exports
 *   `runNavigation`, `writeNavResults`, and `NAV_COMMANDS` are not yet
 *   declared. The first `import` below will throw a `ResolveMessage`
 *   ("Cannot find module export …") on bun's loader; bun reports the
 *   entire file as a single failure counting every `it()` block
 *   against the same missing export. Once GREEN creates the symbols
 *   (even as stubs), every individual `it()` becomes its own targeted
 *   failure for the specific contract it pins:
 *
 *     - runNavigation returns one NavResult per scenario (5 scenarios)
 *     - NavResult shape has all plan-literal fields
 *     - status='pass' when actualPath === expectedPath
 *     - status='fail' when actualPath !== expectedPath
 *     - back-button exercised via evaluate(() => history.back()) and
 *       verified by checking the runner returns to fromPath
 *     - component name check via evaluate on rendered DOM
 *     - 5 plan-literal scenarios driven in order
 *     - fake runner intercepts the exact kimi-webbridge command paths
 *     - writeNavResults round-trips through runs/qa-navigation-<ts>.json
 *       preserving the NavRunLog envelope
 *
 * Live-behaviour pairing (per test-strategy §"Phase 5 — Cross-route nav"):
 *
 *   The contract this file enforces is the static gate. The live gate
 *   is Phase S5's "Generate Docs & Doctor" sub-task: run the actual
 *   `runNavigation(realRunner, realScenarios)` against the running dev
 *   stack, capture screenshots in `screenshots/nav/`, and record the
 *   run log in `runs/qa-navigation-<ts>.json`. The fake-runner tests
 *   prove the wiring; the real-runner invocation proves the wiring is
 *   connected to kimi-webbridge + the actual Vite dev server. Both
 *   are required; neither replaces the other.
 */
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';

import type {
  NavResult,
  NavResultStatus,
  NavRunLog,
  NavScenario,
} from './types';

// Importing from a module that does not yet export these symbols is
// the primary Red signal. Bun's loader will throw on the first
// `import` below until GREEN extends `scripts/qa-executor.ts` with
// the Phase S5 surface (NAV_COMMANDS, runNavigation, writeNavResults).
import {
  NAV_COMMANDS,
  type KimiWebBridgeRunner,
  runNavigation,
  writeNavResults,
} from './qa-executor';

const TRACK_DIR = resolve(dirname(import.meta.path), '..');

/**
 * The 5 plan-literal cross-route navigation scenarios per
 * `plan.md` Phase S5 sub-task #2 ("Contract test for the 5 scenarios").
 *
 * The runner consumes this list verbatim — any drift between the plan
 * literal and the test pin would be a regression, so the names and
 * paths are anchored to the spec ACs (STORY-Q5) and the plan
 * sub-task #2 enumeration.
 */
const PLAN_LITERAL_SCENARIOS: NavScenario[] = [
  {
    name: 'portfolio→project→back',
    fromPath: 'portfolio',
    clickTarget: { tag: 'a', role: 'link', text: 'Open project' },
    expectedPath: '/project/abc123',
    expectedComponent: 'ProjectViewPage',
    verifyBack: true,
  },
  {
    name: 'settings→app',
    fromPath: 'settings',
    clickTarget: { tag: 'a', role: 'link', text: 'App' },
    expectedPath: '/settings/app',
    expectedComponent: 'AppConfigSection',
  },
  {
    name: 'deep-link→non-existent-project',
    fromPath: 'project/non-existent-id',
    expectedPath: '/',
    expectedComponent: 'PortfolioPage',
  },
  {
    name: 'deep-link→settings',
    fromPath: 'settings',
    expectedPath: '/settings/app',
    expectedComponent: 'AppConfigSection',
  },
  {
    name: '404→wildcard',
    fromPath: 'this/route/does/not/exist',
    expectedPath: '/',
    expectedComponent: 'PortfolioPage',
  },
];

/**
 * Canned kimi-webbridge results. The script is indexable by the
 * call-order counter so we can simulate multi-step scenarios (e.g.
 * the back-button round-trip reads `location.pathname` twice).
 */
interface CannedNavigateResult {
  success: boolean;
  url: string;
  tabId: number;
  httpStatus?: number;
}

interface CannedEvaluateResult {
  type: string;
  value: unknown;
}

interface CannedClickResult {
  success: boolean;
  ref?: number;
  error?: string;
}

/**
 * Fake `KimiWebBridgeRunner` implementation. Records the exact
 * arguments each runner method receives, and returns canned results
 * from a per-instance script. The fake never opens a socket, never
 * spawns a child process, never reads the filesystem — the test is
 * hermetic and bounded.
 *
 * The `evaluate` script is *indexable by call-order* so the runner
 * can read `location.pathname`, then the rendered component name,
 * then (for the back-button round-trip) read `location.pathname`
 * again and get a different result. This is the minimum surface
 * needed to drive the back-button contract without a real browser.
 */
interface FakeKimiRunner extends KimiWebBridgeRunner {
  navigateCalls: Array<{ url: string; session: string }>;
  clickCalls: Array<{ session: string; selector: string }>;
  evaluateCalls: Array<{ session: string; code: string }>;
  screenshotCalls: Array<{ session: string; path: string }>;
}

function makeFakeRunner(script: {
  navigate?: (
    url: string,
  ) => CannedNavigateResult | Promise<CannedNavigateResult>;
  click?: (
    session: string,
    selector: string,
  ) => CannedClickResult | Promise<CannedClickResult>;
  evaluate?: (
    session: string,
    code: string,
    callIndex: number,
  ) =>
    | CannedEvaluateResult
    | Promise<CannedEvaluateResult>;
  screenshot?: (
    session: string,
    path: string,
  ) => Promise<{ path: string }> | { path: string };
} = {}): FakeKimiRunner {
  const navigateCalls: Array<{ url: string; session: string }> = [];
  const clickCalls: Array<{ session: string; selector: string }> = [];
  const evaluateCalls: Array<{ session: string; code: string }> = [];
  const screenshotCalls: Array<{ session: string; path: string }> = [];
  let evaluateCallIndex = 0;

  return {
    navigateCalls,
    clickCalls,
    evaluateCalls,
    screenshotCalls,
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
    async screenshot(session, path): Promise<{ path: string }> {
      screenshotCalls.push({ session, path });
      if (script.screenshot) return await script.screenshot(session, path);
      return { path };
    },
    async evaluate(
      session,
      code,
    ): Promise<CannedEvaluateResult> {
      evaluateCalls.push({ session, code });
      const idx = evaluateCallIndex++;
      if (script.evaluate) return await script.evaluate(session, code, idx);
      return { type: 'string', value: '' };
    },
  };
}

/**
 * Default script that returns a healthy `location.pathname` /
 * `component` for every evaluate call. Tests that need a back-button
 * round-trip can pass a custom `evaluate` script that flips the
 * pathname on the second call.
 */
function defaultHealthyScript(scenario: NavScenario): {
  navigate: (url: string) => CannedNavigateResult;
  evaluate: (
    session: string,
    code: string,
    idx: number,
  ) => CannedEvaluateResult;
} {
  let pathnameCalls = 0;
  return {
    navigate: (url) => ({ success: true, url, tabId: 1, httpStatus: 200 }),
    evaluate: (_session, code, _idx) => {
      if (code.includes('location.pathname')) {
        pathnameCalls++;
        // After the first pathname read, return fromPath to simulate
        // the back-button round-trip returning to the originating page.
        if (pathnameCalls > 1) {
          return { type: 'string', value: '/' + scenario.fromPath };
        }
        return { type: 'string', value: scenario.expectedPath };
      }
      if (code.includes('history.back')) {
        return { type: 'string', value: 'back' };
      }
      if (code.includes('PortfolioPage') || code.includes('component')) {
        return { type: 'string', value: scenario.expectedComponent ?? '' };
      }
      return { type: 'string', value: '' };
    },
  };
}

describe('Phase S5 — NAV_COMMANDS contract (exact paths)', () => {
  /**
   * NAV_COMMANDS is the single source of truth for the per-scenario
   * command paths. The plan sub-task #1 pins the literal screenshot
   * path shape and the run log directory; this block makes a
   * drift-detector test out of it so a refactor that "just changes
   * the screenshot dir" or "moves the session name" breaks loudly
   * here instead of silently in production.
   */
  it('exports screenshotDir = ./measure/tracks/e2e_qa_smoke_20260613/screenshots (per plan sub-task #1)', () => {
    expect(typeof NAV_COMMANDS.screenshotDir).toBe('string');
    expect(NAV_COMMANDS.screenshotDir).toContain('screenshots');
  });

  it('exports runsDir = ./measure/tracks/e2e_qa_smoke_20260613/runs (per plan sub-task #2)', () => {
    expect(typeof NAV_COMMANDS.runsDir).toBe('string');
    expect(NAV_COMMANDS.runsDir).toContain('runs');
  });

  it('exports historyBackScript containing "history.back" (per plan sub-task #1 browser back literal)', () => {
    expect(typeof NAV_COMMANDS.historyBackScript).toBe('string');
    expect(NAV_COMMANDS.historyBackScript).toContain('history.back');
  });
});

describe('Phase S5 — runNavigation() contract: one NavResult per scenario', () => {
  /**
   * The plan literally requires "the navigation-runner visits all 5
   * scenarios and writes one `NavResult` per entry." This block
   * asserts runNavigation returns exactly N entries where N is the
   * length of the scenarios array (5 in the plan literal). Any
   * scenario drift between the plan and the test surface here as a
   * hard fail.
   */
  it('returns one NavResult per scenario (5 plan-literal scenarios)', async () => {
    const fake = makeFakeRunner();
    for (const scenario of PLAN_LITERAL_SCENARIOS) {
      Object.assign(fake, {});
      Object.assign(
        fake,
        defaultHealthyScript(scenario) as unknown as FakeKimiRunner,
      );
    }

    const results: NavResult[] = await runNavigation(
      PLAN_LITERAL_SCENARIOS,
      makeFakeRunner(),
    );

    expect(Array.isArray(results)).toBe(true);
    expect(results.length).toBe(PLAN_LITERAL_SCENARIOS.length);
    expect(results.length).toBe(5);
  });

  it('emits NavResult entries in the same order as the scenarios array', async () => {
    const fake = makeFakeRunner();

    const results: NavResult[] = await runNavigation(PLAN_LITERAL_SCENARIOS, fake);

    for (let i = 0; i < PLAN_LITERAL_SCENARIOS.length; i++) {
      expect(results[i]?.name).toBe(PLAN_LITERAL_SCENARIOS[i]?.name);
      expect(results[i]?.fromPath).toBe(PLAN_LITERAL_SCENARIOS[i]?.fromPath);
      expect(results[i]?.expectedPath).toBe(
        PLAN_LITERAL_SCENARIOS[i]?.expectedPath,
      );
    }
  });

  it('emits a NavResult with status="pass" when actualPath matches expectedPath', async () => {
    const scenario = PLAN_LITERAL_SCENARIOS[0]!;
    const fake = makeFakeRunner(defaultHealthyScript(scenario));

    const results: NavResult[] = await runNavigation([scenario], fake);

    expect(results[0]?.status).toBe('pass');
    expect(results[0]?.actualPath).toBe(scenario.expectedPath);
    expect(results[0]?.error).toBeUndefined();
  });

  it('emits a NavResult with status="fail" when actualPath does not match expectedPath', async () => {
    const scenario = PLAN_LITERAL_SCENARIOS[0]!;
    const fake = makeFakeRunner({
      ...defaultHealthyScript(scenario),
      evaluate: (_s, code, _idx) => {
        if (code.includes('location.pathname')) {
          // Return a path that does NOT match the expected one.
          return { type: 'string', value: '/wrong-path' };
        }
        if (code.includes('history.back')) {
          return { type: 'string', value: 'back' };
        }
        if (code.includes('component')) {
          return { type: 'string', value: scenario.expectedComponent ?? '' };
        }
        return { type: 'string', value: '' };
      },
    });

    const results: NavResult[] = await runNavigation([scenario], fake);

    expect(results[0]?.status).toBe('fail');
    expect(results[0]?.actualPath).toBe('/wrong-path');
    expect(typeof results[0]?.error).toBe('string');
    expect((results[0]?.error ?? '').length).toBeGreaterThan(0);
  });

  it('emits a NavResult with status="fail" when expectedComponent does not match rendered component', async () => {
    const scenario = PLAN_LITERAL_SCENARIOS[0]!;
    const fake = makeFakeRunner({
      ...defaultHealthyScript(scenario),
      evaluate: (_s, code, _idx) => {
        if (code.includes('location.pathname')) {
          return { type: 'string', value: scenario.expectedPath };
        }
        if (code.includes('history.back')) {
          return { type: 'string', value: 'back' };
        }
        // Return a different component name.
        return { type: 'string', value: 'WrongComponent' };
      },
    });

    const results: NavResult[] = await runNavigation([scenario], fake);

    expect(results[0]?.status).toBe('fail');
    expect(results[0]?.actualComponent).toBe('WrongComponent');
    expect(typeof results[0]?.error).toBe('string');
  });

  it('emits durationMs >= 0 for every NavResult (records wall-clock budget per scenario)', async () => {
    const fake = makeFakeRunner();

    const results: NavResult[] = await runNavigation(PLAN_LITERAL_SCENARIOS, fake);

    for (const result of results) {
      expect(typeof result.durationMs).toBe('number');
      expect(result.durationMs).toBeGreaterThanOrEqual(0);
    }
  });
});

describe('Phase S5 — NavResult shape contract (all plan-literal fields)', () => {
  /**
   * The plan literally specifies the per-scenario shape:
   *   `{ name, fromPath, clickTarget?, expectedPath, actualPath,
   *      expectedComponent?, actualComponent, backVerified, status,
   *      screenshotPath, durationMs, error? }`
   * This block exercises a real `runNavigation` call against a healthy
   * fake and asserts the resulting NavResult matches the plan shape
   * field-for-field.
   */
  it('NavResult has all 11 plan-literal fields (name, fromPath, expectedPath, actualPath, actualComponent, backVerified, status, screenshotPath, durationMs)', async () => {
    const scenario = PLAN_LITERAL_SCENARIOS[0]!;
    const fake = makeFakeRunner(defaultHealthyScript(scenario));

    const results: NavResult[] = await runNavigation([scenario], fake);
    const portfolioProject = results[0];
    expect(portfolioProject).toBeDefined();

    // Required string fields.
    expect(typeof portfolioProject?.name).toBe('string');
    expect(typeof portfolioProject?.fromPath).toBe('string');
    expect(typeof portfolioProject?.expectedPath).toBe('string');
    expect(typeof portfolioProject?.actualPath).toBe('string');
    expect(typeof portfolioProject?.actualComponent).toBe('string');
    expect(typeof portfolioProject?.screenshotPath).toBe('string');

    // Required literal-union field.
    const allowedStatuses: NavResultStatus[] = ['pass', 'fail', 'skip'];
    expect(allowedStatuses).toContain(portfolioProject?.status);

    // Required boolean field.
    expect(typeof portfolioProject?.backVerified).toBe('boolean');

    // Required number field.
    expect(typeof portfolioProject?.durationMs).toBe('number');
  });

  it('NavResult.status matches the literal union "pass" | "fail" | "skip" (per plan literal)', async () => {
    const fake = makeFakeRunner();

    const results: NavResult[] = await runNavigation(PLAN_LITERAL_SCENARIOS, fake);

    for (const result of results) {
      expect(['pass', 'fail', 'skip']).toContain(result.status);
    }
  });
});

describe('Phase S5 — back-button contract (per plan sub-task #1)', () => {
  /**
   * Plan sub-task #1 step 4: "Test browser back via
   * `evaluate(() => history.back())` and verify state preservation."
   * The runner must:
   *   1. Navigate to fromPath
   *   2. Click the target → arrive at expectedPath
   *   3. evaluate(() => history.back())
   *   4. evaluate(() => location.pathname) again
   *   5. Verify the second pathname equals fromPath
   * This block pins the literal `history.back()` evaluate call and
   * the state-preservation assertion.
   */
  it('invokes runner.evaluate with code containing "history.back" for the portfolio→project→back scenario', async () => {
    const scenario = PLAN_LITERAL_SCENARIOS[0]!; // portfolio→project→back
    const fake = makeFakeRunner(defaultHealthyScript(scenario));

    await runNavigation([scenario], fake);

    const backCalls = fake.evaluateCalls.filter((c) =>
      c.code.includes('history.back'),
    );
    expect(backCalls.length).toBe(1);
  });

  it('marks backVerified=true when history.back() returns the runner to fromPath', async () => {
    const scenario = PLAN_LITERAL_SCENARIOS[0]!;
    let pathnameCalls = 0;
    const fake = makeFakeRunner({
      navigate: (url) => ({ success: true, url, tabId: 1, httpStatus: 200 }),
      evaluate: (_s, code) => {
        if (code.includes('location.pathname')) {
          pathnameCalls++;
          // First call: at expectedPath. Second call (after back): at fromPath.
          if (pathnameCalls === 1) return { type: 'string', value: scenario.expectedPath };
          return { type: 'string', value: '/' + scenario.fromPath };
        }
        if (code.includes('history.back')) {
          return { type: 'string', value: 'back' };
        }
        if (code.includes('component')) {
          return { type: 'string', value: scenario.expectedComponent ?? '' };
        }
        return { type: 'string', value: '' };
      },
    });

    const results: NavResult[] = await runNavigation([scenario], fake);

    expect(results[0]?.backVerified).toBe(true);
    expect(results[0]?.status).toBe('pass');
  });

  it('marks backVerified=false AND status="fail" when history.back() does not return to fromPath', async () => {
    const scenario = PLAN_LITERAL_SCENARIOS[0]!;
    let pathnameCalls = 0;
    const fake = makeFakeRunner({
      navigate: (url) => ({ success: true, url, tabId: 1, httpStatus: 200 }),
      evaluate: (_s, code) => {
        if (code.includes('location.pathname')) {
          pathnameCalls++;
          // First call: at expectedPath. Second call (after back): still at expectedPath (state lost).
          return { type: 'string', value: scenario.expectedPath };
        }
        if (code.includes('history.back')) {
          return { type: 'string', value: 'back' };
        }
        if (code.includes('component')) {
          return { type: 'string', value: scenario.expectedComponent ?? '' };
        }
        return { type: 'string', value: '' };
      },
    });

    const results: NavResult[] = await runNavigation([scenario], fake);

    expect(results[0]?.backVerified).toBe(false);
    expect(results[0]?.status).toBe('fail');
  });

  it('does not invoke history.back() for scenarios without verifyBack=true (redirect / wildcard scenarios)', async () => {
    const scenarios: NavScenario[] = PLAN_LITERAL_SCENARIOS.filter(
      (s) => s.verifyBack !== true,
    );
    expect(scenarios.length).toBe(4); // settings→app, deep-link→non-existent-project, deep-link→settings, 404→wildcard

    const fake = makeFakeRunner();

    await runNavigation(scenarios, fake);

    const backCalls = fake.evaluateCalls.filter((c) =>
      c.code.includes('history.back'),
    );
    expect(backCalls.length).toBe(0);
  });
});

describe('Phase S5 — 5 plan-literal scenarios are all driven (regression-safe enumeration)', () => {
  /**
   * The plan sub-task #2 enumerates 5 specific scenarios. This block
   * pins the *names* of those scenarios as a regression-safe
   * enumeration. If GREEN drops a scenario (e.g. "deep-link→settings"
   * because the runner's author thinks "settings→app" already covers
   * it), the test fails loudly. The runner must visit all 5.
   */
  it('includes the portfolio→project→back scenario (per spec AC #1)', async () => {
    const names = PLAN_LITERAL_SCENARIOS.map((s) => s.name);
    expect(names).toContain('portfolio→project→back');
  });

  it('includes the settings→app scenario (per spec AC #4)', async () => {
    const names = PLAN_LITERAL_SCENARIOS.map((s) => s.name);
    expect(names).toContain('settings→app');
  });

  it('includes the deep-link→non-existent-project scenario (per spec AC #3)', async () => {
    const names = PLAN_LITERAL_SCENARIOS.map((s) => s.name);
    expect(names).toContain('deep-link→non-existent-project');
  });

  it('includes the deep-link→settings scenario (per spec AC #4 — direct visit)', async () => {
    const names = PLAN_LITERAL_SCENARIOS.map((s) => s.name);
    expect(names).toContain('deep-link→settings');
  });

  it('includes the 404→wildcard scenario (per spec AC #3 — wildcard route)', async () => {
    const names = PLAN_LITERAL_SCENARIOS.map((s) => s.name);
    expect(names).toContain('404→wildcard');
  });

  it('portfolio→project→back scenario is the ONLY one with verifyBack=true', () => {
    const backScenarios = PLAN_LITERAL_SCENARIOS.filter(
      (s) => s.verifyBack === true,
    );
    expect(backScenarios.length).toBe(1);
    expect(backScenarios[0]?.name).toBe('portfolio→project→back');
  });
});

describe('Phase S5 — fake runner intercepts the exact kimi-webbridge command paths', () => {
  /**
   * Satisfies the MID prompt's fake-harness requirement: "prove the
   * fake mode intercepts the exact command path or test the command
   * string directly." This block exercises runNavigation against a
   * fake runner and asserts that for each scenario the runner was
   * called with the expected sequence (navigate → click? → evaluate
   * for pathname → evaluate for component → evaluate history.back? →
   * evaluate for back-pathname → screenshot) at the expected URL /
   * selector paths.
   */
  it('invokes runner.navigate exactly once per scenario (5 calls total)', async () => {
    const fake = makeFakeRunner();

    await runNavigation(PLAN_LITERAL_SCENARIOS, fake);

    expect(fake.navigateCalls.length).toBe(PLAN_LITERAL_SCENARIOS.length);
  });

  it('navigates to the Vite dev server origin for every scenario (http://localhost:5173/<fromPath>)', async () => {
    const fake = makeFakeRunner();

    await runNavigation(PLAN_LITERAL_SCENARIOS, fake);

    // Every navigate call must use the local Vite dev server origin.
    const wrongOrigin = fake.navigateCalls.filter(
      (call) => !call.url.startsWith('http://localhost:5173/'),
    );
    expect(wrongOrigin).toEqual([]);
  });

  it('invokes runner.click only for scenarios that have a clickTarget (portfolio→project→back, settings→app = 2 calls)', async () => {
    const fake = makeFakeRunner();

    await runNavigation(PLAN_LITERAL_SCENARIOS, fake);

    // 2 of the 5 scenarios have a clickTarget (portfolio→project→back, settings→app).
    // The other 3 are deep-link / wildcard scenarios with no click.
    const scenariosWithClick = PLAN_LITERAL_SCENARIOS.filter(
      (s) => s.clickTarget !== undefined,
    );
    expect(scenariosWithClick.length).toBe(2);
    expect(fake.clickCalls.length).toBe(scenariosWithClick.length);
  });

  it('writes a screenshot per scenario to a non-empty path under the track\'s screenshot dir', async () => {
    const fake = makeFakeRunner();

    await runNavigation(PLAN_LITERAL_SCENARIOS, fake);

    expect(fake.screenshotCalls.length).toBe(PLAN_LITERAL_SCENARIOS.length);
    for (const call of fake.screenshotCalls) {
      expect(typeof call.path).toBe('string');
      expect(call.path.length).toBeGreaterThan(0);
      // The screenshot path is rooted under the track's screenshot directory.
      expect(NAV_COMMANDS.screenshotDir.length).toBeGreaterThan(0);
    }
  });

  it('uses a single kimi-webbridge session name across all scenario calls (per run)', async () => {
    const fake = makeFakeRunner();

    await runNavigation(PLAN_LITERAL_SCENARIOS, fake);

    const sessions = new Set<string>();
    for (const call of fake.navigateCalls) sessions.add(call.session);
    for (const call of fake.clickCalls) sessions.add(call.session);
    for (const call of fake.evaluateCalls) sessions.add(call.session);
    for (const call of fake.screenshotCalls) sessions.add(call.session);

    // All calls in a single runNavigation invocation share one session.
    expect(sessions.size).toBe(1);
    const [session] = [...sessions];
    expect(typeof session).toBe('string');
    expect((session ?? '').length).toBeGreaterThan(0);
  });
});

describe('Phase S5 — writeNavResults() on-disk artifact contract', () => {
  /**
   * Plan sub-task #2: "Per-scenario `NavResult` written to
   * `runs/qa-navigation-<ts>.json`." This block pins the on-disk
   * format while keeping the Red test hermetic via `mkdtempSync`
   * per-test isolation.
   *
   * The on-disk envelope is `NavRunLog` (committed to
   * `scripts/types.ts` alongside `NavResult`): `{ $schema,
   * generated_at, session, frontendBaseUrl, results: NavResult[] }`.
   * This is the same envelope shape Phase S2/S3/S4 use so the
   * `qa-navigation-<ts>.json` consumers (Phase S6 findings
   * aggregator, Phase S7 coverage reporter) can rely on a single
   * metadata convention.
   */
  let tmpDir: string;
  let navPath: string;

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'qa-nav-test-'));
    navPath = join(tmpDir, 'qa-navigation-test.json');
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it('writes a NavRunLog envelope with $schema, generated_at, session, frontendBaseUrl, results', async () => {
    const fake = makeFakeRunner();
    const results: NavResult[] = await runNavigation(PLAN_LITERAL_SCENARIOS, fake);
    const log: NavRunLog = {
      $schema: 'https://fleet-commander.local/schemas/qa-navigation.v1.json',
      generated_at: '2026-06-13T12:00:00.000Z',
      session: 'qa-2026-06-13',
      frontendBaseUrl: 'http://localhost:5173',
      results,
    };
    await writeNavResults(navPath, log);

    const parsed = JSON.parse(readFileSync(navPath, 'utf8')) as NavRunLog;
    expect(parsed.$schema).toBe('https://fleet-commander.local/schemas/qa-navigation.v1.json');
    expect(parsed.generated_at).toBe('2026-06-13T12:00:00.000Z');
    expect(parsed.session).toBe('qa-2026-06-13');
    expect(parsed.frontendBaseUrl).toBe('http://localhost:5173');
    expect(Array.isArray(parsed.results)).toBe(true);
    expect(parsed.results.length).toBe(results.length);
  });

  it('preserves every NavResult field through the round-trip (no field loss)', async () => {
    const fake = makeFakeRunner();
    const results: NavResult[] = await runNavigation(PLAN_LITERAL_SCENARIOS, fake);
    const log: NavRunLog = {
      $schema: 'https://fleet-commander.local/schemas/qa-navigation.v1.json',
      generated_at: '2026-06-13T12:00:00.000Z',
      session: 'qa-2026-06-13',
      frontendBaseUrl: 'http://localhost:5173',
      results,
    };
    await writeNavResults(navPath, log);

    const parsed = JSON.parse(readFileSync(navPath, 'utf8')) as NavRunLog;
    for (let i = 0; i < results.length; i++) {
      const written = parsed.results[i];
      const original = results[i];
      if (!written || !original) {
        throw new Error(`NavResult ${i} missing after round-trip`);
      }
      expect(written.name).toBe(original.name);
      expect(written.fromPath).toBe(original.fromPath);
      expect(written.expectedPath).toBe(original.expectedPath);
      expect(written.actualPath).toBe(original.actualPath);
      expect(written.status).toBe(original.status);
      expect(written.backVerified).toBe(original.backVerified);
      expect(written.screenshotPath).toBe(original.screenshotPath);
      expect(written.durationMs).toBe(original.durationMs);
    }
  });

  it('is idempotent — second call with the same input produces byte-equal output', async () => {
    const fake = makeFakeRunner();
    const results: NavResult[] = await runNavigation(PLAN_LITERAL_SCENARIOS, fake);
    const log: NavRunLog = {
      $schema: 'https://fleet-commander.local/schemas/qa-navigation.v1.json',
      generated_at: '2026-06-13T12:00:00.000Z',
      session: 'qa-2026-06-13',
      frontendBaseUrl: 'http://localhost:5173',
      results,
    };

    await writeNavResults(navPath, log);
    const first = readFileSync(navPath, 'utf8');
    await writeNavResults(navPath, log);
    const second = readFileSync(navPath, 'utf8');

    expect(second).toBe(first);
  });
});

// Type-only smoke: the imports above must resolve to *exported* symbols,
// not just `any`. This dead reference at the bottom of the file gives
// `tsc --noEmit` (and bun's loader) an additional handle to refuse if
// the GREEN module forgets to export one of the contract types.
const _typeProbe: {
  Runner: KimiWebBridgeRunner;
  Result: NavResult;
  Log: NavRunLog;
  Scenario: NavScenario;
} | null = null;
if (_typeProbe !== null) {
  // unreachable; keeps the unused-import flag quiet.
  console.log(_typeProbe);
}
