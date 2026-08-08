/**
 * Registered-runtime contracts for task CRUD, assignment, claiming, and
 * canonical task state.
 *
 * These scenarios use the production schema, indexes, generated IDs, and
 * registered Convex APIs. Database writes are limited to schema-valid setup;
 * behavior is exercised through the public function references.
 */

import { describe, expect, it } from 'vitest';
import { api } from './_generated/api';
import {
  createConvexTest,
  createUnauthenticatedConvexTest,
} from '../test/convexTest';
import {
  seedAgent,
  seedProject,
  seedSprint,
  seedTask,
} from '../test/convexDomainSeeds';

describe('task-domain core registered runtime contracts', () => {
  it('rejects unauthenticated fleet task-domain reads', async () => {
    const t = createUnauthenticatedConvexTest();
    await expect(
      t.query(api.fleet.getActiveSprintForProject, {
        projectSlug: 'unauthenticated-task-domain',
      }),
    ).rejects.toThrow('Authentication required');
    await expect(
      t.query(api.fleet.getTasksForSprint, {
        projectSlug: 'unauthenticated-task-domain',
        taskKeys: ['TASK-1'],
      }),
    ).rejects.toThrow('Authentication required');
  });

  it('runs task CRUD, canonical status transitions, and indexed listing', async () => {
    const t = createConvexTest();
    const projectId = await seedProject(t, 'task-crud-runtime');

    const firstId = await t.mutation(api.tasks.createTaskHandler, {
      projectId,
      title: 'First runtime task',
      description: 'First description',
      storyPoints: 3,
      priority: 'high',
    });
    const secondId = await t.mutation(api.tasks.createTaskHandler, {
      projectId,
      title: 'Second runtime task',
      description: 'Second description',
      storyPoints: 5,
      priority: 'medium',
    });

    const listed = await t.query(api.tasks.listTasksHandler, { projectId });
    expect(listed).toHaveLength(2);
    expect(listed.map((task) => task.title)).toEqual([
      'Second runtime task',
      'First runtime task',
    ]);
    expect(listed[0]).not.toHaveProperty('_creationTime');

    await t.mutation(api.tasks.updateTaskHandler, {
      id: firstId,
      title: 'Updated runtime task',
      storyPoints: 8,
      priority: 'low',
    });
    expect(await t.query(api.tasks.getTaskHandler, { id: firstId })).toMatchObject({
      _id: firstId,
      title: 'Updated runtime task',
      description: 'First description',
      storyPoints: 8,
      priority: 'low',
    });

    for (const status of [
      'ready',
      'in_progress',
      'review',
      'done',
      'blocked',
      'ready',
    ] as const) {
      await t.mutation(api.tasks.updateTaskStatusHandler, {
        id: firstId,
        status,
      });
    }
    expect(await t.query(api.tasks.getTaskHandler, { id: firstId })).toMatchObject({
      _id: firstId,
      status: 'ready',
    });
    expect(await t.query(api.tasks.getTaskHandler, { id: secondId })).toMatchObject({
      _id: secondId,
      title: 'Second runtime task',
    });
  });

  it('assigns by real agent IDs, enforces workload, and moves only to active sprints', async () => {
    const t = createConvexTest();
    const projectId = await seedProject(t, 'task-mutation-runtime');
    const activeSprintId = await seedSprint(t, projectId, 'active', 'Active runtime sprint');
    const plannedSprintId = await seedSprint(t, projectId, 'planned', 'Planned runtime sprint');
    const agentId = await seedAgent(t, 'runtime-executor', 0, 1, 2.1);
    const taskId = await seedTask(t, {
      projectId,
      title: 'Assignable task',
      status: 'ready',
    });

    await t.mutation(api.tasks.assignTaskHandler, { taskId, agentId });
    expect(await t.run((ctx) => ctx.db.get(taskId))).toMatchObject({
      assigneeId: agentId,
      costEstimate: 8.4,
    });
    expect(await t.run((ctx) => ctx.db.get(agentId))).toMatchObject({ workload: 1 });

    const blockedTaskId = await seedTask(t, {
      projectId,
      title: 'Workload-limited task',
    });
    await expect(
      t.mutation(api.tasks.assignTaskHandler, { taskId: blockedTaskId, agentId }),
    ).rejects.toThrow('Agent workload exceeded');

    await t.mutation(api.tasks.moveTaskHandler, {
      taskId,
      sprintId: activeSprintId,
    });
    expect(await t.run((ctx) => ctx.db.get(taskId))).toMatchObject({
      sprintId: activeSprintId,
    });
    await expect(
      t.mutation(api.tasks.moveTaskHandler, {
        taskId,
        sprintId: plannedSprintId,
      }),
    ).rejects.toThrow('Sprint is not active');
  });

  it('claims through the task-key index and rejects stale or cross-project claims', async () => {
    const t = createConvexTest();
    const projectId = await seedProject(t, 'claim-runtime');
    await seedTask(t, {
      projectId,
      title: 'Claimable task',
      status: 'ready',
      projectSlug: 'claim-runtime',
      trackId: 'claim-track',
      taskKey: 'CLAIM-1',
    });

    await expect(
      t.mutation(api.tasks.claimTaskForExecution, {
        projectSlug: 'claim-runtime',
        trackId: 'claim-track',
        taskKey: 'CLAIM-1',
        expectedStatus: 'ready',
        runId: 'run-1',
      }),
    ).resolves.toMatchObject({ claimed: true, currentStatus: 'in_progress' });
    expect(
      await t.run((ctx) =>
        ctx.db
          .query('tasks')
          .withIndex('by_task_key', (q) => q.eq('taskKey', 'CLAIM-1'))
          .unique(),
      ),
    ).toMatchObject({ status: 'in_progress', claimedByRunId: 'run-1' });

    await expect(
      t.mutation(api.tasks.claimTaskForExecution, {
        projectSlug: 'claim-runtime',
        trackId: 'claim-track',
        taskKey: 'CLAIM-1',
        expectedStatus: 'ready',
        runId: 'run-2',
      }),
    ).resolves.toMatchObject({
      claimed: false,
      currentStatus: 'in_progress',
      reason: 'Expected status ready, got in_progress',
    });

    await expect(
      t.mutation(api.tasks.claimTaskForExecution, {
        projectSlug: 'other-project',
        trackId: 'claim-track',
        taskKey: 'CLAIM-1',
        expectedStatus: 'in_progress',
        runId: 'run-3',
      }),
    ).resolves.toMatchObject({ claimed: false, reason: 'Project mismatch' });
  });
});
