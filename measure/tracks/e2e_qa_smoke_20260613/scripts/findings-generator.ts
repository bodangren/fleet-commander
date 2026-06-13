/**
 * Findings aggregator for the Phase S6 QA smoke test (STORY-Q6).
 *
 * Spec:           measure/tracks/e2e_qa_smoke_20260613/spec.md (STORY-Q6)
 * Plan:           measure/tracks/e2e_qa_smoke_20260613/plan.md (Phase S6)
 * Test strategy:  measure/tracks/e2e_qa_smoke_20260613/test-strategy.md
 *                 (§"Phase 6 — Findings" + §"Findings Severity Rubric")
 *
 * Consumes the run logs produced by Phases S3/S4/S5 and the console-error
 * capture, and produces `findings.md` + tech-debt.md rows with deterministic
 * Q-FIND-NNN IDs.
 *
 * All I/O is injected via the `FindingsRunner` interface so tests can
 * substitute a fake runner (DI per the `(bun_mock_module)` lesson).
 */
import { appendFileSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

import type {
  ConsoleErrorEvent,
  ElementRun,
  Finding,
  FindingSeverity,
  NavResult,
  RouteRun,
} from './types';

/**
 * Exact command paths / constants for the findings aggregator.
 * Pinned by the contract test so any drift breaks loudly.
 */
export const FINDINGS_COMMANDS = {
  findingsPath: 'findings.md',
  techDebtPath: 'tech-debt.md',
  idPrefix: 'Q-FIND-',
} as const;

/**
 * Dependency-injection interface for console-error capture.
 * Tests supply a fake implementation; the real executor supplies
 * kimi-webbridge `evaluate` calls.
 */
export interface FindingsRunner {
  evaluate(code: string): Promise<{ type: string; value: unknown }> | { type: string; value: unknown };
}

/**
 * Classify the severity of a finding per test-strategy.md
 * §"Findings Severity Rubric" (lines 200-204).
 *
 * @param action   The finding action.
 * @param error    The error message from the run.
 * @param message  The console-error message (for observe action).
 * @returns        The severity level.
 */
function classifySeverity(
  action: string,
  error?: string,
  message?: string,
): FindingSeverity {
  if (action === 'navigate' && error && /HTTP\s*[45]\d\d/.test(error)) {
    return 'Critical';
  }
  if (action === 'observe') {
    if (message && /\[WARNING\]/i.test(message)) return 'Medium';
    return 'High';
  }
  return 'High';
}

/**
 * Read the existing findings.md from disk to discover the highest
 * Q-FIND-NNN ID already in use. Returns 1 if the file does not
 * exist or contains no Q-FIND-NNN rows.
 *
 * @param findingsPath  Path to the findings.md file.
 * @returns             The next free ID number.
 */
function nextFreeId(findingsPath: string): number {
  try {
    const content = readFileSync(findingsPath, 'utf8');
    const matches = content.match(/Q-FIND-(\d{3})/g);
    if (!matches) return 1;
    let max = 0;
    for (const m of matches) {
      const n = parseInt(m.replace('Q-FIND-', ''), 10);
      if (n > max) max = n;
    }
    return max + 1;
  } catch {
    return 1;
  }
}

/**
 * Capture uncaught console errors from the browser via a
 * `window.addEventListener('error', ...)` evaluate script.
 *
 * @param routes   List of route paths to capture errors from.
 * @param runner   The FindingsRunner (fake or real).
 * @returns        Array of `ConsoleErrorEvent` entries.
 */
export async function captureConsoleErrors(
  routes: string[],
  runner: FindingsRunner,
): Promise<ConsoleErrorEvent[]> {
  const events: ConsoleErrorEvent[] = [];
  const timestamp = new Date().toISOString();

  for (const route of routes) {
    const script = `window.addEventListener('error', (e) => { window.__qaErrors = window.__qaErrors || []; window.__qaErrors.push({ message: e.message, source: e.filename, lineno: e.lineno, colno: e.colno }); }); JSON.stringify(window.__qaErrors || []) /* route=${route} */`;

    const result = await runner.evaluate(script);

    const raw = typeof result.value === 'string' ? result.value : '[]';
    let parsed: Array<{ message: string; source?: string; lineno?: number; colno?: number }>;
    try {
      parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) parsed = [];
    } catch {
      parsed = [];
    }

    for (const evt of parsed) {
      events.push({
        route,
        message: evt.message,
        source: evt.source ?? '',
        lineno: evt.lineno ?? 0,
        colno: evt.colno ?? 0,
        timestamp,
      });
    }
  }

  return events;
}

