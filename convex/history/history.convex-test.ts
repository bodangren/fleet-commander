/**
 * Runtime contracts for task, sprint, and agent history queries.
 *
 * The task-specific performance suite covers high-volume filtering. This
 * companion suite preserves the distinct catalog, history-aggregate, and
 * project-isolation behavior from the remaining mock-context suites.
 */

import { describe, expect, it } from 'vitest';
import { api } from '../_generated/api';
import type { Id } from '../_generated/dataModel';
import {
  createConvexTest,
  createUnauthenticatedConvexTest,
} from '../../test/convexTest';

type ConvexTest = ReturnType<typeof createConvexTest>;

type TaskSeed = {
  projectId: Id<'projects'>;
  title: string;
  status?: 'backlog' | 'ready' | 'in_progress' | 'review' | 'done' | 'blocked';
  storyPoints?: number;
  sprintId?: Id<'sprints'>;
  assigneeId?: Id<'agents'>;
  projectSlug?: string;
  trackId?: string;
  taskKey?: string;
  dependencies?: string[];
};

/**
 * Creates a schema-valid project for one isolated history scenario.
 *
 * @param t - Isolated Convex runtime backend.
 * @param slug - Stable project identifier used in assertions.
 * @returns The persisted project ID.
 */
async function seedProject(
  t: ConvexTest,
  slug: string,
): Promise<Id<'projects'>> {
  return t.run((ctx) =>
    ctx.db.insert('projects', {
      name: slug,
      slug,
      description: `History scenario for ${slug}`,
      createdAt: 1_000,
      updatedAt: 1_000,
    }),
  );
}

/**
 * Creates a schema-valid agent usable in task assignment and pipeline history.
 *
 * @param t - Isolated Convex runtime backend.
 * @param name - Stable agent name.
 * @returns The persisted agent ID.
 */
async function seedAgent(
  t: ConvexTest,
  name: string,
): Promise<Id<'agents'>> {
  return t.run((ctx) =>
    ctx.db.insert('agents', {
      name,
      role: 'executor',
      skills: ['typescript'],
      model: 'claude-sonnet',
      costPerPoint: 2.1,
      reliability: 0.9,
      status: 'active',
      workload: 0,
      maxWorkload: 5,
      createdAt: 1_000,
    }),
  );
}

/**
 * Creates a task with all required production schema fields.
 *
 * @param t - Isolated Convex runtime backend.
 * @param task - Required project linkage and optional history fields.
 * @returns The persisted task ID.
 */
async function seedTask(
  t: ConvexTest,
  task: TaskSeed,
): Promise<Id<'tasks'>> {
  return t.run((ctx) =>
    ctx.db.insert('tasks', {
      projectId: task.projectId,
      title: task.title,
      description: `Description for ${task.title}`,
      storyPoints: task.storyPoints ?? 1,
      status: task.status ?? 'done',
      priority: 'medium',
      costEstimate: 10,
      sprintId: task.sprintId,
      assigneeId: task.assigneeId,
      projectSlug: task.projectSlug,
      trackId: task.trackId,
      taskKey: task.taskKey,
      dependencies: task.dependencies,
      createdAt: 1_000,
      updatedAt: 1_000,
    }),
  );
}

/**
 * Creates a sprint with production-required delivery fields.
 *
 * @param t - Isolated Convex runtime backend.
 * @param projectId - Project that owns the sprint.
 * @param name - Sprint display name.
 * @param taskCount - Number of tasks reported by the sprint.
 * @param pointsDelivered - Delivered points used for velocity.
 * @returns The persisted sprint ID.
 */
async function seedSprint(
  t: ConvexTest,
  projectId: Id<'projects'>,
  name: string,
  taskCount: number,
  pointsDelivered: number,
): Promise<Id<'sprints'>> {
  return t.run((ctx) =>
    ctx.db.insert('sprints', {
      projectId,
      name,
      status: 'closed',
      budget: 100,
      actualCost: 50,
      pointsDelivered,
      taskCount,
      completedCount: taskCount,
      createdAt: 1_000,
      startedAt: 1_100,
      closedAt: 1_200,
    }),
  );
}

/**
 * Records a real pipeline run tied to a task and agent.
 *
 * @param t - Isolated Convex runtime backend.
 * @param taskId - Task executed by the pipeline stage.
 * @param agentId - Agent credited for the run.
 * @param startTime - Run start timestamp.
 * @param endTime - Run end timestamp.
 * @param cost - Cost attributed to the run.
 * @param status - Terminal pipeline status.
 */
async function seedPipelineRun(
  t: ConvexTest,
  taskId: Id<'tasks'>,
  agentId: Id<'agents'>,
  startTime: number,
  endTime: number,
  cost: number,
  status: 'completed' | 'failed' = 'completed',
): Promise<void> {
  await t.run((ctx) =>
    ctx.db.insert('pipelineRuns', {
      taskId,
      agentId,
      stage: 'executor',
      startTime,
      endTime,
      cost,
      status,
      createdAt: startTime,
    }),
  );
}

