/**
 * Coverage reporter for the Phase S7 QA smoke test (STORY-Q7).
 *
 * Spec:           measure/archive/e2e_qa_smoke_20260613/spec.md (STORY-Q7)
 * Plan:           measure/archive/e2e_qa_smoke_20260613/plan.md (Phase S7)
 * Test strategy:  measure/archive/e2e_qa_smoke_20260613/test-strategy.md
 *                 (§"Phase 7 — Coverage report")
 *
 * Consumes the run logs produced by Phases S3/S4/S5/S6 and renders
 * `coverage-report.md` + `screenshots/INDEX.md` + metadata.json updates.
 *
 * All filesystem I/O for screenshot discovery is injected via the
 * `CoverageRunner` interface so tests can substitute a fake walker
 * (DI per the `(bun_mock_module)` lesson).
 */
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';

import type {
  CoverageReportData,
  CoverageReportSummary,
  CoverageRunner,
  ElementRunLog,
  Finding,
  FindingSeverity,
  NavRunLog,
  RouteRunLog,
  ScreenshotIndexRow,
} from './types';

export type { CoverageRunner };

const TRACK_DIR = resolve(dirname(import.meta.path), '..');

/**
 * Exact command paths / constants for the coverage reporter.
 * Pinned by the contract test so any drift breaks loudly.
 */
export const COVERAGE_COMMANDS = {
  coverageReportPath: 'coverage-report.md',
  screenshotIndexPath: 'screenshots/INDEX.md',
  metadataPath: 'metadata.json',
} as const;

/**
 * Default `CoverageRunner` backed by `readdirSync`.
 */
function createDefaultRunner(): CoverageRunner {
  return {
    listPngFiles(dir: string): string[] {
      const results: string[] = [];
      try {
        const walk = (d: string) => {
          for (const entry of readdirSync(d, { withFileTypes: true })) {
            const full = join(d, entry.name);
            if (entry.isDirectory()) {
              walk(full);
            } else if (entry.name.endsWith('.png')) {
              results.push(relative(dir, full));
            }
          }
        };
        walk(dir);
      } catch {
        // Directory doesn't exist — return empty
      }
      return results.sort();
    },
  };
}

/**
 * Aggregate summary counts from the four run-log inputs.
 */
function summarize(data: CoverageReportData, screenshotCount: number): CoverageReportSummary {
  const routesTested = data.routes.length;
  const routesPassed = data.routes.filter((r) => r.status === 'pass').length;
  const routesFailed = data.routes.filter((r) => r.status === 'fail').length;
  const routesSkipped = data.routes.filter((r) => r.status === 'skip').length;

  const elementsExercised = data.elements.length;
  const elementsPassed = data.elements.filter((e) => e.status === 'pass').length;
  const elementsFailed = data.elements.filter((e) => e.status === 'fail').length;
  const elementsSkipped = data.elements.filter((e) => e.status === 'skip').length;

  const navTotal = data.navigation.length;
  const navPassed = data.navigation.filter((n) => n.status === 'pass').length;
  const navFailed = data.navigation.filter((n) => n.status === 'fail').length;
  const navSkipped = data.navigation.filter((n) => n.status === 'skip').length;

  const passRate = routesTested > 0 ? Math.round((routesPassed / routesTested) * 100) : 0;

  const findingsCritical = data.findings.filter((f) => f.severity === 'Critical').length;
  const findingsHigh = data.findings.filter((f) => f.severity === 'High').length;
  const findingsMedium = data.findings.filter((f) => f.severity === 'Medium').length;
  const findingsLow = data.findings.filter((f) => f.severity === 'Low').length;

  return {
    routesTested,
    routesPassed,
    routesFailed,
    routesSkipped,
    elementsExercised,
    elementsPassed,
    elementsFailed,
    elementsSkipped,
    navTotal,
    navPassed,
    navFailed,
    navSkipped,
    passRate,
    findingsCritical,
    findingsHigh,
    findingsMedium,
    findingsLow,
    findingsTotal: data.findings.length,
    screenshotsCaptured: screenshotCount,
  };
}

/**
 * Render `coverage-report.md` from the four upstream run logs.
 *
 * @param outPath  Absolute path to write the report to.
 * @param data     Aggregated run-log data from Phases S3–S6.
 */