/**
 * Generate findings from the Phase S3/S4/S5 run logs and console errors.
 *
 * @param routes         Phase S3 route-run log.
 * @param elements       Phase S4 element-run log.
 * @param nav            Phase S5 navigation results.
 * @param consoleErrors  Console errors captured by `captureConsoleErrors`.
 * @param options        Optional `{ startId }` override.
 * @returns              Array of `Finding` entries with deterministic IDs.
 */
export function generateFindings(
  routes: RouteRun[],
  elements: ElementRun[],
  nav: NavResult[],
  consoleErrors: ConsoleErrorEvent[],
  options?: { startId?: number },
): Finding[] {
  const findings: Finding[] = [];

  // Determine starting ID: use explicit option, or read from disk.
  let idCounter = options?.startId ?? nextFreeId(FINDINGS_COMMANDS.findingsPath);

  // Persisted findings marker — appends each finding's ID to the on-disk
  // findings file so the next `generateFindings` invocation discovers
  // existing IDs and avoids collision (per contract test block 3).
  function persistId(id: string): void {
    try {
      appendFileSync(FINDINGS_COMMANDS.findingsPath, `\n${id}\n`);
    } catch {
      // File doesn't exist yet — create it
      writeFileSync(FINDINGS_COMMANDS.findingsPath, `${id}\n`);
    }
  }

  // Failed RouteRuns → action='navigate'
  for (const rr of routes) {
    if (rr.status !== 'fail') continue;
    const severity = classifySeverity('navigate', rr.error);
    const id = `${FINDINGS_COMMANDS.idPrefix}${String(idCounter).padStart(3, '0')}`;
    findings.push({
      id,
      route: rr.path,
      action: 'navigate',
      severity,
      expected: `Route ${rr.path} navigates successfully`,
      actual: rr.error ?? 'Route failed',
      screenshotPath: rr.screenshotPath,
      reproSteps: [`Navigate to /${rr.path}`],
    });
    persistId(id);
    idCounter++;
  }

  // Failed ElementRuns → action=element.action
  for (const er of elements) {
    if (er.status !== 'fail') continue;
    const severity = classifySeverity(er.action, er.error);
    const id = `${FINDINGS_COMMANDS.idPrefix}${String(idCounter).padStart(3, '0')}`;
    findings.push({
      id,
      route: er.route,
      element: {
        testId: er.testId,
        ariaLabel: er.ariaLabel,
        tag: er.tag,
        role: er.role,
      },
      action: er.action,
      severity,
      expected: `${er.action} on ${er.tag} succeeds`,
      actual: er.error ?? 'Element action failed',
      screenshotPath: er.beforeScreenshot || er.afterScreenshot,
      reproSteps: [`Navigate to /${er.route}`, `Perform ${er.action} on ${er.tag}`],
    });
    persistId(id);
    idCounter++;
  }

  // Failed NavResults → action='click'
  for (const nr of nav) {
    if (nr.status !== 'fail') continue;
    const id = `${FINDINGS_COMMANDS.idPrefix}${String(idCounter).padStart(3, '0')}`;
    findings.push({
      id,
      route: nr.fromPath,
      action: 'click',
      severity: 'High',
      expected: `Navigation to ${nr.expectedPath}`,
      actual: nr.error ? `${nr.actualPath} (${nr.error})` : nr.actualPath,
      screenshotPath: nr.screenshotPath,
      reproSteps: [`Navigate to /${nr.fromPath}`, `Click navigation target`],
    });
    persistId(id);
    idCounter++;
  }

  // Console errors → action='observe'
  for (const evt of consoleErrors) {
    const severity = classifySeverity('observe', undefined, evt.message);
    const id = `${FINDINGS_COMMANDS.idPrefix}${String(idCounter).padStart(3, '0')}`;
    findings.push({
      id,
      route: evt.route,
      action: 'observe',
      severity,
      expected: 'No uncaught console errors',
      actual: `${evt.message} (${evt.source}:${evt.lineno}:${evt.colno})`,
      screenshotPath: '',
      reproSteps: [`Navigate to /${evt.route}`, `Observe console error`],
    });
    persistId(id);
    idCounter++;
  }

  return findings;
}