describe('history runtime access contract', () => {
  it('rejects task, sprint, and agent history reads without an identity', async () => {
    const t = createUnauthenticatedConvexTest();
    const projectId = await seedProject(t, 'unauthenticated-history');

    await expect(
      t.query(api.history.tasks.listTaskHistoryHandler, { projectId }),
    ).rejects.toThrow('Authentication required');
    await expect(
      t.query(api.history.sprints.listSprintHistoryHandler, { projectId }),
    ).rejects.toThrow('Authentication required');
    await expect(
      t.query(api.history.agents.listAgentHistoryHandler, {}),
    ).rejects.toThrow('Authentication required');
  });
});

describe('task history runtime contract gaps', () => {
  it('preserves catalog fields, resolves agent names, isolates projects, and returns null after deletion', async () => {
    const t = createConvexTest();
    const projectId = await seedProject(t, 'catalog-project');
    const foreignProjectId = await seedProject(t, 'foreign-catalog-project');
    const agentId = await seedAgent(t, 'catalog-agent');
    const taskId = await seedTask(t, {
      projectId,
      title: 'Imported catalog task',
      assigneeId: agentId,
      projectSlug: 'reading-advantage-llm-benchmark',
      trackId: 'history-repair',
      taskKey: 'HIST-001',
      dependencies: ['HIST-000'],
    });
    await seedTask(t, {
      projectId: foreignProjectId,
      title: 'Foreign task must not leak',
      projectSlug: 'foreign-project',
    });

    await expect(
      t.query(api.history.tasks.listTaskHistoryHandler, { projectId }),
    ).resolves.toEqual([
      expect.objectContaining({
        _id: taskId,
        title: 'Imported catalog task',
        agent: 'catalog-agent',
        projectSlug: 'reading-advantage-llm-benchmark',
        trackId: 'history-repair',
        taskKey: 'HIST-001',
        dependencies: ['HIST-000'],
      }),
    ]);
    const history = await t.query(api.history.tasks.getTaskHistoryHandler, {
      id: taskId,
    });
    expect(history).toMatchObject({ _id: taskId, agent: 'catalog-agent' });
    expect(history).not.toHaveProperty('_creationTime');

    await t.run((ctx) => ctx.db.delete(taskId));
    await expect(
      t.query(api.history.tasks.getTaskHistoryHandler, { id: taskId }),
    ).resolves.toBeNull();
  });
});

describe('sprint history runtime contracts', () => {
  it('returns only project sprints with live task aggregates, zero-task velocity, and limits', async () => {
    const t = createConvexTest();
    const projectId = await seedProject(t, 'sprint-project');
    const foreignProjectId = await seedProject(t, 'foreign-sprint-project');
    const deliverySprintId = await seedSprint(
      t,
      projectId,
      'Delivery sprint',
      10,
      25,
    );
    await seedSprint(t, projectId, 'Empty sprint', 0, 0);
    const foreignSprintId = await seedSprint(
      t,
      foreignProjectId,
      'Foreign sprint',
      1,
      99,
    );
    await seedTask(t, {
      projectId,
      sprintId: deliverySprintId,
      title: 'Delivered work A',
      storyPoints: 5,
    });
    await seedTask(t, {
      projectId,
      sprintId: deliverySprintId,
      title: 'Delivered work B',
      storyPoints: 3,
    });
    await seedTask(t, {
      projectId: foreignProjectId,
      sprintId: foreignSprintId,
      title: 'Foreign work',
      storyPoints: 99,
    });

    const result = await t.query(api.history.sprints.listSprintHistoryHandler, {
      projectId,
    });
    expect(result.map((sprint) => sprint.name).sort()).toEqual([
      'Delivery sprint',
      'Empty sprint',
    ]);
    expect(result.find((sprint) => sprint._id === deliverySprintId)).toMatchObject({
      velocity: 2.5,
      pointsEstimated: 8,
    });
    expect(result.find((sprint) => sprint.name === 'Empty sprint')).toMatchObject({
      velocity: 0,
      pointsEstimated: 0,
    });
    expect(result[0]).not.toHaveProperty('_creationTime');
    await expect(
      t.query(api.history.sprints.listSprintHistoryHandler, {
        projectId,
        limit: 1,
      }),
    ).resolves.toHaveLength(1);
  });

  it('gets a single sprint, rejects malformed project IDs, and returns null after deletion', async () => {
    const t = createConvexTest();
    const projectId = await seedProject(t, 'get-sprint-project');
    const sprintId = await seedSprint(t, projectId, 'Get sprint', 1, 3);
    await seedTask(t, {
      projectId,
      sprintId,
      title: 'Estimated work',
      storyPoints: 3,
    });

    await expect(
      t.query(api.history.sprints.getSprintHistoryHandler, { id: sprintId }),
    ).resolves.toMatchObject({
      _id: sprintId,
      name: 'Get sprint',
      velocity: 3,
      pointsEstimated: 3,
    });
    await expect(
      t.query(api.history.sprints.listSprintHistoryHandler, {
        projectId: 'not-a-convex-project-id' as Id<'projects'>,
      }),
    ).rejects.toThrow();

    await t.run((ctx) => ctx.db.delete(sprintId));
    await expect(
      t.query(api.history.sprints.getSprintHistoryHandler, { id: sprintId }),
    ).resolves.toBeNull();
  });
});