export async function writeCoverageReport(
  outPath: string,
  data: CoverageReportData,
): Promise<void> {
  const lines: string[] = [];

  lines.push('# QA Coverage Report');
  lines.push('');

  // --- Routes covered ---
  lines.push('## Routes Covered');
  lines.push('');
  lines.push('| Path | Component | Status | Screenshot |');
  lines.push('| --- | --- | --- | --- |');
  for (const r of data.routes) {
    lines.push(`| ${r.path} | ${r.component} | ${r.status} | ${r.screenshotPath} |`);
  }
  lines.push('');

  // --- Elements exercised ---
  lines.push('## Elements Exercised');
  lines.push('');
  lines.push('| Route | Tag | Role | Action | Status | Before Screenshot | After Screenshot |');
  lines.push('| --- | --- | --- | --- | --- | --- | --- |');
  for (const e of data.elements) {
    lines.push(
      `| ${e.route} | ${e.tag} | ${e.role} | ${e.action} | ${e.status} | ${e.beforeScreenshot} | ${e.afterScreenshot} |`,
    );
  }
  lines.push('');

  // --- Pass/fail breakdown ---
  const summary = summarize(data, 0);
  lines.push('## Pass/Fail Breakdown');
  lines.push('');
  lines.push(`**Routes:** ${summary.routesPassed} pass / ${summary.routesFailed} fail / ${summary.routesSkipped} skip`);
  lines.push(`**Elements:** ${summary.elementsPassed} pass / ${summary.elementsFailed} fail / ${summary.elementsSkipped} skip`);
  lines.push(`**Navigation:** ${summary.navPassed} pass / ${summary.navFailed} fail / ${summary.navSkipped} skip`);
  lines.push(`**Pass Rate:** ${summary.passRate}%`);
  lines.push('');

  // --- Severity histogram ---
  lines.push('## Severity Histogram');
  lines.push('');
  lines.push('| Severity | Count |');
  lines.push('| --- | --- |');
  for (const sev of ['Critical', 'High', 'Medium', 'Low'] as FindingSeverity[]) {
    const count = data.findings.filter((f) => f.severity === sev).length;
    lines.push(`| ${sev} | ${count} |`);
  }
  lines.push('');

  // --- Top-3 findings ---
  lines.push('## Top 3 Findings');
  lines.push('');
  const top3 = data.findings.slice(0, 3);
  for (const f of top3) {
    lines.push(`- **${f.id}** (${f.severity}) — ${f.route}: ${f.expected}`);
  }
  lines.push('');

  // --- Screenshot index reference ---
  lines.push('## Screenshot Index');
  lines.push('');
  lines.push(`See [Screenshot Index](screenshots/INDEX.md) for all captured screenshots.`);
  lines.push('');

  writeFileSync(outPath, lines.join('\n'));
}

/**
 * Walk `screenshotsDir` and produce `screenshots/INDEX.md`.
 *
 * @param outPath       Absolute path to write the index to.
 * @param screenshotsDir  Path to the screenshots directory.
 * @param runner        Optional CoverageRunner (defaults to readdirSync walker).
 */
export async function writeScreenshotIndex(
  outPath: string,
  screenshotsDir: string,
  runner?: CoverageRunner,
): Promise<void> {
  const effectiveRunner = runner ?? createDefaultRunner();
  const pngFiles = effectiveRunner.listPngFiles(screenshotsDir);

  const rows: ScreenshotIndexRow[] = pngFiles.map((relPath) => {
    const normalized = relPath.replaceAll('\\', '/');
    const parts = normalized.split('/');
    const route = parts.length > 1 ? `/${parts[0]}` : '';
    const basename = parts[parts.length - 1].replace(/\.png$/, '');
    const screenshotPath = `screenshots/${normalized}`;
    return { route, element: basename, screenshotPath };
  });

  const lines: string[] = [];
  lines.push('# Screenshot Index');
  lines.push('');
  lines.push('| Route | Element | Screenshot Path |');
  lines.push('| --- | --- | --- |');
  for (const row of rows) {
    lines.push(`| ${row.route} | ${row.element} | [${row.element}](${row.screenshotPath}) |`);
  }
  lines.push('');

  writeFileSync(outPath, lines.join('\n'));
}

/**
 * Update `metadata.json` with coverage and findings counts.
 *
 * Signature matches the contract test's variadic calling convention:
 *   updateMetadata(path, routeRun, findings?)
 *   updateMetadata(path, ...routeRuns)
 *
 * @param metadataPath  Absolute path to metadata.json.
 * @param args          One or more `RouteRun` entries, optionally followed
 *                      by a `Finding[]` array as the last argument.
 */
