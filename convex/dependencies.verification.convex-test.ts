/**
 * Phase 6 verification — end-to-end dependency cycle (test-strategy §3 item 3).
 *
 * This suite intentionally runs through the registered Convex functions in
 * the edge-compatible `convex-test` runtime. The schema, indexes, argument
 * validators, and authenticated identity are therefore exercised together.
 */

import { api } from './_generated/api';
import type { Doc, Id } from './_generated/dataModel';
import {
  createConvexTest,
  createUnauthenticatedConvexTest,
} from '../test/convexTest';
import { describe, expect, it } from 'vitest';

type TaskStatus = 'backlog' | 'ready' | 'in_progress' | 'review' | 'done' | 'blocked';

type TaskSeed = {
  taskKey: string;
  title: string;
  status: TaskStatus;
  storyPoints: number;
};

type ConvexTest = ReturnType<typeof createConvexTest>;

async function seedScenario(
  t: ConvexTest,
  projectSlug: string,
  seeds: TaskSeed[],
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

    for (const seed of seeds) {
      await ctx.db.insert('tasks', {
        projectId,
        title: seed.title,
        description: `desc-${seed.taskKey}`,
        storyPoints: seed.storyPoints,
        status: seed.status,
        priority: 'medium',
        costEstimate: 0,
        createdAt: now,
        updatedAt: now,
        taskKey: seed.taskKey,
        dependencies: [],
      });
    }

    return projectId;
  });
}

async function getTaskByKey(t: ConvexTest, taskKey: string): Promise<Doc<'tasks'> | null> {
  return t.run(async (ctx) =>
    ctx.db
      .query('tasks')
      .withIndex('by_task_key', (q) => q.eq('taskKey', taskKey))
      .unique(),
  );
}