describe('agent history runtime contracts', () => {
  it('aggregates only pipeline runs whose real tasks belong to the requested project', async () => {
    const t = createConvexTest();
    const projectId = await seedProject(t, 'agent-project');
    const foreignProjectId = await seedProject(t, 'foreign-agent-project');
    const agentId = await seedAgent(t, 'aggregate-agent');
    const idleAgentId = await seedAgent(t, 'idle-agent');
    const firstTaskId = await seedTask(t, {
      projectId,
      title: 'First project task',
    });
    const secondTaskId = await seedTask(t, {
      projectId,
      title: 'Second project task',
    });
    const foreignTaskId = await seedTask(t, {
      projectId: foreignProjectId,
      title: 'Foreign project task',
    });
    await seedPipelineRun(t, firstTaskId, agentId, 1_000, 5_000, 12.5);
    await seedPipelineRun(t, secondTaskId, agentId, 6_000, 9_000, 8);
    await seedPipelineRun(t, foreignTaskId, agentId, 10_000, 19_000, 50);

    const targetHistory = await t.query(api.history.agents.listAgentHistoryHandler, {
      projectId,
    });
    expect(targetHistory.find((agent) => agent._id === agentId)).toMatchObject({
      tasksCompleted: 2,
      totalCost: 20.5,
      avgLatencyMs: 3_500,
    });
    expect(targetHistory.find((agent) => agent._id === idleAgentId)).toMatchObject({
      tasksCompleted: 0,
      totalCost: 0,
      avgLatencyMs: 0,
    });
    expect(targetHistory[0]).not.toHaveProperty('_creationTime');

    const foreignHistory = await t.query(api.history.agents.listAgentHistoryHandler, {
      projectId: foreignProjectId,
    });
    expect(foreignHistory.find((agent) => agent._id === agentId)).toMatchObject({
      tasksCompleted: 1,
      totalCost: 50,
      avgLatencyMs: 9_000,
    });
  });

  it('keeps large agent history bounded and computes aggregate values over 100 real pipeline runs', async () => {
    const t = createConvexTest();
    const projectId = await seedProject(t, 'large-agent-project');
    const agentIds = await Promise.all(
      Array.from({ length: 20 }, (_, index) => seedAgent(t, `perf-agent-${index}`)),
    );
    const taskIds = await Promise.all(
      Array.from({ length: 20 }, (_, index) =>
        seedTask(t, { projectId, title: `Pipeline task ${index}` }),
      ),
    );

    for (let index = 0; index < 100; index += 1) {
      await seedPipelineRun(
        t,
        taskIds[index % taskIds.length],
        agentIds[index % agentIds.length],
        index * 1_000,
        index * 1_000 + 500,
        10,
      );
    }

    const page = await t.query(api.history.agents.listAgentHistoryHandler, {
      projectId,
      limit: 10,
    });
    expect(page).toHaveLength(10);
    expect(page.every((agent) => agent.totalCost === 50)).toBe(true);
    expect(page.every((agent) => agent.tasksCompleted === 5)).toBe(true);
    expect(page.every((agent) => agent.avgLatencyMs === 500)).toBe(true);
  });

  it('returns heavy single-agent aggregation and null after the real ID is deleted', async () => {
    const t = createConvexTest();
    const projectId = await seedProject(t, 'heavy-agent-project');
    const agentId = await seedAgent(t, 'heavy-agent');
    const taskId = await seedTask(t, { projectId, title: 'Heavy aggregation task' });

    for (let index = 0; index < 50; index += 1) {
      await seedPipelineRun(
        t,
        taskId,
        agentId,
        index * 2_000,
        index * 2_000 + 1_000,
        5,
      );
    }

    await expect(
      t.query(api.history.agents.getAgentHistoryHandler, { id: agentId }),
    ).resolves.toMatchObject({
      _id: agentId,
      tasksCompleted: 50,
      totalCost: 250,
      avgLatencyMs: 1_000,
    });

    await t.run((ctx) => ctx.db.delete(agentId));
    await expect(
      t.query(api.history.agents.getAgentHistoryHandler, { id: agentId }),
    ).resolves.toBeNull();
  });
});