export async function updateMetadata(
  metadataPath: string,
  ...args: (RouteRun | RouteRun[] | Finding[])[]
): Promise<void> {
  // Parse the variadic args: collect RouteRuns and optional Findings.
  const routes: RouteRun[] = [];
  let findings: Finding[] = [];

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (Array.isArray(arg)) {
      // Could be Finding[] or RouteRun[] — check the first element.
      if (arg.length > 0 && 'severity' in arg[0] && 'reproSteps' in arg[0]) {
        findings = arg as Finding[];
      } else {
        routes.push(...(arg as RouteRun[]));
      }
    } else {
      routes.push(arg as RouteRun);
    }
  }

  const existing = JSON.parse(readFileSync(metadataPath, 'utf8'));

  const routesTested = routes.length;
  const routesPassed = routes.filter((r) => r.status === 'pass').length;
  const routesFailed = routes.filter((r) => r.status === 'fail').length;
  const passRate = routesTested > 0 ? Math.round((routesPassed / routesTested) * 100) : 0;

  existing.actual_tasks = routesTested;
  existing.qa_coverage = {
    routes_tested: routesTested,
    routes_passed: routesPassed,
    routes_failed: routesFailed,
    pass_rate: passRate,
    coverage_percent: passRate,
  };

  const findings_count = {
    total: findings.length,
    critical: findings.filter((f) => f.severity === 'Critical').length,
    high: findings.filter((f) => f.severity === 'High').length,
    medium: findings.filter((f) => f.severity === 'Medium').length,
    low: findings.filter((f) => f.severity === 'Low').length,
  };
  existing.findings_count = findings_count;

  writeFileSync(metadataPath, JSON.stringify(existing, null, 2));
}

function parseArgs(argv: string[]): Record<string, string> {
  const parsed: Record<string, string> = {};
  for (let i = 0; i < argv.length; i++) {
    const token = argv[i];
    if (!token.startsWith('--')) continue;
    const key = token.slice(2);
    const next = argv[i + 1];
    if (next === undefined || next.startsWith('--')) {
      parsed[key] = 'true';
    } else {
      parsed[key] = next;
      i++;
    }
  }
  return parsed;
}

function resolveTrackPath(value: string | undefined, fallback: string): string {
  const target = value ?? fallback;
  return resolve(TRACK_DIR, target);
}

function readJsonFile<T>(path: string): T {
  return JSON.parse(readFileSync(path, 'utf8')) as T;
}

function readFindingsFile(path: string): Finding[] {
  if (!existsSync(path)) return [];
  const content = readFileSync(path, 'utf8');
  const rows = content
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => /^\|\s*Q-FIND-\d{3}\s*\|/.test(line));

  return rows.map((row) => {
    const cells = row.split('|').map((cell) => cell.trim()).filter(Boolean);
    return {
      id: cells[0],
      severity: (cells[1] || 'High') as FindingSeverity,
      route: cells[2] || '',
      action: 'observe',
      expected: cells.slice(3).join(' | ') || 'See finding details',
      actual: cells.slice(3).join(' | ') || 'See finding details',
      screenshotPath: '',
      reproSteps: [],
    } satisfies Finding;
  });
}

/**
 * Run the Phase S7 reporter from CLI arguments.
 *
 * @param argv CLI tokens after the script path.
 * @returns 0 when the report and screenshot index are written.
 */
export async function runCoverageReporterCli(argv: string[]): Promise<number> {
  const args = parseArgs(argv);
  const routesPath = resolveTrackPath(args.routes, 'runs/qa-routes.json');
  const elementsPath = resolveTrackPath(args.elements, 'runs/qa-elements.json');
  const navigationPath = resolveTrackPath(args.navigation, 'runs/qa-navigation.json');
  const findingsPath = resolveTrackPath(args.findings, 'findings.md');
  const outPath = resolveTrackPath(args.out, COVERAGE_COMMANDS.coverageReportPath);
  const screenshotsDir = resolveTrackPath(args['screenshots-dir'], 'screenshots');
  const screenshotIndexPath = resolveTrackPath(args['screenshots-index'], COVERAGE_COMMANDS.screenshotIndexPath);
  const metadataPath = resolveTrackPath(args.metadata, COVERAGE_COMMANDS.metadataPath);

  const routeLog = readJsonFile<RouteRunLog>(routesPath);
  const elementLog = readJsonFile<ElementRunLog>(elementsPath);
  const navLog = readJsonFile<NavRunLog>(navigationPath);
  const findings = readFindingsFile(findingsPath);
  const data: CoverageReportData = {
    routes: routeLog.routes,
    elements: elementLog.elements,
    navigation: navLog.results,
    findings,
  };

  await writeCoverageReport(outPath, data);
  await writeScreenshotIndex(screenshotIndexPath, screenshotsDir);
  if (existsSync(metadataPath)) {
    await updateMetadata(metadataPath, routeLog.routes, findings);
  }

  return printReportPath(outPath, screenshotIndexPath);
}

/**
 * Check that both coverage-report.md and screenshots/INDEX.md exist.
 *
 * @param coverageReportPath    Path to coverage-report.md.
 * @param screenshotIndexPath   Path to screenshots/INDEX.md.
 * @returns 0 if both exist, 1 otherwise.
 */
export function printReportPath(
  coverageReportPath: string,
  screenshotIndexPath: string,
): number {
  if (existsSync(coverageReportPath) && existsSync(screenshotIndexPath)) {
    return 0;
  }
  return 1;
}

if (import.meta.main) {
  const code = await runCoverageReporterCli(process.argv.slice(2));
  process.exit(code);
}
