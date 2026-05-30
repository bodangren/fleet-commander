import { describe, test, expect, beforeAll, afterAll } from 'bun:test';
import { mkdir, rm, writeFile, chmod } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { GitClient, slugify, generateBranchName, generateCommitMessage } from './client';

/**
 * Test helper that spawns a git subprocess and returns its exit code
 * @param cwd - Working directory for git command
 * @param args - Git command arguments
 * @returns Promise resolving to exit code
 */
async function runGit(cwd: string, args: string[]): Promise<{ exitCode: number }> {
  return new Promise((resolve) => {
    const proc = Bun.spawn({
      cmd: ['git', ...args],
      cwd,
      stdout: 'pipe',
      stderr: 'pipe',
    });
    proc.exited.then((exitCode) => resolve({ exitCode }));
  });
}

describe('GitClient', () => {
  const testDir = join(tmpdir(), `git-client-test-${Date.now()}`);
  let client: GitClient;

  beforeAll(async () => {
    await mkdir(testDir, { recursive: true });
    await runGit(testDir, ['init']);
    await runGit(testDir, ['config', 'user.email', 'test@example.com']);
    await runGit(testDir, ['config', 'user.name', 'Test User']);
    const readmeFile = join(testDir, 'README.md');
    await writeFile(readmeFile, '# Test Project');
    await runGit(testDir, ['add', '-A']);
    await runGit(testDir, ['commit', '-m', 'Initial commit']);
    client = new GitClient({ cwd: testDir });
  });

  afterAll(async () => {
    await rm(testDir, { recursive: true, force: true });
  });

  test('getCurrentBranch returns current branch', async () => {
    const branch = await client.getCurrentBranch();
    expect(branch).toBe('master');
  });

  test('branch creates a new branch and checks it out', async () => {
    await client.branch('feature-test');
    const branch = await client.getCurrentBranch();
    expect(branch).toBe('feature-test');
  });

  test('checkout switches to existing branch', async () => {
    await client.checkout('master');
    const branch = await client.getCurrentBranch();
    expect(branch).toBe('master');
  });

  test('stageAll stages modified files', async () => {
    const testFile = join(testDir, 'test.txt');
    await writeFile(testFile, 'hello world');
    await client.stageAll();
    const status = await client.status();
    expect(status.staged).toBe(1);
    expect(status.untracked).toBe(0);
  });

  test('commit creates a commit with message', async () => {
    const testFile = join(testDir, 'test.txt');
    await writeFile(testFile, 'hello world');
    await client.stageAll();
    await client.commit('Initial commit');
    const log = await client.getLog(1);
    expect(log).toContain('Initial commit');
  });

  test('status returns dirty true when there are changes', async () => {
    const testFile = join(testDir, 'test2.txt');
    await writeFile(testFile, 'new content');
    const status = await client.status();
    expect(status.dirty).toBe(true);
    expect(status.untracked).toBe(1);
  });

  test('status returns dirty false in clean repo', async () => {
    await client.stageAll();
    await client.commit('Clean state');
    const status = await client.status();
    expect(status.dirty).toBe(false);
  });

  test('hasChanges returns true when there are changes', async () => {
    const testFile = join(testDir, 'test3.txt');
    await writeFile(testFile, 'content');
    const hasChanges = await client.hasChanges();
    expect(hasChanges).toBe(true);
  });

  test('hasChanges returns false in clean repo', async () => {
    await client.stageAll();
    await client.commit('Add test3');
    const hasChanges = await client.hasChanges();
    expect(hasChanges).toBe(false);
  });
});

describe('slugify', () => {
  test('converts to lowercase', () => {
    expect(slugify('Hello World')).toBe('hello-world');
  });

  test('replaces spaces with hyphens', () => {
    expect(slugify('hello world test')).toBe('hello-world-test');
  });

  test('removes special characters', () => {
    expect(slugify('hello@world#test')).toBe('hello-world-test');
  });

  test('trims to 40 chars', () => {
    const long = 'a'.repeat(50);
    const result = slugify(long);
    expect(result.length).toBe(40);
  });

  test('removes leading and trailing hyphens', () => {
    expect(slugify('  hello  ')).toBe('hello');
    expect(slugify('---hello---')).toBe('hello');
  });
});

describe('generateBranchName', () => {
  test('creates branch name with task id and slugified title', () => {
    const branch = generateBranchName('123', 'Add Login Feature');
    expect(branch).toBe('fc/task-123-add-login-feature');
  });

  test('handles special characters in title', () => {
    const branch = generateBranchName('456', 'Fix Bug #123 & Improve Performance!');
    expect(branch).toBe('fc/task-456-fix-bug-123-improve-performance');
  });
});

describe('generateCommitMessage', () => {
  test('creates commit message with task id and summary', () => {
    const msg = generateCommitMessage('789', 'Added new feature');
    expect(msg).toBe('fc(task-789): Added new feature');
  });
});
