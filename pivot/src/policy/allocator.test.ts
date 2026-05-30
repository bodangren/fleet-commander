import { describe, expect, it, beforeEach, afterEach } from 'bun:test';
import { writeFileSync, mkdirSync, rmSync, existsSync } from 'fs';
import { join } from 'path';
import {
  loadAllocationPolicy,
  watchAllocationPolicy,
  unwatchAllocationPolicy,
  AllocationPolicy,
  canAdmit,
  AllocationContext,
  TaskDescriptor,
  WorktreeManager,
  WorktreeLease,
  DispatchPacer,
} from './allocator';

const TEST_ALLOC_DIR = join(process.cwd(), 'test-alloc');

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

describe('allocator - allocation.yml parser', () => {
  beforeEach(() => {
    mkdirSync(TEST_ALLOC_DIR, { recursive: true });
  });

  afterEach(() => {
    rmSync(TEST_ALLOC_DIR, { recursive: true, force: true });
    unwatchAllocationPolicy();
  });

  describe('loadAllocationPolicy', () => {
    it('loads a valid allocation.yml with all fields', () => {
      const yaml = `
perRepoConcurrency:
  repo-1: 2
  repo-2: 4
globalConcurrency: 10
budgetPacing: 5000
affinity:
  - ifTask: "feature:*"
    preferHarness: opencode
  - ifTask: "bug:*"
    preferHarness: reviewer
antiAffinity:
  - ifTask: "chore:*"
    avoidHarness: opencode
`;
      const filePath = join(TEST_ALLOC_DIR, 'allocation.yml');
      writeFileSync(filePath, yaml);

      const result = loadAllocationPolicy(filePath);
      expect(result).not.toBeNull();
      expect(result!.perRepoConcurrency).toEqual({ 'repo-1': 2, 'repo-2': 4 });
      expect(result!.globalConcurrency).toBe(10);
      expect(result!.budgetPacing).toBe(5000);
      expect(result!.affinity).toHaveLength(2);
      expect(result!.antiAffinity).toHaveLength(1);
    });

    it('loads allocation.yml with minimal fields using defaults', () => {
      const yaml = `
perRepoConcurrency: {}
globalConcurrency: 5
`;
      const filePath = join(TEST_ALLOC_DIR, 'minimal.yml');
      writeFileSync(filePath, yaml);

      const result = loadAllocationPolicy(filePath);
      expect(result).not.toBeNull();
      expect(result!.globalConcurrency).toBe(5);
      expect(result!.budgetPacing).toBe(0);
      expect(result!.affinity).toEqual([]);
      expect(result!.antiAffinity).toEqual([]);
    });

    it('returns null for invalid YAML syntax', () => {
      const yaml = `
perRepoConcurrency:
  invalid yaml here
    missing indent
`;
      const filePath = join(TEST_ALLOC_DIR, 'invalid-syntax.yml');
      writeFileSync(filePath, yaml);

      const result = loadAllocationPolicy(filePath);
      expect(result).toBeNull();
    });

    it('returns null for schema validation failure', () => {
      const yaml = `
perRepoConcurrency: "not-a-map"
globalConcurrency: -1
`;
      const filePath = join(TEST_ALLOC_DIR, 'invalid-schema.yml');
      writeFileSync(filePath, yaml);

      const result = loadAllocationPolicy(filePath);
      expect(result).toBeNull();
    });

    it('returns null for malformed affinity rule', () => {
      const yaml = `
perRepoConcurrency: {}
globalConcurrency: 5
affinity:
  - ifTask: 123
    preferHarness: opencode
`;
      const filePath = join(TEST_ALLOC_DIR, 'malformed-affinity.yml');
      writeFileSync(filePath, yaml);

      const result = loadAllocationPolicy(filePath);
      expect(result).toBeNull();
    });

    it('returns null for malformed anti-affinity rule', () => {
      const yaml = `
perRepoConcurrency: {}
globalConcurrency: 5
antiAffinity:
  - ifTask: "feature:*"
    avoidHarness: 999
`;
      const filePath = join(TEST_ALLOC_DIR, 'malformed-antiaffinity.yml');
      writeFileSync(filePath, yaml);

      const result = loadAllocationPolicy(filePath);
      expect(result).toBeNull();
    });
  });

  describe('watchAllocationPolicy', () => {
    it('calls onChange when file is modified', async () => {
      const yaml = `
perRepoConcurrency: {}
globalConcurrency: 5
`;
      const filePath = join(TEST_ALLOC_DIR, 'watch.yml');
      writeFileSync(filePath, yaml);

      let changeCount = 0;
      const policyHolder: { policy: AllocationPolicy | null } = { policy: null };

      watchAllocationPolicy(filePath, (policy) => {
        changeCount++;
        policyHolder.policy = policy as AllocationPolicy;
      });

      await new Promise((resolve) => setTimeout(resolve, 1100));

      writeFileSync(filePath, yaml.replace('globalConcurrency: 5', 'globalConcurrency: 10'));

      await new Promise((resolve) => setTimeout(resolve, 1100));

      expect(changeCount).toBeGreaterThan(0);
      expect(policyHolder.policy?.globalConcurrency).toBe(10);
    });
  });
});

