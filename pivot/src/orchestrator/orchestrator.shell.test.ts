/**
 * Phase 3: Thin the Shell — Red-phase guardrails.
 *
 * These tests assert the post-decomposition shape of `runProject` and
 * `orchestrator.ts` before the Phase 3 refactor lands:
 *
 *   1. `runProject` body length is below the 200-line shell target.
 *   2. `orchestrator.ts` file length is below the 500-line god-file threshold
 *      (gates the TD-206 allowlist removal in `measure/godfile-allowlist.txt`).
 *   3. `runProject` body has a bounded number of control-flow statements —
 *      a thin shell delegates branches to extracted stage modules rather
 *      than embedding them inline.
 *   4. `runProject` exported signature is stable (locks the public contract
 *      for callers — runAllProjects + test files).
 *   5. `runProject` caller count in `build-graph` matches the Phase 1 baseline
 *      (0 callers), so the refactor does not silently grow the caller set.
 *
 * Tests 1-3 are RED today: the body spans 87-834 (747 lines), the file is
 * 893 lines, and the body contains many inline branches. Tests 4-5 lock the
 * baseline and will continue to pass before and after the refactor.
 *
 * Source: measure/tracks/orchestrator_decomposition_20260605/plan.md (Phase 3)
 *         measure/tracks/orchestrator_decomposition_20260605/test-strategy.md
 *         (Per-Phase Test Notes §Phase 3 + Architecture Guardrails).
 */

import { describe, expect, it, beforeAll } from 'bun:test';
import * as fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';

const ORCHESTRATOR_TS = resolve(import.meta.dir, 'orchestrator.ts');
const REPO_ROOT = resolve(import.meta.dir, '..', '..', '..');

interface FunctionBody {
  signatureLine: number;
  braceStart: number;
  braceEnd: number;
  bodyLines: number;
}

let source = '';
let runProjectBody: FunctionBody;
let fileLineCount = 0;

/**
 * Locate the runProject async function and measure its body by tracking
 * brace depth from the opening `{` to the matching `}`. The body line count
 * is inclusive of the opening and closing braces.
 */
function measureFunctionBody(src: string, name: string): FunctionBody {
  const lines = src.split('\n');
  let signatureLine = -1;
  const sigRegex = new RegExp(`export\\s+async\\s+function\\s+${name}\\s*\\(`);
  for (let i = 0; i < lines.length; i += 1) {
    if (sigRegex.test(lines[i])) {
      signatureLine = i;
      break;
    }
  }
  if (signatureLine === -1) {
    throw new Error(`Could not find exported async function ${name} in source`);
  }

  let braceStart = -1;
  for (let i = signatureLine; i < Math.min(signatureLine + 30, lines.length); i += 1) {
    if (lines[i].includes('{')) {
      braceStart = i;
      break;
    }
  }
  if (braceStart === -1) {
    throw new Error(`Could not find opening brace for ${name}`);
  }

  let depth = 0;
  let braceEnd = -1;
  for (let i = braceStart; i < lines.length; i += 1) {
    for (const ch of lines[i]) {
      if (ch === '{') {
        depth += 1;
      } else if (ch === '}') {
        depth -= 1;
        if (depth === 0) {
          braceEnd = i;
          break;
        }
      }
    }
    if (braceEnd !== -1) {
      break;
    }
  }
  if (braceEnd === -1) {
    throw new Error(`Could not find matching close brace for ${name}`);
  }

  return {
    signatureLine,
    braceStart,
    braceEnd,
    bodyLines: braceEnd - braceStart + 1,
  };
}

beforeAll(() => {
  source = fs.readFileSync(ORCHESTRATOR_TS, 'utf8');
  runProjectBody = measureFunctionBody(source, 'runProject');
  fileLineCount = source.split('\n').length;
});

