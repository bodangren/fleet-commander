import { describe, expect, it, mock, beforeEach } from 'bun:test';
import { runAllProjects } from './orchestrator';
import type { RunResult } from './orchestrator';
import type { IssueHooks, GitHooks } from './types';

const mockProjects = [
  { slug: 'proj-a', name: 'Project A', rootPath: '/tmp/a', status: 'active', source: 'manual' },
  { slug: 'proj-b', name: 'Project B', rootPath: '/tmp/b', status: 'active', source: 'manual' },
];

const mockTasks: Record<string, Array<{
  projectSlug: string;
  trackId: string;
  taskKey: string;
  title: string;
  status: 'todo';
  dependencies: never[];
  updatedAt: number;
}>> = {
  'proj-a': [
    {
      projectSlug: 'proj-a',
      trackId: 'track-1',
      taskKey: 'a-task-1',
      title: 'Task A1',
      status: 'todo' as const,
      dependencies: [],
      updatedAt: Date.now(),
    },
  ],
  'proj-b': [
    {
      projectSlug: 'proj-b',
      trackId: 'track-2',
      taskKey: 'b-task-1',
      title: 'Task B1',
      status: 'todo' as const,
      dependencies: [],
      updatedAt: Date.now(),
    },
  ],
};

const mockTracks: Record<string, Array<{
  projectSlug: string;
  trackId: string;
  title: string;
  status: string;
  version: number;
  updatedAt: number;
}>> = {
  'proj-a': [
    { projectSlug: 'proj-a', trackId: 'track-1', title: 'Track 1', status: 'active', version: 1, updatedAt: Date.now() },
  ],
  'proj-b': [
    { projectSlug: 'proj-b', trackId: 'track-2', title: 'Track 2', status: 'active', version: 1, updatedAt: Date.now() },
  ],
};

function createMockClient() {
  return {
    query: mock(async (_ref: any, args?: any): Promise<any> => {
      if (args?.taskId) return null;
      return [];
    }),
    mutation: mock(async (_ref: any, _args?: any): Promise<any> => ({})),
  };
}

/**
 * Creates a mock runProject function for testing runAllProjects.
 */
function createMockRunProject() {
  return mock(async (
    _client: any,
    projectSlug: string,
    _config: any,
    _hooks?: any,
    _executeFn?: any,
    _gitHooks?: any,
  ): Promise<RunResult> => ({
    projectSlug,
    taskKey: 'mock-task',
    status: 'succeeded',
  }));
}

describe('runAllProjects', () => {
  beforeEach(() => {
    // no-op: mocks are reset per-test below
  });

  it('returns empty array when no active projects', async () => {
    const mockClient = createMockClient();
    const results = await runAllProjects(
      { maxRetries: 0, baseDelayMs: 1, maxDelayMs: 1, commandTimeoutMs: 1000 },
      undefined,
      undefined,
      {
        createClient: () => mockClient as any,
        loadProjects: async () => [],
        runProjectFn: createMockRunProject(),
      },
    );

    expect(results).toEqual([]);
  });

  it('runs multiple projects sequentially', async () => {
    const mockClient = createMockClient();
    const results = await runAllProjects(
      { maxRetries: 0, baseDelayMs: 1, maxDelayMs: 1, commandTimeoutMs: 1000 },
      undefined,
      undefined,
      {
        createClient: () => mockClient as any,
        loadProjects: async () => mockProjects as any,
        runProjectFn: createMockRunProject(),
      },
    );

    expect(results).toHaveLength(2);
    expect(results[0].projectSlug).toBe('proj-a');
    expect(results[1].projectSlug).toBe('proj-b');
  });

  it('returns succeeded status for each project', async () => {
    const mockClient = createMockClient();
    const results = await runAllProjects(
      { maxRetries: 0, baseDelayMs: 1, maxDelayMs: 1, commandTimeoutMs: 1000 },
      undefined,
      undefined,
      {
        createClient: () => mockClient as any,
        loadProjects: async () => mockProjects as any,
        runProjectFn: createMockRunProject(),
      },
    );

    expect(results.every((r) => r.status === 'succeeded')).toBe(true);
  });

  it('handles project errors gracefully without crashing', async () => {
    const mockClient = createMockClient();
    const runProjectFn = mock(async (
      _client: any,
      projectSlug: string,
    ): Promise<RunResult> => {
      if (projectSlug === 'proj-b') {
        throw new Error('Convex connection lost');
      }
      return { projectSlug, taskKey: 'mock-task', status: 'succeeded' };
    });

    const results = await runAllProjects(
      { maxRetries: 0, baseDelayMs: 1, maxDelayMs: 1, commandTimeoutMs: 1000 },
      undefined,
      undefined,
      {
        createClient: () => mockClient as any,
        loadProjects: async () => mockProjects as any,
        runProjectFn,
      },
    );

    expect(results).toHaveLength(2);
    expect(results[0].status).toBe('succeeded');
    expect(results[1].status).toBe('failed');
    expect(results[1].error).toContain('Convex connection lost');
  });

  it('passes hooks to each project', async () => {
    const mockClient = createMockClient();
    const runProjectFn = createMockRunProject();
    const blockerHook = mock(async () => {});
    const delegationHook = mock(async () => 0);
    const hooks: IssueHooks = {
      createBlocker: blockerHook,
      createDelegations: delegationHook,
    };

    await runAllProjects(
      { maxRetries: 0, baseDelayMs: 1, maxDelayMs: 1, commandTimeoutMs: 1000 },
      hooks,
      undefined,
      {
        createClient: () => mockClient as any,
        loadProjects: async () => mockProjects as any,
        runProjectFn,
      },
    );

    expect(runProjectFn).toHaveBeenCalled();
  });

  it('passes git hooks to each project', async () => {
    const mockClient = createMockClient();
    const runProjectFn = createMockRunProject();
    const onTaskStart = mock(async () => ({ branchName: 'feat/test', branchCreated: true }));
    const onTaskComplete = mock(async () => {});
    const gitHooks: GitHooks = { onTaskStart, onTaskComplete };

    await runAllProjects(
      { maxRetries: 0, baseDelayMs: 1, maxDelayMs: 1, commandTimeoutMs: 1000 },
      undefined,
      gitHooks,
      {
        createClient: () => mockClient as any,
        loadProjects: async () => mockProjects as any,
        runProjectFn,
      },
    );

    expect(runProjectFn).toHaveBeenCalled();
  });

  it('returns failed result for projects that throw unexpected errors', async () => {
    const mockClient = createMockClient();
    const crashProject = { slug: 'crash-project', name: 'Crash', rootPath: '/tmp/crash', status: 'active', source: 'manual' };
    const runProjectFn = mock(async (
      _client: any,
      projectSlug: string,
    ): Promise<RunResult> => {
      if (projectSlug === 'crash-project') {
        throw new Error('Fatal: database unreachable');
      }
      return { projectSlug, taskKey: 'mock-task', status: 'succeeded' };
    });

    const results = await runAllProjects(
      { maxRetries: 0, baseDelayMs: 1, maxDelayMs: 1, commandTimeoutMs: 1000 },
      undefined,
      undefined,
      {
        createClient: () => mockClient as any,
        loadProjects: async () => [crashProject] as any,
        runProjectFn,
      },
    );

    expect(results).toHaveLength(1);
    expect(results[0].status).toBe('failed');
    expect(results[0].error).toContain('Fatal: database unreachable');
  });
});