describe('allocator - canAdmit admission controller', () => {
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

    it('rejects task when same harness is already running matching task', () => {
      const policy: AllocationPolicy = {
        perRepoConcurrency: {},
        globalConcurrency: 5,
        budgetPacing: 0,
        affinity: [],
        antiAffinity: [{ ifTask: 'bug:*', avoidHarness: 'reviewer' }],
      };
      const task = makeTask({ id: 'task-2', taskClass: 'bug', harnessName: 'reviewer' });
      const context = makeContext({
        runningTasks: [makeTask({ id: 'task-1', taskClass: 'bug', harnessName: 'reviewer' })],
      });

      const result = canAdmit(task, policy, context);

      expect(result.admit).toBe(false);
    });
  });

  describe('combined constraints', () => {
    it('admits task when all constraints satisfied', () => {
      const policy: AllocationPolicy = {
        perRepoConcurrency: { 'repo-1': 3 },
        globalConcurrency: 10,
        budgetPacing: 0,
        affinity: [{ ifTask: 'feature:*', preferHarness: 'opencode' }],
        antiAffinity: [],
      };
      const task = makeTask({ taskClass: 'feature', repoId: 'repo-1', harnessName: 'opencode' });
      const context = makeContext({
        runningTasks: [makeTask({ id: 'task-1', repoId: 'repo-1' })],
      });

      const result = canAdmit(task, policy, context);

      expect(result.admit).toBe(true);
    });

    it('rejects task if any single constraint fails', () => {
      const policy: AllocationPolicy = {
        perRepoConcurrency: { 'repo-1': 1 },
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

      expect(result.admit).toBe(false);
    });
  });
});

