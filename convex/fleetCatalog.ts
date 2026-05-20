import { v } from 'convex/values';
import { mutation, query } from './_generated/server';
import { resolveActor } from './lib/auth';
import { issueStatus, priority, runStatus, sourceKind, taskStatus, trackStatus } from './lib/validators';

export const getBootstrapSummary = query({
  args: {},
  returns: v.object({
    projects: v.number(),
    tracks: v.number(),
    tasks: v.number(),
    issues: v.number(),
    executionLogs: v.number(),
    settings: v.number(),
    agents: v.number(),
    harnesses: v.number(),
    workRuns: v.number(),
  }),
  handler: async (ctx) => {
    await resolveActor(ctx);
    // TD-029: .collect().length fetches all documents to count them.
    // For large datasets, replace with denormalized counters (e.g., systemMetadata table).
    // Convex does not provide a native .count() on queries.
    const [
      projects,
      tracks,
      tasks,
      issues,
      executionLogs,
      settings,
      agents,
      workRuns,
    ] = await Promise.all([
      ctx.db.query('projects').collect(),
      ctx.db.query('tracks').collect(),
      ctx.db.query('tasks').collect(),
      ctx.db.query('issues').collect(),
      ctx.db.query('executionLogs').collect(),
      ctx.db.query('settings').collect(),
      ctx.db.query('agents').collect(),
      ctx.db.query('workRuns').collect(),
    ]);

    return {
      projects: projects.length,
      tracks: tracks.length,
      tasks: tasks.length,
      issues: issues.length,
      executionLogs: executionLogs.length,
      settings: settings.length,
      agents: agents.length,
      harnesses: 0,
      workRuns: workRuns.length,
    };
  },
});

const agentResponse = v.object({
  name: v.string(),
  displayName: v.string(),
  mode: v.string(),
  model: v.string(),
  temperature: v.number(),
  prompt: v.string(),
  toolsJson: v.string(),
  source: sourceKind,
  updatedAt: v.number(),
});

export const listAgents = query({
  args: {},
  returns: v.array(agentResponse),
  handler: async (ctx) => {
    await resolveActor(ctx);
    const docs = await ctx.db.query('agents').order('desc').collect();
    return docs.map((doc) => ({
      name: doc.name,
      displayName: (doc as any).displayName ?? doc.name,
      mode: (doc as any).mode ?? 'agent',
      model: doc.model,
      temperature: (doc as any).temperature ?? 0.2,
      prompt: (doc as any).prompt ?? '',
      toolsJson: (doc as any).toolsJson ?? '{}',
      source: (doc as any).source ?? 'import',
      updatedAt: (doc as any).updatedAt ?? doc.createdAt,
    }));
  },
});

export const getAgentByName = query({
  args: { name: v.string() },
  returns: v.union(agentResponse, v.null()),
  handler: async (ctx, args) => {
    await resolveActor(ctx);
    const doc = await ctx.db
      .query('agents')
      .withIndex('by_name', (q) => q.eq('name', args.name))
      .unique();
    if (!doc) return null;
    return {
      name: doc.name,
      displayName: (doc as any).displayName ?? doc.name,
      mode: (doc as any).mode ?? 'agent',
      model: doc.model,
      temperature: (doc as any).temperature ?? 0.2,
      prompt: (doc as any).prompt ?? '',
      toolsJson: (doc as any).toolsJson ?? '{}',
      source: (doc as any).source ?? 'import',
      updatedAt: (doc as any).updatedAt ?? doc.createdAt,
    };
  },
});

const harnessResponse = v.object({
  name: v.string(),
  commandTemplate: v.string(),
  discoveryCommand: v.optional(v.string()),
  source: sourceKind,
  updatedAt: v.number(),
});

export const listHarnesses = query({
  args: {},
  returns: v.array(harnessResponse),
  handler: async (_ctx) => {
    return [];
  },
});

export const getHarnessByName = query({
  args: { name: v.string() },
  returns: v.union(harnessResponse, v.null()),
  handler: async (_ctx, _args) => {
    return null;
  },
});

