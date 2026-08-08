/**
 * Runtime contracts for dependency-cycle and blocker messages.
 *
 * These messages are returned directly by registered mutations and surfaced
 * verbatim in the dependency editor, so changes need explicit coverage against
 * the real schema, indexes, and authentication boundary.
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
};

type ConvexTest = ReturnType<typeof createConvexTest>;

/**
 * Inserts a schema-valid project and its task graph for a single runtime test.
 *
 * @param t - Isolated Convex runtime backend.
 * @param projectSlug - Project name and slug used by the seeded rows.
 * @param tasks - Task rows to persist before exercising registered mutations.
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
        dependencies: [],
        createdAt: now,
        updatedAt: now,
      });
    }

    return projectId;
  });
}

/**
 * Reads one task through the production unique index.
 *
 * @param t - Isolated Convex runtime backend.
 * @param taskKey - Unique task key to resolve.
 * @returns The stored task, if present.
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

describe('dependency cycle and blocker runtime message contracts', () => {
  it('rejects dependency mutations without identity and preserves task state', async () => {
    const t = createUnauthenticatedConvexTest();
    await seedScenario(t, 'cycle-message-auth', [
      { taskKey: 'A', title: 'Task A', status: 'ready', storyPoints: 3 },
      { taskKey: 'B', title: 'Task B', status: 'ready', storyPoints: 3 },
    ]);

    await expect(
      t.mutation(api.dependencies.addTaskDependency, {
        taskKey: 'A',
        dependencyKey: 'B',
      }),
    ).rejects.toThrow('Authentication required');

    expect(await getTaskByKey(t, 'A')).toMatchObject({
      status: 'ready',
      dependencies: [],
    });
  });

  it('accepts the shared authenticated identity', async () => {
    const t = createConvexTest();

    expect(await t.run((ctx) => ctx.auth.getUserIdentity())).toMatchObject({
      tokenIdentifier: 'test-user',
      subject: 'test-user',
    });
  });

  it('returns the exact self-dependency message', async () => {
    const t = createConvexTest();

    const result = await t.mutation(api.dependencies.addTaskDependency, {
      taskKey: 'A',
      dependencyKey: 'A',
    });

    expect(result).toEqual({
      ok: false,
      error: 'Cannot add self-dependency',
    });
  });

  it('returns the exact two-node cycle message surfaced by DependencyEditor', async () => {
    const t = createConvexTest();
    await seedScenario(t, 'cycle-message-two-node', [
      { taskKey: 'A', title: 'Task A', status: 'ready', storyPoints: 3 },
      { taskKey: 'B', title: 'Task B', status: 'ready', storyPoints: 3 },
    ]);

    expect(
      await t.mutation(api.dependencies.addTaskDependency, {
        taskKey: 'A',
        dependencyKey: 'B',
      }),
    ).toEqual({ ok: true });

    expect(
      await t.mutation(api.dependencies.addTaskDependency, {
        taskKey: 'B',
        dependencyKey: 'A',
      }),
    ).toEqual({
      ok: false,
      error: 'Adding this dependency would create a cycle',
    });
  });

  it('returns the exact three-node cycle message', async () => {
    const t = createConvexTest();
    await seedScenario(t, 'cycle-message-three-node', [
      { taskKey: 'A', title: 'Task A', status: 'ready', storyPoints: 3 },
      { taskKey: 'B', title: 'Task B', status: 'ready', storyPoints: 3 },
      { taskKey: 'C', title: 'Task C', status: 'ready', storyPoints: 3 },
    ]);

    await t.mutation(api.dependencies.addTaskDependency, {
      taskKey: 'B',
      dependencyKey: 'A',
    });
    await t.mutation(api.dependencies.addTaskDependency, {
      taskKey: 'C',
      dependencyKey: 'B',
    });

    expect(
      await t.mutation(api.dependencies.addTaskDependency, {
        taskKey: 'A',
        dependencyKey: 'C',
      }),
    ).toEqual({
      ok: false,
      error: 'Adding this dependency would create a cycle',
    });
  });

  it('returns the exact transitive-cycle message', async () => {
    const t = createConvexTest();
    await seedScenario(t, 'cycle-message-transitive', [
      { taskKey: 'A', title: 'Task A', status: 'ready', storyPoints: 3 },
      { taskKey: 'B', title: 'Task B', status: 'ready', storyPoints: 3 },
      { taskKey: 'C', title: 'Task C', status: 'ready', storyPoints: 3 },
      { taskKey: 'D', title: 'Task D', status: 'ready', storyPoints: 3 },
    ]);

    await t.mutation(api.dependencies.addTaskDependency, {
      taskKey: 'B',
      dependencyKey: 'A',
    });
    await t.mutation(api.dependencies.addTaskDependency, {
      taskKey: 'C',
      dependencyKey: 'B',
    });
    await t.mutation(api.dependencies.addTaskDependency, {
      taskKey: 'D',
      dependencyKey: 'C',
    });

    expect(
      await t.mutation(api.dependencies.addTaskDependency, {
        taskKey: 'A',
        dependencyKey: 'D',
      }),
    ).toEqual({
      ok: false,
      error: 'Adding this dependency would create a cycle',
    });
  });

  it('returns exact missing-task and missing-dependency messages', async () => {
    const t = createConvexTest();
    await seedScenario(t, 'cycle-message-missing', [
      { taskKey: 'A', title: 'Task A', status: 'ready', storyPoints: 3 },
      { taskKey: 'B', title: 'Task B', status: 'ready', storyPoints: 3 },
    ]);

    expect(
      await t.mutation(api.dependencies.addTaskDependency, {
        taskKey: 'GHOST',
        dependencyKey: 'B',
      }),
    ).toEqual({ ok: false, error: 'Task GHOST not found' });
    expect(
      await t.mutation(api.dependencies.addTaskDependency, {
        taskKey: 'A',
        dependencyKey: 'PHANTOM',
      }),
    ).toEqual({
      ok: false,
      error: 'Dependency task PHANTOM not found',
    });
  });

  it('returns the exact duplicate-dependency message', async () => {
    const t = createConvexTest();
    await seedScenario(t, 'cycle-message-duplicate', [
      { taskKey: 'A', title: 'Task A', status: 'ready', storyPoints: 3 },
      { taskKey: 'B', title: 'Task B', status: 'ready', storyPoints: 3 },
    ]);

    await t.mutation(api.dependencies.addTaskDependency, {
      taskKey: 'A',
      dependencyKey: 'B',
    });

    expect(
      await t.mutation(api.dependencies.addTaskDependency, {
        taskKey: 'A',
        dependencyKey: 'B',
      }),
    ).toEqual({ ok: false, error: 'Dependency already exists' });
  });

  it('persists the exact blocker message when adding an incomplete dependency', async () => {
    const t = createConvexTest();
    await seedScenario(t, 'cycle-message-blocker', [
      { taskKey: 'A', title: 'Task A', status: 'ready', storyPoints: 3 },
      { taskKey: 'B', title: 'Task B', status: 'in_progress', storyPoints: 3 },
    ]);

    expect(
      await t.mutation(api.dependencies.addTaskDependency, {
        taskKey: 'A',
        dependencyKey: 'B',
      }),
    ).toEqual({ ok: true });

    expect(await getTaskByKey(t, 'A')).toMatchObject({
      dependencies: ['B'],
      status: 'blocked',
      blockerReason: 'Waiting on B',
    });
  });

  it('returns exact remove-mutation messages for an unknown task and a missing edge', async () => {
    const t = createConvexTest();
    await seedScenario(t, 'cycle-message-remove', [
      { taskKey: 'A', title: 'Task A', status: 'ready', storyPoints: 3 },
      { taskKey: 'B', title: 'Task B', status: 'ready', storyPoints: 3 },
    ]);

    expect(
      await t.mutation(api.dependencies.removeTaskDependency, {
        taskKey: 'NOPE',
        dependencyKey: 'B',
      }),
    ).toEqual({ ok: false, error: 'Task NOPE not found' });
    expect(
      await t.mutation(api.dependencies.removeTaskDependency, {
        taskKey: 'A',
        dependencyKey: 'B',
      }),
    ).toEqual({ ok: false, error: 'Dependency does not exist' });
  });
});
