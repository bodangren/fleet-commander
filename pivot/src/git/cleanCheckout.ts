import { mkdtemp, rm, symlink } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

/**
 * Runs a command against a pristine checkout of a specific commit.
 *
 * A gate that runs in the working tree grades the working tree, not the commit.
 * Uncommitted edits, stray build output, and a half-applied migration all leak
 * in. `git worktree add --detach` gives the command a tree that contains
 * exactly what was committed and nothing else.
 *
 * Dependency directories are the one deliberate exception. A fresh worktree has
 * no `node_modules`, and reinstalling per gate run would cost minutes. Those
 * paths are symlinked back to the origin repo, which is safe because the gate
 * is forbidden from mutating (see `acceptanceGate.ts`).
 */

/** Directories symlinked from the origin repo so the gate does not reinstall. */
export const DEFAULT_LINKED_PATHS: readonly string[] = Object.freeze([
  'node_modules',
  'pivot/node_modules',
  'frontend/node_modules',
]);

export interface CleanCheckoutOptions {
  /** Repository the worktree is created from. */
  repoRoot: string;
  /** Commit-ish to check out. */
  commit: string;
  /** Shell command, run via `bash -lc`. */
  command: string;
  /** Hard timeout in milliseconds. */
  timeoutMs: number;
  /** Paths symlinked in from `repoRoot`. Defaults to the node_modules set. */
  linkedPaths?: readonly string[];
  /** Extra environment for the command. */
  env?: Record<string, string>;
}

export interface CleanCheckoutResult {
  exitCode: number;
  timedOut: boolean;
  durationMs: number;
  stdout: string;
  stderr: string;
  /** Resolved commit SHA the worktree was built from. */
  commit: string;
}

interface SpawnLike {
  exited: Promise<number>;
  kill: (signal?: number | NodeJS.Signals) => void;
  stdout: ReadableStream<Uint8Array> | null;
  stderr: ReadableStream<Uint8Array> | null;
}

/** Collect a stream to a string, tolerating an absent stream. */
async function drain(stream: ReadableStream<Uint8Array> | null): Promise<string> {
  if (!stream) return '';
  return await new Response(stream).text();
}

/** Run a command and capture output, returning the raw exit code. */
async function run(
  cmd: string[],
  cwd: string,
): Promise<{ exitCode: number; stdout: string; stderr: string }> {
  const proc = Bun.spawn({ cmd, cwd, stdout: 'pipe', stderr: 'pipe' }) as unknown as SpawnLike;
  const [stdout, stderr, exitCode] = await Promise.all([
    drain(proc.stdout),
    drain(proc.stderr),
    proc.exited,
  ]);
  return { exitCode, stdout, stderr };
}

/**
 * Resolve a commit-ish to a full SHA.
 * @param repoRoot - Repository to resolve within
 * @param commit - Branch, tag, or SHA
 * @returns The resolved 40-character SHA
 * @throws {Error} When the commit cannot be resolved
 */
export async function resolveCommit(
  repoRoot: string,
  commit: string,
): Promise<string> {
  const { exitCode, stdout, stderr } = await run(
    ['git', 'rev-parse', '--verify', `${commit}^{commit}`],
    repoRoot,
  );
  if (exitCode !== 0) {
    throw new Error(`Cannot resolve commit "${commit}": ${stderr.trim()}`);
  }
  return stdout.trim();
}

/**
 * Report whether one commit is reachable from another.
 * Supplies the ancestry oracle that `validateAcceptanceCommand` needs to prove
 * a gate was declared before the code it grades.
 * @param repoRoot - Repository to query
 * @param ancestor - Commit expected to come first
 * @param descendant - Commit expected to come later
 * @returns True when `ancestor` is reachable from `descendant`
 */
export async function isAncestor(
  repoRoot: string,
  ancestor: string,
  descendant: string,
): Promise<boolean> {
  const { exitCode } = await run(
    ['git', 'merge-base', '--is-ancestor', ancestor, descendant],
    repoRoot,
  );
  return exitCode === 0;
}

/**
 * Check out `commit` into a throwaway worktree and run `command` there.
 * The worktree is always removed, including when the command fails or times out.
 * @param options - Repository, commit, command, and limits
 * @returns Exit code, timing, and captured output
 * @throws {Error} When the worktree cannot be created
 */
export async function runInCleanCheckout(
  options: CleanCheckoutOptions,
): Promise<CleanCheckoutResult> {
  const repoRoot = resolve(options.repoRoot);
  const sha = await resolveCommit(repoRoot, options.commit);
  const linkedPaths = options.linkedPaths ?? DEFAULT_LINKED_PATHS;

  const parent = await mkdtemp(join(tmpdir(), 'fc-acceptance-'));
  const worktree = join(parent, 'tree');

  const added = await run(
    ['git', 'worktree', 'add', '--detach', '--quiet', worktree, sha],
    repoRoot,
  );
  if (added.exitCode !== 0) {
    await rm(parent, { recursive: true, force: true });
    throw new Error(
      `Failed to create clean checkout of ${sha}: ${added.stderr.trim()}`,
    );
  }

  try {
    for (const relative of linkedPaths) {
      const source = join(repoRoot, relative);
      if (!existsSync(source)) continue;
      const target = join(worktree, relative);
      if (existsSync(target)) continue;
      try {
        await symlink(source, target, 'dir');
      } catch {
        // A missing parent directory in the checked-out tree is not fatal —
        // the command simply runs without that dependency directory.
      }
    }

    const started = Date.now();
    const proc = Bun.spawn({
      cmd: ['bash', '-lc', options.command],
      cwd: worktree,
      stdout: 'pipe',
      stderr: 'pipe',
      env: { ...process.env, ...(options.env ?? {}) },
    }) as unknown as SpawnLike;

    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      proc.kill();
    }, options.timeoutMs);

    const [stdout, stderr, exitCode] = await Promise.all([
      drain(proc.stdout),
      drain(proc.stderr),
      proc.exited,
    ]);
    clearTimeout(timer);

    return {
      exitCode,
      timedOut,
      durationMs: Date.now() - started,
      stdout,
      stderr,
      commit: sha,
    };
  } finally {
    // Remove the worktree registration first, then the directory, so the origin
    // repo is not left with a stale entry in .git/worktrees.
    await run(['git', 'worktree', 'remove', '--force', worktree], repoRoot);
    await rm(parent, { recursive: true, force: true });
    await run(['git', 'worktree', 'prune'], repoRoot);
  }
}
