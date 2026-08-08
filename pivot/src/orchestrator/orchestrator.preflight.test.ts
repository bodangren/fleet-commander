import { describe, expect, it, mock } from 'bun:test';
import type { ConvexHttpClient } from 'convex/browser';
import { runProject } from './orchestrator';
import type { ExecuteFn, Task } from './types';

describe('runProject preflight boundary', () => {
  it('does not let an injected executor bypass the production preflight for a resolved project', async () => {
    const task = {
      projectSlug: 'reading-advantage-llm-benchmark',
      trackId: 'track-1',
      taskKey: 'track-1-task-1',
      title: 'Bounded task',
      status: 'backlog' as const,
      dependencies: [],
      updatedAt: 1,
    };
    const project = {
      _id: 'jproject1234567890123456789012',
      name: 'Reading Advantage',
      slug: task.projectSlug,
      description: 'Imported benchmark',
      path: '/path-that-must-not-be-used-for-a-spawn',
      createdAt: 1,
      updatedAt: 2,
    };
    let projectSlugQueryCount = 0;
    const execute: ExecuteFn = mock(async () => ({
      taskKey: task.taskKey,
      status: 'succeeded' as const,
      durationMs: 1,
      output: 'should not run',
    }));
    const client = {
      query: mock(async (_ref: unknown, args: Record<string, unknown>) => {
        if (args.slug === project.slug) return project;
        if ('name' in args) return null;
        if ('projectSlug' in args) {
          projectSlugQueryCount += 1;
          return projectSlugQueryCount === 1 ? [task] : [];
        }
        if ('limit' in args) return [];
        return null;
      }),
      mutation: mock(async () => ({})),
    } as unknown as ConvexHttpClient;

    const result = await runProject(client, task.projectSlug, undefined, undefined, execute);

    expect(result.status).toBe('failed');
    expect(result.error).toContain('Project path');
    expect(execute).not.toHaveBeenCalled();
  });

  it('fails closed when an unresolved project injects an executor without preflight', async () => {
    const task = {
      projectSlug: 'unresolved-project',
      trackId: 'track-1',
      taskKey: 'track-1-task-1',
      title: 'Bounded task',
      status: 'backlog' as const,
      dependencies: [],
      updatedAt: 1,
    };
    let projectSlugQueryCount = 0;
    const execute: ExecuteFn = mock(async () => ({
      taskKey: task.taskKey,
      status: 'succeeded' as const,
      durationMs: 1,
      output: 'should not run',
    }));
    const client = {
      query: mock(async (_ref: unknown, args: Record<string, unknown>) => {
        if ('slug' in args || 'name' in args) return null;
        if ('projectSlug' in args) {
          projectSlugQueryCount += 1;
          return projectSlugQueryCount === 1 ? [task] : [];
        }
        if ('limit' in args) return [];
        return null;
      }),
      mutation: mock(async () => ({})),
    } as unknown as ConvexHttpClient;

    const result = await runProject(client, task.projectSlug, undefined, undefined, execute);

    expect(result).toMatchObject({
      projectSlug: task.projectSlug,
      taskKey: task.taskKey,
      status: 'failed',
      error: 'Project path is missing or inaccessible.',
    });
    expect(execute).not.toHaveBeenCalled();
  });

  it('returns before claim or executor spawn when the injected preflight fails', async () => {
    const task = {
      projectSlug: 'reading-advantage-llm-benchmark',
      trackId: 'track-1',
      taskKey: 'track-1-task-1',
      title: 'Bounded task',
      status: 'backlog' as const,
      dependencies: [],
      updatedAt: 1,
    };
    let projectSlugQueryCount = 0;
    const mutation = mock(async () => ({}));
    const client = {
      query: mock(async (_ref: unknown, args: Record<string, unknown>) => {
        if ('slug' in args || 'name' in args) return null;
        if ('projectSlug' in args) {
          projectSlugQueryCount += 1;
          return projectSlugQueryCount === 1 ? [task] : [];
        }
        if ('limit' in args) return [];
        return null;
      }),
      mutation,
    } as unknown as ConvexHttpClient;
    const execute: ExecuteFn = mock(async () => ({
      taskKey: task.taskKey,
      status: 'succeeded' as const,
      durationMs: 1,
      output: 'should not run',
    }));
    const preflight = mock(async () => ({ ok: false, reason: 'Pi provider unavailable.' }));

    const result = await runProject(
      client,
      task.projectSlug,
      undefined,
      undefined,
      execute,
      undefined,
      undefined,
      undefined,
      preflight,
    );

    expect(result).toEqual({
      projectSlug: task.projectSlug,
      taskKey: task.taskKey,
      status: 'failed',
      error: 'Pi provider unavailable.',
    });
    expect(preflight).toHaveBeenCalledTimes(1);
    expect(execute).not.toHaveBeenCalled();
    const mutationCalls = mutation.mock.calls as unknown as Array<
      [unknown, Record<string, unknown>?]
    >;
    expect(mutationCalls.some((call) => {
      const args = call[1] as Record<string, unknown> | undefined;
      return args?.taskKey === task.taskKey && args?.expectedStatus === 'ready';
    })).toBe(false);
  });

  it('preflights and spawns the effective reviewer agent', async () => {
    const task = {
      projectSlug: 'reading-advantage-llm-benchmark',
      trackId: 'track-1',
      taskKey: 'review-task-1',
      title: 'Review the bounded task',
      status: 'review' as const,
      assignee: 'executor-agent',
      reviewerId: 'reviewer-agent',
      dependencies: [],
      updatedAt: 1,
    };
    let projectSlugQueryCount = 0;
    const client = {
      query: mock(async (_ref: unknown, args: Record<string, unknown>) => {
        if ('slug' in args || 'name' in args) return null;
        if ('projectSlug' in args) {
          projectSlugQueryCount += 1;
          return projectSlugQueryCount === 1 ? [task] : [];
        }
        if ('limit' in args) return [];
        return null;
      }),
      mutation: mock(async () => ({})),
    } as unknown as ConvexHttpClient;
    let preflightAgent: string | undefined;
    let spawnedAgent: string | undefined;
    const preflight = mock(async (
      _client: ConvexHttpClient,
      _projectSlug: string,
      preflightTask: Task,
    ) => {
      preflightAgent = preflightTask.assignee;
      return { ok: true };
    });
    const execute: ExecuteFn = mock(async (
      _client,
      agentName,
      _taskTitle,
      taskKey,
    ) => {
      spawnedAgent = agentName;
      return { taskKey, status: 'succeeded' as const, durationMs: 1, output: '' };
    });

    const result = await runProject(
      client,
      task.projectSlug,
      undefined,
      undefined,
      execute,
      undefined,
      undefined,
      undefined,
      preflight,
    );

    expect(result.status).toBe('succeeded');
    expect(preflightAgent).toBe('reviewer-agent');
    expect(spawnedAgent).toBe('reviewer-agent');
    expect(preflightAgent).toBe(spawnedAgent);
  });

  it('preflights only the explicitly requested eligible task', async () => {
    const tasks = [
      {
        projectSlug: 'reading-advantage-llm-benchmark',
        trackId: 'track-1',
        taskKey: 'task-a',
        title: 'Unrelated high-score task',
        status: 'ready' as const,
        dependencies: [],
        updatedAt: 1,
      },
      {
        projectSlug: 'reading-advantage-llm-benchmark',
        trackId: 'track-1',
        taskKey: 'task-b',
        title: 'The sprint-assigned task',
        status: 'ready' as const,
        dependencies: [],
        updatedAt: 1,
      },
    ];
    let projectSlugQueryCount = 0;
    const client = {
      query: mock(async (_ref: unknown, args: Record<string, unknown>) => {
        if ('slug' in args || 'name' in args) return null;
        if ('projectSlug' in args) {
          projectSlugQueryCount += 1;
          return projectSlugQueryCount === 1 ? tasks : [];
        }
        if ('limit' in args) return [];
        return null;
      }),
      mutation: mock(async () => ({})),
    } as unknown as ConvexHttpClient;
    const execute: ExecuteFn = mock(async () => ({
      taskKey: 'task-b',
      status: 'succeeded' as const,
      durationMs: 1,
      output: 'should not run after failed preflight',
    }));
    const preflight = mock(
      async (
        _client: ConvexHttpClient,
        _projectSlug: string,
        _task: Task,
        _rootPath: string | undefined,
      ) => ({
        ok: false,
        reason: 'Stop after proving task identity.',
      }),
    );

    const result = await runProject(
      client,
      tasks[0]!.projectSlug,
      undefined,
      undefined,
      execute,
      undefined,
      undefined,
      undefined,
      preflight,
      { requiredTaskKey: 'task-b' },
    );

    expect(result).toMatchObject({ taskKey: 'task-b', status: 'failed' });
    expect(preflight).toHaveBeenCalledTimes(1);
    expect(preflight.mock.calls[0]?.[2]).toMatchObject({
      taskKey: 'task-b',
    });
    expect(execute).not.toHaveBeenCalled();
  });

  it('fails before preflight when the requested task is not eligible', async () => {
    const task = {
      projectSlug: 'reading-advantage-llm-benchmark',
      trackId: 'track-1',
      taskKey: 'task-a',
      title: 'Only eligible task',
      status: 'ready' as const,
      dependencies: [],
      updatedAt: 1,
    };
    let projectSlugQueryCount = 0;
    const client = {
      query: mock(async (_ref: unknown, args: Record<string, unknown>) => {
        if ('slug' in args || 'name' in args) return null;
        if ('projectSlug' in args) {
          projectSlugQueryCount += 1;
          return projectSlugQueryCount === 1 ? [task] : [];
        }
        if ('limit' in args) return [];
        return null;
      }),
      mutation: mock(async () => ({})),
    } as unknown as ConvexHttpClient;
    const preflight = mock(async () => ({ ok: true }));

    const result = await runProject(
      client,
      task.projectSlug,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      preflight,
      { requiredTaskKey: 'task-missing' },
    );

    expect(result).toEqual({
      projectSlug: task.projectSlug,
      taskKey: 'task-missing',
      status: 'failed',
      error: 'Requested task task-missing is not eligible for execution.',
    });
    expect(preflight).not.toHaveBeenCalled();
  });
});
