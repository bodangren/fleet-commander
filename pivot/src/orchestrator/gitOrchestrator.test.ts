import { describe, test, expect, beforeAll, afterAll, beforeEach, vi } from 'bun:test';
import { mkdir, rm, writeFile } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import type { GitHooks } from './types';
import { createDefaultGitHooks, createAutoPushGitHooks } from './gitOrchestrator';
import { GitClient, generateBranchName, generateCommitMessage } from '../git/client';

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

describe('GitOrchestrator hooks', () => {
  const testDir = join(tmpdir(), `git-orch-test-${Date.now()}`);

  beforeAll(async () => {
    await mkdir(testDir, { recursive: true });
    await runGit(testDir, ['init']);
    await runGit(testDir, ['config', 'user.email', 'test@example.com']);
    await runGit(testDir, ['config', 'user.name', 'Test User']);
    const readmeFile = join(testDir, 'README.md');
    await writeFile(readmeFile, '# Test Project');
    await runGit(testDir, ['add', '-A']);
    await runGit(testDir, ['commit', '-m', 'Initial commit']);
  });

  afterAll(async () => {
    await rm(testDir, { recursive: true, force: true });
  });

  describe('createDefaultGitHooks', () => {
    let hooks: GitHooks;

    beforeEach(async () => {
      const client = new GitClient({ cwd: testDir });
      await client.checkout('master');
      hooks = createDefaultGitHooks();
    });

    test('onTaskStart creates a branch', async () => {
      const result = await hooks.onTaskStart!(
        'test-project',
        testDir,
        '123',
        'Test Task Title',
      );
      expect(result.branchName).toBe('fc/task-123-test-task-title');
      const client = new GitClient({ cwd: testDir });
      const branch = await client.getCurrentBranch();
      expect(branch).toBe('fc/task-123-test-task-title');
    });

    test('onTaskComplete commits changes when there are changes', async () => {
      const client = new GitClient({ cwd: testDir });
      await client.checkout('master');
      await client.branch('test-branch');
      
      const testFile = join(testDir, 'test.txt');
      await writeFile(testFile, 'hello world');
      
      await hooks.onTaskComplete!(
        'test-project',
        testDir,
        '456',
        'Another Task',
        true,
      );
      
      const log = await client.getLog(1);
      expect(log).toContain('fc(task-456): Another Task');
    });

    test('onTaskComplete skips commit when success is false', async () => {
      const client = new GitClient({ cwd: testDir });
      await client.checkout('master');
      await client.branch('test-branch-fail');
      
      const testFile = join(testDir, 'test-fail.txt');
      await writeFile(testFile, 'hello world');
      
      const result = await hooks.onTaskComplete!(
        'test-project',
        testDir,
        '789',
        'Failed Task',
        false,
      );
      
      expect(result).toBeUndefined();
      const log = await client.getLog(5);
      expect(log).not.toContain('fc(task-789): Failed Task');
    });

    test('onTaskComplete skips commit when no changes', async () => {
      const client = new GitClient({ cwd: testDir });
      await client.checkout('master');
      await client.branch('test-branch-clean');
      
      const result = await hooks.onTaskComplete!(
        'test-project',
        testDir,
        '999',
        'Clean Task',
        true,
      );
      
      expect(result).toBeUndefined();
    });

    test('onTaskCommit creates commit with summary', async () => {
      const client = new GitClient({ cwd: testDir });
      await client.checkout('master');
      await client.branch('test-commit-hook');
      
      const testFile = join(testDir, 'commit-test.txt');
      await writeFile(testFile, 'content');
      
      const result = await hooks.onTaskCommit!(
        'test-project',
        testDir,
        '111',
        'Updated something',
      );
      
      expect(result.commitHash).toBeTruthy();
      const log = await client.getLog(1);
      expect(log).toContain('fc(task-111): Updated something');
    });
  });

  describe('createAutoPushGitHooks', () => {
    test('autoPush hooks push after commit', async () => {
      const hooks = createAutoPushGitHooks(true);
      
      const client = new GitClient({ cwd: testDir });
      await client.checkout('master');
      
      const testFile = join(testDir, 'auto-push-test.txt');
      await writeFile(testFile, 'auto push content');
      
      await hooks.onTaskComplete!(
        'test-project',
        testDir,
        '222',
        'Auto Push Task',
        true,
      );
    });
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