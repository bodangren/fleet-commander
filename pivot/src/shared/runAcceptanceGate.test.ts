import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { runAcceptanceGate, toEvidenceRecord } from './runAcceptanceGate';
import { gradeAcceptanceRun } from './acceptanceGate';

/**
 * End-to-end gate behavior against a real repository. The distinction these
 * tests protect is `rejected` (the gate itself is unusable) versus `failed`
 * (the code is wrong). Collapsing the two is how a track gets marked complete
 * without evidence.
 */

let repo: string;
let declareCommit: string;
let implCommit: string;

async function git(args: string[]): Promise<string> {
  const proc = Bun.spawn({ cmd: ['git', ...args], cwd: repo, stdout: 'pipe', stderr: 'pipe' });
  const [out, , code] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
    proc.exited,
  ]);
  if (code !== 0) throw new Error(`git ${args.join(' ')} failed`);
  return out.trim();
}

function declaration(overrides: Record<string, unknown> = {}) {
  return {
    command: 'test -f feature.txt',
    expectExitCode: 0,
    timeoutMs: 30_000,
    declaredAt: Date.now(),
    declaredAtCommit: declareCommit,
    ...overrides,
  };
}

beforeAll(async () => {
  repo = await mkdtemp(join(tmpdir(), 'fc-gate-test-'));
  await git(['init', '--quiet', '-b', 'main']);
  await git(['config', 'user.email', 'test@example.com']);
  await git(['config', 'user.name', 'Test']);
  await git(['config', 'commit.gpgsign', 'false']);

  // The gate is declared here, before any implementation exists.
  await writeFile(join(repo, 'spec.md'), '# spec\n');
  await git(['add', '.']);
  await git(['commit', '--quiet', '-m', 'declare gate']);
  declareCommit = await git(['rev-parse', 'HEAD']);

  // Implementation lands afterwards.
  await writeFile(join(repo, 'feature.txt'), 'done\n');
  await git(['add', '.']);
  await git(['commit', '--quiet', '-m', 'implement']);
  implCommit = await git(['rev-parse', 'HEAD']);
});

afterAll(async () => {
  if (repo) await rm(repo, { recursive: true, force: true });
});

describe('runAcceptanceGate', () => {
  it('passes when the declared command succeeds on the implementation commit', async () => {
    const outcome = await runAcceptanceGate({
      repoRoot: repo,
      commit: implCommit,
      declaration: declaration(),
      firstImplementationCommit: implCommit,
    });
    expect(outcome.status).toBe('passed');
    if (outcome.status === 'passed') {
      expect(outcome.verdict.evidence.commit).toBe(implCommit);
    }
  });

  it('fails when the command is red at that commit', async () => {
    const outcome = await runAcceptanceGate({
      repoRoot: repo,
      commit: declareCommit,
      declaration: declaration(),
      firstImplementationCommit: implCommit,
    });
    // feature.txt does not exist at the declaration commit.
    expect(outcome.status).toBe('failed');
    if (outcome.status === 'failed') {
      expect(outcome.verdict.passed).toBe(false);
      expect(outcome.verdict.evidence.actualExitCode).not.toBe(0);
    }
  });

  it('rejects an absent declaration rather than treating it as a pass', async () => {
    const outcome = await runAcceptanceGate({
      repoRoot: repo,
      commit: implCommit,
      declaration: undefined,
    });
    expect(outcome.status).toBe('rejected');
    if (outcome.status === 'rejected') expect(outcome.code).toBe('missing');
  });

  it('rejects a trivially passing declaration', async () => {
    const outcome = await runAcceptanceGate({
      repoRoot: repo,
      commit: implCommit,
      declaration: declaration({ command: 'true' }),
    });
    expect(outcome.status).toBe('rejected');
    if (outcome.status === 'rejected') expect(outcome.code).toBe('trivial');
  });

  it('rejects a declaration written after the implementation', async () => {
    const outcome = await runAcceptanceGate({
      repoRoot: repo,
      commit: implCommit,
      declaration: declaration({ declaredAtCommit: implCommit }),
      firstImplementationCommit: declareCommit,
    });
    expect(outcome.status).toBe('rejected');
    if (outcome.status === 'rejected') {
      expect(outcome.code).toBe('declared_too_late');
    }
  });

  it('treats an unresolvable declaration commit as declared too late', async () => {
    const outcome = await runAcceptanceGate({
      repoRoot: repo,
      commit: implCommit,
      declaration: declaration({ declaredAtCommit: 'deadbeefdeadbeef' }),
      firstImplementationCommit: implCommit,
    });
    expect(outcome.status).toBe('rejected');
    if (outcome.status === 'rejected') {
      expect(outcome.code).toBe('declared_too_late');
    }
  });

  it('skips ordering when no implementation commit is supplied', async () => {
    const outcome = await runAcceptanceGate({
      repoRoot: repo,
      commit: implCommit,
      declaration: declaration({ declaredAtCommit: 'whatever' }),
    });
    expect(outcome.status).toBe('passed');
  });

  it('does not let a dirty working tree satisfy the gate', async () => {
    // Create the file only in the working tree, never committed.
    await writeFile(join(repo, 'phantom.txt'), 'uncommitted\n');
    try {
      const outcome = await runAcceptanceGate({
        repoRoot: repo,
        commit: implCommit,
        declaration: declaration({ command: 'test -f phantom.txt' }),
        firstImplementationCommit: implCommit,
      });
      expect(outcome.status).toBe('failed');
    } finally {
      await rm(join(repo, 'phantom.txt'), { force: true });
    }
  });
});

describe('toEvidenceRecord', () => {
  it('carries the verdict and a timestamp', () => {
    const verdict = gradeAcceptanceRun(
      {
        command: 'bun test',
        expectExitCode: 0,
        timeoutMs: 1000,
        declaredAt: 1,
        declaredAtCommit: 'aaa',
      },
      {
        exitCode: 1,
        timedOut: false,
        durationMs: 5,
        commit: 'bbb',
        stdout: '',
        stderr: '',
      },
    );
    const record = toEvidenceRecord(verdict);
    expect(record.passed).toBe(false);
    expect(record.commit).toBe('bbb');
    expect(record.declaredAtCommit).toBe('aaa');
    expect(record.recordedAt).toBeGreaterThan(0);
    expect(record.reason).toContain('exited 1');
  });
});