export const upsertAgent = mutation({
  args: {
    name: v.string(),
    displayName: v.string(),
    mode: v.string(),
    model: v.string(),
    temperature: v.number(),
    prompt: v.string(),
    toolsJson: v.string(),
    source: sourceKind,
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await resolveActor(ctx);
    const existing = await ctx.db
      .query('agents')
      .withIndex('by_name', (q) => q.eq('name', args.name))
      .unique();
    if (existing) {
      await ctx.db.patch(existing._id, { ...args });
    } else {
      await ctx.db.insert('agents', {
        name: args.name,
        role: 'executor' as const,
        skills: [],
        model: args.model,
        costPerPoint: 1.0,
        reliability: 0.8,
        status: 'active' as const,
        workload: 0,
        maxWorkload: 5,
        createdAt: Date.now(),
      });
    }
    return null;
  },
});

export const upsertHarness = mutation({
  args: {
    name: v.string(),
    commandTemplate: v.string(),
    discoveryCommand: v.optional(v.string()),
    source: sourceKind,
  },
  returns: v.null(),
  handler: async (_ctx, _args) => {
    return null;
  },
});

export const listTasksByProject = query({
  args: { projectSlug: v.string() },
  returns: v.array(
    v.object({
      projectSlug: v.string(),
      trackId: v.string(),
      taskKey: v.string(),
      title: v.string(),
      status: taskStatus,
      assignee: v.optional(v.string()),
      dependencies: v.array(v.string()),
      updatedAt: v.number(),
    }),
  ),
  handler: async (_ctx, _args) => {
    return [];
  },
});

export const listAllTasks = query({
  args: {},
  returns: v.array(
    v.object({
      projectSlug: v.string(),
      trackId: v.string(),
      taskKey: v.string(),
      title: v.string(),
      status: taskStatus,
      assignee: v.optional(v.string()),
      dependencies: v.array(v.string()),
      updatedAt: v.number(),
    }),
  ),
  handler: async (_ctx, _args) => {
    return [] as any;
  },
});

export const getTaskByTaskKey = query({
  args: { taskKey: v.string() },
  returns: v.union(
    v.object({
      projectSlug: v.string(),
      trackId: v.string(),
      taskKey: v.string(),
      title: v.string(),
      status: taskStatus,
      assignee: v.optional(v.string()),
      dependencies: v.array(v.string()),
      updatedAt: v.number(),
    }),
    v.null(),
  ),
  handler: async (_ctx, _args) => {
    return null;
  },
});

export const listTracksByProject = query({
  args: { projectSlug: v.string() },
  returns: v.array(
    v.object({
      projectSlug: v.string(),
      trackId: v.string(),
      title: v.string(),
      status: trackStatus,
      version: v.number(),
      updatedAt: v.number(),
    }),
  ),
  handler: async (ctx, args) => {
    await resolveActor(ctx);
    const docs = await ctx.db
      .query('tracks')
      .withIndex('by_project', (q) => q.eq('projectSlug', args.projectSlug))
      .collect();
    return docs.map((doc) => ({
      projectSlug: doc.projectSlug,
      trackId: doc.trackId,
      title: doc.title,
      status: doc.status,
      version: doc.version,
      updatedAt: doc.updatedAt,
    }));
  },
});

export const getSetting = query({
  args: { scope: v.string(), key: v.string() },
  returns: v.union(
    v.object({ scope: v.string(), key: v.string(), valueJson: v.string(), updatedAt: v.number() }),
    v.null(),
  ),
  handler: async (ctx, args) => {
    await resolveActor(ctx);
    const doc = await ctx.db
      .query('settings')
      .withIndex('by_scope_and_key', (q) =>
        q.eq('scope', args.scope).eq('key', args.key),
      )
      .unique();
    if (!doc) return null;
    return {
      scope: doc.scope,
      key: doc.key,
      valueJson: doc.valueJson,
      updatedAt: doc.updatedAt,
    };
  },
});

export const listSettingsByScope = query({
  args: { scope: v.string() },
  returns: v.array(
    v.object({
      scope: v.string(),
      key: v.string(),
      valueJson: v.string(),
      updatedAt: v.number(),
    }),
  ),
  handler: async (ctx, args) => {
    await resolveActor(ctx);
    const docs = await ctx.db
      .query('settings')
      .withIndex('by_scope', (q) => q.eq('scope', args.scope))
      .collect();
    return docs.map((doc) => ({
      scope: doc.scope,
      key: doc.key,
      valueJson: doc.valueJson,
      updatedAt: doc.updatedAt,
    }));
  },
});

