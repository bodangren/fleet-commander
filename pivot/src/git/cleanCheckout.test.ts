import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import { mkdtemp, rm, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  isAncestor,
  resolveCommit,
  runInCleanCheckout,
} from './cleanCheckout';

/**
 * These tests build a real git repository and run real commands in it. The
 * point of the module is that a gate cannot be satisfied by a dirty working
 * tree, and only a real checkout can demonstrate that.
 */

let repo: string;
let firstCommit: string;
let secondCommit: string;

async function git(args: string[], cwd = repo): Promise<string> {
  const proc = Bun.spawn({ cmd: ['git', ...args], cwd, stdout: 'pipe', stderr: 'pipe' });
  const [out, , code] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
    proc.exited,
  ]);
  if (code !== 0) throw new Error(`git ${args.join(' ')} failed`);
  return out.trim();
}

beforeAll(async () => {
  repo = await mkdtemp(join(tmpdir(), 'fc-clean-checkout-test-'));
  await git(['init', '--quiet', '-b', 'main']);
  await git(['config', 'user.email', 'test@example.com']);
  await git(['config', 'user.name', 'Test']);
  await git(['config', 'commit.gpgsign', 'false']);

  await writeFile(join(repo, 'value.txt'), 'committed\n');
  await git(['add', '.']);
  await git(['commit', '--quiet', '-m', 'first']);
  firstCommit = await git(['rev-parse', 'HEAD']);

  await writeFile(join(repo, 'second.txt'), 'second\n');
  await git(['add', '.']);
  await git(['commit', '--quiet', '-m', 'second']);
  secondCommit = await git(['rev-parse', 'HEAD']);
});

afterAll(async () => {
  if (repo) await rm(repo, { recursive: true, force: true });
});

describe('resolveCommit', () => {
  it('resolves HEAD to a full sha', async () => {
    const sha = await resolveCommit(repo, 'HEAD');
    expect(sha).toBe(secondCommit);
    expect(sha).toHaveLength(40);
  });

  it('throws on an unknown ref', async () => {
    await expect(resolveCommit(repo, 'no-such-ref')).rejects.toThrow(
      /Cannot resolve commit/,
    );
  });
});

describe('isAncestor', () => {
  it('reports a true ancestor', async () => {
    expect(await isAncestor(repo, firstCommit, secondCommit)).toBe(true);
  });

  it('rejects the reverse direction', async () => {
    expect(await isAncestor(repo, secondCommit, firstCommit)).toBe(false);
  });
});

describe('runInCleanCheckout', () => {
  it('runs a command and returns its exit code', async () => {
    const result = await runInCleanCheckout({
      repoRoot: repo,
      commit: secondCommit,
      command: 'cat value.txt',
      timeoutMs: 30_000,
    });
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('committed');
    expect(result.commit).toBe(secondCommit);
  });

  it('propagates a non-zero exit code', async () => {
    const result = await runInCleanCheckout({
      repoRoot: repo,
      commit: secondCommit,
      command: 'exit 3',
      timeoutMs: 30_000,
    });
    expect(result.exitCode).toBe(3);
    expect(result.timedOut).toBe(false);
  });

  it('checks out the requested commit, not HEAD', async () => {
    // second.txt exists at secondCommit but not at firstCommit.
    const result = await runInCleanCheckout({
      repoRoot: repo,
      commit: firstCommit,
      command: 'test -f second.txt',
      timeoutMs: 30_000,
    });
    expect(result.exitCode).not.toBe(0);
  });

  it('ignores uncommitted working-tree changes', async () => {
    // This is the property the whole module exists for: a gate must grade the
    // commit, not the developer's dirty tree.
    await writeFile(join(repo, 'value.txt'), 'DIRTY\n');
    try {
      const result = await runInCleanCheckout({
        repoRoot: repo,
        commit: secondCommit,
        command: 'cat value.txt',
        timeoutMs: 30_000,
      });
      expect(result.stdout).toContain('committed');
      expect(result.stdout).not.toContain('DIRTY');
    } finally {
      await writeFile(join(repo, 'value.txt'), 'committed\n');
    }
  });

  it('ignores untracked files in the working tree', async () => {
    await writeFile(join(repo, 'sneaky.txt'), 'not committed\n');
    try {
      const result = await runInCleanCheckout({
        repoRoot: repo,
        commit: secondCommit,
        command: 'test -f sneaky.txt',
        timeoutMs: 30_000,
      });
      expect(result.exitCode).not.toBe(0);
    } finally {
      await rm(join(repo, 'sneaky.txt'), { force: true });
    }
  });

  it('kills a command that exceeds its timeout', async () => {
    const result = await runInCleanCheckout({
      repoRoot: repo,
      commit: secondCommit,
      command: 'sleep 30',
      timeoutMs: 1_000,
    });
    expect(result.timedOut).toBe(true);
    expect(result.durationMs).toBeLessThan(20_000);
  });

  it('symlinks requested dependency directories into the checkout', async () => {
    await mkdir(join(repo, 'node_modules'), { recursive: true });
    await writeFile(join(repo, 'node_modules', 'marker.txt'), 'linked\n');
    try {
      const result = await runInCleanCheckout({
        repoRoot: repo,
        commit: secondCommit,
        command: 'cat node_modules/marker.txt',
        timeoutMs: 30_000,
      });
      expect(result.stdout).toContain('linked');
    } finally {
      await rm(join(repo, 'node_modules'), { recursive: true, force: true });
    }
  });

  it('removes the worktree even when the command fails', async () => {
    const before = await git(['worktree', 'list']);
    await runInCleanCheckout({
      repoRoot: repo,
      commit: secondCommit,
      command: 'exit 1',
      timeoutMs: 30_000,
    });
    const after = await git(['worktree', 'list']);
    expect(after.split('\n')).toHaveLength(before.split('\n').length);
  });

  it('leaves no temp directory behind', async () => {
    const result = await runInCleanCheckout({
      repoRoot: repo,
      commit: secondCommit,
      command: 'pwd',
      timeoutMs: 30_000,
    });
    const worktreePath = result.stdout.trim();
    expect(existsSync(worktreePath)).toBe(false);
  });

  it('throws on an unresolvable commit', async () => {
    await expect(
      runInCleanCheckout({
        repoRoot: repo,
        commit: 'deadbeef',
        command: 'true',
        timeoutMs: 30_000,
      }),
    ).rejects.toThrow(/Cannot resolve commit/);
  });
});
