/**
 * Registered-runtime contracts for project and sprint-planning APIs.
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

describe('project and planning registered runtime contracts', () => {
  it('requires an identity across every in-scope registered project and planning surface', async () => {
    const t = createUnauthenticatedConvexTest();
    const projectId = await seedProject(t, 'unauth-runtime-project');
    const agentId = await seedAgent(t, 'unauth-runtime-agent');
    const sprintId = await seedSprint(t, projectId, 'planned', 'Unauth runtime sprint');
    const taskId = await seedTask(t, {
      projectId,
      title: 'Unauth runtime task',
      status: 'backlog',
    });
    const pipelineRunId = await t.run((ctx) =>
      ctx.db.insert('pipelineRuns', {
        taskId,
        stage: 'dispatch',
        status: 'running',
        startTime: 1_000,
        createdAt: 1_000,
      }),
    );

    const requests: Array<() => Promise<unknown>> = [
      () => t.query(api.projects.listProjectsHandler, {}),
      () => t.query(api.projects.getProjectHandler, { id: projectId }),
      () => t.query(api.projects.getProjectBySlugHandler, { slug: 'unauth-runtime-project' }),
      () => t.query(api.projects.getProjectByNameHandler, { name: 'unauth-runtime-project' }),
      () => t.mutation(api.projects.createProjectHandler, {
        name: 'Unauth create project',
        description: 'Must be rejected',
      }),
      () => t.mutation(api.projects.updateProjectHandler, {
        id: projectId,
        name: 'Unauth update project',
        description: 'Must be rejected',
      }),
      () => t.mutation(api.projects.deleteProjectHandler, { id: projectId }),
      () => t.mutation(api.projects.updateProjectRoutingPolicy, {
        id: projectId,
        policy: 'cost_first',
      }),
      () => t.query(api.sprintPlanning.getBacklogTasksHandler, { projectId }),
      () => t.query(api.sprintPlanning.getAgentsForPlanningHandler, {}),
      () => t.mutation(api.sprintPlanning.createSprintHandler, {
        projectId,
        name: 'Unauth planning sprint',
        budget: 100,
        taskId,
        agentId,
      }),
      () => t.query(api.sprintPlanning.getProjectStatsHandler, { projectId }),
    ];

    for (const request of requests) {
      await expect(request()).rejects.toThrow('Authentication required');
    }
  });

  it('covers project CRUD, indexed identity reads, and routing policy updates', async () => {
    const t = createConvexTest();
    const firstId = await t.mutation(api.projects.createProjectHandler, {
      name: 'Runtime Project',
      slug: 'runtime-project',
      description: 'Project CRUD contract',
      path: '/tmp/runtime-project',
    });
    const secondId = await t.mutation(api.projects.createProjectHandler, {
      name: 'Second Runtime Project',
      slug: 'second-runtime-project',
      description: 'Second project',
    });

    await expect(
      t.query(api.projects.getProjectHandler, { id: firstId }),
    ).resolves.toMatchObject({
      _id: firstId,
      name: 'Runtime Project',
      slug: 'runtime-project',
      path: '/tmp/runtime-project',
    });
    await expect(
      t.query(api.projects.getProjectBySlugHandler, { slug: 'runtime-project' }),
    ).resolves.toMatchObject({ _id: firstId, slug: 'runtime-project' });
    await expect(
      t.query(api.projects.getProjectByNameHandler, { name: 'Runtime Project' }),
    ).resolves.toMatchObject({ _id: firstId, name: 'Runtime Project' });

    const listed = await t.query(api.projects.listProjectsHandler, {});
    expect(listed.map((project) => project._id)).toEqual([secondId, firstId]);
    expect(listed[0]).not.toHaveProperty('_creationTime');

    await t.mutation(api.projects.updateProjectHandler, {
      id: firstId,
      name: 'Updated Runtime Project',
      description: 'Updated project contract',
      path: '/tmp/updated-runtime-project',
    });
    await t.mutation(api.projects.updateProjectRoutingPolicy, {
      id: firstId,
      policy: 'cost_first',
    });
    await expect(
      t.query(api.projects.getProjectHandler, { id: firstId }),
    ).resolves.toMatchObject({
      name: 'Updated Runtime Project',
      description: 'Updated project contract',
      modelRoutingPolicy: 'cost_first',
    });

    await expect(
      t.mutation(api.projects.deleteProjectHandler, { id: secondId }),
    ).resolves.toBeNull();
    await expect(
      t.query(api.projects.getProjectHandler, { id: secondId }),
    ).resolves.toBeNull();
  });

  it('reads backlog, planning agents, and project stats through real indexes', async () => {
    const t = createConvexTest();
    const projectId = await seedProject(t, 'planning-runtime');
    await seedSprint(t, projectId, 'active', 'Active planning sprint');
    await seedAgent(t, 'planning-agent');
    await seedTask(t, {
      projectId,
      title: 'Backlog task',
      status: 'backlog',
      projectSlug: 'planning-runtime',
      trackId: 'planning-track',
      taskKey: 'PLAN-1',
      dependencies: ['PLAN-0'],
      storyPoints: 5,
    });
    await seedTask(t, {
      projectId,
      title: 'Ready task',
      status: 'ready',
      storyPoints: 2,
    });
    await seedTask(t, {
      projectId,
      title: 'Blocked task',
      status: 'blocked',
      storyPoints: 8,
    });

    const backlog = await t.query(api.sprintPlanning.getBacklogTasksHandler, {
      projectId,
    });
    expect(backlog).toEqual([
      expect.objectContaining({
        title: 'Backlog task',
        status: 'backlog',
        projectSlug: 'planning-runtime',
        trackId: 'planning-track',
        taskKey: 'PLAN-1',
        dependencies: ['PLAN-0'],
      }),
    ]);
    expect(backlog[0]).not.toHaveProperty('projectId');
    expect(backlog[0]).not.toHaveProperty('_creationTime');

    await expect(
      t.query(api.sprintPlanning.getAgentsForPlanningHandler, {}),
    ).resolves.toEqual([
      expect.objectContaining({ name: 'planning-agent', workload: 0 }),
    ]);
    await expect(
      t.query(api.sprintPlanning.getProjectStatsHandler, { projectId }),
    ).resolves.toEqual({
      backlogCount: 1,
      totalPoints: 5,
      activeSprintCount: 1,
    });
  });

  it('creates and assigns a sprint task while enforcing canonical planning state', async () => {
    const t = createConvexTest();
    const projectId = await seedProject(t, 'create-sprint-runtime');
    const agentId = await seedAgent(t, 'sprint-planner');
    await seedTask(t, {
      projectId,
      title: 'Completed dependency',
      taskKey: 'DEP-1',
      status: 'done',
      storyPoints: 1,
    });
    const taskId = await seedTask(t, {
      projectId,
      title: 'Sprint candidate',
      taskKey: 'TASK-1',
      status: 'backlog',
      dependencies: ['DEP-1'],
      storyPoints: 3,
    });

    const result = await t.mutation(api.sprintPlanning.createSprintHandler, {
      projectId,
      name: 'Runtime planning sprint',
      budget: 10,
      taskId,
      agentId,
    });
    expect(result).toMatchObject({ sprintId: expect.any(String), taskId });
    expect(
      await t.query(api.sprints.getSprintHandler, { id: result.sprintId }),
    ).toMatchObject({
      _id: result.sprintId,
      status: 'active',
      taskCount: 1,
      budget: 10,
    });
    await expect(
      t.run((ctx) => ctx.db.get(taskId)),
    ).resolves.toMatchObject({
      sprintId: result.sprintId,
      assigneeId: agentId,
      status: 'ready',
      costEstimate: 6,
    });
    await expect(
      t.run((ctx) => ctx.db.get(agentId)),
    ).resolves.toMatchObject({ workload: 1 });

    const nonBacklogTaskId = await seedTask(t, {
      projectId,
      title: 'Already active task',
      status: 'in_progress',
    });
    await expect(
      t.mutation(api.sprintPlanning.createSprintHandler, {
        projectId,
        name: 'Invalid planning sprint',
        budget: 10,
        taskId: nonBacklogTaskId,
        agentId,
      }),
    ).rejects.toThrow('Task must be in backlog');
  });
});