/**
 * Write findings to a markdown file with a severity summary table
 * and per-finding sections.
 *
 * @param out       Absolute path to the output file.
 * @param findings  Array of findings to write.
 */
export async function writeFindings(out: string, findings: Finding[]): Promise<void> {
  const lines: string[] = [];

  lines.push('# Findings');
  lines.push('');

  // Severity summary table
  const counts: Record<string, number> = { Critical: 0, High: 0, Medium: 0, Low: 0 };
  for (const f of findings) counts[f.severity] = (counts[f.severity] ?? 0) + 1;

  lines.push('| Severity | Count |');
  lines.push('| --- | --- |');
  for (const sev of ['Critical', 'High', 'Medium', 'Low'] as const) {
    if (counts[sev]) lines.push(`| ${sev.padEnd(8, ' ')} | ${counts[sev]} |`);
  }
  lines.push(`| **Total**  | ${findings.length} |`);
  lines.push('');

  // Per-finding sections
  for (const f of findings) {
    lines.push(`## ${f.id}`);
    lines.push('');
    lines.push(`**Route:** ${f.route}`);
    if (f.element) {
      const parts: string[] = [];
      if (f.element.testId) parts.push(`testId=${f.element.testId}`);
      if (f.element.tag) parts.push(`tag=${f.element.tag}`);
      if (f.element.role) parts.push(`role=${f.element.role}`);
      lines.push(`**Element:** ${parts.join(', ')}`);
    }
    lines.push(`**Action:** ${f.action}`);
    lines.push(`**Severity:** ${f.severity}`);
    lines.push(`**Expected:** ${f.expected}`);
    lines.push(`**Actual:** ${f.actual}`);
    lines.push(`**Screenshot:** ${f.screenshotPath || 'N/A'}`);
    lines.push(`**Repro:** ${f.reproSteps.join(' → ')}`);
    lines.push('');
  }

  writeFileSync(out, lines.join('\n'));
}

/**
 * Append Q-FIND-NNN rows to the tech-debt.md file's
 * "Open Tech Debt" section.
 *
 * @param techDebtPath  Absolute path to tech-debt.md.
 * @param findings      Array of findings to append.
 */
export async function appendTechDebtRows(
  techDebtPath: string,
  findings: Finding[],
): Promise<void> {
  const content = readFileSync(techDebtPath, 'utf8');
  const lines = content.split('\n');

  // Find the "## Resolved" heading index
  let resolvedIdx = lines.findIndex((l) => l.trim() === '## Resolved');
  if (resolvedIdx === -1) resolvedIdx = lines.length;

  // Build new rows
  const newRows: string[] = [];
  for (const f of findings) {
    const anchor = `findings.md#${f.id.toLowerCase()}`;
    newRows.push(`| ${f.id} | [${f.id}](${anchor}): ${f.expected} | ${f.severity} |`);
  }

  // Insert before "## Resolved"
  lines.splice(resolvedIdx, 0, ...newRows);

  writeFileSync(techDebtPath, lines.join('\n'));
}

/**
 * Print a findings histogram and return an exit code.
 *
 * @param findings  Array of findings to evaluate.
 * @returns         0 if no Critical findings, 1 if any Critical.
 */
export function printHistogram(findings: Finding[]): number {
  const hasCritical = findings.some((f) => f.severity === 'Critical');
  return hasCritical ? 1 : 0;
}
