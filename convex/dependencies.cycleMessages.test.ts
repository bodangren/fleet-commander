/**
 * Phase 6 verification — exact error-string contract for `addTaskDependency`.
 *
 * Encodes the Phase 6 manual checklist item:
 *
 *   "Manual test: attempt to create circular dependency, verify mutation
 *    rejects with clear error"
 *
 * The mutation's `error` field is surfaced verbatim by the Phase 3
 * `DependencyEditor` component (see
 * `frontend/src/components/kanban/DependencyEditor.test.tsx` — the
 * `role="alert"` Red gate checks for `"Adding this dependency would create
 * a cycle"`). If the production handler ever changes the error string, the
 * UI breaks silently. These tests pin the exact contract.
 *
 * The Red phase writes only the test; the Green phase is responsible for
 * keeping the strings stable (or updating both sides in lock-step).
 *
 * No production source code is modified in this commit.
 */

import { describe, expect, it } from 'bun:test';

import { addTaskDependency, removeTaskDependency } from './dependencies';
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
  seed: { taskKey: string; title: string; status: TaskStatus; storyPoints: number },
): string {
  return ctx.db.insert('tasks', {
    projectId,
    title: seed.title,
    description: `desc-${seed.taskKey}`,
    storyPoints: seed.storyPoints,
    status: seed.status,
    priority: 'medium',
    costEstimate: 0,
    createdAt: 1_000,
    updatedAt: 1_000,
    taskKey: seed.taskKey,
    dependencies: [],
  });
}

