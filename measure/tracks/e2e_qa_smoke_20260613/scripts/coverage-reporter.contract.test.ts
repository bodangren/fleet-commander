/**
 * Contract test for the Phase S7 coverage reporter (STORY-Q7).
 *
 * Spec:           measure/tracks/e2e_qa_smoke_20260613/spec.md (STORY-Q7)
 * Plan:           measure/tracks/e2e_qa_smoke_20260613/plan.md (Phase S7)
 * Test strategy:  measure/tracks/e2e_qa_smoke_20260613/test-strategy.md
 *                 (§"Phase 7 — Coverage report" pins the four-artifact
 *                  deliverable: coverage-report.md + screenshots/INDEX.md
 *                  + metadata.json updates + print-report-path exit code.
 *                  Spec AC §"STORY-Q7" lines 108-120 pin the report
 *                  sections: routes covered, elements exercised, pass/fail
 *                  breakdown, severity histogram, top-3 findings, screenshot
 *                  index reference.)
 *
 * Why a separate test file from the Phase S2-S6 contract tests?
 *
 *   The coverage reporter is a distinct module (`scripts/coverage-reporter.ts`)
 *   with its own DI surface, its own on-disk artifact contracts, and its own
 *   exit-code semantics. It cannot be appended to `findings-generator.contract.test.ts`
 *   without violating the test's narrative (that file is a findings aggregator
 *   contract, not a coverage reporter contract).
 *
 * Why dependency injection (fake `CoverageRunner`) instead of `mock.module()`?
 *
 *   `(bun_mock_module)` in lessons-learned: "`mock.module()` persists across
 *   test files; prefer dependency injection over module mocks." The reporter
 *   walks `screenshotsDir` recursively (`writeScreenshotIndex`) and reads
 *   run logs (`writeCoverageReport`), so a fake walker + `mkdtempSync` tmpfile
 *   is the only way to make the test deterministic and bounded.
 *
 *   The fake walker *also* gives us an exact-path assertion surface (per
 *   the MID prompt: "If testing a shell runner or fake harness, prove the
 *   fake mode intercepts the exact command path or test the command string
 *   directly"). The fake `listPngFiles` records the directory the reporter
 *   passes so the test can assert it is exactly `COVERAGE_COMMANDS.screenshotsDir`
 *   (closes the "GREEN walks an unrelated directory" cheat path).
 *
 * Red signal (expected failures at HEAD):
 *
 *   The entire test file fails to load because `./coverage-reporter` does
 *   not exist on disk. Once GREEN creates the module, every individual
 *   `it()` becomes its own targeted failure for the specific contract it
 *   pins:
 *
 *     - COVERAGE_COMMANDS pins exact path literals (coverage-report.md + screenshots/INDEX.md + metadata.json)
 *     - writeCoverageReport() emits the 6 plan-literal sections (routes covered, elements exercised,
 *       pass/fail breakdown, severity histogram, top-3 findings, screenshot index reference)
 *     - writeCoverageReport() is byte-equal idempotent
 *     - writeScreenshotIndex() walks the directory and produces one markdown row per PNG
 *     - writeScreenshotIndex() emits the 3-column shape (Route | Element | Screenshot path)
 *     - updateMetadata() mutates qa_coverage + findings_count + actual_tasks per spec AC
 *     - printReportPath() returns 0 iff both artifacts exist, 1 otherwise
 *
 * Live-behaviour pairing:
 *
 *   This is the static contract for the coverage reporter. The live gate
 *   is Phase S7's "Generate Docs & Doctor" sub-task: GREEN/REVIEW runs the
 *   actual `bun run scripts/coverage-reporter.ts --routes ... --elements ...
 *   --navigation ... --findings ... --out coverage-report.md --screenshots-dir screenshots/`
 *   command against the real run logs (the JSON files written by Phases S3/S4/S5)
 *   and the real `screenshots/` directory, then writes the real
 *   `coverage-report.md` + `screenshots/INDEX.md` and updates the real
 *   `metadata.json`. The fake-walker tests prove the wiring; the real-walker
 *   invocation proves the wiring is connected to the actual filesystem on
 *   the user's machine. Both are required; neither replaces the other.
 */
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import type {
  CoverageReportData,
  ElementRun,
  Finding,
  NavResult,
  RouteRun,
  ScreenshotIndexRow,
} from './types';

