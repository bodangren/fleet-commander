import { v } from 'convex/values';
import { mutation, query } from './_generated/server';
import { resolveActor } from './lib/auth';
import { computeCost, computeSessionSavings, estimateTokens } from './lib/cost';
import { computeCostPerTaskMetric } from './lib/costMetrics';

const MS_PER_DAY = 86400000;

export const recordCost = mutation({
  args: {
    agentId: v.string(),
    projectSlug: v.string(),
    taskId: v.string(),
    model: v.string(),
    inputTokens: v.number(),
    outputTokens: v.number(),
    sessionResumed: v.boolean(),
    sprintId: v.optional(v.string()),
    contextTokens: v.optional(v.number()),
  },
  returns: v.object({
    costRecordId: v.id('costRecords'),
    costUSD: v.number(),
    sessionCostSaved: v.number(),
  }),
  handler: async (ctx, args) => {
    await resolveActor(ctx);

    const costUSD = computeCost(args.model, args.inputTokens, args.outputTokens);
    const sessionCostSaved = args.sessionResumed && args.contextTokens
      ? computeSessionSavings(args.contextTokens, args.model)
      : 0;

    const costRecordId = await ctx.db.insert('costRecords', {
      agentId: args.agentId,
      projectSlug: args.projectSlug,
      sprintId: args.sprintId,
      taskId: args.taskId,
      model: args.model,
      inputTokens: args.inputTokens,
      outputTokens: args.outputTokens,
      costUSD,
      sessionResumed: args.sessionResumed,
      sessionCostSaved,
      recordedAt: Date.now(),
    });

    const existing = await ctx.db
      .query('runContracts')
      .withIndex('by_task', (q) => q.eq('taskId', args.taskId))
      .first();
    if (existing) {
      await ctx.db.patch(existing._id, {
        actualCost: (existing.actualCost ?? 0) + costUSD,
        inputTokens: (existing.inputTokens ?? 0) + args.inputTokens,
        outputTokens: (existing.outputTokens ?? 0) + args.outputTokens,
      });
    }

    // Update budget spend and check thresholds
    const budget = await ctx.db
      .query('budgets')
      .withIndex('by_scope', (q) => q.eq('scope', `project:${args.projectSlug}`))
      .first();
    if (budget) {
      await ctx.db.patch(budget._id, {
        spent: budget.spent + costUSD,
        updatedAt: Date.now(),
      });
      const utilization = budget.cap > 0 ? (budget.spent + costUSD) / budget.cap : 0;
      if (utilization >= 0.8 && utilization < 1) {
        await ctx.db.insert('governanceEvents', {
          scope: budget.scope,
          eventType: 'budget_warning',
          payloadJson: JSON.stringify({ utilization, spent: budget.spent + costUSD, cap: budget.cap, taskId: args.taskId }),
          createdAt: Date.now(),
        });
      } else if (utilization >= 1) {
        await ctx.db.insert('governanceEvents', {
          scope: budget.scope,
          eventType: 'budget_breach',
          payloadJson: JSON.stringify({ utilization, spent: budget.spent + costUSD, cap: budget.cap, taskId: args.taskId }),
          createdAt: Date.now(),
        });
      }
    }

    return { costRecordId, costUSD, sessionCostSaved };
  },
});

export const getCostByProject = query({
  args: {
    days: v.optional(v.number()),
    projectSlug: v.optional(v.string()),
  },
  returns: v.array(
    v.object({
      projectSlug: v.string(),
      totalCostUSD: v.number(),
      totalInputTokens: v.number(),
      totalOutputTokens: v.number(),
      recordCount: v.number(),
    }),
  ),
  handler: async (ctx, args) => {
    await resolveActor(ctx);
    const days = args.days ?? 30;
    const cutoff = Date.now() - days * MS_PER_DAY;

    let records;
    if (args.projectSlug) {
      records = await ctx.db
        .query('costRecords')
        .withIndex('by_project_and_recorded_at', (q) =>
          q.eq('projectSlug', args.projectSlug!).gte('recordedAt', cutoff))
        .collect();
    } else {
      records = await ctx.db
        .query('costRecords')
        .withIndex('by_recorded_at', (q) => q.gte('recordedAt', cutoff))
        .collect();
    }

    const byProject = new Map<string, {
      totalCostUSD: number;
      totalInputTokens: number;
      totalOutputTokens: number;
      recordCount: number;
    }>();

    for (const r of records) {
      const entry = byProject.get(r.projectSlug) ?? {
        totalCostUSD: 0,
        totalInputTokens: 0,
        totalOutputTokens: 0,
        recordCount: 0,
      };
      entry.totalCostUSD += r.costUSD;
      entry.totalInputTokens += r.inputTokens;
      entry.totalOutputTokens += r.outputTokens;
      entry.recordCount++;
      byProject.set(r.projectSlug, entry);
    }

    return Array.from(byProject.entries())
      .map(([projectSlug, stats]) => ({ projectSlug, ...stats }))
      .sort((a, b) => b.totalCostUSD - a.totalCostUSD);
  },
});