describe('Phase 6 verification — addTaskDependency error string contract', () => {
  it('rejects self-dependency with the exact "Cannot add self-dependency" string', async () => {
    const ctx = makeCtx();
    const projectId = 'project-cycle-msg-self';
    seedTask(ctx, projectId, { taskKey: 'A', title: 'A', status: 'ready', storyPoints: 3 });

    const result = await addTaskDependency(ctx, { taskKey: 'A', dependencyKey: 'A' });
    expect(result.ok).toBe(false);
    expect(result.error).toBe('Cannot add self-dependency');
  });

  it('rejects 2-node cycle (A->B, then B->A) with the exact cycle string DependencyEditor surfaces', async () => {
    const ctx = makeCtx();
    const projectId = 'project-cycle-msg-2node';
    seedTask(ctx, projectId, { taskKey: 'A', title: 'A', status: 'ready', storyPoints: 3 });
    seedTask(ctx, projectId, { taskKey: 'B', title: 'B', status: 'ready', storyPoints: 3 });

    expect((await addTaskDependency(ctx, { taskKey: 'A', dependencyKey: 'B' })).ok).toBe(true);
    const second = await addTaskDependency(ctx, { taskKey: 'B', dependencyKey: 'A' });
    expect(second.ok).toBe(false);
    expect(second.error).toBe('Adding this dependency would create a cycle');
  });

  it('rejects 3-node cycle (A->B->C, then C->A) with the exact cycle string', async () => {
    const ctx = makeCtx();
    const projectId = 'project-cycle-msg-3node';
    seedTask(ctx, projectId, { taskKey: 'A', title: 'A', status: 'ready', storyPoints: 3 });
    seedTask(ctx, projectId, { taskKey: 'B', title: 'B', status: 'ready', storyPoints: 3 });
    seedTask(ctx, projectId, { taskKey: 'C', title: 'C', status: 'ready', storyPoints: 3 });

    expect((await addTaskDependency(ctx, { taskKey: 'B', dependencyKey: 'A' })).ok).toBe(true);
    expect((await addTaskDependency(ctx, { taskKey: 'C', dependencyKey: 'B' })).ok).toBe(true);
    const cycle = await addTaskDependency(ctx, { taskKey: 'A', dependencyKey: 'C' });
    expect(cycle.ok).toBe(false);
    expect(cycle.error).toBe('Adding this dependency would create a cycle');
  });

  it('rejects transitive cycle (B->A->...->B) with the exact cycle string', async () => {
    const ctx = makeCtx();
    const projectId = 'project-cycle-msg-transitive';
    seedTask(ctx, projectId, { taskKey: 'A', title: 'A', status: 'ready', storyPoints: 3 });
    seedTask(ctx, projectId, { taskKey: 'B', title: 'B', status: 'ready', storyPoints: 3 });
    seedTask(ctx, projectId, { taskKey: 'C', title: 'C', status: 'ready', storyPoints: 3 });
    seedTask(ctx, projectId, { taskKey: 'D', title: 'D', status: 'ready', storyPoints: 3 });

    expect((await addTaskDependency(ctx, { taskKey: 'B', dependencyKey: 'A' })).ok).toBe(true);
    expect((await addTaskDependency(ctx, { taskKey: 'C', dependencyKey: 'B' })).ok).toBe(true);
    expect((await addTaskDependency(ctx, { taskKey: 'D', dependencyKey: 'C' })).ok).toBe(true);
    const cycle = await addTaskDependency(ctx, { taskKey: 'A', dependencyKey: 'D' });
    expect(cycle.ok).toBe(false);
    expect(cycle.error).toBe('Adding this dependency would create a cycle');
  });

  it('rejects missing taskKey with the exact "Task <key> not found" string (includes the key)', async () => {
    const ctx = makeCtx();
    const projectId = 'project-cycle-msg-missing';
    seedTask(ctx, projectId, { taskKey: 'B', title: 'B', status: 'ready', storyPoints: 3 });

    const result = await addTaskDependency(ctx, { taskKey: 'GHOST', dependencyKey: 'B' });
    expect(result.ok).toBe(false);
    expect(result.error).toBe('Task GHOST not found');
  });

  it('rejects missing dependencyKey with the exact "Dependency task <key> not found" string', async () => {
    const ctx = makeCtx();
    const projectId = 'project-cycle-msg-missing-dep';
    seedTask(ctx, projectId, { taskKey: 'A', title: 'A', status: 'ready', storyPoints: 3 });

    const result = await addTaskDependency(ctx, { taskKey: 'A', dependencyKey: 'PHANTOM' });
    expect(result.ok).toBe(false);
    expect(result.error).toBe('Dependency task PHANTOM not found');
  });

  it('rejects a duplicate dependency add with the exact "Dependency already exists" string', async () => {
    const ctx = makeCtx();
    const projectId = 'project-cycle-msg-dup';
    seedTask(ctx, projectId, { taskKey: 'A', title: 'A', status: 'ready', storyPoints: 3 });
    seedTask(ctx, projectId, { taskKey: 'B', title: 'B', status: 'ready', storyPoints: 3 });

    expect((await addTaskDependency(ctx, { taskKey: 'A', dependencyKey: 'B' })).ok).toBe(true);
    const second = await addTaskDependency(ctx, { taskKey: 'A', dependencyKey: 'B' });
    expect(second.ok).toBe(false);
    expect(second.error).toBe('Dependency already exists');
  });
});

describe('Phase 6 verification — removeTaskDependency error string contract', () => {
  it('rejects unknown task with the exact "Task <key> not found" string', async () => {
    const ctx = makeCtx();
    const result = await removeTaskDependency(ctx, {
      taskKey: 'NOPE',
      dependencyKey: 'B',
    });
    expect(result.ok).toBe(false);
    expect(result.error).toBe('Task NOPE not found');
  });

  it('rejects missing edge with the exact "Dependency does not exist" string', async () => {
    const ctx = makeCtx();
    const projectId = 'project-cycle-msg-rm-missing';
    seedTask(ctx, projectId, { taskKey: 'A', title: 'A', status: 'ready', storyPoints: 3 });
    seedTask(ctx, projectId, { taskKey: 'B', title: 'B', status: 'ready', storyPoints: 3 });

    const result = await removeTaskDependency(ctx, { taskKey: 'A', dependencyKey: 'B' });
    expect(result.ok).toBe(false);
    expect(result.error).toBe('Dependency does not exist');
  });
});