describe('allocator - WorktreeManager', () => {
  const LEAK_TIMEOUT_MS = 5 * 60 * 1000;

  function makeLease(overrides: Partial<WorktreeLease> = {}): WorktreeLease {
    return {
      branch: 'feature/test',
      repoId: 'repo-1',
      taskId: 'task-1',
      acquiredAt: Date.now(),
      lastHeartbeat: Date.now(),
      ...overrides,
    };
  }

  describe('allocate', () => {
    it('allocates an available worktree', () => {
      const manager = new WorktreeManager(LEAK_TIMEOUT_MS);
      const lease = manager.allocate('feature/new', 'repo-1', 'task-1');

      expect(lease).not.toBeNull();
      expect(lease!.branch).toBe('feature/new');
      expect(lease!.repoId).toBe('repo-1');
      expect(lease!.taskId).toBe('task-1');
    });

    it('returns null when worktree is already in use', () => {
      const manager = new WorktreeManager(LEAK_TIMEOUT_MS);
      manager.allocate('feature/new', 'repo-1', 'task-1');

      const secondLease = manager.allocate('feature/new', 'repo-1', 'task-2');

      expect(secondLease).toBeNull();
    });

    it('allocates different branches independently', () => {
      const manager = new WorktreeManager(LEAK_TIMEOUT_MS);
      manager.allocate('feature/new', 'repo-1', 'task-1');

      const secondLease = manager.allocate('feature/other', 'repo-1', 'task-2');

      expect(secondLease).not.toBeNull();
    });

    it('tracks multiple leases across different repos', () => {
      const manager = new WorktreeManager(LEAK_TIMEOUT_MS);
      manager.allocate('feature/new', 'repo-1', 'task-1');
      manager.allocate('feature/new', 'repo-2', 'task-2');

      const leases = manager.getAllLeases();
      expect(leases).toHaveLength(2);
    });
  });

  describe('release', () => {
    it('releases an existing lease', () => {
      const manager = new WorktreeManager(LEAK_TIMEOUT_MS);
      manager.allocate('feature/new', 'repo-1', 'task-1');

      const released = manager.release('feature/new', 'task-1');

      expect(released).toBe(true);
      expect(manager.getAllLeases()).toHaveLength(0);
    });

    it('allows new allocation after release', () => {
      const manager = new WorktreeManager(LEAK_TIMEOUT_MS);
      manager.allocate('feature/new', 'repo-1', 'task-1');
      manager.release('feature/new', 'task-1');

      const newLease = manager.allocate('feature/new', 'repo-1', 'task-2');

      expect(newLease).not.toBeNull();
      expect(newLease!.taskId).toBe('task-2');
    });

    it('returns false for non-existent lease', () => {
      const manager = new WorktreeManager(LEAK_TIMEOUT_MS);

      const released = manager.release('feature/nonexistent', 'task-1');

      expect(released).toBe(false);
    });

    it('only releases if taskId matches', () => {
      const manager = new WorktreeManager(LEAK_TIMEOUT_MS);
      manager.allocate('feature/new', 'repo-1', 'task-1');

      const released = manager.release('feature/new', 'task-999');

      expect(released).toBe(false);
      expect(manager.getAllLeases()).toHaveLength(1);
    });
  });

  describe('heartbeat', () => {
    it('updates lastHeartbeat timestamp', () => {
      const manager = new WorktreeManager(LEAK_TIMEOUT_MS);
      manager.allocate('feature/new', 'repo-1', 'task-1');
      const originalHeartbeat = manager.getLease('feature/new')!.lastHeartbeat;

      manager.heartbeat('feature/new', 'task-1');
      const updatedHeartbeat = manager.getLease('feature/new')!.lastHeartbeat;

      expect(updatedHeartbeat).toBeGreaterThanOrEqual(originalHeartbeat);
    });

    it('returns false for non-existent lease', () => {
      const manager = new WorktreeManager(LEAK_TIMEOUT_MS);

      const success = manager.heartbeat('feature/nonexistent', 'task-1');

      expect(success).toBe(false);
    });
  });

  describe('reclaimStale', () => {
    it('reclaims worktree with no heartbeat since leak timeout', () => {
      const manager = new WorktreeManager(LEAK_TIMEOUT_MS);
      const staleTime = Date.now() - LEAK_TIMEOUT_MS - 1000;
      manager.allocate('feature/stale', 'repo-1', 'task-1');

      const leases = manager.getAllLeases();
      leases[0].lastHeartbeat = staleTime;

      const reclaimed: Array<{ branch: string; taskId: string }> = [];
      manager.reclaimStale((branch, taskId) => {
        reclaimed.push({ branch, taskId });
      });

      expect(reclaimed).toHaveLength(1);
      expect(reclaimed[0].branch).toBe('feature/stale');
      expect(reclaimed[0].taskId).toBe('task-1');
    });

    it('does not reclaim worktree with recent heartbeat', () => {
      const manager = new WorktreeManager(LEAK_TIMEOUT_MS);
      manager.allocate('feature/active', 'repo-1', 'task-1');

      const reclaimed: Array<{ branch: string; taskId: string }> = [];
      manager.reclaimStale((branch, taskId) => {
        reclaimed.push({ branch, taskId });
      });

      expect(reclaimed).toHaveLength(0);
    });

    it('emits governance event on reclaim', () => {
      const manager = new WorktreeManager(LEAK_TIMEOUT_MS);
      const staleTime = Date.now() - LEAK_TIMEOUT_MS - 1000;
      manager.allocate('feature/stale', 'repo-1', 'task-1');

      const leases = manager.getAllLeases();
      leases[0].lastHeartbeat = staleTime;

      let eventEmitted = false;
      manager.reclaimStale((branch, taskId) => {
        eventEmitted = true;
      });

      expect(eventEmitted).toBe(true);
    });

    it('removes reclaimed leases from tracking', () => {
      const manager = new WorktreeManager(LEAK_TIMEOUT_MS);
      const staleTime = Date.now() - LEAK_TIMEOUT_MS - 1000;
      manager.allocate('feature/stale', 'repo-1', 'task-1');

      const leases = manager.getAllLeases();
      leases[0].lastHeartbeat = staleTime;

      manager.reclaimStale(() => {});

      expect(manager.getAllLeases()).toHaveLength(0);
    });
  });
});

