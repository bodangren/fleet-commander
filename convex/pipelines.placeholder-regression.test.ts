/**
 * Phase 1 (Red) — adversarial regression net for the P3 placeholder inversion.
 *
 * Track: operations_api_contract_closure_20260618
 * Strategy: measure/tracks/operations_api_contract_closure_20260618/test-strategy.md
 *           §3 ("Either path needs a regression test asserting `'stub-id'` is
 *            no longer returned by any production query.")
 *           §5 ("If `convex/pipelines.ts` is deleted, also add a doctor-style
 *            test (or grep-based unit) that ensures no `api.pipelines.*`
 *            reference remains in pivot.")
 *           §6 ("Artifact / contract (no live process): ... any grep-style
 *            'no `' + "`'stub-id'`" + ` in production' test.")
 *
 * Complements `convex/pipelines.test.ts` (which pins the placeholder's return
 * value) by ensuring the placeholder value `'stub-id'` is confined to that
 * single file. If a future change accidentally introduces a 'stub-id' return
 * value in any other production pivot/convex file, this test fails.
 *
 * Also asserts the symmetric "orphan reference" guard: if P3 deletes
 * `convex/pipelines.ts`, the pivot code must not import from `api.pipelines.*`.
 *
 * This is intentionally a static-analysis test (no live process) — see
 * `dependencies.staticAnalysis.test.ts` for the same pattern. The full
 * P3 gate also includes the inversion of `convex/pipelines.test.ts` and
 * the live route tests in `pivot/src/routes/pipelines.test.ts`.
 *
 * Run with:
 *   bun test ./convex/pipelines.placeholder-regression.test.ts
 */
import { describe, expect, it } from 'bun:test';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const REPO_ROOT = join(import.meta.dir, '..');
const PRODUCTION_SCAN_DIRS = [
  join(REPO_ROOT, 'pivot/src'),
  join(REPO_ROOT, 'convex'),
];

/** Recursively collects every non-test `.ts` file under a directory. */
function listProductionSourceFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const abs = join(dir, entry);
    const stat = statSync(abs);
    if (stat.isDirectory()) {
      out.push(...listProductionSourceFiles(abs));
    } else if (entry.endsWith('.ts') && !entry.endsWith('.test.ts')) {
      out.push(abs);
    }
  }
  return out;
}

/** Lines that include the literal `'stub-id'` or `"stub-id"`. */
function findStubIdOccurrences(file: string): { line: number; text: string }[] {
  const src = readFileSync(file, 'utf8');
  const lines = src.split('\n');
  const hits: { line: number; text: string }[] = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] ?? '';
    if (line.includes("'stub-id'") || line.includes('"stub-id"')) {
      hits.push({ line: i + 1, text: line.trim() });
    }
  }
  return hits;
}

/** Pivot files that import from `api.pipelines.*` (i.e. the placeholder module). */
function findApiPipelinesImports(file: string): { line: number; text: string }[] {
  const src = readFileSync(file, 'utf8');
  const lines = src.split('\n');
  const hits: { line: number; text: string }[] = [];
  const re = /api\.pipelines\.\w+/g;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] ?? '';
    if (re.test(line)) {
      hits.push({ line: i + 1, text: line.trim() });
    }
    re.lastIndex = 0;
  }
  return hits;
}

describe('operations_api_contract_closure_20260618 — Phase 1: stub-id / orphan-reference regression net', () => {
  it("the literal 'stub-id' is confined to convex/pipelines.ts (no leak into other production files)", () => {
    const allFiles: string[] = [];
    for (const dir of PRODUCTION_SCAN_DIRS) {
      allFiles.push(...listProductionSourceFiles(dir));
    }
    const offenders: { file: string; line: number; text: string }[] = [];
    for (const file of allFiles) {
      const rel = file.replace(REPO_ROOT + '/', '');
      if (rel === 'convex/pipelines.ts') continue;
      const hits = findStubIdOccurrences(file);
      for (const hit of hits) {
        offenders.push({ file: rel, line: hit.line, text: hit.text });
      }
    }
    expect(
      offenders,
      "'stub-id' must not appear in any production source file other than " +
        'convex/pipelines.ts. Offenders: ' +
        JSON.stringify(offenders, null, 2),
    ).toEqual([]);
  });

  it('no pivot production file imports from api.pipelines.* (the placeholder module)', () => {
    // Intentionally red at P1 closeout and at HEAD: pivot/src/routes/pipelines.ts
    // still uses api.pipelines.startPipeline / updatePipelineStatus / getPipelineLogs
    // (the placeholder module that P3 must delete or replace). When P3 lands — either
    // by deleting convex/pipelines.ts and moving the imports to api.pipelineRuns.*, or
    // by replacing the placeholder bodies with real pipelineRuns writes — this test
    // will turn green. The same pattern as `convex/pipelines.test.ts`: red at P1
    // (negative-space contract for P3), green at P3 closeout.
    const pivotDir = join(REPO_ROOT, 'pivot/src');
    const allFiles = listProductionSourceFiles(pivotDir);
    const offenders: { file: string; line: number; text: string }[] = [];
    for (const file of allFiles) {
      const rel = file.replace(REPO_ROOT + '/', '');
      const hits = findApiPipelinesImports(file);
      for (const hit of hits) {
        offenders.push({ file: rel, line: hit.line, text: hit.text });
      }
    }
    expect(
      offenders,
      'pivot must not import from the placeholder module api.pipelines.*. ' +
        'P3 deletes convex/pipelines.ts; any surviving import would silently ' +
        '404 at runtime. Offenders: ' +
        JSON.stringify(offenders, null, 2),
    ).toEqual([]);
  });
});
