/**
 * Runtime integration contracts for dependency state transitions and reads.
 *
 * Cycle and exact error-message coverage lives in
 * `dependencies.cycleMessages.convex-test.ts`; this suite focuses on the
 * distinct state, graph, and project-isolation behaviors that used to rely on
 * a handwritten mock database.
 */

import { api } from './_generated/api';
import type { Doc, Id } from './_generated/dataModel';
import {
  createConvexTest,
  createUnauthenticatedConvexTest,
} from '../test/convexTest';
import { describe, expect, it } from 'vitest';

type TaskStatus =
  | 'backlog'
  | 'ready'
  | 'in_progress'
  | 'review'
  | 'done'
  | 'blocked';

type TaskSeed = {
  taskKey: string;
  title: string;
  status: TaskStatus;
  storyPoints: number;
  dependencies?: string[];
  blockerReason?: string;
};

type ConvexTest = ReturnType<typeof createConvexTest>;

/**
 * Seeds one project and a schema-valid task graph for a runtime test.
 *
 * @param t - Isolated Convex runtime backend.
 * @param projectSlug - Project name and slug to seed.
 * @param tasks - Graph rows to create in insertion order.
 * @returns The inserted project identifier.
 */
async function seedScenario(
  t: ConvexTest,
  projectSlug: string,
  tasks: TaskSeed[],
): Promise<Id<'projects'>> {
  return t.run(async (ctx) => {
    const now = 1_000;
    const projectId = await ctx.db.insert('projects', {
      name: projectSlug,
      slug: projectSlug,
      description: `description-${projectSlug}`,
      createdAt: now,
      updatedAt: now,
    });

    for (const task of tasks) {
      await ctx.db.insert('tasks', {
        projectId,
        title: task.title,
        description: `description-${task.taskKey}`,
        storyPoints: task.storyPoints,
        status: task.status,
        priority: 'medium',
        costEstimate: 0,
        taskKey: task.taskKey,
        dependencies: task.dependencies ?? [],
        blockerReason: task.blockerReason,
        createdAt: now,
        updatedAt: now,
      });
    }

    return projectId;
  });
}

/**
 * Reads a task using the production unique task-key index.
 *
 * @param t - Isolated Convex runtime backend.
 * @param taskKey - Task key to resolve.
 * @returns Persisted task, if found.
 */
async function getTaskByKey(
  t: ConvexTest,
  taskKey: string,
): Promise<Doc<'tasks'> | null> {
  return t.run(async (ctx) =>
    ctx.db
      .query('tasks')
      .withIndex('by_task_key', (q) => q.eq('taskKey', taskKey))
      .unique(),
  );
}

