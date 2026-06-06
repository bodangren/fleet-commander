/**
 * Phase 6 verification — end-to-end dependency cycle (test-strategy §3 item 3).
 *
 * Encodes the Phase 6 manual checklist item:
 *
 *   "Manual test: create 3 tasks with dependencies, verify kanban badges,
 *    verify blocker dashboard, complete blocker, verify unblock"
 *
 * The dashboard, kanban cards, and detail panel all derive their state from
 * `addTaskDependency` / `getBlockedTasks` / `checkAndUnblockDownstream`.
 * This file exercises the full cycle through the production handlers against
 * the in-memory mock context, so any regression in the wired behaviour shows
 * up here without needing a live Convex deployment.
 *
 * Red phase: every assertion in this file is contract-level (the production
 * handlers must return these values). If a Green-phase change breaks the
 * cycle (e.g. silently drops the dependency, fails to transition status,
 * or stops computing the blocker chain), these tests will fail loudly.
 *
 * No production source code is modified in this commit.
 */

import { describe, expect, it } from 'bun:test';

import {
  addTaskDependency,
  checkAndUnblockDownstream,
  getBlockedTasks,
} from './dependencies';
import { createMockCtx } from './__fixtures__/foundation';

type TaskStatus = 'backlog' | 'ready' | 'in_progress' | 'review' | 'done' | 'blocked';

function makeCtx() {
  const { db } = createMockCtx();
  return {
    db,
    auth: { getUserIdentity: async () => null },
  } as any;
}

