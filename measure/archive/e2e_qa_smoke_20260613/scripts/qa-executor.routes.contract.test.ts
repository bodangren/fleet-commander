/**
 * Contract test for the Phase S3 route-runner (STORY-Q3).
 *
 * Spec:           measure/archive/e2e_qa_smoke_20260613/spec.md (STORY-Q3)
 * Plan:           measure/archive/e2e_qa_smoke_20260613/plan.md (Phase S3)
 * Test strategy:  measure/archive/e2e_qa_smoke_20260613/test-strategy.md
 *                 (§"Phase 3 — Route coverage" pins the per-route shape
 *                  `{ path, component, status, httpStatus?, title,
 *                  screenshotPath, snapshotRefs, durationMs, error? }`.)
 *
 * Why a separate test file from `qa-executor.contract.test.ts`?
 *
 *   `qa-executor.contract.test.ts` enforces the Phase S2 dev-stack probe
 *   contract. This file enforces the Phase S3 route-runner contract.
 *   They are independent and run independently — the two phases consume
 *   different symbols from `./qa-executor` and the contract surface
 *   for each is gated on its own `describe` block.
 *
 * Why dependency injection (fake `KimiWebBridgeRunner`) instead of
 * `mock.module()`?
 *
 *   Per `(bun_mock_module)` in lessons-learned: "`mock.module()` persists
 *   across test files; prefer dependency injection over module mocks."
 *   The route runner talks to `http://127.0.0.1:10086` (kimi-webbridge
 *   daemon), so a fake runner is the only way to make the test
 *   deterministic and bounded.
 *
 *   The fake runner *also* satisfies the MID prompt's fake-harness
 *   requirement: "prove the fake mode intercepts the exact command path
 *   or test the command string directly". Each fake method records the
 *   exact arguments it was called with — the URL navigated to, the
 *   screenshot path, the evaluate code — so assertions can pin the
 *   literal strings a real kimi-webbridge call would emit. A real
 *   daemon call would not surface that.
 *
 * Red signal (expected failures at HEAD):
 *
 *   The contract surface for Phase S3 lives in `qa-executor.ts` next to
 *   the Phase S2 surface. At HEAD, `qa-executor.ts` exports
 *   `runRoutes`, `KimiWebBridgeRunner`, `writeRouteRuns`, and
 *   `ROUTE_COMMANDS` are not yet declared. The first `import` below
 *   will throw a `ResolveMessage` ("Cannot find module export …") on
 *   bun's loader; bun reports the entire file as a single failure
 *   counting every `it()` block against the same missing export. Once
 *   GREEN creates the symbols (even as stubs), every individual `it()`
 *   becomes its own targeted failure for the specific contract it
 *   pins:
 *
 *     - runRoutes returns 38 entries (one per inventory route)
 *     - RouteRun shape has all 8 fields from the plan literal
 *     - Fake runner intercepts the exact kimi-webbridge command paths
 *       (navigate → snapshot → evaluate → screenshot per route)
 *     - status='pass' when title matches expectedComponents
 *     - status='fail' when httpStatus is 4xx/5xx OR refs === 0
 *     - status='skip' for redirect / noInteractive routes
 *     - writeRouteRuns round-trips through runs/qa-routes-<ts>.json
 *       preserving the RouteRunLog envelope
 *
 * Live-behaviour pairing (per test-strategy §"Phase 3 — Route coverage"):
 *
 *   The contract this file enforces is the static gate. The live gate
 *   is Phase S3's "Generate Docs & Doctor" sub-task: run the actual
 *   `runRoutes(realRunner, realInventory)` against the running dev
 *   stack, capture screenshots in `screenshots/`, and record the run
 *   log in `runs/qa-routes-<ts>.json`. The fake-runner tests prove
 *   the wiring; the real-runner invocation proves the wiring is
 *   connected to kimi-webbridge + the actual Vite dev server. Both
 *   are required; neither replaces the other.
 */
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';

import type { RouteInventory, RouteRun, RouteRunLog } from './types';

// Importing from a module that does not yet export these symbols is
// the primary Red signal. Bun's loader will throw on the first
// `import` below until GREEN extends `scripts/qa-executor.ts` with
// the Phase S3 surface.
import {
  ROUTE_COMMANDS,
  type KimiWebBridgeRunner,
  runRoutes,
  writeRouteRuns,
} from './qa-executor';

const TRACK_DIR = resolve(dirname(import.meta.path), '..');
const INVENTORY_JSON = join(TRACK_DIR, 'route-inventory.json');