describe('dependency runtime integration contracts', () => {
  it('rejects remove mutations without identity and preserves persisted dependencies', async () => {
    const t = createUnauthenticatedConvexTest();
    await seedScenario(t, 'integration-auth', [
      {
        taskKey: 'AUTH-A',
        title: 'Dependent task',
        status: 'blocked',
        storyPoints: 3,
        dependencies: ['AUTH-B'],
        blockerReason: 'Waiting on AUTH-B',
      },
      {
        taskKey: 'AUTH-B',
        title: 'Blocking task',
        status: 'in_progress',
        storyPoints: 3,
      },
    ]);

    await expect(
      t.mutation(api.dependencies.removeTaskDependency, {
        taskKey: 'AUTH-A',
        dependencyKey: 'AUTH-B',
      }),
    ).rejects.toThrow('Authentication required');

    expect(await getTaskByKey(t, 'AUTH-A')).toMatchObject({
      status: 'blocked',
      dependencies: ['AUTH-B'],
      blockerReason: 'Waiting on AUTH-B',
    });
  });

  it('adds a second incomplete dependency and refreshes the persisted blocker message', async () => {
    const t = createConvexTest();
    await seedScenario(t, 'integration-add', [
      { taskKey: 'ADD-A', title: 'Dependent task', status: 'ready', storyPoints: 3 },
      { taskKey: 'ADD-B', title: 'First blocker', status: 'in_progress', storyPoints: 2 },
      { taskKey: 'ADD-C', title: 'Second blocker', status: 'in_progress', storyPoints: 5 },
    ]);

    expect(
      await t.mutation(api.dependencies.addTaskDependency, {
        taskKey: 'ADD-A',
        dependencyKey: 'ADD-B',
      }),
    ).toEqual({ ok: true });
    expect(
      await t.mutation(api.dependencies.addTaskDependency, {
        taskKey: 'ADD-A',
        dependencyKey: 'ADD-C',
      }),
    ).toEqual({ ok: true });

    expect(await getTaskByKey(t, 'ADD-A')).toMatchObject({
      status: 'blocked',
      dependencies: ['ADD-B', 'ADD-C'],
      blockerReason: 'Waiting on ADD-C',
    });
  });

  it('removes dependencies through the registered mutation and reconciles blocked state', async () => {
    const t = createConvexTest();
    await seedScenario(t, 'integration-remove', [
      {
        taskKey: 'REMOVE-A',
        title: 'Dependent task',
        status: 'blocked',
        storyPoints: 3,
        dependencies: ['REMOVE-B', 'REMOVE-C'],
        blockerReason: 'Waiting on REMOVE-B',
      },
      { taskKey: 'REMOVE-B', title: 'Incomplete blocker', status: 'in_progress', storyPoints: 2 },
      { taskKey: 'REMOVE-C', title: 'Completed dependency', status: 'done', storyPoints: 5 },
      { taskKey: 'REMOVE-D', title: 'Next blocker', status: 'in_progress', storyPoints: 1 },
    ]);

    expect(
      await t.mutation(api.dependencies.removeTaskDependency, {
        taskKey: 'REMOVE-A',
        dependencyKey: 'REMOVE-B',
      }),
    ).toEqual({ ok: true });
    expect(await getTaskByKey(t, 'REMOVE-A')).toMatchObject({
      status: 'ready',
      dependencies: ['REMOVE-C'],
    });

    await t.mutation(api.dependencies.addTaskDependency, {
      taskKey: 'REMOVE-A',
      dependencyKey: 'REMOVE-D',
    });
    expect(
      await t.mutation(api.dependencies.removeTaskDependency, {
        taskKey: 'REMOVE-A',
        dependencyKey: 'REMOVE-C',
      }),
    ).toEqual({ ok: true });
    expect(await getTaskByKey(t, 'REMOVE-A')).toMatchObject({
      status: 'blocked',
      dependencies: ['REMOVE-D'],
      blockerReason: 'Waiting on REMOVE-D',
    });
  });

  it('resolves existing dependency rows and omits stale keys', async () => {
    const t = createConvexTest();
    await seedScenario(t, 'integration-resolve', [
      {
        taskKey: 'RESOLVE-A',
        title: 'Dependent task',
        status: 'ready',
        storyPoints: 3,
        dependencies: ['RESOLVE-B', 'STALE-DEPENDENCY'],
      },
      { taskKey: 'RESOLVE-B', title: 'Resolved task', status: 'done', storyPoints: 8 },
    ]);

    await expect(
      t.query(api.dependencies.getTaskWithDependencies, {
        taskKey: 'MISSING-TASK',
      }),
    ).resolves.toBeNull();
    await expect(
      t.query(api.dependencies.getTaskWithDependencies, {
        taskKey: 'RESOLVE-A',
      }),
    ).resolves.toEqual({
      taskKey: 'RESOLVE-A',
      title: 'Dependent task',
      status: 'ready',
      storyPoints: 3,
      dependencies: [
        {
          taskKey: 'RESOLVE-B',
          title: 'Resolved task',
          status: 'done',
          storyPoints: 8,
        },
      ],
    });
  });

  it('returns only the requested project’s blocked task and complete blocker chain', async () => {
    const t = createConvexTest();
    const projectId = await seedScenario(t, 'integration-blocker-chain', [
      {
        taskKey: 'CHAIN-A',
        title: 'Blocked task',
        status: 'blocked',
        storyPoints: 3,
        dependencies: ['CHAIN-B'],
        blockerReason: 'Waiting on CHAIN-B',
      },
      {
        taskKey: 'CHAIN-B',
        title: 'Immediate blocker',
        status: 'ready',
        storyPoints: 5,
        dependencies: ['CHAIN-C'],
      },
      { taskKey: 'CHAIN-C', title: 'Root blocker', status: 'in_progress', storyPoints: 2 },
    ]);
    await seedScenario(t, 'integration-blocker-foreign', [
      {
        taskKey: 'FOREIGN-A',
        title: 'Foreign blocked task',
        status: 'blocked',
        storyPoints: 13,
        dependencies: ['FOREIGN-B'],
        blockerReason: 'Waiting on FOREIGN-B',
      },
      { taskKey: 'FOREIGN-B', title: 'Foreign blocker', status: 'in_progress', storyPoints: 21 },
    ]);

    await expect(
      t.query(api.dependencies.getBlockedTasks, { projectId }),
    ).resolves.toEqual([
      {
        taskKey: 'CHAIN-A',
        title: 'Blocked task',
        status: 'blocked',
        updatedAt: 1_000,
        blockerChain: [
          {
            taskKey: 'CHAIN-B',
            title: 'Immediate blocker',
            status: 'ready',
            depth: 1,
          },
          {
            taskKey: 'CHAIN-C',
            title: 'Root blocker',
            status: 'in_progress',
            depth: 2,
          },
        ],
      },
    ]);
  });

  it('computes the active critical path without crossing project boundaries', async () => {
    const t = createConvexTest();
    const projectId = await seedScenario(t, 'integration-critical-path', [
      { taskKey: 'PATH-A', title: 'Foundation', status: 'ready', storyPoints: 2 },
      {
        taskKey: 'PATH-B',
        title: 'Heavier branch',
        status: 'ready',
        storyPoints: 9,
        dependencies: ['PATH-A'],
      },
      {
        taskKey: 'PATH-C',
        title: 'Lighter branch',
        status: 'ready',
        storyPoints: 4,
        dependencies: ['PATH-A'],
      },
      { taskKey: 'PATH-DONE', title: 'Completed work', status: 'done', storyPoints: 100 },
    ]);
    await seedScenario(t, 'integration-critical-path-foreign', [
      { taskKey: 'FOREIGN-PATH', title: 'Foreign work', status: 'ready', storyPoints: 500 },
    ]);

    await expect(
      t.query(api.dependencies.getCriticalPath, { projectId }),
    ).resolves.toEqual({
      path: ['PATH-A', 'PATH-B'],
      totalStoryPoints: 11,
      length: 2,
    });
  });

  it('unblocks only complete downstream branches and remains idempotent', async () => {
    const t = createConvexTest();
    await seedScenario(t, 'integration-unblock', [
      { taskKey: 'UNBLOCK-A', title: 'Completed task', status: 'done', storyPoints: 3 },
      {
        taskKey: 'UNBLOCK-B',
        title: 'Ready to unblock',
        status: 'blocked',
        storyPoints: 5,
        dependencies: ['UNBLOCK-A'],
        blockerReason: 'Waiting on UNBLOCK-A',
      },
      {
        taskKey: 'UNBLOCK-C',
        title: 'Still blocked',
        status: 'blocked',
        storyPoints: 2,
        dependencies: ['UNBLOCK-A', 'UNBLOCK-D'],
        blockerReason: 'Waiting on UNBLOCK-A',
      },
      { taskKey: 'UNBLOCK-D', title: 'Incomplete dependency', status: 'in_progress', storyPoints: 1 },
    ]);

    await expect(
      t.mutation(api.dependencies.checkAndUnblockDownstream, {
        completedTaskKey: 'UNBLOCK-A',
      }),
    ).resolves.toEqual({ unblocked: ['UNBLOCK-B'] });
    expect(await getTaskByKey(t, 'UNBLOCK-B')).toMatchObject({
      status: 'ready',
    });
    expect(await getTaskByKey(t, 'UNBLOCK-C')).toMatchObject({
      status: 'blocked',
      blockerReason: 'Waiting on UNBLOCK-A',
    });

    await expect(
      t.mutation(api.dependencies.checkAndUnblockDownstream, {
        completedTaskKey: 'UNBLOCK-A',
      }),
    ).resolves.toEqual({ unblocked: [] });
  });
});
