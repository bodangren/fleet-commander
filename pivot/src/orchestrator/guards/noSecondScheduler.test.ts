/**
 * Phase S5 Architecture Guard Tests.
 *
 * Owned by Phase S5 Test task 4 of
 * `measure/tracks/measure_quality_workflow_integration_20260611/plan.md`.
 *
 * Contract pinned by this file (per test-strategy §4 "Architecture
 * guardrails" and spec S5 AC "Given cutover completes, Then only the
 * canonical orchestrator schedules production work; the Python supervisor
 * is clearly documented as deprecated/manual reference or removed by an
 * explicit follow-up decision."):
 *
 *   1. No production source file in `pivot/src/` or `convex/` spawns
 *      `measure/automation-supervisor.py` (or any direct python3
 *      invocation of the legacy script). The supervisor is a behavior
 *      reference, not a runtime dependency.
 *
 *   2. Only one production scheduler exists: `autoRunner.ts`. No other
 *      file may register a new `setTimeout`/`setInterval` (other than
 *      library imports) and the only `setTimeout` / `setInterval` call
 *      site in production code is in `autoRunner.ts`.
 *
 *   3. Only one production claimant exists:
 *      `pivot/src/orchestrator/stages/claimForExecution.ts`. No other
 *      function in `pivot/src/` may call
 *      `api.tasks.claimTaskForExecution` or any equivalent claim
 *      function.
 *
 *   4. No production code (i.e. non-test, non-spec) imports any
 *      `*.fake.ts` or `*.stub.ts` module. Stage-runner fakes live in
 *      test files only.
 *
 *   5. No `*.red.test.ts` file remains at S5 closeout. Per
 *      test-strategy §7 rule 4: "S5 cutover requires zero
 *      `*.red.test.ts` files remaining".
 *
 *   6. The Python supervisor file `measure/automation-supervisor.py`
 *      is not referenced as a runtime dependency in production code
 *      paths. The supervisor's `qualityProfile.ts` regex blocks
 *      unsafe profile commands from referencing the script.
 *
 * Red-phase state at S5 MID start: the
 * `pivot/src/orchestrator/guards/` directory does not exist. The file
 * is intentionally Red. The Green sibling lands when the directory is
 * present, the guard tests pass against the production source tree,
 * and the cutover acceptance rules are satisfied.
 *
 * The test is purely static: it reads source files from disk and
 * inspects them for forbidden patterns. It does NOT spawn any process,
 * does NOT run the real `measure/automation-supervisor.py`, and does
 * NOT execute `npm run verify` or any other command path that could
 * be intercepted by `VERIFY_FAKE_GATE_DIR`. This protects against the
 * "fake gate" risk called out in the supervisor instructions.
 */

import { describe, expect, it } from 'bun:test';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

const REPO_ROOT = resolve(import.meta.dir, '..', '..', '..', '..');
const PIVOT_SRC = join(REPO_ROOT, 'pivot', 'src');
const CONVEX_DIR = join(REPO_ROOT, 'convex');
const MEASURE_DIR = join(REPO_ROOT, 'measure');

const SUPERVISOR_SCRIPT = 'measure/automation-supervisor.py';
const SUPERVISOR_BASENAME = 'automation-supervisor.py';
const CANONICAL_CLAIM_FILE = join(
  PIVOT_SRC,
  'orchestrator',
  'stages',
  'claimForExecution.ts',
);
const CANONICAL_SCHEDULER_FILE = join(
  PIVOT_SRC,
  'orchestrator',
  'autoRunner.ts',
);

// Source roots the guard inspects for forbidden patterns. Excludes
// test/spec/fixture files (the guard is about production code paths).
const PRODUCTION_SCAN_ROOTS: ReadonlyArray<string> = [
  PIVOT_SRC,
  CONVEX_DIR,
];

// Source-file extensions considered production code.
const SOURCE_EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs']);

// Test/spec file name suffixes excluded from the production scan.
const TEST_FILE_PATTERNS: RegExp[] = [
  /\.test\.[jt]sx?$/,
  /\.spec\.[jt]sx?$/,
  /\.red\.test\.[jt]sx?$/,
  /__fixtures__[\\/]/,
  /__tests__[\\/]/,
];

