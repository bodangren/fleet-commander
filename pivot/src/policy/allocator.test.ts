import { describe, expect, it } from 'bun:test';
import {
  canAdmit,
  type AllocationPolicy,
  type AllocationContext,
  type TaskDescriptor,
} from './allocator';

/**
 * Creates test task with defaults for allocator tests.
 * @param overrides - Partial task overrides
 * @returns TaskDescriptor with defaults applied
 */
function makeTask(overrides: Partial<TaskDescriptor> = {}): TaskDescriptor {
  return {
    id: 'task-1',
    taskClass: 'feature',
    repoId: 'repo-1',
    harnessName: 'opencode',
    createdAt: Date.now(),
    ...overrides,
  };
}

/**
 * Creates test allocation context with defaults.
 * @param overrides - Partial context overrides
 * @returns AllocationContext with defaults applied
 */
function makeContext(overrides: Partial<AllocationContext> = {}): AllocationContext {
  return {
    runningTasks: [],
    worktrees: {},
    ...overrides,
  };
}

describe('canAdmit admission controller', () => {
  describe('per-repo concurrency', () => {
    it('admits task when repo has no running tasks', () => {
      const policy: AllocationPolicy = {
        perRepoConcurrency: { 'repo-1': 2 },
        globalConcurrency: 10,
        budgetPacing: 0,
        affinity: [],
        antiAffinity: [],
      };
      const task = makeTask({ repoId: 'repo-1' });
      const context = makeContext({ runningTasks: [] });

      const result = canAdmit(task, policy, context);

      expect(result.admit).toBe(true);
    });

    it('admits task when repo has running tasks below cap', () => {
      const policy: AllocationPolicy = {
        perRepoConcurrency: { 'repo-1': 2 },
        globalConcurrency: 10,
        budgetPacing: 0,
        affinity: [],
        antiAffinity: [],
      };
      const task = makeTask({ id: 'task-2', repoId: 'repo-1' });
      const context = makeContext({
        runningTasks: [makeTask({ id: 'task-1', repoId: 'repo-1' })],
      });

      const result = canAdmit(task, policy, context);

      expect(result.admit).toBe(true);
    });

    it('rejects task when repo is at concurrency cap', () => {
      const policy: AllocationPolicy = {
        perRepoConcurrency: { 'repo-1': 2 },
        globalConcurrency: 10,
        budgetPacing: 0,
        affinity: [],
        antiAffinity: [],
      };
      const task = makeTask({ id: 'task-3', repoId: 'repo-1' });
      const context = makeContext({
        runningTasks: [
          makeTask({ id: 'task-1', repoId: 'repo-1' }),
          makeTask({ id: 'task-2', repoId: 'repo-1' }),
        ],
      });

      const result = canAdmit(task, policy, context);

      expect(result.admit).toBe(false);
      expect(result.reason).toContain('repo');
    });

    it('allows task for repo with no specific limit when other repos are capped', () => {
      const policy: AllocationPolicy = {
        perRepoConcurrency: { 'repo-1': 1 },
        globalConcurrency: 10,
        budgetPacing: 0,
        affinity: [],
        antiAffinity: [],
      };
      const task = makeTask({ id: 'task-2', repoId: 'repo-2' });
      const context = makeContext({
        runningTasks: [makeTask({ id: 'task-1', repoId: 'repo-1' })],
      });

      const result = canAdmit(task, policy, context);

      expect(result.admit).toBe(true);
    });
  });

  describe('global concurrency', () => {
    it('admits task when global concurrency not exceeded', () => {
      const policy: AllocationPolicy = {
        perRepoConcurrency: {},
        globalConcurrency: 5,
        budgetPacing: 0,
        affinity: [],
        antiAffinity: [],
      };
      const task = makeTask();
      const context = makeContext({
        runningTasks: [makeTask({ id: 'task-1' }), makeTask({ id: 'task-2' })],
      });

      const result = canAdmit(task, policy, context);

      expect(result.admit).toBe(true);
    });

    it('rejects task when global concurrency limit reached', () => {
      const policy: AllocationPolicy = {
        perRepoConcurrency: {},
        globalConcurrency: 2,
        budgetPacing: 0,
        affinity: [],
        antiAffinity: [],
      };
      const task = makeTask({ id: 'task-3' });
      const context = makeContext({
        runningTasks: [makeTask({ id: 'task-1' }), makeTask({ id: 'task-2' })],
      });

      const result = canAdmit(task, policy, context);

      expect(result.admit).toBe(false);
      expect(result.reason).toContain('global');
    });
  });

  describe('worktree availability', () => {
    it('admits task when no worktree required', () => {
      const policy: AllocationPolicy = {
        perRepoConcurrency: {},
        globalConcurrency: 5,
        budgetPacing: 0,
        affinity: [],
        antiAffinity: [],
      };
      const task = makeTask();
      const context = makeContext({ runningTasks: [] });

      const result = canAdmit(task, policy, context);

      expect(result.admit).toBe(true);
    });

    it('admits task when required worktree is available', () => {
      const policy: AllocationPolicy = {
        perRepoConcurrency: {},
        globalConcurrency: 5,
        budgetPacing: 0,
        affinity: [],
        antiAffinity: [],
      };
      const task = makeTask({ worktreeBranch: 'feature/new-feature' });
      const context = makeContext({
        runningTasks: [],
        worktrees: { 'feature/new-feature': { repoId: 'repo-1', status: 'available' } },
      });

      const result = canAdmit(task, policy, context);

      expect(result.admit).toBe(true);
    });

    it('rejects task when required worktree is in use', () => {
      const policy: AllocationPolicy = {
        perRepoConcurrency: {},
        globalConcurrency: 5,
        budgetPacing: 0,
        affinity: [],
        antiAffinity: [],
      };
      const task = makeTask({ id: 'task-2', worktreeBranch: 'feature/new-feature' });
      const context = makeContext({
        runningTasks: [makeTask({ id: 'task-1', worktreeBranch: 'feature/new-feature' })],
        worktrees: { 'feature/new-feature': { repoId: 'repo-1', status: 'in_use' } },
      });

      const result = canAdmit(task, policy, context);

      expect(result.admit).toBe(false);
      expect(result.reason).toContain('worktree');
    });
  });

  describe('anti-affinity hard filter', () => {
    it('admits task when no anti-affinity rules match', () => {
      const policy: AllocationPolicy = {
        perRepoConcurrency: {},
        globalConcurrency: 5,
        budgetPacing: 0,
        affinity: [],
        antiAffinity: [{ ifTask: 'chore:*', avoidHarness: 'opencode' }],
      };
      const task = makeTask({ taskClass: 'feature', harnessName: 'opencode' });
      const context = makeContext({ runningTasks: [] });

      const result = canAdmit(task, policy, context);

      expect(result.admit).toBe(true);
    });

    it('rejects task when anti-affinity rule matches', () => {
      const policy: AllocationPolicy = {
        perRepoConcurrency: {},
        globalConcurrency: 5,
        budgetPacing: 0,
        affinity: [],
        antiAffinity: [{ ifTask: 'chore:*', avoidHarness: 'opencode' }],
      };
      const task = makeTask({ taskClass: 'chore', harnessName: 'opencode' });
      const context = makeContext({
        runningTasks: [makeTask({ id: 'task-1', taskClass: 'feature', harnessName: 'opencode' })],
      });

      const result = canAdmit(task, policy, context);

      expect(result.admit).toBe(false);
      expect(result.reason).toContain('anti-affinity');
    });
  });
});