export const getCostByAgent = query({
  args: {
    days: v.optional(v.number()),
    projectSlug: v.optional(v.string()),
  },
  returns: v.array(
    v.object({
      agentId: v.string(),
      totalCostUSD: v.number(),
      recordCount: v.number(),
    }),
  ),
  handler: async (ctx, args) => {
    await resolveActor(ctx);
    const days = args.days ?? 30;
    const cutoff = Date.now() - days * MS_PER_DAY;

    let records;
    if (args.projectSlug) {
      records = await ctx.db
        .query('costRecords')
        .withIndex('by_project_and_recorded_at', (q) =>
          q.eq('projectSlug', args.projectSlug!).gte('recordedAt', cutoff))
        .collect();
    } else {
      records = await ctx.db
        .query('costRecords')
        .withIndex('by_recorded_at', (q) => q.gte('recordedAt', cutoff))
        .collect();
    }

    const byAgent = new Map<string, { totalCostUSD: number; recordCount: number }>();

    for (const r of records) {
      const entry = byAgent.get(r.agentId) ?? { totalCostUSD: 0, recordCount: 0 };
      entry.totalCostUSD += r.costUSD;
      entry.recordCount++;
      byAgent.set(r.agentId, entry);
    }

    return Array.from(byAgent.entries())
      .map(([agentId, stats]) => ({ agentId, ...stats }))
      .sort((a, b) => b.totalCostUSD - a.totalCostUSD);
  },
});

export const getCostTrend = query({
  args: {
    days: v.optional(v.number()),
    projectSlug: v.optional(v.string()),
  },
  returns: v.array(
    v.object({
      date: v.string(),
      costUSD: v.number(),
      inputTokens: v.number(),
      outputTokens: v.number(),
    }),
  ),
  handler: async (ctx, args) => {
    await resolveActor(ctx);
    const days = args.days ?? 30;
    const now = Date.now();
    const cutoff = now - days * MS_PER_DAY;

    let records;
    if (args.projectSlug) {
      records = await ctx.db
        .query('costRecords')
        .withIndex('by_project_and_recorded_at', (q) =>
          q.eq('projectSlug', args.projectSlug!).gte('recordedAt', cutoff))
        .collect();
    } else {
      records = await ctx.db
        .query('costRecords')
        .withIndex('by_recorded_at', (q) => q.gte('recordedAt', cutoff))
        .collect();
    }

    const result: { date: string; costUSD: number; inputTokens: number; outputTokens: number }[] = [];

    for (let i = days - 1; i >= 0; i--) {
      const dayStart = now - (i + 1) * MS_PER_DAY;
      const dayEnd = now - i * MS_PER_DAY;
      const dateStr = new Date(dayEnd).toISOString().slice(0, 10);

      const dayRecords = records.filter(
        (r) => r.recordedAt > dayStart && r.recordedAt <= dayEnd,
      );

      result.push({
        date: dateStr,
        costUSD: dayRecords.reduce((sum, r) => sum + r.costUSD, 0),
        inputTokens: dayRecords.reduce((sum, r) => sum + r.inputTokens, 0),
        outputTokens: dayRecords.reduce((sum, r) => sum + r.outputTokens, 0),
      });
    }

    return result;
  },
});

