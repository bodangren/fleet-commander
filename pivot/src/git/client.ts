import { runCommand } from '../shared/commandRunner';
import { createPRClient, type Provider } from '../pr/factory';

/**
 * Error thrown when a merge operation reports a conflict.
 * Caller can inspect `stderr` for the raw git output.
 */
export class MergeConflictError extends Error {
  readonly code = 'CONFLICT' as const;
  readonly stderr: string;
  constructor(message: string, stderr: string) {
    super(message);
    this.name = 'MergeConflictError';
    this.stderr = stderr;
  }
}

/**
 * Validates that a branch name is safe for git operations.
 * Rejects names with shell metacharacters, path traversal, or empty strings.
 * @param name - The branch name to validate
 * @throws {Error} If the branch name is invalid
 */
export function validateBranchName(name: string): void {
  if (!name || !name.trim()) {
    throw new Error('Branch name must not be empty');
  }
  if (/[;&|`$(){}!<>]/.test(name)) {
    throw new Error(`Branch name contains invalid characters: ${name}`);
  }
  if (name.includes('..')) {
    throw new Error(`Branch name must not contain '..': ${name}`);
  }
}

export interface GitStatus {
  branch: string;
  dirty: boolean;
  ahead: number;
  behind: number;
  staged: number;
  modified: number;
  untracked: number;
}

export interface GitClientOptions {
  cwd?: string;
  prProvider?: Provider;
}

export class GitClient {
  private cwd: string;
  private prProvider: Provider;

  constructor(options: GitClientOptions = {}) {
    this.cwd = options.cwd || process.cwd();
    this.prProvider = options.prProvider ?? 'github';
  }

  private async run(args: string[]): Promise<{ stdout: string; stderr: string; exitCode: number }> {
    return runCommand('git', args, this.cwd);
  }

  async branch(name: string, base: string = 'HEAD'): Promise<void> {
    const args = base.startsWith('-') ? ['checkout', '-b', name, '--', base] : ['checkout', '-b', name, base];
    const { exitCode, stderr } = await this.run(args);
    if (exitCode !== 0) {
      throw new Error(`Failed to create branch: ${stderr}`);
    }
  }

  async checkout(branchName: string): Promise<void> {
    const { exitCode, stderr } = await this.run(['checkout', branchName]);
    if (exitCode !== 0) {
      throw new Error(`Failed to checkout branch: ${stderr}`);
    }
  }

  async stageAll(): Promise<void> {
    const { exitCode, stderr } = await this.run(['add', '-A']);
    if (exitCode !== 0) {
      throw new Error(`Failed to stage files: ${stderr}`);
    }
  }

  async commit(message: string): Promise<void> {
    const { exitCode, stderr } = await this.run(['commit', '-m', message]);
    if (exitCode !== 0) {
      throw new Error(`Failed to commit: ${stderr}`);
    }
  }

  async push(remote: string = 'origin', branch?: string): Promise<void> {
    const branchName = branch || (await this.getCurrentBranch());
    const { exitCode, stderr } = await this.run(['push', remote, branchName]);
    if (exitCode !== 0) {
      throw new Error(`Failed to push: ${stderr}`);
    }
  }

  async deleteBranch(branchName: string, force: boolean = false): Promise<void> {
    const flag = force ? '-D' : '-d';
    const { exitCode, stderr } = await this.run(['branch', flag, branchName]);
    if (exitCode !== 0) {
      throw new Error(`Failed to delete branch: ${stderr}`);
    }
  }

  async deleteRemoteBranch(remote: string = 'origin', branchName: string): Promise<void> {
    const { exitCode, stderr } = await this.run(['push', remote, '--delete', branchName]);
    if (exitCode !== 0) {
      throw new Error(`Failed to delete remote branch: ${stderr}`);
    }
  }

  /**
   * Merges `sourceBranch` into `targetBranch` using the requested strategy.
   *
   * Performs `git checkout {targetBranch}` then `git merge {flag} {sourceBranch}`,
   * where the flag is `--squash` for the `'squash'` strategy or `--no-ff` for the
   * `'no-ff'` strategy. For squash merges, this call only stages the changes —
   * the caller must invoke `commit()` afterward to produce the merge commit.
   *
   * @param opts.sourceBranch - The feature branch whose commits will be merged in.
   * @param opts.targetBranch - The destination branch (e.g. `'main'`).
   * @param opts.strategy - `'squash'` for squash-and-commit-later, `'no-ff'` for
   *   a true merge commit.
   * @returns The exit code and captured stderr from the underlying `git merge` call.
   * @throws {TypeError} If `strategy` is not `'squash'` or `'no-ff'`.
   * @throws {MergeConflictError} If git reports a merge conflict (exit code 1 with
   *   stderr containing `"CONFLICT"`).
   * @throws {Error} For any other non-zero exit from `git checkout` or `git merge`.
   */
  async merge(opts: {
    sourceBranch: string;
    targetBranch: string;
    strategy: 'squash' | 'no-ff';
  }): Promise<{ exitCode: number; stderr: string }> {
    if (opts.strategy !== 'squash' && opts.strategy !== 'no-ff') {
      throw new TypeError(`Invalid merge strategy: ${String(opts.strategy)}`);
    }
    validateBranchName(opts.sourceBranch);
    validateBranchName(opts.targetBranch);

    const checkoutResult = await this.run(['checkout', opts.targetBranch]);
    if (checkoutResult.exitCode !== 0) {
      throw new Error(`Failed to checkout ${opts.targetBranch}: ${checkoutResult.stderr}`);
    }

    const flag = opts.strategy === 'squash' ? '--squash' : '--no-ff';
    const mergeResult = await this.run(['merge', flag, opts.sourceBranch]);
    if (mergeResult.exitCode !== 0) {
      if (/CONFLICT/i.test(mergeResult.stderr) || mergeResult.exitCode === 1) {
        throw new MergeConflictError(
          `Merge conflict while merging ${opts.sourceBranch} into ${opts.targetBranch}`,
          mergeResult.stderr,
        );
      }
      throw new Error(`Failed to merge ${opts.sourceBranch} into ${opts.targetBranch}: ${mergeResult.stderr}`);
    }
    return { exitCode: mergeResult.exitCode, stderr: mergeResult.stderr };
  }

  async getCurrentBranch(): Promise<string> {
    const { stdout, exitCode, stderr } = await this.run(['rev-parse', '--abbrev-ref', 'HEAD']);
    if (exitCode !== 0) {
      throw new Error(`Failed to get current branch: ${stderr}`);
    }
    return stdout.trim();
  }

  async getCurrentRef(): Promise<string> {
    const { stdout, exitCode, stderr } = await this.run(['rev-parse', 'HEAD']);
    if (exitCode !== 0) {
      throw new Error(`Failed to get current ref: ${stderr}`);
    }
    return stdout.trim();
  }

  async status(): Promise<GitStatus> {
    const { stdout: statusOutput, exitCode } = await this.run(['status', '--porcelain']);
    if (exitCode !== 0) {
      throw new Error('Failed to get git status');
    }

    const { stdout: branchOutput } = await this.run(['rev-parse', '--abbrev-ref', 'HEAD']);
    const branch = branchOutput.trim() || 'HEAD';

    const { stdout: revListOutput } = await this.run([
      'rev-list',
      '--left-right',
      '--count',
      `${branch}...@{upstream}`,
    ]);

    let ahead = 0;
    let behind = 0;
    const parts = revListOutput.trim().split('\t');
    if (parts.length === 2) {
      ahead = parseInt(parts[0], 10) || 0;
      behind = parseInt(parts[1], 10) || 0;
    }

    let staged = 0;
    let modified = 0;
    let untracked = 0;

    for (const line of statusOutput.split('\n')) {
      if (!line.trim()) continue;
      const indexStatus = line[0];
      const workTreeStatus = line[1];

      if (indexStatus === '?' && workTreeStatus === '?') {
        untracked++;
      } else {
        if (indexStatus !== ' ' && indexStatus !== '?') staged++;
        if (workTreeStatus !== ' ' && workTreeStatus !== '?') modified++;
      }
    }

    return {
      branch,
      dirty: statusOutput.trim().length > 0,
      ahead,
      behind,
      staged,
      modified,
      untracked,
    };
  }

  async hasChanges(): Promise<boolean> {
    const { stdout, exitCode } = await this.run(['status', '--porcelain']);
    return exitCode === 0 && stdout.trim().length > 0;
  }

  async verifyCleanWorktree(): Promise<{ clean: boolean; dirtyFiles: string[] }> {
    const { stdout, exitCode } = await this.run(['status', '--porcelain']);
    if (exitCode !== 0) {
      throw new Error('Failed to check worktree status');
    }
    const dirtyFiles = stdout
      .split('\n')
      .filter((l) => l.trim())
      .map((l) => l.slice(3).trim());
    return { clean: dirtyFiles.length === 0, dirtyFiles };
  }

  async getLog(maxCount: number = 10): Promise<string> {
    const { stdout, exitCode } = await this.run(['log', `--max-count=${maxCount}`, '--oneline']);
    if (exitCode !== 0) {
      return '';
    }
    return stdout;
  }

  async createPR(title: string, body: string, branch: string, draft: boolean = true): Promise<string> {
    validateBranchName(branch);
    const prClient = createPRClient(this.prProvider, this.cwd);
    const pr = await prClient.create({ title, body, branch, draft });
    return pr.url;
  }
}

/**
 * Converts text to URL-safe lowercase slug with max 40 chars
 * @param text - The text to slugify
 * @returns URL-safe slug string
 */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
}

/**
 * Generates a feature branch name from task ID and title (e.g. fc/task-123-add-login-feature)
 * @param taskId - The task ID
 * @param taskTitle - The task title
 * @returns The formatted branch name
 */
export function generateBranchName(taskId: string, taskTitle: string): string {
  const slug = slugify(taskTitle);
  return `fc/task-${taskId}-${slug}`;
}

/**
 * Creates a commit message with task ID prefix (e.g. fc(task-123): summary)
 * @param taskId - The task ID
 * @param summary - The commit summary
 * @param trackId - Optional track ID for the prefix
 * @returns The formatted commit message
 */
export function generateCommitMessage(
  taskId: string,
  summary: string,
  trackId?: string,
): string {
  const prefix = trackId ? `fc(${trackId}, task-${taskId})` : `fc(task-${taskId})`;
  return `${prefix}: ${summary}`.slice(0, 72);
}