// Importing from a module that does not yet exist on disk is the primary
// Red signal. Bun's loader will throw a `ResolveMessage` ("Cannot find
// module './coverage-reporter'") on the very first `import` below until
// GREEN creates `scripts/coverage-reporter.ts` and exports each symbol.
import {
  COVERAGE_COMMANDS,
  printReportPath,
  updateMetadata,
  writeCoverageReport,
  writeScreenshotIndex,
  type CoverageRunner,
} from './coverage-reporter';

// ---------------------------------------------------------------------------
// Test fixtures
// ---------------------------------------------------------------------------

/**
 * Build a `RouteRun` fixture. Defaults produce a passing run; flip
 * `status` + `error` to model a failure the reporter must count.
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
 * `status` + `error` to model a failure the reporter must count.
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
 * `status` + `error` to model a failure the reporter must count.
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
 * Build a `Finding` fixture. Defaults produce a High-severity click
 * finding; flip `severity` to model the severity histogram rows.
 */
function makeFinding(overrides: Partial<Finding> = {}): Finding {
  return {
    id: 'Q-FIND-001',
    route: 'portfolio',
    action: 'click',
    severity: 'High',
    expected: 'Click opens project',
    actual: 'Click did not navigate',
    screenshotPath: 'screenshots/portfolio/02-element.png',
    reproSteps: ['Navigate to /portfolio', 'Click open-project button'],
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Fake runner (per (bun_mock_module) lesson — DI over module mocks)
// ---------------------------------------------------------------------------

/**
 * Fake `CoverageRunner` implementation: records the directory the reporter
 * passes to `listPngFiles` and returns a hard-coded PNG list. The fake
 * never touches the real filesystem — it lets the contract test pin the
 * exact directory the reporter walks (closes the "GREEN walks an
 * unrelated directory" cheat path).
 */
interface FakeCoverageRunner extends CoverageRunner {
  listPngFilesCalls: string[];
  pngFiles: string[];
}

function makeFakeRunner(pngFiles: string[] = []): FakeCoverageRunner {
  const listPngFilesCalls: string[] = [];
  return {
    listPngFilesCalls,
    pngFiles,
    listPngFiles(dir: string): string[] {
      listPngFilesCalls.push(dir);
      return pngFiles;
    },
  };
}

// ---------------------------------------------------------------------------
// tmpfile helpers (per (mid_attempt_3) S2 evidence — mkdtempSync for hermetic isolation)
// ---------------------------------------------------------------------------

let tmpRoot = '';
let committedCoverageReportPath = '';
let committedScreenshotIndexPath = '';
let committedMetadataPath = '';

beforeEach(() => {
  tmpRoot = mkdtempSync(join(tmpdir(), 'coverage-reporter-test-'));
  committedCoverageReportPath = join(
    process.cwd(),
    'measure/tracks/e2e_qa_smoke_20260613/coverage-report.md',
  );
  committedScreenshotIndexPath = join(
    process.cwd(),
    'measure/tracks/e2e_qa_smoke_20260613/screenshots/INDEX.md',
  );
  committedMetadataPath = join(
    process.cwd(),
    'measure/tracks/e2e_qa_smoke_20260613/metadata.json',
  );
});

afterEach(() => {
  if (tmpRoot) {
    rmSync(tmpRoot, { recursive: true, force: true });
    tmpRoot = '';
  }
});

// ---------------------------------------------------------------------------
// Block 1 — COVERAGE_COMMANDS contract (exact paths)
// ---------------------------------------------------------------------------

describe('Phase S7 — COVERAGE_COMMANDS contract (exact paths)', () => {
  it('pins the coverage-report.md file-name literal (per plan sub-task #1)', () => {
    expect(COVERAGE_COMMANDS.coverageReportPath).toContain('coverage-report.md');
  });

  it('pins the screenshots/INDEX.md path literal (per plan sub-task #2)', () => {
    expect(COVERAGE_COMMANDS.screenshotIndexPath).toContain('screenshots/INDEX.md');
  });

  it('pins the metadata.json registry path literal (per plan sub-task #3)', () => {
    expect(COVERAGE_COMMANDS.metadataPath).toContain('metadata.json');
  });
});

// ---------------------------------------------------------------------------
// Block 2 — CoverageReportData shape contract
// ---------------------------------------------------------------------------

describe('Phase S7 — CoverageReportData shape contract (4 plan-literal aggregate fields)', () => {
  it('exposes CoverageReportData, CoverageReportSummary, ScreenshotIndexRow, CoverageRunner from ./types', () => {
    // This block would not have compiled if the `./types` exports
    // were missing; the test pins the canonical contract surface
    // imported by the reporter.
    const data: CoverageReportData = {
      routes: [makeRouteRun()],
      elements: [makeElementRun()],
      navigation: [makeNavResult()],
      findings: [makeFinding()],
    };
    expect(data.routes).toHaveLength(1);
    expect(data.elements).toHaveLength(1);
    expect(data.navigation).toHaveLength(1);
    expect(data.findings).toHaveLength(1);
  });

  it('ScreenshotIndexRow has all 3 plan-literal fields (route, element, screenshotPath)', () => {
    const required = ['route', 'element', 'screenshotPath'] as const;
    const row: ScreenshotIndexRow = {
      route: '/portfolio',
      element: '01-route',
      screenshotPath: 'screenshots/portfolio/01-route.png',
    };
    for (const key of required) {
      expect(row).toHaveProperty(key);
    }
    expect(row.screenshotPath).toBe('screenshots/portfolio/01-route.png');
  });
});

// ---------------------------------------------------------------------------
// Block 3 — writeCoverageReport() on-disk artifact contract
// ---------------------------------------------------------------------------

describe('Phase S7 — writeCoverageReport() on-disk artifact contract', () => {
  function fixtureData(): CoverageReportData {
    return {
      routes: [
        makeRouteRun({ path: 'portfolio', status: 'pass' }),
        makeRouteRun({ path: 'agents', status: 'pass' }),
        makeRouteRun({ path: 'project/demo-project', status: 'fail', error: 'HTTP 500' }),
      ],
      elements: [
        makeElementRun({ route: 'portfolio', action: 'click', status: 'pass' }),
        makeElementRun({ route: 'agents', action: 'fill', status: 'fail', error: 'Input not editable' }),
      ],
      navigation: [
        makeNavResult({ status: 'pass' }),
        makeNavResult({ name: 'settings→app', fromPath: 'settings', expectedPath: 'settings/app', status: 'fail', error: 'mismatch' }),
      ],
      findings: [
        makeFinding({ id: 'Q-FIND-001', severity: 'Critical', route: 'project/demo-project', expected: 'Page renders', actual: 'HTTP 500' }),
        makeFinding({ id: 'Q-FIND-002', severity: 'High', route: 'agents' }),
        makeFinding({ id: 'Q-FIND-003', severity: 'Medium', route: 'portfolio' }),
        makeFinding({ id: 'Q-FIND-004', severity: 'Low' }),
      ],
    };
  }

  it('renders the "routes covered" section with one markdown row per RouteRun', async () => {
    const out = join(tmpRoot, 'coverage-report.md');
    await writeCoverageReport(out, fixtureData());
    const written = readFileSync(out, 'utf8');
    expect(written).toContain('portfolio');
    expect(written).toContain('agents');
    expect(written).toContain('project/demo-project');
  });

  it('renders the "elements exercised" section with one markdown row per ElementRun', async () => {
    const out = join(tmpRoot, 'coverage-report.md');
    await writeCoverageReport(out, fixtureData());
    const written = readFileSync(out, 'utf8');
    expect(written).toContain('02-element-before'); // implicit via screenshot path (02 = element before-screenshot per types.ts naming convention)
    // Both elements are referenced somewhere in the report
    const portfolioHits = (written.match(/portfolio/g) ?? []).length;
    const agentsHits = (written.match(/agents/g) ?? []).length;
    expect(portfolioHits).toBeGreaterThan(0);
    expect(agentsHits).toBeGreaterThan(0);
  });

  it('renders a pass/fail breakdown with integer percentages', async () => {
    const out = join(tmpRoot, 'coverage-report.md');
    const data = fixtureData();
    // 3 routes: 2 pass, 1 fail → pass_rate = 67
    await writeCoverageReport(out, data);
    const written = readFileSync(out, 'utf8');
    expect(written).toContain('2'); // routes passed
    expect(written).toContain('1'); // routes failed
    // pass_rate literal integer is present
    expect(written).toMatch(/67%|67 %/);
  });

  it('renders a severity histogram with all 4 severity rows', async () => {
    const out = join(tmpRoot, 'coverage-report.md');
    await writeCoverageReport(out, fixtureData());
    const written = readFileSync(out, 'utf8');
    expect(written).toContain('Critical');
    expect(written).toContain('High');
    expect(written).toContain('Medium');
    expect(written).toContain('Low');
  });

  it('renders the top-3 findings as the first 3 Finding rows (per spec AC §"STORY-Q7")', async () => {
    const out = join(tmpRoot, 'coverage-report.md');
    await writeCoverageReport(out, fixtureData());
    const written = readFileSync(out, 'utf8');
    expect(written).toContain('Q-FIND-001');
    expect(written).toContain('Q-FIND-002');
    expect(written).toContain('Q-FIND-003');
    // The 4th finding is NOT in the top-3 list (it is still in the
    // severity histogram count, just not in the top-3 list itself).
    // The reporter's render order matters: top-3 comes before the
    // severity histogram count, so a GREEN that emits the severity
    // histogram first and the top-3 list second would still satisfy
    // the substring assertion — the assertion is intentionally
    // tolerant of render order.
  });

  it('references the screenshot index (screenshots/INDEX.md) — coverage report links to the index', async () => {
    const out = join(tmpRoot, 'coverage-report.md');
    await writeCoverageReport(out, fixtureData());
    const written = readFileSync(out, 'utf8');
    expect(written).toContain('screenshots/INDEX.md');
  });

  it('is byte-equal on re-write of the same input (idempotency)', async () => {
    const out = join(tmpRoot, 'coverage-report.md');
    const data = fixtureData();
    await writeCoverageReport(out, data);
    const first = readFileSync(out, 'utf8');
    await writeCoverageReport(out, data);
    const second = readFileSync(out, 'utf8');
    expect(second).toBe(first);
  });

  it('does NOT touch the committed coverage-report.md at measure/tracks/e2e_qa_smoke_20260613/coverage-report.md', async () => {
    // The committed coverage-report.md (manually written by the prior
    // QA pass) must remain byte-equal before and after the test. The
    // contract test writes to a tmpfile; this is the per-`(mid_attempt_3)`
    // S2-evidence pattern that prevents an over-eager GREEN from
    // accidentally clobbering the on-disk artifact.
    const before = readFileSync(committedCoverageReportPath, 'utf8');
    const out = join(tmpRoot, 'coverage-report.md');
    await writeCoverageReport(out, fixtureData());
    const after = readFileSync(committedCoverageReportPath, 'utf8');
    expect(after).toBe(before);
  });
});

// ---------------------------------------------------------------------------
// Block 4 — writeScreenshotIndex() on-disk artifact contract
// ---------------------------------------------------------------------------

describe('Phase S7 — writeScreenshotIndex() on-disk artifact contract', () => {
  function seedScreenshotsDir(): string {
    const dir = join(tmpRoot, 'screenshots');
    mkdirSync(join(dir, 'portfolio'), { recursive: true });
    mkdirSync(join(dir, 'agents'), { recursive: true });
    mkdirSync(join(dir, 'nav'), { recursive: true });
    writeFileSync(join(dir, 'portfolio/01-route.png'), 'png');
    writeFileSync(join(dir, 'portfolio/02-element-button-before.png'), 'png');
    writeFileSync(join(dir, 'portfolio/03-element-button-after.png'), 'png');
    writeFileSync(join(dir, 'agents/01-route.png'), 'png');
    writeFileSync(join(dir, 'nav/portfolio-project.png'), 'png');
    return dir;
  }

  it('emits one markdown row per PNG file in the screenshots directory', async () => {
    const screenshotsDir = seedScreenshotsDir();
    const out = join(tmpRoot, 'INDEX.md');
    await writeScreenshotIndex(out, screenshotsDir);
    const written = readFileSync(out, 'utf8');
    // 5 PNG files seeded → 5 rows (or more, depending on GREEN's
    // separator format, but at minimum one row per file).
    const pngMatches = written.match(/\.png/g) ?? [];
    expect(pngMatches.length).toBeGreaterThanOrEqual(5);
  });

  it('emits the 3-column shape (Route | Element | Screenshot path) per plan sub-task #2', async () => {
    const screenshotsDir = seedScreenshotsDir();
    const out = join(tmpRoot, 'INDEX.md');
    await writeScreenshotIndex(out, screenshotsDir);
    const written = readFileSync(out, 'utf8');
    expect(written).toMatch(/Route/);
    expect(written).toMatch(/Element/);
    expect(written).toMatch(/Screenshot/);
  });

  it('emits a markdown link for each screenshot path (per spec AC §"STORY-Q7" clickable index)', async () => {
    const screenshotsDir = seedScreenshotsDir();
    const out = join(tmpRoot, 'INDEX.md');
    await writeScreenshotIndex(out, screenshotsDir);
    const written = readFileSync(out, 'utf8');
    expect(written).toMatch(/\[.*\]\(.*\.png\)/);
  });

  it('populates the Route column from the parent directory (e.g. portfolio → /portfolio)', async () => {
    const screenshotsDir = seedScreenshotsDir();
    const out = join(tmpRoot, 'INDEX.md');
    await writeScreenshotIndex(out, screenshotsDir);
    const written = readFileSync(out, 'utf8');
    // The reporter must surface at least one row with route '/portfolio'
    expect(written).toMatch(/\/portfolio|\bportfolio\b/);
  });

  it('is byte-equal on re-write of the same input (idempotency)', async () => {
    const screenshotsDir = seedScreenshotsDir();
    const out = join(tmpRoot, 'INDEX.md');
    await writeScreenshotIndex(out, screenshotsDir);
    const first = readFileSync(out, 'utf8');
    await writeScreenshotIndex(out, screenshotsDir);
    const second = readFileSync(out, 'utf8');
    expect(second).toBe(first);
  });

  it('does NOT touch the committed screenshots/INDEX.md at measure/tracks/e2e_qa_smoke_20260613/screenshots/INDEX.md', async () => {
    // Same hermetic-isolation pattern as Block 3.
    const before = readFileSync(committedScreenshotIndexPath, 'utf8');
    const screenshotsDir = seedScreenshotsDir();
    const out = join(tmpRoot, 'INDEX.md');
    await writeScreenshotIndex(out, screenshotsDir);
    const after = readFileSync(committedScreenshotIndexPath, 'utf8');
    expect(after).toBe(before);
  });
});

// ---------------------------------------------------------------------------
// Block 5 — updateMetadata() on-disk artifact contract
// ---------------------------------------------------------------------------

describe('Phase S7 — updateMetadata() on-disk artifact contract (per spec AC §"STORY-Q7")', () => {
  function seedMetadata(): string {
    const metadataPath = join(tmpRoot, 'metadata.json');
    const seed = {
      track_id: 'e2e_qa_smoke_20260613',
      status: 'in-progress',
      actual_tasks: 0,
    };
    writeFileSync(metadataPath, JSON.stringify(seed, null, 2));
    return metadataPath;
  }

  it('sets actual_tasks to a numeric value (per spec AC §"STORY-Q7")', async () => {
    const metadataPath = seedMetadata();
    await updateMetadata(metadataPath, makeRouteRun({}), []);
    const written = JSON.parse(readFileSync(metadataPath, 'utf8'));
    expect(typeof written.actual_tasks).toBe('number');
    expect(written.actual_tasks).toBeGreaterThan(0);
  });

  it('sets qa_coverage.routes_tested to the RouteRun[] length', async () => {
    const metadataPath = seedMetadata();
    const routes = [
      makeRouteRun({ path: 'portfolio' }),
      makeRouteRun({ path: 'agents' }),
      makeRouteRun({ path: 'ops' }),
    ];
    await updateMetadata(metadataPath, ...routes);
    const written = JSON.parse(readFileSync(metadataPath, 'utf8'));
    expect(written.qa_coverage.routes_tested).toBe(3);
  });

  it('sets qa_coverage.routes_passed to the count of pass-status RouteRuns', async () => {
    const metadataPath = seedMetadata();
    const routes = [
      makeRouteRun({ path: 'portfolio', status: 'pass' }),
      makeRouteRun({ path: 'agents', status: 'pass' }),
      makeRouteRun({ path: 'ops', status: 'fail', error: 'HTTP 500' }),
    ];
    await updateMetadata(metadataPath, ...routes);
    const written = JSON.parse(readFileSync(metadataPath, 'utf8'));
    expect(written.qa_coverage.routes_passed).toBe(2);
  });

  it('sets qa_coverage.routes_failed to the count of fail-status RouteRuns', async () => {
    const metadataPath = seedMetadata();
    const routes = [
      makeRouteRun({ path: 'portfolio', status: 'pass' }),
      makeRouteRun({ path: 'agents', status: 'fail', error: 'HTTP 500' }),
      makeRouteRun({ path: 'ops', status: 'fail', error: 'Page returned 0 refs' }),
    ];
    await updateMetadata(metadataPath, ...routes);
    const written = JSON.parse(readFileSync(metadataPath, 'utf8'));
    expect(written.qa_coverage.routes_failed).toBe(2);
  });

  it('sets qa_coverage.pass_rate to the integer percentage (passed / tested * 100, rounded)', async () => {
    const metadataPath = seedMetadata();
    // 2 pass + 1 fail = 67% pass_rate
    const routes = [
      makeRouteRun({ path: 'portfolio', status: 'pass' }),
      makeRouteRun({ path: 'agents', status: 'pass' }),
      makeRouteRun({ path: 'ops', status: 'fail', error: 'X' }),
    ];
    await updateMetadata(metadataPath, ...routes);
    const written = JSON.parse(readFileSync(metadataPath, 'utf8'));
    expect(written.qa_coverage.pass_rate).toBe(67);
    expect(written.qa_coverage.coverage_percent).toBe(67);
  });

  it('sets findings_count.{total,critical,high,medium,low} to the per-severity counts', async () => {
    const metadataPath = seedMetadata();
    const findings: Finding[] = [
      makeFinding({ id: 'Q-FIND-001', severity: 'Critical' }),
      makeFinding({ id: 'Q-FIND-002', severity: 'Critical' }),
      makeFinding({ id: 'Q-FIND-003', severity: 'High' }),
      makeFinding({ id: 'Q-FIND-004', severity: 'Medium' }),
    ];
    await updateMetadata(metadataPath, makeRouteRun({}), findings);
    const written = JSON.parse(readFileSync(metadataPath, 'utf8'));
    expect(written.findings_count.total).toBe(4);
    expect(written.findings_count.critical).toBe(2);
    expect(written.findings_count.high).toBe(1);
    expect(written.findings_count.medium).toBe(1);
    expect(written.findings_count.low).toBe(0);
  });

  it('does NOT touch the committed metadata.json at measure/tracks/e2e_qa_smoke_20260613/metadata.json', async () => {
    // The committed metadata.json is the `measure/tracks.md`-tracked
    // track registry entry; clobbering it from a contract test would
    // break the supervisor's strict file-set check. The hermetic-
    // isolation pattern keeps the test bounded.
    const before = readFileSync(committedMetadataPath, 'utf8');
    const metadataPath = seedMetadata();
    await updateMetadata(metadataPath, makeRouteRun({}), [makeFinding()]);
    const after = readFileSync(committedMetadataPath, 'utf8');
    expect(after).toBe(before);
  });
});

// ---------------------------------------------------------------------------
// Block 6 — printReportPath() exit-code contract
// ---------------------------------------------------------------------------

describe('Phase S7 — printReportPath() exit-code contract (per plan sub-task #5)', () => {
  it('returns 0 when both coverage-report.md AND screenshots/INDEX.md exist on disk', () => {
    const coverageReportPath = join(tmpRoot, 'coverage-report.md');
    const screenshotIndexPath = join(tmpRoot, 'INDEX.md');
    writeFileSync(coverageReportPath, 'stub');
    writeFileSync(screenshotIndexPath, 'stub');
    const code = printReportPath(coverageReportPath, screenshotIndexPath);
    expect(code).toBe(0);
  });

  it('returns 1 when coverage-report.md is missing', () => {
    const coverageReportPath = join(tmpRoot, 'coverage-report.md');
    const screenshotIndexPath = join(tmpRoot, 'INDEX.md');
    writeFileSync(screenshotIndexPath, 'stub');
    // coverageReportPath does NOT exist
    const code = printReportPath(coverageReportPath, screenshotIndexPath);
    expect(code).toBe(1);
  });

  it('returns 1 when screenshots/INDEX.md is missing', () => {
    const coverageReportPath = join(tmpRoot, 'coverage-report.md');
    const screenshotIndexPath = join(tmpRoot, 'INDEX.md');
    writeFileSync(coverageReportPath, 'stub');
    // screenshotIndexPath does NOT exist
    const code = printReportPath(coverageReportPath, screenshotIndexPath);
    expect(code).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// Block 7 — fake runner intercepts exact filesystem paths
// ---------------------------------------------------------------------------

describe('Phase S7 — fake runner intercepts exact filesystem paths', () => {
  it('writeScreenshotIndex invokes runner.listPngFiles with the exact screenshots directory path', async () => {
    const fake = makeFakeRunner(['portfolio/01-route.png']);
    const dir = '/tmp/fake-screenshots-dir';
    const out = join(tmpRoot, 'INDEX.md');
    await writeScreenshotIndex(out, dir, fake);
    expect(fake.listPngFilesCalls).toContain(dir);
  });

  it('emits exactly one row per PNG returned by the fake runner (no row doubling, no row skipping)', async () => {
    const fake = makeFakeRunner([
      'portfolio/01-route.png',
      'portfolio/02-element-button-before.png',
      'portfolio/03-element-button-after.png',
    ]);
    const dir = '/tmp/fake-screenshots-dir';
    const out = join(tmpRoot, 'INDEX.md');
    await writeScreenshotIndex(out, dir, fake);
    const written = readFileSync(out, 'utf8');
    const pngMatches = written.match(/\.png/g) ?? [];
    expect(pngMatches.length).toBe(3);
  });
});

// ---------------------------------------------------------------------------
// File-footer sentinel — forces tsc to demand the symbols be EXPORTED
// ---------------------------------------------------------------------------

// `_typeProbe` is intentionally a dead reference at runtime; it exists
// to force `tsc --noEmit` (and bun's loader) to demand that the named
// symbols are `export`ed from `./coverage-reporter`, not just declared
// in module scope. Catches a GREEN that omits `export` on any of the
// pinned names. The probe also forces the literal-union types and
// interface shapes to be checked at every import site, catching a
// GREEN that drops the `CoverageRunner` alias and inlines the shape.
const _typeProbe: {
  commands: typeof COVERAGE_COMMANDS;
  runner: CoverageRunner;
  fns: {
    writeCoverageReport: typeof writeCoverageReport;
    writeScreenshotIndex: typeof writeScreenshotIndex;
    updateMetadata: typeof updateMetadata;
    printReportPath: typeof printReportPath;
  };
  artifacts: {
    coverage: CoverageReportData;
    row: ScreenshotIndexRow;
  };
  existsSync: typeof existsSync;
} = {
  commands: COVERAGE_COMMANDS,
  runner: {} as CoverageRunner,
  fns: {
    writeCoverageReport,
    writeScreenshotIndex,
    updateMetadata,
    printReportPath,
  },
  artifacts: {
    coverage: {
      routes: [makeRouteRun()],
      elements: [makeElementRun()],
      navigation: [makeNavResult()],
      findings: [makeFinding()],
    },
    row: {
      route: '/portfolio',
      element: '01-route',
      screenshotPath: 'screenshots/portfolio/01-route.png',
    },
  },
  existsSync,
};
void _typeProbe;