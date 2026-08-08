/**
 * Runtime performance contracts for task history queries.
 *
 * These tests use registered Convex functions with the real schema, indexes,
 * argument validators, and an authenticated identity. They intentionally do
 * not replace database queries with spies: each assertion observes the
 * Convex test backend's indexed, bounded query behavior.
 */

import { api } from '../_generated/api';
import type { Id } from '../_generated/dataModel';
import {
  createConvexTest,
  createUnauthenticatedConvexTest,
} from '../../test/convexTest';
import { describe, expect, it } from 'vitest';

type ConvexTest = ReturnType<typeof createConvexTest>;
type TaskStatus = 'backlog' | 'ready' | 'in_progress' | 'review' | 'done' | 'blocked';
type Priority = 'low' | 'medium' | 'high';

type TaskSeed = {
  title: string;
  status: TaskStatus;
  priority?: Priority;
  storyPoints?: number;
  actualCost?: number;
  assigneeId?: Id<'agents'>;
  createdAt?: number;
  updatedAt?: number;
};

async function seedProject(t: ConvexTest, slug: string): Promise<Id<'projects'>> {
  return t.run(async (ctx) =>
    ctx.db.insert('projects', {
      name: slug,
      slug,
      description: `History performance fixture for ${slug}`,
      createdAt: 1_000,
      updatedAt: 1_000,
    }),
  );
}

async function seedAgent(t: ConvexTest): Promise<Id<'agents'>> {
  return t.run(async (ctx) =>
    ctx.db.insert('agents', {
      name: 'resolver',
      role: 'executor',
      skills: ['typescript'],
      model: 'claude-opus',
      costPerPoint: 10,
      reliability: 0.9,
      status: 'active',
      workload: 5,
      maxWorkload: 10,
      createdAt: 1_000,
    }),
  );
}

async function seedTasks(
  t: ConvexTest,
  projectId: Id<'projects'>,
  seeds: TaskSeed[],
): Promise<Id<'tasks'>[]> {
  return t.run(async (ctx) => {
    const ids: Id<'tasks'>[] = [];
    for (const [index, seed] of seeds.entries()) {
      ids.push(
        await ctx.db.insert('tasks', {
          projectId,
          title: seed.title,
          description: 'History performance task',
          storyPoints: seed.storyPoints ?? 1,
          status: seed.status,
          priority: seed.priority ?? 'medium',
          costEstimate: 10,
          actualCost: seed.actualCost ?? 5,
          assigneeId: seed.assigneeId,
          createdAt: seed.createdAt ?? index,
          updatedAt: seed.updatedAt ?? index,
        }),
      );
    }
    return ids;
  });
}