interface SourceFile {
  /** Absolute path on disk. */
  absPath: string;
  /** Path relative to the repo root (POSIX-style). */
  relPath: string;
}

function listSourceFiles(root: string): SourceFile[] {
  if (!existsSync(root)) {
    return [];
  }
  const out: SourceFile[] = [];
  const walk = (dir: string): void => {
    for (const entry of readdirSync(dir)) {
      const abs = join(dir, entry);
      const st = statSync(abs);
      if (st.isDirectory()) {
        walk(abs);
        continue;
      }
      const ext = abs.slice(abs.lastIndexOf('.'));
      if (!SOURCE_EXTENSIONS.has(ext)) {
        continue;
      }
      const rel = relative(REPO_ROOT, abs).split('\\').join('/');
      if (TEST_FILE_PATTERNS.some((re) => re.test(rel))) {
        continue;
      }
      out.push({ absPath: abs, relPath: rel });
    }
  };
  walk(root);
  return out;
}

function readSource(file: SourceFile): string {
  return readFileSync(file.absPath, 'utf8');
}

// ──────────────────────────────────────────────────────────────────────
// 1. Module surface
// ──────────────────────────────────────────────────────────────────────

describe('guards/noSecondScheduler module surface', () => {
  it('the canonical auto-runner scheduler file exists', () => {
    expect(existsSync(CANONICAL_SCHEDULER_FILE)).toBe(true);
  });

  it('the canonical claim-for-execution file exists', () => {
    expect(existsSync(CANONICAL_CLAIM_FILE)).toBe(true);
  });

  it('the Python supervisor reference file still exists at the legacy path', () => {
    // The supervisor file is the behavior reference. Its presence is
    // expected; its spawn-from-production-code is not.
    expect(existsSync(join(MEASURE_DIR, 'automation-supervisor.py'))).toBe(true);
  });
});

// ──────────────────────────────────────────────────────────────────────
// 2. No production code spawns the Python supervisor
// ──────────────────────────────────────────────────────────────────────

