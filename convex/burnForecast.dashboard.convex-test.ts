/**
 * Registered-runtime authorization and metrics contracts for burn forecasts
 * and the dashboard aggregate query.
 */

import { describe, expect, it } from 'vitest';
import { api } from './_generated/api';
import type { Id } from './_generated/dataModel';
import {
  createConvexTest,
  createUnauthenticatedConvexTest,
} from '../test/convexTest';

type ConvexTest = ReturnType<typeof createConvexTest>;

async function seedProjectAndSprint(
  t: ConvexTest,
): Promise<{ projectId: Id<'projects'>; sprintId: Id<'sprints'> }> {
  return t.run(async (ctx) => {
    const projectId = await ctx.db.insert('projects', {
      name: 'Metrics runtime project',
      slug: 'metrics-runtime-project',
      description: 'Registered metrics fixture',
      createdAt: 1_000,
      updatedAt: 1_000,
    });
    const sprintId = await ctx.db.insert('sprints', {
      projectId,
      name: 'Metrics sprint',
      status: 'active',
      budget: 100,
      actualCost: 0,
      pointsDelivered: 0,
      taskCount: 0,
      completedCount: 0,
      createdAt: 1_000,
    });
    return { projectId, sprintId };
  });
}

describe('burn forecast and dashboard registered runtime access', () => {
  it('rejects all three public metrics queries without an authenticated identity', async () => {
    const t = createUnauthenticatedConvexTest();
    const { sprintId } = await seedProjectAndSprint(t);

    await expect(
      t.query(api.burnForecast.getSprintBurnForecast, { sprintId }),
    ).rejects.toThrow('Authentication required');
    await expect(
      t.query(api.burnForecast.getSprintTaskRecommendations, { sprintId }),
    ).rejects.toThrow('Authentication required');
    await expect(
      t.query(api.dashboard.getDashboardDataHandler, {}),
    ).rejects.toThrow('Authentication required');
  });

  it('returns schema-backed forecast recommendations and dashboard metrics for an authenticated identity', async () => {
    const t = createConvexTest();
    const { projectId, sprintId } = await seedProjectAndSprint(t);

    await t.run(async (ctx) => {
      for (const [index, actualCost] of [10, 20, 30].entries()) {
        await ctx.db.insert('tasks', {
          projectId,
          sprintId,
          title: `Completed task ${index}`,
          description: 'Forecast fixture',
          storyPoints: 2,
          status: 'done',
          priority: 'medium',
          costEstimate: actualCost,
          actualCost,
          createdAt: index * 60 * 60 * 1_000,
          updatedAt: index * 60 * 60 * 1_000,
        });
      }
      await ctx.db.insert('tasks', {
        projectId,
        sprintId,
        title: 'Ready task',
        description: 'Recommendation fixture',
        storyPoints: 8,
        status: 'ready',
        priority: 'high',
        costEstimate: 45,
        createdAt: 10,
        updatedAt: 10,
      });
    });

    const forecast = await t.query(api.burnForecast.getSprintBurnForecast, { sprintId });
    expect(forecast).toMatchObject({
      sprintBudget: 100,
      currentSpend: 60,
      remainingBudget: 40,
      dataPoints: 3,
    });
    expect(forecast.burnRatePerHour).toBeGreaterThan(0);

    const recommendations = await t.query(
      api.burnForecast.getSprintTaskRecommendations,
      { sprintId },
    );
    expect(recommendations).toHaveLength(1);
    expect(recommendations[0]).toMatchObject({
      title: 'Ready task',
      action: 'drop',
      savingsEstimate: 45,
    });

    const dashboard = await t.query(api.dashboard.getDashboardDataHandler, {
      projectId,
    });
    expect(dashboard.sprint).toMatchObject({
      name: 'Metrics sprint',
      taskCount: 4,
      completedCount: 3,
    });
    expect(dashboard.tasks).toHaveLength(4);
    expect(dashboard.metrics.successRate).toBe(75);
  });
});