export const getSessionSavings = query({
  args: {
    days: v.optional(v.number()),
    projectSlug: v.optional(v.string()),
  },
  returns: v.object({
    totalSavedUSD: v.number(),
    totalResumedSessions: v.number(),
    avgSavingsPerSession: v.number(),
  }),
  handler: async (ctx, args) => {
    await resolveActor(ctx);
    const days = args.days ?? 30;
    const cutoff = Date.now() - days * MS_PER_DAY;

    let records;
    if (args.projectSlug) {
      records = await ctx.db
        .query('costRecords')
        .withIndex('by_project_and_recorded_at', (q) =>
          q.eq('projectSlug', args.projectSlug!).gte('recordedAt', cutoff))
        .collect();
    } else {
      records = await ctx.db
        .query('costRecords')
        .withIndex('by_recorded_at', (q) => q.gte('recordedAt', cutoff))
        .collect();
    }

    const resumedRecords = records.filter((r) => r.sessionResumed);
    const totalSavedUSD = resumedRecords.reduce((sum, r) => sum + r.sessionCostSaved, 0);
    const totalResumedSessions = resumedRecords.length;

    return {
      totalSavedUSD,
      totalResumedSessions,
      avgSavingsPerSession: totalResumedSessions > 0 ? totalSavedUSD / totalResumedSessions : 0,
    };
  },
});

export const getCostPerTask = query({
  args: {
    days: v.optional(v.number()),
    projectSlug: v.optional(v.string()),
  },
  returns: v.object({
    totalCostUSD: v.number(),
    completedTasks: v.number(),
    costPerTask: v.number(),
  }),
  handler: async (ctx, args) => {
    await resolveActor(ctx);
    const days = args.days ?? 30;
    const cutoff = Date.now() - days * MS_PER_DAY;

    let costRecords;
    if (args.projectSlug) {
      costRecords = await ctx.db
        .query('costRecords')
        .withIndex('by_project_and_recorded_at', (q) =>
          q.eq('projectSlug', args.projectSlug!).gte('recordedAt', cutoff))
        .collect();
    } else {
      costRecords = await ctx.db
        .query('costRecords')
        .withIndex('by_recorded_at', (q) => q.gte('recordedAt', cutoff))
        .collect();
    }

    const tasks = await ctx.db
      .query('tasks')
      .withIndex('by_status_and_updated_at', (q) =>
        q.eq('status', 'done').gte('updatedAt', cutoff))
      .collect();

    return computeCostPerTaskMetric(costRecords, tasks);
  },
});

export const backfillCostRecords = mutation({
  args: {
    projectSlug: v.optional(v.string()),
    model: v.optional(v.string()),
  },
  returns: v.object({
    scanned: v.number(),
    created: v.number(),
    skipped: v.number(),
  }),
  handler: async (ctx, args) => {
    await resolveActor(ctx);
    const model = args.model ?? 'gpt-4o';

    let contracts;
    if (args.projectSlug) {
      contracts = await ctx.db
        .query('runContracts')
        .withIndex('by_project', (q) => q.eq('projectSlug', args.projectSlug!))
        .take(1000);
    } else {
      contracts = await ctx.db
        .query('runContracts')
        .take(1000);
    }

    let created = 0;
    let skipped = 0;

    const validContracts = contracts.filter((c) => {
      if (!c.inputTokens && !c.outputTokens) {
        skipped++;
        return false;
      }
      return true;
    });

    const existingRecords = await Promise.all(
      validContracts.map((contract) =>
        ctx.db
          .query('costRecords')
          .withIndex('by_task', (q) => q.eq('taskId', contract.taskId))
          .first()
      )
    );

    for (let i = 0; i < validContracts.length; i++) {
      const contract = validContracts[i];
      if (existingRecords[i]) {
        skipped++;
        continue;
      }

      const inputTokens = contract.inputTokens ?? 0;
      const outputTokens = contract.outputTokens ?? 0;
      const costUSD = computeCost(model, inputTokens, outputTokens);

      await ctx.db.insert('costRecords', {
        agentId: 'unknown',
        projectSlug: contract.projectSlug,
        taskId: contract.taskId,
        model,
        inputTokens,
        outputTokens,
        costUSD,
        sessionResumed: !!contract.sessionId,
        sessionCostSaved: 0,
        recordedAt: contract.createdAt,
      });
      created++;
    }

    return { scanned: contracts.length, created, skipped };
  },
});

export { estimateTokens };