describe('allocator - DispatchPacer', () => {
  describe('canDispatch', () => {
    it('allows dispatch when pacing is disabled (0 tokens)', () => {
      const pacer = new DispatchPacer(0);

      const canDispatch = pacer.canDispatch();

      expect(canDispatch).toBe(true);
    });

    it('allows first dispatch when tokens available', () => {
      const pacer = new DispatchPacer(100);

      const canDispatch = pacer.canDispatch();

      expect(canDispatch).toBe(true);
    });

    it('consumes token on dispatch', () => {
      const pacer = new DispatchPacer(100);

      pacer.canDispatch();
      pacer.recordDispatch();

      expect(pacer.canDispatch()).toBe(true);
    });

    it('denies dispatch when tokens exhausted', () => {
      const pacer = new DispatchPacer(1);

      pacer.canDispatch();
      pacer.recordDispatch();

      expect(pacer.canDispatch()).toBe(false);
    });

    it('allows multiple dispatches up to burst limit', () => {
      const pacer = new DispatchPacer(5);

      for (let i = 0; i < 5; i++) {
        expect(pacer.canDispatch()).toBe(true);
        pacer.recordDispatch();
      }

      expect(pacer.canDispatch()).toBe(false);
    });

    it('respects burst limit strictly', () => {
      const pacer = new DispatchPacer(3);

      expect(pacer.canDispatch()).toBe(true);
      pacer.recordDispatch();
      expect(pacer.canDispatch()).toBe(true);
      pacer.recordDispatch();
      expect(pacer.canDispatch()).toBe(true);
      pacer.recordDispatch();
      expect(pacer.canDispatch()).toBe(false);
    });
  });

  describe('refill', () => {
    it('refills tokens after time passes', () => {
      const pacer = new DispatchPacer(60);

      for (let i = 0; i < 60; i++) {
        pacer.canDispatch();
        pacer.recordDispatch();
      }

      expect(pacer.canDispatch()).toBe(false);

      pacer.refill(60 * 1000);

      expect(pacer.canDispatch()).toBe(true);
    });

    it('caps tokens at maximum', () => {
      const pacer = new DispatchPacer(100);

      pacer.refill(100 * 60 * 60 * 1000);

      expect(pacer.getAvailableTokens()).toBeLessThanOrEqual(100);
    });
  });

});