export const upsertTask = mutation({
  args: {
    projectSlug: v.string(),
    trackId: v.string(),
    taskKey: v.string(),
    title: v.string(),
    description: v.optional(v.string()),
    status: taskStatus,
    priority: v.optional(priority),
    assignee: v.optional(v.string()),
    dependencies: v.array(v.string()),
    sessionId: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (_ctx, _args) => {
    return null;
  },
});

export const upsertIssue = mutation({
  args: {
    projectSlug: v.string(),
    trackId: v.optional(v.string()),
    issueId: v.string(),
    title: v.string(),
    body: v.string(),
    status: issueStatus,
    assignedAgent: v.optional(v.string()),
    sourcePath: v.optional(v.string()),
    openedAt: v.number(),
    resolvedAt: v.optional(v.number()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await resolveActor(ctx);
    const existing = await ctx.db
      .query('issues')
      .withIndex('by_issue_id', (q) => q.eq('issueId', args.issueId))
      .unique();
    const next = { ...args, updatedAt: Date.now() };
    if (existing) {
      await ctx.db.patch(existing._id, next);
    } else {
      await ctx.db.insert('issues', next);
    }
    return null;
  },
});

export const setSetting = mutation({
  args: {
    scope: v.string(),
    key: v.string(),
    valueJson: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await resolveActor(ctx);
    const existing = await ctx.db
      .query('settings')
      .withIndex('by_scope_and_key', (q) => q.eq('scope', args.scope).eq('key', args.key))
      .unique();
    const next = { ...args, updatedAt: Date.now() };
    if (existing) {
      await ctx.db.patch(existing._id, next);
    } else {
      await ctx.db.insert('settings', next);
    }
    return null;
  },
});

export const upsertWorkRun = mutation({
  args: {
    projectSlug: v.string(),
    runId: v.string(),
    status: runStatus,
    selectedTaskKey: v.optional(v.string()),
    runnerHost: v.optional(v.string()),
    startedAt: v.number(),
    finishedAt: v.optional(v.number()),
    loadMs: v.optional(v.number()),
    scoreMs: v.optional(v.number()),
    executeMs: v.optional(v.number()),
    persistMs: v.optional(v.number()),
    hookBeforeMs: v.optional(v.number()),
    hookAfterMs: v.optional(v.number()),
    totalMs: v.optional(v.number()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await resolveActor(ctx);
    const existing = await ctx.db
      .query('workRuns')
      .withIndex('by_run_id', (q) => q.eq('runId', args.runId))
      .unique();
    if (existing) {
      await ctx.db.patch(existing._id, args);
    } else {
      await ctx.db.insert('workRuns', args);
    }
    return null;
  },
});

export const deleteAgent = mutation({
  args: { name: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    await resolveActor(ctx);
    const doc = await ctx.db
      .query('agents')
      .withIndex('by_name', (q) => q.eq('name', args.name))
      .unique();
    if (doc) await ctx.db.delete(doc._id);
    return null;
  },
});

export const deleteHarness = mutation({
  args: { name: v.string() },
  returns: v.null(),
  handler: async (_ctx, _args) => {
    return null;
  },
});

export const updateTaskStatus = mutation({
  args: {
    projectSlug: v.string(),
    taskKey: v.string(),
    status: taskStatus,
  },
  returns: v.null(),
  handler: async (_ctx, _args) => {
    return null;
  },
});

export const listWorkRunsByProject = query({
  args: { projectSlug: v.string() },
  returns: v.array(
    v.object({
      projectSlug: v.string(),
      runId: v.string(),
      status: runStatus,
      selectedTaskKey: v.optional(v.string()),
      runnerHost: v.optional(v.string()),
      startedAt: v.number(),
      finishedAt: v.optional(v.number()),
    }),
  ),
  handler: async (ctx, args) => {
    await resolveActor(ctx);
    const docs = args.projectSlug === '*'
      ? await ctx.db.query('workRuns').collect()
      : await ctx.db
          .query('workRuns')
          .withIndex('by_project', (q) => q.eq('projectSlug', args.projectSlug))
          .collect();
    return docs.map((doc) => ({
      projectSlug: doc.projectSlug,
      runId: doc.runId,
      status: doc.status,
      selectedTaskKey: doc.selectedTaskKey,
      runnerHost: doc.runnerHost,
      startedAt: doc.startedAt,
      finishedAt: doc.finishedAt,
    }));
  },
});