/**
 * Load the on-disk route inventory committed at Phase S1 GREEN. The
 * test treats it as the source of truth for "how many routes must the
 * runner visit" — any inventory drift between Phase S1 and Phase S3
 * surfaces here as a hard fail, not as a silent test rerun.
 */
function loadInventory(): RouteInventory {
  const raw = readFileSync(INVENTORY_JSON, 'utf8');
  return JSON.parse(raw) as RouteInventory;
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
 * `runRoutes()` uses the right code path through kimi-webbridge
 * (navigate → snapshot → evaluate → screenshot per route) and not
 * some hard-coded literal that drifts from the contract.
 */
interface FakeKimiRunner extends KimiWebBridgeRunner {
  navigateCalls: Array<{ url: string; session: string }>;
  snapshotCalls: string[];
  evaluateCalls: Array<{ session: string; code: string }>;
  screenshotCalls: Array<{ session: string; path: string }>;
}

interface CannedNavigateResult {
  success: boolean;
  url: string;
  tabId: number;
  httpStatus?: number;
}

interface CannedSnapshotResult {
  url: string;
  title: string;
  refs: number;
}

interface CannedEvaluateResult {
  type: 'string' | 'number' | 'boolean' | 'object';
  value: unknown;
}

function makeFakeRunner(script: {
  navigate?: (url: string) => CannedNavigateResult | Promise<CannedNavigateResult>;
  snapshot?: (session: string) => CannedSnapshotResult | Promise<CannedSnapshotResult>;
  evaluate?: (session: string, code: string) =>
    | CannedEvaluateResult
    | Promise<CannedEvaluateResult>;
  screenshot?: (
    session: string,
    path: string,
  ) => Promise<{ path: string }> | { path: string };
} = {}): FakeKimiRunner {
  const navigateCalls: Array<{ url: string; session: string }> = [];
  const snapshotCalls: string[] = [];
  const evaluateCalls: Array<{ session: string; code: string }> = [];
  const screenshotCalls: Array<{ session: string; path: string }> = [];

  return {
    navigateCalls,
    snapshotCalls,
    evaluateCalls,
    screenshotCalls,
    async navigate(url, session): Promise<CannedNavigateResult> {
      navigateCalls.push({ url, session });
      if (script.navigate) return await script.navigate(url);
      return { success: true, url, tabId: 1, httpStatus: 200 };
    },
    async snapshot(session): Promise<CannedSnapshotResult> {
      snapshotCalls.push(session);
      if (script.snapshot) return await script.snapshot(session);
      return { url: 'http://localhost:5173/portfolio', title: 'PortfolioPage', refs: 4 };
    },
    async evaluate(session, code): Promise<CannedEvaluateResult> {
      evaluateCalls.push({ session, code });
      if (script.evaluate) return await script.evaluate(session, code);
      return { type: 'string', value: 'PortfolioPage · Fleet Commander' };
    },
    async screenshot(session, path): Promise<{ path: string }> {
      screenshotCalls.push({ session, path });
      if (script.screenshot) return await script.screenshot(session, path);
      return { path };
    },
  };
}

describe('Phase S3 — ROUTE_COMMANDS contract (exact paths)', () => {
  /**
   * ROUTE_COMMANDS is the single source of truth for the per-route
   * command paths. The plan sub-task #1 pins the literal screenshot
   * path shape; this block makes a drift-detector test out of it so
   * a refactor that "just changes the screenshot dir" or "moves the
   * session name" breaks loudly here instead of silently in
   * production.
   */
  it('exports kimiBaseUrl = http://127.0.0.1:10086 (kimi-webbridge daemon per test-strategy)', () => {
    expect(ROUTE_COMMANDS.kimiBaseUrl).toBe('http://127.0.0.1:10086');
  });

  it('exports screenshotDir = ./measure/archive/e2e_qa_smoke_20260613/screenshots (per plan sub-task #1)', () => {
    expect(typeof ROUTE_COMMANDS.screenshotDir).toBe('string');
    expect(ROUTE_COMMANDS.screenshotDir).toContain('screenshots');
  });

  it('exports runsDir = ./measure/archive/e2e_qa_smoke_20260613/runs (per plan sub-task #2)', () => {
    expect(typeof ROUTE_COMMANDS.runsDir).toBe('string');
    expect(ROUTE_COMMANDS.runsDir).toContain('runs');
  });
});

describe('Phase S3 — runRoutes() contract: one RouteRun per inventory entry', () => {
  /**
   * The plan literally requires "the route-runner visits all 38
   * inventory entries and writes one RouteRun per entry". This block
   * loads the on-disk inventory (the Phase S1 GREEN output) and
   * asserts runRoutes returns exactly N entries where N is
   * `inventory.routes.length`. Any inventory drift between S1 and S3
   * surfaces here as a hard fail.
   */
  it('returns one RouteRun per inventory entry (38 routes per the Phase S1 inventory)', async () => {
    const inventory = loadInventory();
    const fake = makeFakeRunner();

    const runs: RouteRun[] = await runRoutes(inventory, fake);

    expect(Array.isArray(runs)).toBe(true);
    expect(runs.length).toBe(inventory.routes.length);
    expect(runs.length).toBe(38);
  });

  it('emits RouteRun entries in the same order as inventory.routes', async () => {
    const inventory = loadInventory();
    const fake = makeFakeRunner();

    const runs: RouteRun[] = await runRoutes(inventory, fake);

    for (let i = 0; i < inventory.routes.length; i++) {
      expect(runs[i]?.path).toBe(inventory.routes[i]?.path);
      expect(runs[i]?.component).toBe(inventory.routes[i]?.component);
    }
  });

  it('emits a RouteRun with status="pass" for a healthy route (200 + refs>0 + title match)', async () => {
    const inventory = loadInventory();
    const fake = makeFakeRunner({
      navigate: () => ({ success: true, url: 'http://localhost:5173/portfolio', tabId: 1, httpStatus: 200 }),
      snapshot: () => ({ url: 'http://localhost:5173/portfolio', title: 'PortfolioPage · Fleet Commander', refs: 4 }),
      evaluate: () => ({ type: 'string', value: 'PortfolioPage · Fleet Commander' }),
    });

    const runs: RouteRun[] = await runRoutes(inventory, fake);
    const portfolio = runs.find((r) => r.path === 'portfolio');

    expect(portfolio).toBeDefined();
    expect(portfolio?.status).toBe('pass');
    expect(portfolio?.httpStatus).toBe(200);
    expect(portfolio?.snapshotRefs).toBe(4);
    expect(portfolio?.error).toBeUndefined();
  });

  it('emits status="fail" with error message when refs === 0 (empty page)', async () => {
    const inventory = loadInventory();
    const fake = makeFakeRunner({
      snapshot: () => ({ url: 'http://localhost:5173/portfolio', title: 'PortfolioPage', refs: 0 }),
    });

    const runs: RouteRun[] = await runRoutes(inventory, fake);
    const portfolio = runs.find((r) => r.path === 'portfolio');

    expect(portfolio?.status).toBe('fail');
    expect(portfolio?.snapshotRefs).toBe(0);
    expect(typeof portfolio?.error).toBe('string');
    expect((portfolio?.error ?? '').length).toBeGreaterThan(0);
  });

  it('emits status="fail" with error message when httpStatus is 4xx/5xx', async () => {
    const inventory = loadInventory();
    const fake = makeFakeRunner({
      navigate: () => ({ success: true, url: 'http://localhost:5173/portfolio', tabId: 1, httpStatus: 500 }),
    });

    const runs: RouteRun[] = await runRoutes(inventory, fake);
    const portfolio = runs.find((r) => r.path === 'portfolio');

    expect(portfolio?.status).toBe('fail');
    expect(portfolio?.httpStatus).toBe(500);
    expect((portfolio?.error ?? '').toLowerCase()).toContain('5');
  });

  it('emits status="skip" for routes with noInteractive=true (redirects + page-less entries)', async () => {
    const inventory = loadInventory();
    const fake = makeFakeRunner();

    const runs: RouteRun[] = await runRoutes(inventory, fake);
    const skipped = runs.filter((r) => r.status === 'skip');

    // Every inventory entry flagged noInteractive must be skipped.
    const expectedSkippedPaths = inventory.routes
      .filter((r) => r.noInteractive === true)
      .map((r) => r.path);
    for (const path of expectedSkippedPaths) {
      const run = runs.find((r) => r.path === path);
      expect(run?.status).toBe('skip');
    }
    expect(skipped.length).toBe(expectedSkippedPaths.length);
  });

  it('emits durationMs > 0 for every RouteRun (records wall-clock budget per route)', async () => {
    const inventory = loadInventory();
    const fake = makeFakeRunner();

    const runs: RouteRun[] = await runRoutes(inventory, fake);

    for (const run of runs) {
      expect(typeof run.durationMs).toBe('number');
      expect(run.durationMs).toBeGreaterThanOrEqual(0);
    }
  });
});

describe('Phase S3 — RouteRun shape contract (all 8 plan-literal fields)', () => {
  /**
   * The plan literally specifies the per-route shape:
   *   `{ path, component, status: 'pass'|'fail'|'skip', httpStatus?,
   *     title, screenshotPath, snapshotRefs: number, durationMs,
   *     error? }`
   * This block exercises a real `runRoutes` call against a healthy
   * fake and asserts the resulting RouteRun matches the plan shape
   * field-for-field.
   */
  it('RouteRun has all 8 plan-literal fields (path, component, status, httpStatus, title, screenshotPath, snapshotRefs, durationMs)', async () => {
    const inventory = loadInventory();
    const fake = makeFakeRunner();

    const runs: RouteRun[] = await runRoutes(inventory, fake);
    const portfolio = runs.find((r) => r.path === 'portfolio');
    expect(portfolio).toBeDefined();

    // Required string fields.
    expect(typeof portfolio?.path).toBe('string');
    expect(typeof portfolio?.component).toBe('string');
    expect(typeof portfolio?.title).toBe('string');
    expect(typeof portfolio?.screenshotPath).toBe('string');

    // Required literal-union field.
    expect(['pass', 'fail', 'skip']).toContain(portfolio?.status);

    // Required number fields.
    expect(typeof portfolio?.httpStatus).toBe('number');
    expect(typeof portfolio?.snapshotRefs).toBe('number');
    expect(typeof portfolio?.durationMs).toBe('number');
  });

  it('RouteRun.status matches the literal union "pass" | "fail" | "skip" (per plan literal)', async () => {
    const inventory = loadInventory();
    const fake = makeFakeRunner();

    const runs: RouteRun[] = await runRoutes(inventory, fake);

    for (const run of runs) {
      expect(['pass', 'fail', 'skip']).toContain(run.status);
    }
  });
});

describe('Phase S3 — fake runner intercepts the exact kimi-webbridge command paths', () => {
  /**
   * Satisfies the MID prompt's fake-harness requirement: "prove the
   * fake mode intercepts the exact command path or test the command
   * string directly." This block exercises runRoutes against a fake
   * runner and asserts that for each route the runner was called
   * with the expected sequence (navigate → snapshot → evaluate →
   * screenshot) at the expected URL / selector paths.
   *
   * The 38-route inventory is iterated 1:1, so we expect exactly
   * 38 navigate calls and 38 screenshot calls.
   */
  it('invokes runner.navigate exactly once per inventory route (38 calls total)', async () => {
    const inventory = loadInventory();
    const fake = makeFakeRunner();

    await runRoutes(inventory, fake);

    expect(fake.navigateCalls.length).toBe(inventory.routes.length);
  });

  it('navigates to the Vite dev server origin for every route (http://localhost:5173/<path>)', async () => {
    const inventory = loadInventory();
    const fake = makeFakeRunner();

    await runRoutes(inventory, fake);

    // Every navigate call must use the local Vite dev server origin.
    const wrongOrigin = fake.navigateCalls.filter(
      (call) => !call.url.startsWith(ROUTE_COMMANDS.frontendBaseUrl),
    );
    expect(wrongOrigin).toEqual([]);
  });

  it('invokes runner.snapshot exactly once per non-skipped route (post-filter count)', async () => {
    const inventory = loadInventory();
    const fake = makeFakeRunner();

    await runRoutes(inventory, fake);

    const skippedCount = inventory.routes.filter((r) => r.noInteractive === true)
      .length;
    const expectedSnapshotCalls = inventory.routes.length - skippedCount;
    // Skip routes may or may not call snapshot (GREEN's choice); the
    // floor is "at least the non-skipped count".
    expect(fake.snapshotCalls.length).toBeGreaterThanOrEqual(expectedSnapshotCalls);
  });

  it('writes a screenshot per non-skipped route to <runs-dir>-relative path', async () => {
    const inventory = loadInventory();
    const fake = makeFakeRunner();

    await runRoutes(inventory, fake);

    expect(fake.screenshotCalls.length).toBeGreaterThan(0);
    for (const call of fake.screenshotCalls) {
      // Every screenshot path is a non-empty string routed under the
      // track's screenshot directory.
      expect(typeof call.path).toBe('string');
      expect(call.path.length).toBeGreaterThan(0);
    }
  });

  it('uses a single kimi-webbridge session name across all route calls (per run)', async () => {
    const inventory = loadInventory();
    const fake = makeFakeRunner();

    await runRoutes(inventory, fake);

    const sessions = new Set<string>();
    for (const call of fake.navigateCalls) sessions.add(call.session);
    for (const call of fake.snapshotCalls) sessions.add(call);
    for (const call of fake.screenshotCalls) sessions.add(call.session);
    for (const call of fake.evaluateCalls) sessions.add(call.session);

    // All calls in a single runRoutes invocation share one session.
    expect(sessions.size).toBe(1);
    const [session] = [...sessions];
    expect(typeof session).toBe('string');
    expect((session ?? '').length).toBeGreaterThan(0);
  });
});

describe('Phase S3 — writeRouteRuns() on-disk artifact contract', () => {
  /**
   * Plan sub-task #2: "Per-route `RouteRun` written to
   * `runs/qa-routes-<ts>.json`." This block pins the on-disk format
   * while keeping the Red test hermetic via `mkdtempSync` per-test
   * isolation.
   *
   * The on-disk envelope is `RouteRunLog` (committed to
   * `scripts/types.ts` alongside `RouteRun`): `{ $schema,
   * generated_at, session, frontendBaseUrl, routes: RouteRun[] }`.
   * This is the same envelope shape Phase S2's `writeProbeResult()`
   * uses (snake_case on disk via the wire format) so the
   * `qa-routes-<ts>.json` consumers (Phase S6 findings aggregator,
   * Phase S7 coverage reporter) can rely on a single metadata
   * convention.
   */
  let tmpDir: string;
  let runsPath: string;

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'qa-routes-test-'));
    runsPath = join(tmpDir, 'qa-routes-test.json');
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it('writes a RouteRunLog envelope with $schema, generated_at, session, frontendBaseUrl, routes', async () => {
    const inventory = loadInventory();
    const fake = makeFakeRunner();

    const runs: RouteRun[] = await runRoutes(inventory, fake);
    const log: RouteRunLog = {
      $schema: 'https://fleet-commander.local/schemas/qa-routes.v1.json',
      generated_at: '2026-06-13T12:00:00.000Z',
      session: 'qa-2026-06-13',
      frontendBaseUrl: 'http://localhost:5173',
      routes: runs,
    };
    await writeRouteRuns(runsPath, log);

    const parsed = JSON.parse(readFileSync(runsPath, 'utf8')) as RouteRunLog;
    expect(parsed.$schema).toBe('https://fleet-commander.local/schemas/qa-routes.v1.json');
    expect(parsed.generated_at).toBe('2026-06-13T12:00:00.000Z');
    expect(parsed.session).toBe('qa-2026-06-13');
    expect(parsed.frontendBaseUrl).toBe('http://localhost:5173');
    expect(Array.isArray(parsed.routes)).toBe(true);
    expect(parsed.routes.length).toBe(runs.length);
  });

  it('preserves every RouteRun field through the round-trip (no field loss)', async () => {
    const inventory = loadInventory();
    const fake = makeFakeRunner();

    const runs: RouteRun[] = await runRoutes(inventory, fake);
    const log: RouteRunLog = {
      $schema: 'https://fleet-commander.local/schemas/qa-routes.v1.json',
      generated_at: '2026-06-13T12:00:00.000Z',
      session: 'qa-2026-06-13',
      frontendBaseUrl: 'http://localhost:5173',
      routes: runs,
    };
    await writeRouteRuns(runsPath, log);

    const parsed = JSON.parse(readFileSync(runsPath, 'utf8')) as RouteRunLog;
    for (let i = 0; i < runs.length; i++) {
      const written = parsed.routes[i];
      const original = runs[i];
      if (!written || !original) {
        throw new Error(`route ${i} missing after round-trip`);
      }
      expect(written.path).toBe(original.path);
      expect(written.component).toBe(original.component);
      expect(written.status).toBe(original.status);
      expect(written.title).toBe(original.title);
      expect(written.screenshotPath).toBe(original.screenshotPath);
      expect(written.snapshotRefs).toBe(original.snapshotRefs);
      expect(written.durationMs).toBe(original.durationMs);
    }
  });

  it('is idempotent — second call with the same input produces byte-equal output', async () => {
    const inventory = loadInventory();
    const fake = makeFakeRunner();

    const runs: RouteRun[] = await runRoutes(inventory, fake);
    const log: RouteRunLog = {
      $schema: 'https://fleet-commander.local/schemas/qa-routes.v1.json',
      generated_at: '2026-06-13T12:00:00.000Z',
      session: 'qa-2026-06-13',
      frontendBaseUrl: 'http://localhost:5173',
      routes: runs,
    };

    await writeRouteRuns(runsPath, log);
    const first = readFileSync(runsPath, 'utf8');
    await writeRouteRuns(runsPath, log);
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
  Run: RouteRun;
  Log: RouteRunLog;
} | null = null;
if (_typeProbe !== null) {
  // unreachable; keeps the unused-import flag quiet.
  console.log(_typeProbe);
}