function seedTask(
  ctx: any,
  projectId: string,
  seed: {
    taskKey: string;
    title: string;
    status: TaskStatus;
    storyPoints: number;
  },
): string {
  const now = 1_000;
  return ctx.db.insert('tasks', {
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

async function getTaskByKey(ctx: any, taskKey: string) {
  return ctx.db
    .query('tasks')
    .withIndex('by_task_key', (q: any) => q.eq('taskKey', taskKey))
    .unique();
}

describe('Phase 6 verification — end-to-end dependency cycle', () => {
  it('creates 3 tasks, links A→B and A→C, and surfaces B/C on the blockers dashboard', async () => {
    const ctx = makeCtx();
    const projectId = 'project-verify-cycle';

    seedTask(ctx, projectId, { taskKey: 'A', title: 'Foundation', status: 'ready', storyPoints: 3 });
    seedTask(ctx, projectId, { taskKey: 'B', title: 'Feature B', status: 'ready', storyPoints: 5 });
    seedTask(ctx, projectId, { taskKey: 'C', title: 'Feature C', status: 'ready', storyPoints: 2 });

    const addB = await addTaskDependency(ctx, { taskKey: 'B', dependencyKey: 'A' });
    expect(addB.ok).toBe(true);
    const addC = await addTaskDependency(ctx, { taskKey: 'C', dependencyKey: 'A' });
    expect(addC.ok).toBe(true);

    const blocked = await getBlockedTasks(ctx, { projectId });
    const keys = blocked.map((b: any) => b.taskKey).sort();
    expect(keys).toEqual(['B', 'C']);

    const bEntry = blocked.find((b: any) => b.taskKey === 'B');
    const cEntry = blocked.find((b: any) => b.taskKey === 'C');
    expect(bEntry?.blockerChain.map((m: any) => m.taskKey)).toContain('A');
    expect(cEntry?.blockerChain.map((m: any) => m.taskKey)).toContain('A');
  });

  it('transitions B and C to status=blocked so the kanban card surfaces a BLOCKED badge', async () => {
    const ctx = makeCtx();
    const projectId = 'project-verify-cycle-2';
    seedTask(ctx, projectId, { taskKey: 'A', title: 'A', status: 'ready', storyPoints: 3 });
    seedTask(ctx, projectId, { taskKey: 'B', title: 'B', status: 'ready', storyPoints: 5 });
    seedTask(ctx, projectId, { taskKey: 'C', title: 'C', status: 'ready', storyPoints: 2 });

    await addTaskDependency(ctx, { taskKey: 'B', dependencyKey: 'A' });
    await addTaskDependency(ctx, { taskKey: 'C', dependencyKey: 'A' });

    const b = await getTaskByKey(ctx, 'B');
    const c = await getTaskByKey(ctx, 'C');
    expect(b.status).toBe('blocked');
    expect(c.status).toBe('blocked');
    expect(b.blockerReason).toBeDefined();
    expect(c.blockerReason).toBeDefined();
  });

  it('does NOT transition a task to blocked when its only dependency is already done', async () => {
    const ctx = makeCtx();
    const projectId = 'project-verify-cycle-3';
    seedTask(ctx, projectId, { taskKey: 'A', title: 'A', status: 'done', storyPoints: 3 });
    seedTask(ctx, projectId, { taskKey: 'B', title: 'B', status: 'ready', storyPoints: 5 });

    const add = await addTaskDependency(ctx, { taskKey: 'B', dependencyKey: 'A' });
    expect(add.ok).toBe(true);

    const b = await getTaskByKey(ctx, 'B');
    expect(b.status).toBe('ready');
    expect(b.blockerReason).toBeUndefined();

    const blocked = await getBlockedTasks(ctx, { projectId });
    expect(blocked.map((t: any) => t.taskKey)).not.toContain('B');
  });

  it('completes the blocker and surfaces B/C as unblocked (status→ready) on the dashboard', async () => {
    const ctx = makeCtx();
    const projectId = 'project-verify-cycle-4';
    seedTask(ctx, projectId, { taskKey: 'A', title: 'A', status: 'in_progress', storyPoints: 3 });
    seedTask(ctx, projectId, { taskKey: 'B', title: 'B', status: 'ready', storyPoints: 5 });
    seedTask(ctx, projectId, { taskKey: 'C', title: 'C', status: 'ready', storyPoints: 2 });

    await addTaskDependency(ctx, { taskKey: 'B', dependencyKey: 'A' });
    await addTaskDependency(ctx, { taskKey: 'C', dependencyKey: 'A' });

    const before = await getBlockedTasks(ctx, { projectId });
    expect(before.map((t: any) => t.taskKey).sort()).toEqual(['B', 'C']);

    const aDoc = await getTaskByKey(ctx, 'A');
    await ctx.db.patch(aDoc._id, { status: 'done', updatedAt: Date.now() });

    const result = await checkAndUnblockDownstream(ctx, { completedTaskKey: 'A' });
    expect(result.unblocked.sort()).toEqual(['B', 'C']);

    const after = await getBlockedTasks(ctx, { projectId });
    expect(after).toEqual([]);

    const b = await getTaskByKey(ctx, 'B');
    const c = await getTaskByKey(ctx, 'C');
    expect(b.status).toBe('ready');
    expect(c.status).toBe('ready');
    expect(b.blockerReason).toBeUndefined();
    expect(c.blockerReason).toBeUndefined();
  });

  it('unblocks only the dependents whose remaining blockers are all done (partial unblock)', async () => {
    const ctx = makeCtx();
    const projectId = 'project-verify-cycle-5';
    seedTask(ctx, projectId, { taskKey: 'A', title: 'A', status: 'in_progress', storyPoints: 3 });
    seedTask(ctx, projectId, { taskKey: 'D', title: 'D', status: 'ready', storyPoints: 3 });
    seedTask(ctx, projectId, { taskKey: 'C', title: 'C', status: 'ready', storyPoints: 3 });

    await addTaskDependency(ctx, { taskKey: 'C', dependencyKey: 'A' });
    await addTaskDependency(ctx, { taskKey: 'C', dependencyKey: 'D' });

    const aDoc = await getTaskByKey(ctx, 'A');
    await ctx.db.patch(aDoc._id, { status: 'done', updatedAt: Date.now() });

    const result = await checkAndUnblockDownstream(ctx, { completedTaskKey: 'A' });
    expect(result.unblocked).toEqual([]);
    const c = await getTaskByKey(ctx, 'C');
    expect(c.status).toBe('blocked');
  });
});