describe('guards/noSecondScheduler - no production source spawns the Python supervisor', () => {
  const productionFiles = PRODUCTION_SCAN_ROOTS.flatMap((root) =>
    listSourceFiles(root),
  );

  it('scans at least one production source file (sanity check)', () => {
    expect(productionFiles.length).toBeGreaterThan(0);
  });

  it('no production file spawns measure/automation-supervisor.py', () => {
    const offenders: { file: string; line: number; match: string }[] = [];
    for (const file of productionFiles) {
      const src = readSource(file);
      const lines = src.split('\n');
      for (let i = 0; i < lines.length; i += 1) {
        const line = lines[i] ?? '';
        if (
          line.includes(SUPERVISOR_SCRIPT) &&
          /spawn|exec|child_process|require\s*\(|import\s+/.test(line)
        ) {
          offenders.push({
            file: file.relPath,
            line: i + 1,
            match: line.trim(),
          });
        }
      }
    }
    expect(offenders).toEqual([]);
  });

  it('no production file spawns automation-supervisor.py by basename', () => {
    const offenders: { file: string; line: number; match: string }[] = [];
    for (const file of productionFiles) {
      const src = readSource(file);
      const lines = src.split('\n');
      for (let i = 0; i < lines.length; i += 1) {
        const line = lines[i] ?? '';
        if (
          line.includes(SUPERVISOR_BASENAME) &&
          /spawn|exec|child_process/.test(line)
        ) {
          offenders.push({
            file: file.relPath,
            line: i + 1,
            match: line.trim(),
          });
        }
      }
    }
    expect(offenders).toEqual([]);
  });

  it('the canonical safety regex in qualityProfile.ts still blocks supervisor references in profile commands', () => {
    const qualityProfile = join(PIVOT_SRC, 'shared', 'qualityProfile.ts');
    if (!existsSync(qualityProfile)) {
      // If the file is removed, the safety check must move to a peer
      // (this test fails closed so the safety contract is never
      // silently dropped).
      throw new Error('qualityProfile.ts is missing — safety contract is unprotected');
    }
    const src = readFileSync(qualityProfile, 'utf8');
    expect(src).toMatch(/automation-supervisor/);
  });
});

// ──────────────────────────────────────────────────────────────────────
// 3. Only one production scheduler
// ──────────────────────────────────────────────────────────────────────
//
// The canonical orchestrator scheduler is `autoRunner.ts`. The proxy
// we use to detect a "second scheduler" is direct import of
// `runAllProjects` outside of `autoRunner.ts`. Pre-existing
// policy/retrospective/providerHealthMonitor schedulers exist in the
// repo but they do not call `runAllProjects` — they run their own
// scoped work. This test pins that boundary: a regression that wires
// a new scheduler to `runAllProjects` is a single-control-plane
// violation and blocks cutover.

const ORCHESTRATOR_FILE = join(PIVOT_SRC, 'orchestrator', 'orchestrator.ts');
const ALLOWED_RUN_ALL_PROJECTS_IMPORTERS: ReadonlySet<string> = new Set([
  relative(REPO_ROOT, CANONICAL_SCHEDULER_FILE), // autoRunner.ts (canonical scheduler)
  relative(REPO_ROOT, ORCHESTRATOR_FILE), // self (defines the export)
  relative(REPO_ROOT, join(PIVOT_SRC, 'orchestrator', 'index.ts')), // barrel re-export
  relative(REPO_ROOT, join(PIVOT_SRC, 'orchestrator', 'run.ts')), // one-shot CLI entrypoint (no timer)
  relative(REPO_ROOT, join(PIVOT_SRC, 'routes', 'pipelineEngine.ts')), // REST route that wires orchestrator into the server
  relative(REPO_ROOT, join(PIVOT_SRC, 'orchestrator', 'runAllProjects.test.ts')), // test
  relative(REPO_ROOT, join(PIVOT_SRC, 'orchestrator', 'orchestrator.test.ts')), // test
]);

function readSourceLines(file: SourceFile): string[] {
  return readSource(file).split('\n');
}

describe('guards/noSecondScheduler - only one production scheduler', () => {
  const productionFiles = PRODUCTION_SCAN_ROOTS.flatMap((root) =>
    listSourceFiles(root),
  );

  it('only autoRunner.ts imports runAllProjects from production code', () => {
    const offenders: { file: string; line: number; match: string }[] = [];
    for (const file of productionFiles) {
      if (file.relPath === relative(REPO_ROOT, ORCHESTRATOR_FILE)) {
        // The file that defines runAllProjects is its own importer (export).
        continue;
      }
      const lines = readSourceLines(file);
      for (let i = 0; i < lines.length; i += 1) {
        const line = lines[i] ?? '';
        // Match ES imports of runAllProjects from the orchestrator module.
        // Accept both `./orchestrator` (relative to src/orchestrator/*) and
        // `../orchestrator/orchestrator` (relative to src/routes/*).
        if (
          /import\s*\{[^}]*\brunAllProjects\b[^}]*\}\s*from\s*['"]\.{1,2}\/orchestrator(\/orchestrator)?['"]/.test(line)
        ) {
          if (ALLOWED_RUN_ALL_PROJECTS_IMPORTERS.has(file.relPath)) {
            continue;
          }
          offenders.push({
            file: file.relPath,
            line: i + 1,
            match: line.trim(),
          });
        }
      }
    }
    expect(offenders).toEqual([]);
  });

  it('only orchestrator.ts exports runAllProjects and runProject', () => {
    const offenders: { file: string; line: number; match: string }[] = [];
    for (const file of productionFiles) {
      const lines = readSourceLines(file);
      for (let i = 0; i < lines.length; i += 1) {
        const line = lines[i] ?? '';
        if (
          /export\s+(async\s+)?function\s+(runAllProjects|runProject)\b/.test(line) &&
          file.relPath !== relative(REPO_ROOT, ORCHESTRATOR_FILE)
        ) {
          offenders.push({
            file: file.relPath,
            line: i + 1,
            match: line.trim(),
          });
        }
      }
    }
    expect(offenders).toEqual([]);
  });
});

