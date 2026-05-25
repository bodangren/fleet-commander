import { v } from 'convex/values';
import { query } from './_generated/server';
import { resolveActor } from './lib/auth';

const auditEventType = v.union(
  v.literal('task'),
  v.literal('run'),
  v.literal('alert'),
  v.literal('reconciliation'),
  v.literal('pipeline'),
);

const auditEventResponse = v.object({
  _id: v.string(),
  type: auditEventType,
  projectSlug: v.optional(v.string()),
  trackId: v.optional(v.string()),
  taskKey: v.optional(v.string()),
  agentId: v.optional(v.string()),
  agentName: v.optional(v.string()),
  severity: v.optional(v.string()),
  message: v.string(),
  createdAt: v.number(),
});

export const listAuditEventsHandler = query({
  args: {
    type: v.optional(auditEventType),
    agentId: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  returns: v.array(auditEventResponse),
  handler: async (ctx, args) => {
    await resolveActor(ctx);
    const limit = args.limit ?? 100;
    const events: any[] = [];

    // Collect execution logs
    const logs = await ctx.db
      .query('executionLogs')
      .order('desc')
      .take(limit);
    for (const log of logs) {
      events.push({
        _id: log._id,
        type: 'run',
        projectSlug: log.projectSlug,
        trackId: log.trackId,
        message: log.summary,
        createdAt: log.createdAt,
      });
    }

    // Collect alerts
    const alerts = await ctx.db
      .query('alerts')
      .order('desc')
      .take(limit);
    for (const alert of alerts) {
      events.push({
        _id: alert._id,
        type: 'alert',
        severity: alert.severity,
        message: alert.message,
        createdAt: alert.createdAt,
      });
    }

    // Collect reconciliation events
    const reconciliations = await ctx.db
      .query('reconciliationEvents')
      .order('desc')
      .take(limit);
    for (const rec of reconciliations) {
      events.push({
        _id: rec._id,
        type: 'reconciliation',
        projectSlug: rec.projectSlug,
        message: rec.description,
        createdAt: rec.createdAt,
      });
    }

    // Collect pipeline runs
    const pipelineRuns = await ctx.db
      .query('pipelineRuns')
      .order('desc')
      .take(limit);
    const agents = await ctx.db.query('agents').collect();
    const agentMap = new Map(agents.map((a) => [a._id, a.name as string]));
    for (const run of pipelineRuns) {
      events.push({
        _id: run._id,
        type: 'pipeline',
        agentId: run.agentId,
        agentName: run.agentId ? agentMap.get(run.agentId) : undefined,
        message: `${run.stage} — ${run.status}`,
        createdAt: run.createdAt,
      });
    }

    // Sort by createdAt desc and apply filters
    events.sort((a, b) => b.createdAt - a.createdAt);

    let filtered = events;
    if (args.type) {
      filtered = filtered.filter((e) => e.type === args.type);
    }
    if (args.agentId) {
      filtered = filtered.filter((e) => e.agentId === args.agentId);
    }

    return filtered.slice(0, limit);
  },
});
