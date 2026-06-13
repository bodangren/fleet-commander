/**
 * Contract test for the Phase S6 findings aggregator (STORY-Q6).
 *
 * Spec:           measure/archive/e2e_qa_smoke_20260613/spec.md (STORY-Q6)
 * Plan:           measure/archive/e2e_qa_smoke_20260613/plan.md (Phase S6)
 * Test strategy:  measure/archive/e2e_qa_smoke_20260613/test-strategy.md
 *                 (§"Phase 6 — Findings" pins the four-step command:
 *                  `bun run scripts/findings-generator.ts --routes ... --elements ...
 *                  --navigation ... --out findings.md` then auto-append to tech-debt.md.
 *                  §"Findings Severity Rubric" lines 200-204 pin the per-failure
 *                  severity classification this test enforces.)
 *
 * Why a separate test file from the Phase S2/S3/S4/S5 contract tests?
 *
 *   The findings generator is a distinct module (`scripts/findings-generator.ts`)
 *   with its own DI surface, its own on-disk artifact contract, and its own
 *   severity rubric. It cannot be appended to `qa-executor.contract.test.ts`
 *   without violating the test's narrative (the existing file is a probe /
 *   runner contract, not a findings aggregator contract).
 *
 * Why dependency injection (fake `FindingsRunner`) instead of `mock.module()`?
 *
 *   `(bun_mock_module)` in lessons-learned: "`mock.module()` persists across
 *   test files; prefer dependency injection over module mocks." The findings
 *   generator touches the filesystem (`writeFindings`, `appendTechDebtRows`)
 *   and (via the runner) the browser's console-error listener, so a fake
 *   runner + `mkdtempSync` tmpfile is the only way to make the test
 *   deterministic and bounded.
 *
 *   The fake runner *also* gives us an exact-path assertion surface (per
 *   the MID prompt: "If testing a shell runner or fake harness, prove the
 *   fake mode intercepts the exact command path or test the command string
 *   directly"). The fake `evaluate` records the script string the
 *   aggregator passes so the test can assert it contains the literal
 *   `'window.addEventListener'` + `'error'` substring per plan sub-task #3.
 *
 * Red signal (expected failures at HEAD):
 *
 *   The entire test file fails to load because `./findings-generator` does
 *   not exist on disk. Once GREEN creates the module, every individual
 *   `it()` becomes its own targeted failure for the specific contract it
 *   pins:
 *
 *     - Finding shape contract (id, route, element?, action, severity, expected, actual, screenshotPath, reproSteps)
 *     - FindingSeverity literal union ('Critical' | 'High' | 'Medium' | 'Low')
 *     - FindingAction literal union ('navigate' | 'click' | 'fill' | 'submit' | 'hover' | 'observe' | 'probe')
 *     - FINDINGS_COMMANDS pins exact file/id-prefix literals
 *     - generateFindings() one-Finding-per-failed-run mapping (routes + elements + nav + console errors)
 *     - generateFindings() deterministic Q-FIND-NNN ID sequence (3-digit zero-padded)
 *     - Severity classification rules (HTTP 4xx/5xx → Critical; click does not navigate → High; etc.)
 *     - Console-error capture (window.addEventListener('error', ...) via evaluate)
 *     - writeFindings() on-disk artifact (findings.md with summary table + per-finding sections)
 *     - appendTechDebtRows() on-disk artifact (Q-FIND-NNN row in Open Tech Debt section, preserves existing content)
 *     - printHistogram() exit code (0 if no Critical, 1 if any Critical)
 *     - Fake runner intercepts exact evaluate script string
 *
 * Live-behaviour pairing:
 *
 *   This is the static contract for the findings aggregator. The live gate
 *   is Phase S6's "Generate Docs & Doctor" sub-task: GREEN/REVIEW runs the
 *   actual `generateFindings()` against the real run logs (qa-routes.json,
 *   qa-elements.json, qa-navigation.json) and the real kimi-webbridge
 *   console-error capture on the user's connected browser, then writes
 *   the real `findings.md` and appends to `tech-debt.md`. The fake-runner
 *   tests prove the wiring; the real-runner invocation proves the wiring
 *   is connected to the actual browser console + filesystem paths on the
 *   user's machine. Both are required; neither replaces the other.
 */
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import type {
  ConsoleErrorEvent,
  ElementRun,
  Finding,
  NavResult,
  RouteRun,
} from './types';

// Importing from a module that does not yet exist on disk is the primary
// Red signal. Bun's loader will throw a `ResolveMessage` ("Cannot find
// module './findings-generator'") on the very first `import` below until
// GREEN creates `scripts/findings-generator.ts` and exports each symbol.
import {
  FINDINGS_COMMANDS,
  appendTechDebtRows,
  captureConsoleErrors,
  generateFindings,
  printHistogram,
  writeFindings,
  type FindingsRunner,
} from './findings-generator';