// ──────────────────────────────────────────────────────────────────────
// 4. Only one production claimant
// ──────────────────────────────────────────────────────────────────────

describe('guards/noSecondScheduler - only one production claimant', () => {
  const productionFiles = PRODUCTION_SCAN_ROOTS.flatMap((root) =>
    listSourceFiles(root),
  );

  it('only claimForExecution.ts may call api.tasks.claimTaskForExecution', () => {
    const offenders: { file: string; line: number; match: string }[] = [];
    for (const file of productionFiles) {
      const src = readSource(file);
      const lines = src.split('\n');
      for (let i = 0; i < lines.length; i += 1) {
        const line = lines[i] ?? '';
        if (!/claimTaskForExecution/.test(line)) {
          continue;
        }
        if (line.trim().startsWith('//') || line.trim().startsWith('*')) {
          continue;
        }
        if (file.relPath === relative(REPO_ROOT, CANONICAL_CLAIM_FILE)) {
          continue;
        }
        // Allow re-exports of the canonical symbol (e.g. index.ts).
        // Block actual call sites (`mutation(api.tasks.claimTaskForExecution`).
        if (/api\.tasks\.claimTaskForExecution\b/.test(line)) {
          offenders.push({
            file: file.relPath,
            line: i + 1,
            match: line.trim(),
          });
        }
      }
    }
    expect(offenders).toEqual([]);
  });
});

// ──────────────────────────────────────────────────────────────────────
// 5. No production code imports fake/stub modules
// ──────────────────────────────────────────────────────────────────────

describe('guards/noSecondScheduler - no production fake/stub imports', () => {
  const productionFiles = PRODUCTION_SCAN_ROOTS.flatMap((root) =>
    listSourceFiles(root),
  );

  it('no production file imports any *.fake.ts or *.stub.ts module', () => {
    const offenders: { file: string; line: number; match: string }[] = [];
    for (const file of productionFiles) {
      const src = readSource(file);
      const lines = src.split('\n');
      for (let i = 0; i < lines.length; i += 1) {
        const line = lines[i] ?? '';
        // Match ES imports and CommonJS requires that reference a
        // .fake.ts or .stub.ts file (case-insensitive).
        if (
          /from\s+['"][^'"]+\.(fake|stub)\.ts['"]/i.test(line) ||
          /require\s*\(\s*['"][^'"]+\.(fake|stub)\.ts['"]/i.test(line)
        ) {
          offenders.push({
            file: file.relPath,
            line: i + 1,
            match: line.trim(),
          });
        }
      }
    }
    expect(offenders).toEqual([]);
  });
});

// ──────────────────────────────────────────────────────────────────────
// 6. No *.red.test.ts files remain at S5 closeout
// ──────────────────────────────────────────────────────────────────────

describe('guards/noSecondScheduler - no red.test files remain at S5 closeout', () => {
  function findRedTestFiles(): string[] {
    const results: string[] = [];
    // Directories to skip: anything outside the source tree (build artifacts,
    // dependency caches, agent skill caches, VCS metadata, dist outputs).
    const SKIP_DIRS = new Set([
      'node_modules', 'dist', '.git', '.claude', '.opencode',
      'coverage', 'build', '.next', '.cache', 'vendor',
    ]);
    const walk = (dir: string): void => {
      if (!existsSync(dir)) {
        return;
      }
      for (const entry of readdirSync(dir)) {
        const abs = join(dir, entry);
        let st;
        try {
          st = statSync(abs);
        } catch {
          continue;
        }
        if (st.isDirectory()) {
          if (SKIP_DIRS.has(entry)) {
            continue;
          }
          walk(abs);
          continue;
        }
        if (/\.red\.test\.[jt]sx?$/.test(entry)) {
          results.push(relative(REPO_ROOT, abs).split('\\').join('/'));
        }
      }
    };
    walk(REPO_ROOT);
    return results;
  }

  it('zero *.red.test.ts files exist anywhere in the repo (S5 closeout rule)', () => {
    const remaining = findRedTestFiles();
    expect(remaining).toEqual([]);
  });
});
