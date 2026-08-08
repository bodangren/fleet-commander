/**
 * Registered-runtime contracts for kanban, task timeline, and active-sprint
 * reads.
 *
 * These scenarios use the production schema, indexes, generated IDs, and
 * registered Convex APIs. Database writes are limited to schema-valid setup;
 * behavior is exercised through the public function references.
 */

import { describe, expect, it } from 'vitest';
import { api } from './_generated/api';
import type { Id } from './_generated/dataModel';
import { createConvexTest } from '../test/convexTest';
import {
  seedAgent,
  seedProject,
  seedSprint,
  seedTask,
  type ConvexTest,
} from '../test/convexDomainSeeds';

/**
 * Creates a legacy employee and run pair used only to verify kanban duration
 * enrichment against the schema's real `runs.by_task` index.
 *
 * @param t - Isolated Convex runtime backend.
 * @param taskId - Task associated with the run.
 * @returns Nothing; the rows are persisted in the isolated backend.
 */
async function seedLegacyRun(t: ConvexTest, taskId: Id<'tasks'>): Promise<void> {
  await t.run(async (ctx) => {
    const employeeId = await ctx.db.insert('employees', {
      name: 'legacy-runner',
      role: 'executor',
      skills: ['typescript'],
      model: 'legacy-runner-model',
      status: 'active',
      createdAt: 1_000,
    });
    await ctx.db.insert('runs', {
      taskId,
      employeeId,
      status: 'succeeded',
      startedAt: 2_000,
      finishedAt: 2_300,
    });
  });
}

/**
 * Creates a pipeline run used by the task timeline aggregation.
 *
 * @param t - Isolated Convex runtime backend.
 * @param taskId - Task associated with the run.
 * @param agentId - Agent credited for the run.
 * @param stage - Pipeline stage.
 * @param startTime - Start timestamp used to verify ordering.
 * @returns Nothing; the row is persisted in the isolated backend.
 */
async function seedPipelineRun(
  t: ConvexTest,
  taskId: Id<'tasks'>,
  agentId: Id<'agents'>,
  stage: 'architect' | 'executor',
  startTime: number,
): Promise<void> {
  await t.run((ctx) =>
    ctx.db.insert('pipelineRuns', {
      taskId,
      agentId,
      stage,
      startTime,
      endTime: startTime + 500,
      cost: 1.5,
      status: 'completed',
      createdAt: startTime,
    }),
  );
}

describe('task-domain history registered runtime contracts', () => {
  it('returns a schema-backed sprint board with agent and latest-run enrichment', async () => {
    const t = createConvexTest();
    const projectId = await seedProject(t, 'kanban-runtime');
    const sprintId = await seedSprint(t, projectId, 'active', 'Kanban runtime sprint');
    const agentId = await seedAgent(t, 'board-executor');
    const taskId = await seedTask(t, {
      projectId,
      title: 'Board task',
      sprintId,
      assigneeId: agentId,
    });
    await seedLegacyRun(t, taskId);

    const board = await t.query(api.kanban.getSprintBoardHandler, { sprintId });
    expect(board.sprint).toMatchObject({ _id: sprintId, status: 'active' });
    expect(board.tasks).toHaveLength(1);
    expect(board.tasks[0]).toMatchObject({
      _id: taskId,
      title: 'Board task',
      assigneeName: 'board-executor',
      durationMs: 300,
    });
    expect(board.tasks[0]).not.toHaveProperty('_creationTime');
    expect(board.agents).toEqual([
      expect.objectContaining({ _id: agentId, name: 'board-executor', role: 'executor' }),
    ]);

    await expect(
      t.query(api.kanban.getActiveSprintHandler, { projectId }),
    ).resolves.toMatchObject({ _id: sprintId, status: 'active' });
    await expect(
      t.query(api.kanban.getSprintsByProjectHandler, { projectId }),
    ).resolves.toEqual([expect.objectContaining({ _id: sprintId })]);
  });

  it('aggregates timeline task, pipeline runs, agents, sprint, and project through indexes', async () => {
    const t = createConvexTest();
    const projectId = await seedProject(t, 'timeline-runtime');
    const sprintId = await seedSprint(t, projectId, 'active', 'Timeline runtime sprint');
    const assigneeId = await seedAgent(t, 'timeline-assignee');
    const runAgentId = await seedAgent(t, 'timeline-runner');
    const taskId = await seedTask(t, {
      projectId,
      title: 'Timeline task',
      status: 'in_progress',
      sprintId,
      assigneeId,
    });
    await seedPipelineRun(t, taskId, runAgentId, 'architect', 2_000);
    await seedPipelineRun(t, taskId, runAgentId, 'executor', 1_000);

    const timeline = await t.query(api.taskTimeline.getTaskTimelineHandler, { taskId });
    expect(timeline.task).toMatchObject({ _id: taskId, title: 'Timeline task' });
    expect(timeline.task).not.toHaveProperty('_creationTime');
    expect(timeline.pipelineRuns.map((run) => run.stage)).toEqual(['executor', 'architect']);
    expect(timeline.agents.map((agent) => agent.name).sort()).toEqual([
      'timeline-assignee',
      'timeline-runner',
    ]);
    expect(timeline.sprint).toMatchObject({ _id: sprintId, name: 'Timeline runtime sprint' });
    expect(timeline.project).toMatchObject({
      _id: projectId,
      name: 'timeline-runtime',
      slug: 'timeline-runtime',
    });
  });

  it('isolates fleet active-sprint and task-key reads by project and preserves request order', async () => {
    const t = createConvexTest();
    const projectId = await seedProject(t, 'fleet-runtime');
    const otherProjectId = await seedProject(t, 'other-fleet-runtime');
    const sprintId = await seedSprint(t, projectId, 'active', 'Fleet runtime sprint');
    await seedTask(t, {
      projectId,
      title: 'Task A',
      status: 'done',
      sprintId,
      projectSlug: 'fleet-runtime',
      trackId: 'track-a',
      taskKey: 'TASK-A',
      createdAt: 3_000,
      updatedAt: 3_500,
    });
    await seedTask(t, {
      projectId,
      title: 'Task B',
      status: 'ready',
      sprintId,
      projectSlug: 'fleet-runtime',
      taskKey: 'TASK-B',
      createdAt: 3_000,
      updatedAt: 3_600,
    });
    await seedTask(t, {
      projectId,
      title: 'No catalog key',
      sprintId,
      projectSlug: 'fleet-runtime',
      updatedAt: 3_900,
    });
    await seedTask(t, {
      projectId: otherProjectId,
      title: 'Foreign task',
      projectSlug: 'other-fleet-runtime',
      taskKey: 'TASK-A',
    });

    await expect(
      t.query(api.fleet.getActiveSprintForProject, { projectSlug: 'fleet-runtime' }),
    ).resolves.toMatchObject({
      _id: sprintId,
      projectSlug: 'fleet-runtime',
      name: 'Fleet runtime sprint',
      taskKeys: ['TASK-A', 'TASK-B'],
      updatedAt: 3_900,
    });
    await expect(
      t.query(api.fleet.getTasksForSprint, {
        projectSlug: 'fleet-runtime',
        taskKeys: ['TASK-B', 'TASK-A', 'UNKNOWN'],
      }),
    ).resolves.toEqual([
      expect.objectContaining({ taskKey: 'TASK-B', title: 'Task B', status: 'ready' }),
      expect.objectContaining({ taskKey: 'TASK-A', title: 'Task A', status: 'done' }),
    ]);
  });
});