describe('listTaskHistoryHandler runtime performance contracts', () => {
  it('rejects an invalid project id through the registered argument validator', async () => {
    const t = createUnauthenticatedConvexTest();

    await expect(
      t.query(api.history.tasks.listTaskHistoryHandler, {
        projectId: 'not-a-convex-project-id' as unknown as Id<'projects'>,
      }),
    ).rejects.toThrow();
  });

  it('rejects history reads without an authenticated identity', async () => {
    const t = createUnauthenticatedConvexTest();
    const projectId = await seedProject(t, 'unauthenticated-project');

    await expect(
      t.query(api.history.tasks.listTaskHistoryHandler, { projectId }),
    ).rejects.toThrow(/Authentication required/);
  });

  it('returns 100 tasks for a project through the registered query', async () => {
    const t = createConvexTest();
    const projectId = await seedProject(t, 'perf-project');
    await seedTasks(
      t,
      projectId,
      Array.from({ length: 100 }, (_, index) => ({
        title: `Perf Task ${index + 1}`,
        status: index % 5 === 0 ? 'in_progress' : 'done',
        storyPoints: (index % 8) + 1,
        actualCost: (index % 20) * 5.5,
      })),
    );

    const result = await t.query(api.history.tasks.listTaskHistoryHandler, { projectId });
    expect(result).toHaveLength(100);
  });

  it('bounds a 100-task history query to the requested page size', async () => {
    const t = createConvexTest();
    const projectId = await seedProject(t, 'paginate-project');
    await seedTasks(
      t,
      projectId,
      Array.from({ length: 100 }, (_, index) => ({
        title: `Page Task ${index + 1}`,
        status: 'done' as const,
        priority: 'low' as const,
      })),
    );

    const result = await t.query(api.history.tasks.listTaskHistoryHandler, {
      projectId,
      limit: 25,
    });
    expect(result).toHaveLength(25);
  });

  it('returns older status matches instead of filtering only the newest page', async () => {
    const t = createConvexTest();
    const projectId = await seedProject(t, 'status-project');
    await seedTasks(
      t,
      projectId,
      [
        ...Array.from({ length: 50 }, (_, index) => ({
          title: `Done task ${index}`,
          status: 'done' as const,
        })),
        ...Array.from({ length: 100 }, (_, index) => ({
          title: `In-progress task ${index}`,
          status: 'in_progress' as const,
        })),
      ],
    );

    const result = await t.query(api.history.tasks.listTaskHistoryHandler, {
      projectId,
      status: 'done',
      limit: 50,
    });
    expect(result).toHaveLength(50);
    expect(result.every((task) => task.status === 'done')).toBe(true);
    expect(result.every((task) => task.title.startsWith('Done task '))).toBe(true);
  });

  it('searches task titles through the bounded project index path', async () => {
    const t = createConvexTest();
    const projectId = await seedProject(t, 'search-project');
    await seedTasks(
      t,
      projectId,
      Array.from({ length: 100 }, (_, index) => ({
        title: index % 10 === 0 ? `Auth bug ${index}` : `Generic task ${index}`,
        status: 'done' as const,
        priority: 'low' as const,
      })),
    );

    const result = await t.query(api.history.tasks.listTaskHistoryHandler, {
      projectId,
      search: 'auth',
    });
    expect(result).toHaveLength(10);
    expect(result.every((task) => task.title.toLowerCase().includes('auth'))).toBe(true);
  });

  it('combines status and search while retaining older matches behind newer nonmatches', async () => {
    const t = createConvexTest();
    const projectId = await seedProject(t, 'combined-project');
    await seedTasks(t, projectId, [
      ...Array.from({ length: 5 }, (_, index) => ({
        title: `Dashboard fix ${index}`,
        status: 'done' as const,
      })),
      ...Array.from({ length: 15 }, (_, index) => ({
        title: `Unrelated done task ${index}`,
        status: 'done' as const,
      })),
    ]);

    const result = await t.query(api.history.tasks.listTaskHistoryHandler, {
      projectId,
      status: 'done',
      search: 'dashboard',
      limit: 5,
    });
    expect(result).toHaveLength(5);
    expect(result.every((task) => task.status === 'done')).toBe(true);
    expect(result.every((task) => task.title.toLowerCase().includes('dashboard'))).toBe(true);
  });

  it('enriches returned rows with the assignee agent name', async () => {
    const t = createConvexTest();
    const projectId = await seedProject(t, 'agent-resolve-project');
    const agentId = await seedAgent(t);
    await seedTasks(t, projectId, [
      {
        title: 'Resolve Task',
        status: 'done',
        priority: 'low',
        assigneeId: agentId,
      },
    ]);

    const result = await t.query(api.history.tasks.listTaskHistoryHandler, { projectId });
    expect(result).toHaveLength(1);
    expect(result[0].assigneeId).toBe(agentId);
    expect(result[0].agent).toBe('resolver');
  });
});

describe('getTaskHistoryHandler runtime performance contract', () => {
  it('returns a single task from a dataset of 100 through the registered query', async () => {
    const t = createConvexTest();
    const projectId = await seedProject(t, 'get-project');
    const ids = await seedTasks(
      t,
      projectId,
      Array.from({ length: 100 }, (_, index) => ({
        title: `Get Task ${index + 1}`,
        status: 'done' as const,
        priority: 'low' as const,
      })),
    );

    const result = await t.query(api.history.tasks.getTaskHistoryHandler, { id: ids[50] });
    expect(result).not.toBeNull();
    expect(result?.title).toBe('Get Task 51');
  });
});
