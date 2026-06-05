import { describe, test, expect } from 'bun:test';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { spawnSync } from 'child_process';

const REPO_ROOT = join(import.meta.dir, '..', '..', '..');
const ALLOWLIST_PATH = join(REPO_ROOT, 'measure', 'godfile-allowlist.txt');
const TECH_DEBT_PATH = join(REPO_ROOT, 'measure', 'tech-debt.md');
const DOCTOR_SH = join(REPO_ROOT, 'measure', 'doctor.sh');
const ORCHESTRATOR_PATH = join(
  REPO_ROOT,
  'pivot/src/orchestrator/orchestrator.ts',
);

// Heavy subprocess tests (Task 3 full-suite, Task 4 doctor boundary, and
// any future long-running gates) MUST be opted in explicitly.
//
// Why: Task 3 spawns `bun test` in pivot/, which would re-discover this very
// file and recurse indefinitely. They are also slow. They run only when
// implementers are explicitly closing Phase 4:
//
//   TD206_PHASE4_INTEGRATION=1 bun test src/orchestrator/td206_close_debt.test.ts
//
const RUN_INTEGRATION = process.env.TD206_PHASE4_INTEGRATION === '1';

function readAllowlistEntries(): string[] {
  const content = readFileSync(ALLOWLIST_PATH, 'utf-8');
  return content
    .split('\n')
    .map((line) => line.replace(/#.*/, '').trim())
    .filter((line) => line.length > 0);
}

function readSection(content: string, header: string): string {
  const start = content.indexOf(header);
  if (start === -1) return '';
  const after = content.slice(start + header.length);
  const next = after.search(/^##\s+/m);
  return next === -1 ? after : after.slice(0, next);
}

function runDoctorCheck(
  check: string,
  timeoutMs = 60_000,
): { status: number; stdout: string; stderr: string } {
  if (!existsSync(DOCTOR_SH)) {
    return { status: -1, stdout: '', stderr: `missing ${DOCTOR_SH}` };
  }
  const result = spawnSync('bash', [DOCTOR_SH, check], {
    cwd: REPO_ROOT,
    encoding: 'utf-8',
    timeout: timeoutMs,
  });
  return {
    status: result.status ?? -1,
    stdout: result.stdout ?? '',
    stderr: result.stderr ?? '',
  };
}

describe('TD-206 close: Phase 4 verification gates', () => {
  // ── Task 1: Remove orchestrator.ts from the god-file allowlist ──
  describe('Task 1: god-file allowlist cleanup', () => {
    test('orchestrator.ts is not listed in measure/godfile-allowlist.txt', () => {
      const entries = readAllowlistEntries();
      expect(entries).not.toContain(
        'pivot/src/orchestrator/orchestrator.ts',
      );
    });

    test('orchestrator.ts is below the 500-line god-file threshold', () => {
      const lineCount = readFileSync(ORCHESTRATOR_PATH, 'utf-8').split('\n')
        .length;
      expect(lineCount).toBeLessThan(500);
    });

    test.skipIf(!RUN_INTEGRATION)(
      'doctor.sh god-file exits 0 after the allowlist entry is removed',
      () => {
        const result = runDoctorCheck('god-file');
        if (result.status !== 0) {
          throw new Error(
            `doctor.sh god-file exited ${result.status}\n${result.stdout}${result.stderr}`,
          );
        }
        expect(result.status).toBe(0);
      },
      60_000,
    );
  });

  // ── Task 2: Mark TD-206 as resolved in tech-debt.md ──
  describe('Task 2: TD-206 moved to the Resolved section', () => {
    test('TD-206 is recorded in the "Resolved" section of tech-debt.md', () => {
      const content = readFileSync(TECH_DEBT_PATH, 'utf-8');
      const resolvedSection = readSection(content, '## Resolved');
      expect(resolvedSection).toMatch(/\bTD-206\b/);
    });

    test('TD-206 is no longer in the "Open Tech Debt" section of tech-debt.md', () => {
      const content = readFileSync(TECH_DEBT_PATH, 'utf-8');
      const openSection = readSection(content, '## Open Tech Debt');
      expect(openSection).not.toMatch(/\| TD-206 \|/);
    });
  });

  // ── Task 3: Pivot test + typecheck fully green ──
  // Gated behind TD206_PHASE4_INTEGRATION. The bun-test invocation would
  // otherwise re-discover this file and recurse. Run explicitly during the
  // Phase 4 closing gate.
  describe('Task 3: pivot verification suite green', () => {
    test.skipIf(!RUN_INTEGRATION)(
      'bun test in pivot/ exits 0 (full pivot suite passes)',
      () => {
        const result = spawnSync('bun', ['test'], {
          cwd: join(REPO_ROOT, 'pivot'),
          encoding: 'utf-8',
          timeout: 240_000,
        });
        if (result.status !== 0) {
          const tail = (result.stdout + result.stderr)
            .split('\n')
            .slice(-20)
            .join('\n');
          throw new Error(
            `bun test exited ${result.status} in pivot/\n${tail}`,
          );
        }
        expect(result.status).toBe(0);
      },
      300_000,
    );

    test.skipIf(!RUN_INTEGRATION)(
      'bunx tsc --noEmit in pivot/ exits 0 (typecheck green)',
      () => {
        const result = spawnSync('bunx', ['tsc', '--noEmit'], {
          cwd: join(REPO_ROOT, 'pivot'),
          encoding: 'utf-8',
          timeout: 240_000,
        });
        if (result.status !== 0) {
          const tail = (result.stdout + result.stderr)
            .split('\n')
            .slice(-20)
            .join('\n');
          throw new Error(
            `tsc --noEmit exited ${result.status} in pivot/\n${tail}`,
          );
        }
        expect(result.status).toBe(0);
      },
      300_000,
    );
  });

  // ── Task 4: build-graph updated; no boundary violations ──
  // Gated behind TD206_PHASE4_INTEGRATION (subprocess overhead).
  describe('Task 4: build-graph and boundary', () => {
    test.skipIf(!RUN_INTEGRATION)(
      'doctor.sh boundary exits 0 (no new cross-slice imports)',
      () => {
        const result = runDoctorCheck('boundary');
        if (result.status !== 0) {
          throw new Error(
            `doctor.sh boundary exited ${result.status}\n${result.stdout}${result.stderr}`,
          );
        }
        expect(result.status).toBe(0);
      },
      90_000,
    );
  });

  // ── Task 5: Commit and push ──
  // Not a behavioral test. The implementer is expected to perform the
  // closing commit and push after all four preceding tasks are [x]. The
  // commit message must reference the allowlist removal, the tech-debt
  // update, and the verification test file (this one).
});