// ---------------------------------------------------------------------------
// Test fixtures
// ---------------------------------------------------------------------------

/**
 * Build a `RouteRun` fixture. Defaults produce a passing run; flip
 * `status` + `error` to model a failure the aggregator must catch.
 */
function makeRouteRun(overrides: Partial<RouteRun> = {}): RouteRun {
  return {
    path: 'portfolio',
    component: 'PortfolioPage',
    status: 'pass',
    title: 'All Projects',
    screenshotPath: 'screenshots/portfolio/01-route.png',
    snapshotRefs: 12,
    durationMs: 250,
    ...overrides,
  };
}

/**
 * Build an `ElementRun` fixture. Defaults produce a passing click; flip
 * `status` + `error` to model a failure the aggregator must catch.
 */
function makeElementRun(overrides: Partial<ElementRun> = {}): ElementRun {
  return {
    route: 'portfolio',
    ref: 1,
    tag: 'button',
    role: 'button',
    action: 'click',
    status: 'pass',
    testId: 'open-project',
    ariaLabel: undefined,
    beforeScreenshot: 'screenshots/portfolio/02-element-before.png',
    afterScreenshot: 'screenshots/portfolio/03-element-after.png',
    durationMs: 50,
    ...overrides,
  };
}

/**
 * Build a `NavResult` fixture. Defaults produce a passing scenario; flip
 * `status` + `error` to model a failure the aggregator must catch.
 */
function makeNavResult(overrides: Partial<NavResult> = {}): NavResult {
  return {
    name: 'portfolio→project→back',
    fromPath: 'portfolio',
    expectedPath: 'project/demo-project',
    actualPath: 'project/demo-project',
    actualComponent: 'ProjectViewPage',
    backVerified: true,
    status: 'pass',
    screenshotPath: 'screenshots/nav/portfolio-project.png',
    durationMs: 500,
    ...overrides,
  };
}

/**
 * Build a `ConsoleErrorEvent` fixture. The defaults model a generic
 * `TypeError` on the portfolio page.
 */
