import { describe, expect, it, mock, beforeEach } from 'bun:test';

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

let queryHandler: (ref: any, args?: any) => Promise<any>;
let mutationHandler: (ref: any, args?: any) => Promise<any>;

mock.module('../convexClient', () => ({
  createConvexClient: () => ({
    query: async (ref: any, args?: any) => queryHandler(ref, args),
    mutation: async (ref: any, args?: any) => mutationHandler(ref, args),
  }),
}));

const mockLoadActiveProjects = mock(async () => mockProjects);
const mockLoadTasks = mock(async (client: any, slug: string) => mockTasks[slug] ?? []);
const mockLoadTrackStatuses = mock(async (client: any, slug: string) => {
  const tracks = mockTracks[slug] ?? [];
  return new Map(tracks.map((t: any) => [t.trackId, t.status]));
});
const mockLoadProject = mock(async (client: any, slug: string) =>
  mockProjects.find((p) => p.slug === slug) ?? null,
);

mock.module('./candidates', () => ({
  loadActiveProjects: mockLoadActiveProjects,
  loadTasks: mockLoadTasks,
  loadTrackStatuses: mockLoadTrackStatuses,
  loadProject: mockLoadProject,
}));

mock.module('../policy/dispatch', () => ({
  selectBestCandidate: mock(async (tasks: any[]) => {
    if (!tasks.length) return null;
    return {
      task: tasks[0],
      trackId: tasks[0].trackId,
      score: 1.0,
      breakdown: {},
      justification: 'test selection',
      llmTieBreak: false,
    };
  }),
}));

mock.module('../policy/statsClient', () => ({
  listDispatchPolicyStats: mock(async () => []),
  listHarnessReliabilityStats: mock(async () => []),
}));

mock.module('../policy/policyClient', () => ({
  createScoreAudit: mock(async () => {}),
}));

mock.module('./runContract', () => ({
  validateAndPersist: mock(async () => {}),
  createRunContractIfNeeded: mock(async () => {}),
  appendDispatchRejections: mock(async () => {}),
  RunContractValidationError: class extends Error {
    stage: string;
    rawOutput: string;
    constructor(stage: string, rawOutput: string, message: string) {
      super(message);
      this.stage = stage;
      this.rawOutput = rawOutput;
    }
  },
}));

mock.module('./logger', () => ({
  logAndCaptureError: mock(async () => {}),
}));

mock.module('./coverageEnforcement', () => ({
  enforceCoverageThreshold: mock(async () => ({ violated: false })),
}));

mock.module('./executor', () => ({
  executeTask: mock(async () => ({
    taskKey: 'mock',
    status: 'succeeded' as const,
    exitCode: 0,
    output: 'done',
    durationMs: 100,
  })),
}));

import { runAllProjects } from './orchestrator';
import type { IssueHooks, GitHooks } from './types';

describe('runAllProjects', () => {
  beforeEach(() => {
    mockLoadActiveProjects.mockReset();
    mockLoadActiveProjects.mockImplementation(async () => mockProjects);
    mockLoadTasks.mockReset();
    mockLoadTasks.mockImplementation(async (client: any, slug: string) => mockTasks[slug] ?? []);
    mockLoadTrackStatuses.mockReset();
    mockLoadTrackStatuses.mockImplementation(async (client: any, slug: string) => {
      const tracks = mockTracks[slug] ?? [];
      return new Map(tracks.map((t: any) => [t.trackId, t.status]));
    });
    mockLoadProject.mockReset();
    mockLoadProject.mockImplementation(async (client: any, slug: string) =>
      mockProjects.find((p) => p.slug === slug) ?? null,
    );
    queryHandler = async () => [];
    mutationHandler = async () => {};
  });

  it('returns empty array when no active projects', async () => {
    mockLoadActiveProjects.mockImplementation(async () => []);

    const results = await runAllProjects();
    expect(results).toEqual([]);
  });

  it('runs multiple projects sequentially', async () => {
    const results = await runAllProjects(
      { maxRetries: 0, baseDelayMs: 1, maxDelayMs: 1, commandTimeoutMs: 1000 },
    );

    expect(results).toHaveLength(2);
    expect(results[0].projectSlug).toBe('proj-a');
    expect(results[1].projectSlug).toBe('proj-b');
  });

  it('returns succeeded status for each project', async () => {
    const results = await runAllProjects(
      { maxRetries: 0, baseDelayMs: 1, maxDelayMs: 1, commandTimeoutMs: 1000 },
    );

    expect(results.every((r) => r.status === 'succeeded')).toBe(true);
  });

  it('handles project errors gracefully without crashing', async () => {
    mockLoadTasks.mockImplementation(async (client: any, slug: string) => {
      if (slug === 'proj-b') {
        throw new Error('Convex connection lost');
      }
      return mockTasks[slug] ?? [];
    });

    const results = await runAllProjects(
      { maxRetries: 0, baseDelayMs: 1, maxDelayMs: 1, commandTimeoutMs: 1000 },
    );

    expect(results).toHaveLength(2);
    expect(results[0].status).toBe('succeeded');
    expect(results[1].status).toBe('failed');
    expect(results[1].error).toContain('Convex connection lost');
  });

  it('passes hooks to each project', async () => {
    const blockerHook = mock(async () => {});
    const delegationHook = mock(async () => 0);
    const hooks: IssueHooks = {
      createBlocker: blockerHook,
      createDelegations: delegationHook,
    };

    await runAllProjects(
      { maxRetries: 0, baseDelayMs: 1, maxDelayMs: 1, commandTimeoutMs: 1000 },
      hooks,
    );

    expect(delegationHook).toHaveBeenCalled();
  });

  it('passes git hooks to each project', async () => {
    const onTaskStart = mock(async () => ({ branchName: 'feat/test', branchCreated: true }));
    const onTaskComplete = mock(async () => {});
    const gitHooks: GitHooks = { onTaskStart, onTaskComplete };

    await runAllProjects(
      { maxRetries: 0, baseDelayMs: 1, maxDelayMs: 1, commandTimeoutMs: 1000 },
      undefined,
      gitHooks,
    );

    expect(onTaskStart).toHaveBeenCalled();
    expect(onTaskComplete).toHaveBeenCalled();
  });

  it('returns failed result for projects that throw unexpected errors', async () => {
    mockLoadActiveProjects.mockImplementation(async () => [
      { slug: 'crash-project', name: 'Crash', rootPath: '/tmp/crash', status: 'active', source: 'manual' },
    ]);

    mockLoadProject.mockImplementation(async (client: any, slug: string) => {
      if (slug === 'crash-project') {
        throw new Error('Fatal: database unreachable');
      }
      return mockProjects.find((p) => p.slug === slug) ?? null;
    });

    const results = await runAllProjects(
      { maxRetries: 0, baseDelayMs: 1, maxDelayMs: 1, commandTimeoutMs: 1000 },
    );

    expect(results).toHaveLength(1);
    expect(results[0].status).toBe('failed');
    expect(results[0].error).toContain('Fatal: database unreachable');
  });
});
