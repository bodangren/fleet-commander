import { describe, expect, test } from 'bun:test';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const REPO_ROOT = join(import.meta.dir, '..', '..', '..');

const ROOT_MANIFEST = join(REPO_ROOT, 'package.json');
const VERIFY_SH = join(REPO_ROOT, 'measure', 'verify.sh');

interface PackageJson {
  scripts?: Record<string, string>;
}

function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, 'utf8')) as T;
}

// ──────────────────────────────────────────────────────────────────────────────
// Phase 2 (package_dependency_upgrades_20260607) — Sub-task 2 (Prove the
// compatible batch — "Run pivot tests/typecheck and frontend tests/check/build").
//
// Per `test-strategy.md` § Cross-Phase Edge Cases and `spec.md` AC-7: the
// closeout gate is the exact command list in
//   bun --cwd pivot test
//   bun --cwd pivot typecheck
//   bun --cwd frontend test
//   bun --cwd frontend check
//   npm run lint
//   npm run verify
//
// This test pins the verify-runner contract that Sub-task 2 invokes. Each
// test asserts a piece of the existing runner so a future regression
// (renamed script, dropped gate, restored `npm install`, removed fake mode)
// is caught before Phase 3 lands.
// ──────────────────────────────────────────────────────────────────────────────

const EXPECTED_GATES = [
  'pivot-test',
  'convex-test',
  'frontend-test',
  'pivot-typecheck',
  'frontend-check',
  'doctor',
] as const;

describe('Phase 2 Sub-task 2: verify runner contract (AC-7)', () => {
  test('root package.json exposes a `verify` script bound to measure/verify.sh', () => {
    const root = readJson<PackageJson>(ROOT_MANIFEST);
    const verify = root.scripts?.['verify'];
    expect(verify).toBeDefined();
    // AC-7 calls for `npm run verify`; the runner must dispatch through
    // measure/verify.sh so the gate ordering stays in one place.
    expect(verify).toContain('measure/verify.sh');
  });

  test('measure/verify.sh registers the six expected gates in the AC-7 order', () => {
    expect(existsSync(VERIFY_SH)).toBe(true);
    const src = readFileSync(VERIFY_SH, 'utf8');
    // Locate the GATES=( ... ) literal — the runner keeps the gate list
    // in a single bash array, which is the source of truth for AC-7.
    const gatesMatch = src.match(/GATES=\(([^)]+)\)/);
    expect(gatesMatch).not.toBeNull();
    const declared = (gatesMatch![1]!)
      .split(/\s+/)
      .map(s => s.trim())
      .filter(Boolean);
    expect(declared).toEqual([...EXPECTED_GATES]);
  });

  test('verify.sh has a get_gate_cmd entry for every AC-7 gate', () => {
    const src = readFileSync(VERIFY_SH, 'utf8');
    for (const gate of EXPECTED_GATES) {
      // Each gate must have a case arm so the runner knows the command.
      const armRegex = new RegExp(`${gate}\\)\\s+echo\\s+`);
      expect(src).toMatch(armRegex);
    }
  });

  test('verify.sh does not use `npm install` or `npm ci` (AGENTS.md: bun only)', () => {
    const src = readFileSync(VERIFY_SH, 'utf8');
    // The repository AGENTS.md explicitly forbids npm in this project.
    // A regression that re-introduces `npm install` would break the bun
    // workspace structure.
    expect(src).not.toMatch(/\bnpm\s+install\b/);
    expect(src).not.toMatch(/\bnpm\s+ci\b/);
  });

  test('verify.sh uses `bun` (not `npm`) for pivot and frontend gates', () => {
    const src = readFileSync(VERIFY_SH, 'utf8');
    // The pivot/frontend gate commands must dispatch through bun so the
    // workspace's symlinked node_modules layout is respected.
    expect(src).toContain('bun run --cwd pivot test');
    expect(src).toContain('bun --cwd pivot typecheck');
    expect(src).toContain('bun --cwd frontend test');
    expect(src).toContain('bun --cwd frontend check');
  });

  test('verify.sh supports fake-gate mode (VERIFY_FAKE_GATE_DIR) for parallel gate tests', () => {
    const src = readFileSync(VERIFY_SH, 'utf8');
    // The fake mode is the hook the orchestrator uses to test the runner
    // itself without re-running the full pivot suite. It must dispatch
    // to a stub script in the env-provided directory.
    expect(src).toContain('VERIFY_FAKE_GATE_DIR');
    expect(src).toMatch(/if\s+\[\s+-n\s+"\$\{VERIFY_FAKE_GATE_DIR:-?\}"/);
  });

  test('verify.sh does NOT short-circuit on first gate failure (lesson: `set -e` omission)', () => {
    const src = readFileSync(VERIFY_SH, 'utf8');
    // The script deliberately omits `set -e` so a failing gate does not
    // abort the loop. The runner must continue so all gate outputs are
    // captured in a single verify run.
    expect(src).not.toMatch(/^\s*set\s+-e\b/m);
    // And the loop body must capture the exit code per-gate, not let it
    // propagate to the script-level `set -e` (which would still abort).
    expect(src).toMatch(/gate_exit=\$\?/);
  });

  test('verify.sh aggregates an OVERALL_EXIT across all gates', () => {
    const src = readFileSync(VERIFY_SH, 'utf8');
    // OVERALL_EXIT starts at 0 and is set to 1 when any gate fails.
    // A regression that drops the aggregation would make `npm run verify`
    // report PASS even when one gate failed.
    expect(src).toMatch(/OVERALL_EXIT=0/);
    expect(src).toMatch(/OVERALL_EXIT=1/);
    expect(src).toMatch(/exit\s+"\$OVERALL_EXIT"/);
  });
});