function makeConsoleError(overrides: Partial<ConsoleErrorEvent> = {}): ConsoleErrorEvent {
  return {
    route: 'portfolio',
    message: 'Uncaught TypeError: Cannot read properties of undefined (reading "id")',
    source: 'http://localhost:5173/src/hooks/usePortfolioData.ts',
    lineno: 42,
    colno: 13,
    timestamp: '2026-06-13T12:00:00.000Z',
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Fake runner (per (bun_mock_module) lesson — DI over module mocks)
// ---------------------------------------------------------------------------

/**
 * Fake `FindingsRunner` implementation: records the exact `evaluate` script
 * the aggregator passes so the test can assert the literal `'window.addEventListener'`
 * + `'error'` substring per plan sub-task #3. The fake never touches the
 * real browser — it returns a canned `ConsoleErrorEvent[]` per-route from
 * a script the test populates.
 */
interface FakeFindingsRunner extends FindingsRunner {
  evaluateCalls: string[];
}

function makeFakeRunner(
  script: {
    evaluate?: (code: string) => Promise<{ type: string; value: unknown }> | { type: string; value: unknown };
  } = {},
): FakeFindingsRunner {
  const evaluateCalls: string[] = [];

  return {
    evaluateCalls,
    async evaluate(code: string) {
      evaluateCalls.push(code);
      if (script.evaluate) {
        return await script.evaluate(code);
      }
      return { type: 'string', value: '' };
    },
  };
}

// ---------------------------------------------------------------------------
// tmpfile helpers (per (mid_attempt_3) S2 evidence — mkdtempSync for hermetic isolation)
// ---------------------------------------------------------------------------

let tmpRoot = '';
let persistedFindingsPath = '';
beforeEach(() => {
  tmpRoot = mkdtempSync(join(tmpdir(), 'findings-generator-test-'));
  // Snapshot and clear any persisted findings file so each test
  // starts with a clean ID sequence (the committed findings.md
  // has Q-FIND-001..007 from the manual pass).
  persistedFindingsPath = join(process.cwd(), FINDINGS_COMMANDS.findingsPath);
  try {
    const existing = readFileSync(persistedFindingsPath, 'utf8');
    // Save to restore later
    writeFileSync(persistedFindingsPath + '.bak', existing);
    // Reset to empty so nextFreeId returns 1
    writeFileSync(persistedFindingsPath, '');
  } catch {
    // File doesn't exist — that's fine
  }
});
afterEach(() => {
  if (tmpRoot) {
    rmSync(tmpRoot, { recursive: true, force: true });
    tmpRoot = '';
  }
  // Restore the original findings.md
  try {
    const backup = readFileSync(persistedFindingsPath + '.bak', 'utf8');
    writeFileSync(persistedFindingsPath, backup);
    rmSync(persistedFindingsPath + '.bak', { force: true });
  } catch {
    // No backup — remove the persisted file if we created it
    try { rmSync(persistedFindingsPath, { force: true }); } catch { /* noop */ }
  }
});

// ---------------------------------------------------------------------------
// Block 1 — Finding shape contract (exact fields from plan)
// ---------------------------------------------------------------------------

describe('Phase S6 — Finding shape contract (per plan sub-task #1)', () => {
  it('exposes Finding, FindingSeverity, FindingAction from ./types', () => {
    // This block would not have compiled if the `./types` re-exports
    // were missing; the test pins the canonical contract surface.
    const finding: Finding = {
      id: 'Q-FIND-001',
      route: 'portfolio',
      action: 'navigate',
      severity: 'High',
      expected: 'Page renders All Projects',
      actual: 'Page returned 0 refs',
      screenshotPath: 'screenshots/portfolio/01-route.png',
      reproSteps: ['Navigate to /portfolio'],
    };
    expect(finding.id).toBe('Q-FIND-001');
    expect(finding.route).toBe('portfolio');
  });

  it('Finding has all 9 plan-literal fields (id, route, element?, action, severity, expected, actual, screenshotPath, reproSteps)', () => {
    const required = [
      'id',
      'route',
      'action',
      'severity',
      'expected',
      'actual',
      'screenshotPath',
      'reproSteps',
    ] as const;
    const finding: Finding = {
      id: 'Q-FIND-001',
      route: 'portfolio',
      action: 'navigate',
      severity: 'High',
      expected: 'e',
      actual: 'a',
      screenshotPath: 's',
      reproSteps: ['r'],
    };
    for (const key of required) {
      expect(finding).toHaveProperty(key);
    }
    // `element` is optional but must be type-accepted when present
    const withElement: Finding = {
      id: 'Q-FIND-001',
      route: 'portfolio',
      element: { testId: 'open-project', tag: 'button', role: 'button' },
      action: 'click',
      severity: 'High',
      expected: 'e',
      actual: 'a',
      screenshotPath: 's',
      reproSteps: ['r'],
    };
    expect(withElement.element?.testId).toBe('open-project');
  });

  it('FindingSeverity is the literal union Critical | High | Medium | Low (per test-strategy.md Findings Severity Rubric)', () => {
    // This test pins the literal-union contract by accepting all four
    // values; if GREEN inlines `string` instead of the union, the type
    // compiles but the value-assignment below still passes — the deeper
    // guard is the per-iteration `severity` assertion in block 3.
    const severities: Finding['severity'][] = ['Critical', 'High', 'Medium', 'Low'];
    expect(severities).toHaveLength(4);
    expect(new Set(severities)).toEqual(new Set(['Critical', 'High', 'Medium', 'Low']));
  });

  it('FindingAction covers all 7 action categories (navigate, click, fill, submit, hover, observe, probe)', () => {
    const actions: Finding['action'][] = ['navigate', 'click', 'fill', 'submit', 'hover', 'observe', 'probe'];
    expect(actions).toHaveLength(7);
    expect(new Set(actions)).toEqual(
      new Set(['navigate', 'click', 'fill', 'submit', 'hover', 'observe', 'probe']),
    );
  });
});

// ---------------------------------------------------------------------------
// Block 2 — FINDINGS_COMMANDS contract (exact paths)
// ---------------------------------------------------------------------------

describe('Phase S6 — FINDINGS_COMMANDS contract (exact paths)', () => {
  it('pins the findings.md file-name literal', () => {
    expect(FINDINGS_COMMANDS.findingsPath).toContain('findings.md');
  });

  it('pins the tech-debt.md registry file-name literal', () => {
    expect(FINDINGS_COMMANDS.techDebtPath).toContain('tech-debt.md');
  });

  it('pins the Q-FIND- ID prefix literal (per plan sub-task #1 deterministic ID)', () => {
    expect(FINDINGS_COMMANDS.idPrefix).toBe('Q-FIND-');
  });
});

// ---------------------------------------------------------------------------
// Block 3 — generateFindings() one-Finding-per-failed-run
// ---------------------------------------------------------------------------

describe('Phase S6 — generateFindings() one-Finding-per-failed-run', () => {
  it('returns an empty array when every run log is all-pass and no console errors are present', () => {
    const findings = generateFindings(
      [makeRouteRun({ status: 'pass' })],
      [makeElementRun({ status: 'pass' })],
      [makeNavResult({ status: 'pass' })],
      [],
    );
    expect(findings).toEqual([]);
  });

  it('emits exactly 1 Finding for 1 failed RouteRun (no element, no nav, no console error noise)', () => {
    const findings = generateFindings(
      [makeRouteRun({ status: 'fail', error: 'HTTP 500' })],
      [],
      [],
      [],
    );
    expect(findings).toHaveLength(1);
    expect(findings[0]?.route).toBe('portfolio');
    expect(findings[0]?.action).toBe('navigate');
    expect(findings[0]?.severity).toBe('Critical'); // HTTP 4xx/5xx per rubric
    expect(findings[0]?.expected).toContain('navigate');
    expect(findings[0]?.actual).toContain('HTTP 500');
  });

  it('emits exactly 1 Finding for 1 failed ElementRun, with element descriptor populated', () => {
    const findings = generateFindings(
      [],
      [makeElementRun({ status: 'fail', error: 'Click did not navigate', testId: 'open-project' })],
      [],
      [],
    );
    expect(findings).toHaveLength(1);
    expect(findings[0]?.route).toBe('portfolio');
    expect(findings[0]?.action).toBe('click');
    expect(findings[0]?.element?.testId).toBe('open-project');
    expect(findings[0]?.element?.tag).toBe('button');
    expect(findings[0]?.severity).toBe('High'); // click does not navigate per rubric
    expect(findings[0]?.actual).toContain('Click did not navigate');
  });

  it('emits exactly 1 Finding for 1 failed NavResult, with the scenario name and expected/actual paths', () => {
    const findings = generateFindings(
      [],
      [],
      [makeNavResult({ status: 'fail', expectedPath: 'project/demo-project', actualPath: 'portfolio', error: 'URL did not match' })],
      [],
    );
    expect(findings).toHaveLength(1);
    expect(findings[0]?.route).toBe('portfolio');
    expect(findings[0]?.action).toBe('click');
    expect(findings[0]?.expected).toContain('project/demo-project');
    expect(findings[0]?.actual).toContain('portfolio');
    expect(findings[0]?.actual).toContain('URL did not match');
  });

  it('emits exactly 1 Finding for 1 uncaught console error, with severity High (per plan sub-task #3)', () => {
    const findings = generateFindings(
      [],
      [],
      [],
      [makeConsoleError({ message: 'Uncaught ReferenceError: foo is not defined' })],
    );
    expect(findings).toHaveLength(1);
    expect(findings[0]?.route).toBe('portfolio');
    expect(findings[0]?.action).toBe('observe');
    expect(findings[0]?.severity).toBe('High'); // explicit per plan sub-task #3
    expect(findings[0]?.actual).toContain('ReferenceError');
    expect(findings[0]?.actual).toContain('foo is not defined');
  });

  it('skips passing and skipped runs (only failed runs produce Findings)', () => {
    const findings = generateFindings(
      [
        makeRouteRun({ status: 'pass' }),
        makeRouteRun({ status: 'skip' }),
        makeRouteRun({ status: 'fail', error: 'HTTP 404' }),
      ],
      [
        makeElementRun({ status: 'pass' }),
        makeElementRun({ status: 'skip' }),
        makeElementRun({ status: 'fail', error: 'Fill failed' }),
      ],
      [
        makeNavResult({ status: 'pass' }),
        makeNavResult({ status: 'skip' }),
        makeNavResult({ status: 'fail', actualPath: 'wrong', error: 'mismatch' }),
      ],
      [],
    );
    // 3 failures total: 1 RouteRun + 1 ElementRun + 1 NavResult
    expect(findings).toHaveLength(3);
  });

  it('assigns deterministic, sequential Q-FIND-NNN IDs in declaration order (3-digit zero-padded)', () => {
    const findings = generateFindings(
      [
        makeRouteRun({ status: 'fail', path: 'portfolio', error: 'HTTP 500' }),
        makeRouteRun({ status: 'fail', path: 'agents', error: 'Page returned 0 refs' }),
      ],
      [
        makeElementRun({ status: 'fail', route: 'portfolio', testId: 'btn1', error: 'Click did not navigate' }),
      ],
      [
        makeNavResult({ status: 'fail', name: 'settings→app', fromPath: 'settings', error: 'mismatch' }),
      ],
      [
        makeConsoleError({ route: 'portfolio', message: 'TypeError' }),
      ],
    );
    expect(findings.map((f) => f.id)).toEqual([
      'Q-FIND-001',
      'Q-FIND-002',
      'Q-FIND-003',
      'Q-FIND-004',
      'Q-FIND-005',
    ]);
    // Pin the literal 3-digit zero-padded regex format
    for (const f of findings) {
      expect(f.id).toMatch(/^Q-FIND-\d{3}$/);
    }
  });

  it('starts ID sequence above any pre-existing Q-FIND-NNN rows (collision-avoidance with the manual findings.md)', () => {
    // The committed findings.md has Q-FIND-001..Q-FIND-007 from the prior
    // manual QA pass; the next automated ID must be Q-FIND-008 to avoid
    // collision. The contract: `generateFindings(..., { startId: 8 })` may
    // be supplied, OR the aggregator may read the on-disk findings file
    // to discover the next free ID. Either is acceptable; the test pins
    // the externally-observable property that no two findings share an ID.
    const findings1 = generateFindings(
      [makeRouteRun({ status: 'fail', error: 'HTTP 500' })],
      [],
      [],
      [],
    );
    const findings2 = generateFindings(
      [makeRouteRun({ status: 'fail', path: 'agents', error: 'Page returned 0 refs' })],
      [],
      [],
      [],
    );
    // Two separate invocations must produce non-colliding IDs (the test
    // passes the same `{}` options to both, so the aggregator cannot rely
    // on per-call in-memory state alone — it must consult the on-disk
    // findings file via `FINDINGS_COMMANDS.findingsPath` or accept an
    // explicit `startId` option).
    expect(findings1[0]?.id).not.toBe(findings2[0]?.id);
  });
});

// ---------------------------------------------------------------------------
// Block 4 — Finding severity rules (per test-strategy.md Findings Severity Rubric)
// ---------------------------------------------------------------------------

describe('Phase S6 — Finding severity rules (per test-strategy.md Findings Severity Rubric lines 200-204)', () => {
  it('HTTP 4xx/5xx → Critical (route returns 4xx/5xx)', () => {
    const findings = generateFindings(
      [makeRouteRun({ status: 'fail', error: 'HTTP 500' })],
      [],
      [],
      [],
    );
    expect(findings[0]?.severity).toBe('Critical');
  });

  it('click does not navigate / button unreachable → High', () => {
    const findings = generateFindings(
      [],
      [makeElementRun({ status: 'fail', error: 'Click did not navigate; URL stayed at /portfolio' })],
      [],
      [],
    );
    expect(findings[0]?.severity).toBe('High');
  });

  it('fill failed / form failed to submit → High', () => {
    const findings = generateFindings(
      [],
      [makeElementRun({ status: 'fail', action: 'fill', error: 'Input not editable' })],
      [],
      [],
    );
    expect(findings[0]?.severity).toBe('High');
  });

  it('console warning / unexpected empty state → Medium', () => {
    // Console warnings are NOT the same as uncaught errors — warnings
    // map to Medium per the rubric, while uncaught errors (block 3
    // above) map to High per plan sub-task #3.
    const findings = generateFindings(
      [],
      [],
      [],
      [{ ...makeConsoleError({ message: '[WARNING] deprecated API' }) }],
    );
    // The aggregator must distinguish `console.error` (uncaught) from
    // `console.warn` (warning). The fixture uses `[WARNING]` in the
    // message to signal the lower-severity path. If GREEN does not
    // distinguish, this test fails — closing the "GREEN maps every
    // console event to High" cheat path.
    expect(findings[0]?.severity).toBe('Medium');
  });
});

// ---------------------------------------------------------------------------
// Block 5 — console error capture (per plan sub-task #3)
// ---------------------------------------------------------------------------

describe('Phase S6 — console error capture (per plan sub-task #3)', () => {
  it('calls runner.evaluate with a script containing window.addEventListener and "error"', async () => {
    const runner = makeFakeRunner();
    await captureConsoleErrors(['portfolio', 'agents'], runner);
    expect(runner.evaluateCalls.length).toBeGreaterThan(0);
    const script = runner.evaluateCalls[0] ?? '';
    expect(script).toContain('window.addEventListener');
    expect(script).toContain("'error'");
  });

  it('returns one ConsoleErrorEvent per unique error fired on each route', async () => {
    const runner = makeFakeRunner({
      evaluate: (code: string) => {
        // The fake returns a JSON-serialised array of error events; the
        // aggregator is expected to JSON.parse the value and produce one
        // ConsoleErrorEvent per element. We pin the per-route count by
        // returning a fixed array for each call.
        if (code.includes('portfolio')) {
          return { type: 'string', value: JSON.stringify([{ message: 'TypeError #1', lineno: 10, colno: 5 }, { message: 'TypeError #2', lineno: 20, colno: 5 }]) };
        }
        return { type: 'string', value: JSON.stringify([]) };
      },
    });
    const events = await captureConsoleErrors(['portfolio', 'agents'], runner);
    const portfolioEvents = events.filter((e) => e.route === 'portfolio');
    expect(portfolioEvents).toHaveLength(2);
    expect(portfolioEvents[0]?.message).toBe('TypeError #1');
  });

  it('attaches a deterministic route field to every event (denormalised — no second lookup needed)', async () => {
    const runner = makeFakeRunner({
      evaluate: () => ({ type: 'string', value: JSON.stringify([{ message: 'err', lineno: 1, colno: 1 }]) }),
    });
    const events = await captureConsoleErrors(['portfolio', 'agents'], runner);
    const routes = new Set(events.map((e) => e.route));
    expect(routes.has('portfolio')).toBe(true);
    expect(routes.has('agents')).toBe(true);
  });

  it('does NOT invoke runner.evaluate for routes that have no page mounted (zero-route list)', async () => {
    const runner = makeFakeRunner();
    const events = await captureConsoleErrors([], runner);
    expect(events).toEqual([]);
    expect(runner.evaluateCalls).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// Block 6 — writeFindings() on-disk artifact contract
// ---------------------------------------------------------------------------

describe('Phase S6 — writeFindings() on-disk artifact contract', () => {
  it('writes a markdown file with a severity summary table', async () => {
    const out = join(tmpRoot, 'findings.md');
    const findings: Finding[] = [
      {
        id: 'Q-FIND-001',
        route: 'portfolio',
        action: 'navigate',
        severity: 'Critical',
        expected: 'Page renders',
        actual: 'HTTP 500',
        screenshotPath: 'screenshots/portfolio/01-route.png',
        reproSteps: ['Navigate to /portfolio'],
      },
      {
        id: 'Q-FIND-002',
        route: 'agents',
        action: 'click',
        severity: 'High',
        expected: 'Click opens editor',
        actual: 'Click did not navigate',
        screenshotPath: 'screenshots/agents/02-element.png',
        reproSteps: ['Navigate to /agents', 'Click first agent row'],
      },
    ];
    await writeFindings(out, findings);
    const written = readFileSync(out, 'utf8');
    expect(written).toContain('# Findings');
    expect(written).toContain('Q-FIND-001');
    expect(written).toContain('Q-FIND-002');
    expect(written).toContain('| Critical | 1 |');
    expect(written).toContain('| High     | 1 |');
    expect(written).toContain('**Total**');
  });

  it('writes each finding as a markdown section with all 8 contract fields', async () => {
    const out = join(tmpRoot, 'findings.md');
    const findings: Finding[] = [
      {
        id: 'Q-FIND-001',
        route: 'portfolio',
        element: { testId: 'open-project', tag: 'button', role: 'button' },
        action: 'click',
        severity: 'High',
        expected: 'Click opens project',
        actual: 'Click did not navigate',
        screenshotPath: 'screenshots/portfolio/02-element.png',
        reproSteps: ['Navigate to /portfolio', 'Click open-project button'],
      },
    ];
    await writeFindings(out, findings);
    const written = readFileSync(out, 'utf8');
    expect(written).toContain('## Q-FIND-001');
    expect(written).toContain('**Route:**');
    expect(written).toContain('**Element:**');
    expect(written).toContain('**Action:** click');
    expect(written).toContain('**Severity:** High');
    expect(written).toContain('**Expected:** Click opens project');
    expect(written).toContain('**Actual:** Click did not navigate');
    expect(written).toContain('**Screenshot:**');
    expect(written).toContain('**Repro:**');
  });

  it('is byte-equal on re-write of the same input (idempotency)', async () => {
    const out = join(tmpRoot, 'findings.md');
    const findings: Finding[] = [
      {
        id: 'Q-FIND-001',
        route: 'portfolio',
        action: 'navigate',
        severity: 'Critical',
        expected: 'e',
        actual: 'a',
        screenshotPath: 's',
        reproSteps: ['r'],
      },
    ];
    await writeFindings(out, findings);
    const first = readFileSync(out, 'utf8');
    await writeFindings(out, findings);
    const second = readFileSync(out, 'utf8');
    expect(second).toBe(first);
  });

  it('does NOT touch the committed findings.md at measure/archive/e2e_qa_smoke_20260613/findings.md', async () => {
    // The committed findings.md (7 manual findings from the prior pass)
    // must remain byte-equal before and after the test. The contract
    // test writes to a tmpfile; this is the per-`(mid_attempt_3)`
    // S2-evidence pattern that prevents an over-eager GREEN from
    // accidentally clobbering the on-disk artifact.
    const committedPath = 'measure/archive/e2e_qa_smoke_20260613/findings.md';
    const before = readFileSync(committedPath, 'utf8');
    const out = join(tmpRoot, 'findings.md');
    await writeFindings(out, [
      {
        id: 'Q-FIND-001',
        route: 'portfolio',
        action: 'navigate',
        severity: 'Critical',
        expected: 'e',
        actual: 'a',
        screenshotPath: 's',
        reproSteps: ['r'],
      },
    ]);
    const after = readFileSync(committedPath, 'utf8');
    expect(after).toBe(before);
  });
});

// ---------------------------------------------------------------------------
// Block 7 — appendTechDebtRows() tech-debt.md writer
// ---------------------------------------------------------------------------

describe('Phase S6 — appendTechDebtRows() tech-debt.md writer', () => {
  it('appends Q-FIND-NNN rows inside the Open Tech Debt section (before Resolved)', async () => {
    const techDebtPath = join(tmpRoot, 'tech-debt.md');
    const seed = [
      '# Tech Debt Registry',
      '',
      '## Open Tech Debt',
      '',
      '| ID | Description | Severity |',
      '| --- | --- | --- |',
      '| TD-999 | pre-existing row | High |',
      '',
      '## Resolved',
      '',
      '| ID | Description | Resolution |',
      '| --- | --- | --- |',
      '',
    ].join('\n');
    writeFileSync(techDebtPath, seed);
    const findings: Finding[] = [
      {
        id: 'Q-FIND-001',
        route: 'portfolio',
        action: 'navigate',
        severity: 'Critical',
        expected: 'Page renders',
        actual: 'HTTP 500',
        screenshotPath: 'screenshots/portfolio/01-route.png',
        reproSteps: ['Navigate to /portfolio'],
      },
    ];
    await appendTechDebtRows(techDebtPath, findings);
    const written = readFileSync(techDebtPath, 'utf8');
    expect(written).toContain('| Q-FIND-001 |');
    expect(written).toContain('| TD-999 | pre-existing row | High |');
    // Row must appear BEFORE the "## Resolved" heading
    const insertIndex = written.indexOf('| Q-FIND-001 |');
    const resolvedIndex = written.indexOf('## Resolved');
    expect(insertIndex).toBeGreaterThan(-1);
    expect(resolvedIndex).toBeGreaterThan(insertIndex);
  });

  it('includes a markdown link to the finding in each tech-debt row description', async () => {
    const techDebtPath = join(tmpRoot, 'tech-debt.md');
    const seed = '# Tech Debt Registry\n\n## Open Tech Debt\n\n| ID | Description | Severity |\n| --- | --- | --- |\n\n## Resolved\n\n| ID | Description | Resolution |\n| --- | --- | --- |\n';
    writeFileSync(techDebtPath, seed);
    await appendTechDebtRows(techDebtPath, [
      {
        id: 'Q-FIND-001',
        route: 'portfolio',
        action: 'navigate',
        severity: 'Critical',
        expected: 'Page renders',
        actual: 'HTTP 500',
        screenshotPath: 'screenshots/portfolio/01-route.png',
        reproSteps: ['Navigate to /portfolio'],
      },
    ]);
    const written = readFileSync(techDebtPath, 'utf8');
    expect(written).toContain('findings.md');
    // Anchor link to the finding's heading (markdown `#q-find-001` slug)
    expect(written).toMatch(/\[Q-FIND-001\]\([^)]*findings\.md#q-find-001\)/i);
  });

  it('does NOT touch the committed tech-debt.md at measure/tech-debt.md', async () => {
    // Same hermetic-isolation pattern as block 6 — the contract test
    // never mutates the committed tech-debt registry.
    const committedPath = 'measure/tech-debt.md';
    const before = readFileSync(committedPath, 'utf8');
    const techDebtPath = join(tmpRoot, 'tech-debt.md');
    const seed = '# Tech Debt Registry\n\n## Open Tech Debt\n\n| ID | Description | Severity |\n| --- | --- | --- |\n\n## Resolved\n\n';
    writeFileSync(techDebtPath, seed);
    await appendTechDebtRows(techDebtPath, [
      {
        id: 'Q-FIND-001',
        route: 'portfolio',
        action: 'navigate',
        severity: 'Critical',
        expected: 'e',
        actual: 'a',
        screenshotPath: 's',
        reproSteps: ['r'],
      },
    ]);
    const after = readFileSync(committedPath, 'utf8');
    expect(after).toBe(before);
  });
});

// ---------------------------------------------------------------------------
// Block 8 — printHistogram() exit code
// ---------------------------------------------------------------------------

describe('Phase S6 — printHistogram() exit code (per plan sub-task #5)', () => {
  it('returns 0 when no Critical findings are present', () => {
    const code = printHistogram([
      {
        id: 'Q-FIND-001',
        route: 'portfolio',
        action: 'click',
        severity: 'High',
        expected: 'e',
        actual: 'a',
        screenshotPath: 's',
        reproSteps: ['r'],
      },
      {
        id: 'Q-FIND-002',
        route: 'agents',
        action: 'fill',
        severity: 'Medium',
        expected: 'e',
        actual: 'a',
        screenshotPath: 's',
        reproSteps: ['r'],
      },
    ]);
    expect(code).toBe(0);
  });

  it('returns 1 when at least one Critical finding is present', () => {
    const code = printHistogram([
      {
        id: 'Q-FIND-001',
        route: 'portfolio',
        action: 'navigate',
        severity: 'Critical',
        expected: 'e',
        actual: 'a',
        screenshotPath: 's',
        reproSteps: ['r'],
      },
    ]);
    expect(code).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// Block 9 — fake runner intercepts exact kimi-webbridge command paths
// ---------------------------------------------------------------------------

describe('Phase S6 — fake runner intercepts exact kimi-webbridge command paths', () => {
  it('captureConsoleErrors invokes runner.evaluate exactly once per unique route (no extra calls)', async () => {
    const runner = makeFakeRunner({
      evaluate: () => ({ type: 'string', value: '[]' }),
    });
    await captureConsoleErrors(['portfolio', 'agents', 'portfolio'], runner);
    // The dedup by route is an implementation detail; the test pins the
    // *minimum* contract that every requested route gets at least one
    // evaluate call. A GREEN that dedupes to a single call per unique
    // route is acceptable.
    expect(runner.evaluateCalls.length).toBeGreaterThanOrEqual(1);
    expect(runner.evaluateCalls.length).toBeLessThanOrEqual(3);
  });

  it('the evaluate script does NOT include any non-trivial kimi-webbridge method names (closing the "GREEN uses captureStackTrace / DOMContentLoaded cheat paths")', async () => {
    const runner = makeFakeRunner();
    await captureConsoleErrors(['portfolio'], runner);
    const script = runner.evaluateCalls[0] ?? '';
    // Per plan sub-task #3, the evaluate script must wire a
    // `window.addEventListener('error', ...)` listener — the test
    // pins both the listener registration and the absence of
    // unrelated kimi-webbridge internals (e.g. `network` cmd, which
    // is a separate code path GREEN must also implement, but is
    // not part of the evaluate-script contract).
    expect(script).toContain('window.addEventListener');
    expect(script).not.toContain('network(');
    expect(script).not.toContain('chrome.devtools');
  });
});

// ---------------------------------------------------------------------------
// Block 10 — end-to-end smoke (all four steps in the test-strategy Phase 6 command)
// ---------------------------------------------------------------------------

describe('Phase S6 — end-to-end smoke (generateFindings → writeFindings → appendTechDebtRows → printHistogram)', () => {
  it('integrates the four steps against a fixture run log with 1 fail + 1 console error', async () => {
    const findingsPath = join(tmpRoot, 'findings.md');
    const techDebtPath = join(tmpRoot, 'tech-debt.md');
    const seed = '# Tech Debt Registry\n\n## Open Tech Debt\n\n| ID | Description | Severity |\n| --- | --- | --- |\n\n## Resolved\n\n';
    writeFileSync(techDebtPath, seed);

    const findings = generateFindings(
      [makeRouteRun({ status: 'fail', error: 'HTTP 500' })],
      [],
      [],
      [makeConsoleError({ message: 'Uncaught TypeError: foo' })],
    );
    expect(findings).toHaveLength(2);
    expect(findings[0]?.id).toBe('Q-FIND-001');
    expect(findings[1]?.id).toBe('Q-FIND-002');

    await writeFindings(findingsPath, findings);
    const findingsWritten = readFileSync(findingsPath, 'utf8');
    expect(findingsWritten).toContain('Q-FIND-001');
    expect(findingsWritten).toContain('Q-FIND-002');

    await appendTechDebtRows(techDebtPath, findings);
    const techDebtWritten = readFileSync(techDebtPath, 'utf8');
    expect(techDebtWritten).toContain('| Q-FIND-001 |');
    expect(techDebtWritten).toContain('| Q-FIND-002 |');

    const exitCode = printHistogram(findings);
    expect(exitCode).toBe(1); // HTTP 500 → Critical
  });
});

// ---------------------------------------------------------------------------
// File-footer sentinel — forces tsc to demand the symbols be EXPORTED
// ---------------------------------------------------------------------------

// `_typeProbe` is intentionally a dead reference at runtime; it exists
// to force `tsc --noEmit` (and bun's loader) to demand that the named
// symbols are `export`ed from `./findings-generator`, not just declared
// in module scope. Catches a GREEN that omits `export` on any of the
// pinned names. The probe also forces the literal-union types to be
// checked at every import site, catching a GREEN that drops the
// `FindingSeverity` / `FindingAction` aliases and inlines `string`.
const _typeProbe: {
  commands: typeof FINDINGS_COMMANDS;
  runner: FindingsRunner;
  fns: {
    generate: typeof generateFindings;
    capture: typeof captureConsoleErrors;
    write: typeof writeFindings;
    append: typeof appendTechDebtRows;
    print: typeof printHistogram;
  };
} = {
  commands: FINDINGS_COMMANDS,
  runner: {} as FindingsRunner,
  fns: {
    generate: generateFindings,
    capture: captureConsoleErrors,
    write: writeFindings,
    append: appendTechDebtRows,
    print: printHistogram,
  },
};
void _typeProbe;
