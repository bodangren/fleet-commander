import { v } from 'convex/values';
import { query } from './_generated/server';
import { portfolioHealth } from './lib/validators';

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

export type HealthLevel = 'green' | 'yellow' | 'red';

export function getProjectHealth(params: {
  lastSprintStatus: string | null;
  lastSprintBudget: number | null;
  lastSprintActualCost: number | null;
  lastSprintClosedAt: number | null;
  rejectionRate: number | null;
  totalSprints: number;
}): { health: HealthLevel; reason: string } {
  const {
    lastSprintStatus,
    lastSprintBudget,
    lastSprintActualCost,
    lastSprintClosedAt,
    rejectionRate,
    totalSprints,
  } = params;

  if (totalSprints === 0 || !lastSprintStatus) {
    return { health: 'red', reason: 'No sprints' };
  }

  const now = Date.now();
  if (lastSprintClosedAt && now - lastSprintClosedAt > SEVEN_DAYS_MS) {
    return { health: 'red', reason: 'No sprints in 7 days' };
  }

  const overBudget =
    lastSprintBudget != null &&
    lastSprintActualCost != null &&
    lastSprintBudget > 0 &&
    lastSprintActualCost > lastSprintBudget;

  const highRejection = rejectionRate != null && rejectionRate > 20;

  if (lastSprintStatus === 'closed') {
    if (overBudget || highRejection) {
      const reasons: string[] = [];
      if (overBudget) reasons.push('over budget');
      if (highRejection) reasons.push('rejections >20%');
      return { health: 'yellow', reason: reasons.join(', ') };
    }
    return { health: 'green', reason: 'Last sprint closed within budget' };
  }

  if (highRejection) {
    return { health: 'red', reason: 'High rejection rate' };
  }

  if (overBudget) {
    return { health: 'yellow', reason: 'over budget' };
  }

  return { health: 'yellow', reason: `Last sprint ${lastSprintStatus}` };
}

export const getPortfolioHandler = query({
  args: {},
  returns: v.array(
    v.object({
      _id: v.id('projects'),
      name: v.string(),
      slug: v.string(),
      description: v.string(),
      totalSprints: v.number(),
      lastSprint: v.union(
        v.null(),
        v.object({
          name: v.string(),
          status: v.string(),
          budget: v.number(),
          actualCost: v.number(),
          completedCount: v.number(),
          taskCount: v.number(),
          closedAt: v.optional(v.number()),
        }),
      ),
      totalSpend: v.number(),
      health: portfolioHealth,
      healthReason: v.string(),
    }),
  ),
  handler: async (ctx) => {
    const projects = await ctx.db.query('projects').order('desc').collect();

    const results = await Promise.all(
      projects.map(async (project) => {
        const sprints = await ctx.db
          .query('sprints')
          .withIndex('by_project', (q) => q.eq('projectId', project._id))
          .collect();

        const totalSprints = sprints.length;
        const totalSpend = sprints.reduce((sum, s) => sum + s.actualCost, 0);

        const sorted = [...sprints].sort((a, b) => b.createdAt - a.createdAt);
        const lastSprint = sorted[0] ?? null;

        const lastSprintData = lastSprint
          ? {
              name: lastSprint.name,
              status: lastSprint.status,
              budget: lastSprint.budget,
              actualCost: lastSprint.actualCost,
              completedCount: lastSprint.completedCount,
              taskCount: lastSprint.taskCount,
              closedAt: lastSprint.closedAt,
            }
          : null;

        let rejectionRate: number | null = null;
        if (lastSprint && lastSprint.taskCount > 0) {
          const sprintTasks = await ctx.db
            .query('tasks')
            .withIndex('by_sprint', (q) => q.eq('sprintId', lastSprint._id))
            .collect();
          const blockedCount = sprintTasks.filter((t) => t.status === 'blocked').length;
          rejectionRate = (blockedCount / lastSprint.taskCount) * 100;
        }

        const { health, reason } = getProjectHealth({
          lastSprintStatus: lastSprint?.status ?? null,
          lastSprintBudget: lastSprint?.budget ?? null,
          lastSprintActualCost: lastSprint?.actualCost ?? null,
          lastSprintClosedAt: lastSprint?.closedAt ?? null,
          rejectionRate,
          totalSprints,
        });

        return {
          _id: project._id,
          name: project.name,
          slug: project.slug,
          description: project.description,
          totalSprints,
          lastSprint: lastSprintData,
          totalSpend,
          health,
          healthReason: reason,
        };
      }),
    );

    return results;
  },
});