describe('Phase 3: runProject shell thinning', () => {
  it('runProject function body is below the 200-line shell target', () => {
    // plan.md §Phase 3: "target < 200 lines, readable top-to-bottom"
    // test-strategy.md §Architecture Guardrails: "runProject target below 200 lines"
    expect(runProjectBody.bodyLines).toBeLessThan(200);
  });

  it('orchestrator.ts file is below the 500-line god-file threshold', () => {
    // doctor.sh:14 GODFILE_THRESHOLD=500; plan.md §Phase 4 removes the
    // orchestrator.ts entry from godfile-allowlist.txt only when the file
    // is under threshold. This test makes that gate explicit.
    expect(fileLineCount).toBeLessThan(500);
  });

  it('runProject body has a bounded number of control-flow statements', () => {
    // A thin orchestration shell delegates branches to stages/* modules.
    // The current body embeds retry, budget, circuit, coverage, and review
    // branches inline. We measure how many top-level control-flow keywords
    // appear between the braces; a readable shell should have a small count.
    const bodySource = source
      .split('\n')
      .slice(runProjectBody.braceStart + 1, runProjectBody.braceEnd)
      .join('\n');
    const patterns: RegExp[] = [
      /^\s*if\s*\(/gm,
      /^\s*else\s*\{/gm,
      /^\s*for\s*\(/gm,
      /^\s*while\s*\(/gm,
      /^\s*switch\s*\(/gm,
      /^\s*try\s*\{/gm,
      /^\s*catch\s*\(/gm,
    ];
    let total = 0;
    for (const p of patterns) {
      const matches = bodySource.match(p);
      if (matches) {
        total += matches.length;
      }
    }
    // A reasonable shell that delegates to stages should have < 15 inline
    // control-flow statements. The current body has many more.
    expect(total).toBeLessThan(15);
  });

  it('runProject exported signature is stable (locks the public caller contract)', () => {
    // Spec AC: "build-graph callers for runProject unchanged in count."
    // The 7-argument shape is the public contract that runAllProjects and
    // the test files import. Any change here forces an explicit review.
    const lines = source.split('\n');
    const sigStart = lines.findIndex((line) =>
      /export\s+async\s+function\s+runProject\s*\(/.test(line),
    );
    expect(sigStart).toBeGreaterThanOrEqual(0);

    // The signature spans multiple lines (params with type annotations) and
    // ends at the opening `{`. Capture the full header so we can assert
    // parameter names and the return type that callers depend on.
    let braceIdx = -1;
    for (let i = sigStart; i < Math.min(sigStart + 30, lines.length); i += 1) {
      if (lines[i].includes('{')) {
        braceIdx = i;
        break;
      }
    }
    expect(braceIdx).toBeGreaterThan(sigStart);
    // Include the braceIdx line — the return type annotation lives on the
    // same line as the function-body opening `{` (e.g. `): Promise<RunResult> {`).
    const header = lines.slice(sigStart, braceIdx + 1).join('\n');

    // Parameter names are part of the public contract.
    const expectedParams = [
      'client',
      'projectSlug',
      'config',
      'hooks',
      'executeFn',
      'gitHooks',
      'coverageHooks',
    ];
    for (const name of expectedParams) {
      expect(header).toContain(name);
    }

    // Return type must remain `Promise<RunResult>`.
    expect(header).toContain('Promise<RunResult>');
  });

  it('runProject caller count matches the Phase 1 baseline (0 callers in graph)', () => {
    // Spec AC: "build-graph callers for runProject unchanged in count."
    // Phase 1 baseline: 0 — runProject is called from runAllProjects in the
    // SAME file (no `calls` edge across files) and from test files (which
    // do not produce graph `calls` edges). If a new production caller is
    // added, this test must fail so the change is intentional.
    let raw: string;
    let notFound = false;
    try {
      raw = execFileSync('build-graph', ['callers', './graph.db', 'runProject'], {
        cwd: REPO_ROOT,
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe'],
      });
    } catch (err) {
      const e = err as { status?: number; stdout?: Buffer | string; stderr?: Buffer | string };
      const stdout = e.stdout ? e.stdout.toString() : '';
      const stderr = e.stderr ? e.stderr.toString() : '';
      if (/no results|no callers|not found/i.test(stdout + stderr)) {
        notFound = true;
        raw = stdout;
      } else {
        throw err;
      }
    }
    if (notFound) {
      // Symbol absent or unresolved counts as 0 callers in this baseline.
      expect(notFound).toBe(true);
      return;
    }
    const trimmed = raw
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0 && !/no results|no callers|not found/i.test(line));
    expect(trimmed).toEqual([]);
  });
});