describe('Phase 6 verification — end-to-end dependency cycle', () => {
  it('rejects dependency mutations without an authenticated identity', async () => {
    const t = createUnauthenticatedConvexTest();
    await seedScenario(t, 'project-verify-auth', [
      { taskKey: 'A', title: 'A', status: 'ready', storyPoints: 3 },
      { taskKey: 'B', title: 'B', status: 'ready', storyPoints: 3 },
    ]);

    await expect(
      t.mutation(api.dependencies.addTaskDependency, {
        taskKey: 'B',
        dependencyKey: 'A',
      }),
    ).rejects.toThrow(/Authentication required/);
  });

  it('creates 3 tasks, links A→B and A→C, and surfaces B/C on the blockers dashboard', async () => {
    const t = createConvexTest();
    const projectId = await seedScenario(t, 'project-verify-cycle', [
      { taskKey: 'A', title: 'Foundation', status: 'ready', storyPoints: 3 },
      { taskKey: 'B', title: 'Feature B', status: 'ready', storyPoints: 5 },
      { taskKey: 'C', title: 'Feature C', status: 'ready', storyPoints: 2 },
    ]);

    const addB = await t.mutation(api.dependencies.addTaskDependency, {
      taskKey: 'B',
      dependencyKey: 'A',
    });
    expect(addB.ok).toBe(true);
    const addC = await t.mutation(api.dependencies.addTaskDependency, {
      taskKey: 'C',
      dependencyKey: 'A',
    });
    expect(addC.ok).toBe(true);

    const blocked = await t.query(api.dependencies.getBlockedTasks, { projectId });
    const keys = blocked.map((b) => b.taskKey).sort();
    expect(keys).toEqual(['B', 'C']);

    const bEntry = blocked.find((b) => b.taskKey === 'B');
    const cEntry = blocked.find((b) => b.taskKey === 'C');
    expect(bEntry?.blockerChain.map((m) => m.taskKey)).toContain('A');
    expect(cEntry?.blockerChain.map((m) => m.taskKey)).toContain('A');
  });

  it('transitions B and C to status=blocked so the kanban card surfaces a BLOCKED badge', async () => {
    const t = createConvexTest();
    await seedScenario(t, 'project-verify-cycle-2', [
      { taskKey: 'A', title: 'A', status: 'ready', storyPoints: 3 },
      { taskKey: 'B', title: 'B', status: 'ready', storyPoints: 5 },
      { taskKey: 'C', title: 'C', status: 'ready', storyPoints: 2 },
    ]);

    await t.mutation(api.dependencies.addTaskDependency, {
      taskKey: 'B',
      dependencyKey: 'A',
    });
    await t.mutation(api.dependencies.addTaskDependency, {
      taskKey: 'C',
      dependencyKey: 'A',
    });

    const b = await getTaskByKey(t, 'B');
    const c = await getTaskByKey(t, 'C');
    expect(b?.status).toBe('blocked');
    expect(c?.status).toBe('blocked');
    expect(b?.blockerReason).toBeDefined();
    expect(c?.blockerReason).toBeDefined();
  });

  it('does NOT transition a task to blocked when its only dependency is already done', async () => {
    const t = createConvexTest();
    const projectId = await seedScenario(t, 'project-verify-cycle-3', [
      { taskKey: 'A', title: 'A', status: 'done', storyPoints: 3 },
      { taskKey: 'B', title: 'B', status: 'ready', storyPoints: 5 },
    ]);

    const add = await t.mutation(api.dependencies.addTaskDependency, {
      taskKey: 'B',
      dependencyKey: 'A',
    });
    expect(add.ok).toBe(true);

    const b = await getTaskByKey(t, 'B');
    expect(b?.status).toBe('ready');
    expect(b?.blockerReason).toBeUndefined();

    const blocked = await t.query(api.dependencies.getBlockedTasks, { projectId });
    expect(blocked.map((task) => task.taskKey)).not.toContain('B');
  });

  it('completes the blocker and surfaces B/C as unblocked (status→ready) on the dashboard', async () => {
    const t = createConvexTest();
    const projectId = await seedScenario(t, 'project-verify-cycle-4', [
      { taskKey: 'A', title: 'A', status: 'in_progress', storyPoints: 3 },
      { taskKey: 'B', title: 'B', status: 'ready', storyPoints: 5 },
      { taskKey: 'C', title: 'C', status: 'ready', storyPoints: 2 },
    ]);

    await t.mutation(api.dependencies.addTaskDependency, {
      taskKey: 'B',
      dependencyKey: 'A',
    });
    await t.mutation(api.dependencies.addTaskDependency, {
      taskKey: 'C',
      dependencyKey: 'A',
    });

    const before = await t.query(api.dependencies.getBlockedTasks, { projectId });
    expect(before.map((task) => task.taskKey).sort()).toEqual(['B', 'C']);

    const aDoc = await getTaskByKey(t, 'A');
    expect(aDoc).not.toBeNull();
    await t.run(async (ctx) => {
      await ctx.db.patch(aDoc!._id, { status: 'done', updatedAt: Date.now() });
    });

    const result = await t.mutation(api.dependencies.checkAndUnblockDownstream, {
      completedTaskKey: 'A',
    });
    expect(result.unblocked.sort()).toEqual(['B', 'C']);

    const after = await t.query(api.dependencies.getBlockedTasks, { projectId });
    expect(after).toEqual([]);

    const b = await getTaskByKey(t, 'B');
    const c = await getTaskByKey(t, 'C');
    expect(b?.status).toBe('ready');
    expect(c?.status).toBe('ready');
    expect(b?.blockerReason).toBeUndefined();
    expect(c?.blockerReason).toBeUndefined();
  });

  it('unblocks only dependents whose remaining blockers are all done (partial unblock)', async () => {
    const t = createConvexTest();
    await seedScenario(t, 'project-verify-cycle-5', [
      { taskKey: 'A', title: 'A', status: 'in_progress', storyPoints: 3 },
      { taskKey: 'D', title: 'D', status: 'ready', storyPoints: 3 },
      { taskKey: 'C', title: 'C', status: 'ready', storyPoints: 3 },
    ]);

    await t.mutation(api.dependencies.addTaskDependency, {
      taskKey: 'C',
      dependencyKey: 'A',
    });
    await t.mutation(api.dependencies.addTaskDependency, {
      taskKey: 'C',
      dependencyKey: 'D',
    });

    const aDoc = await getTaskByKey(t, 'A');
    expect(aDoc).not.toBeNull();
    await t.run(async (ctx) => {
      await ctx.db.patch(aDoc!._id, { status: 'done', updatedAt: Date.now() });
    });

    const result = await t.mutation(api.dependencies.checkAndUnblockDownstream, {
      completedTaskKey: 'A',
    });
    expect(result.unblocked).toEqual([]);
    const c = await getTaskByKey(t, 'C');
    expect(c?.status).toBe('blocked');
  });
});
