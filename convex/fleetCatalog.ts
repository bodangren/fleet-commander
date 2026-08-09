import { v } from 'convex/values'
import { mutation, query } from './_generated/server'
import { resolveActor } from './lib/auth'
import { adjustCounter, COUNTER_KEYS, getCounter } from './lib/counters'
import {
  agentStatus,
  issueStatus,
  priority,
  runStatus,
  sourceKind,
  sprintStatus,
  taskStatus,
  trackStatus,
} from './lib/validators'
import { mapTaskDocToRow } from './lib/taskRows'

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
  handler: async ctx => {
    await resolveActor(ctx)

    // Small tables: .collect().length is acceptable (< 1000 rows expected).
    // These are bounded by the number of projects, settings, and agents in the system.
    const [projects, settings, agents, tracks] = await Promise.all([
      ctx.db.query('projects').collect(),
      ctx.db.query('settings').collect(),
      ctx.db.query('agents').collect(),
      ctx.db.query('tracks').collect(),
    ])

    // Large tables: use denormalized counters maintained by mutations.
    const [tasks, issues, executionLogs, workRuns] = await Promise.all([
      getCounter(ctx, COUNTER_KEYS.tasks),
      getCounter(ctx, COUNTER_KEYS.issues),
      getCounter(ctx, COUNTER_KEYS.executionLogs),
      getCounter(ctx, COUNTER_KEYS.workRuns),
    ])

    return {
      projects: projects.length,
      tracks: tracks.length,
      tasks,
      issues,
      executionLogs,
      settings: settings.length,
      agents: agents.length,
      harnesses: 0,
      workRuns,
    }
  },
})

const agentResponse = v.object({
  name: v.string(),
  displayName: v.string(),
  mode: v.string(),
  model: v.string(),
  status: agentStatus,
  workload: v.number(),
  maxWorkload: v.number(),
  temperature: v.number(),
  prompt: v.string(),
  toolsJson: v.string(),
  source: sourceKind,
  updatedAt: v.number(),
})

export const listAgents = query({
  args: {},
  returns: v.array(agentResponse),
  handler: async ctx => {
    await resolveActor(ctx)
    const docs = await ctx.db.query('agents').order('desc').collect()
    return docs.map(doc => ({
      name: doc.name,
      displayName: (doc as any).displayName ?? doc.name,
      mode: (doc as any).mode ?? 'agent',
      model: doc.model,
      status: doc.status,
      workload: doc.workload,
      maxWorkload: doc.maxWorkload,
      temperature: (doc as any).temperature ?? 0.2,
      prompt: (doc as any).prompt ?? '',
      toolsJson: (doc as any).toolsJson ?? '{}',
      source: (doc as any).source ?? 'import',
      updatedAt: (doc as any).updatedAt ?? doc.createdAt,
    }))
  },
})

export const getAgentByName = query({
  args: { name: v.string() },
  returns: v.union(agentResponse, v.null()),
  handler: async (ctx, args) => {
    await resolveActor(ctx)
    const doc = await ctx.db
      .query('agents')
      .withIndex('by_name', q => q.eq('name', args.name))
      .unique()
    if (!doc) return null
    return {
      name: doc.name,
      displayName: (doc as any).displayName ?? doc.name,
      mode: (doc as any).mode ?? 'agent',
      model: doc.model,
      status: doc.status,
      workload: doc.workload,
      maxWorkload: doc.maxWorkload,
      temperature: (doc as any).temperature ?? 0.2,
      prompt: (doc as any).prompt ?? '',
      toolsJson: (doc as any).toolsJson ?? '{}',
      source: (doc as any).source ?? 'import',
      updatedAt: (doc as any).updatedAt ?? doc.createdAt,
    }
  },
})

const harnessResponse = v.object({
  name: v.string(),
  commandTemplate: v.string(),
  discoveryCommand: v.optional(v.string()),
  source: sourceKind,
  updatedAt: v.number(),
})

export const listHarnesses = query({
  args: {},
  returns: v.array(harnessResponse),
  handler: async _ctx => {
    return []
  },
})

export const getHarnessByName = query({
  args: { name: v.string() },
  returns: v.union(harnessResponse, v.null()),
  handler: async (_ctx, _args) => {
    return null
  },
})

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
    await resolveActor(ctx)
    const existing = await ctx.db
      .query('agents')
      .withIndex('by_name', q => q.eq('name', args.name))
      .unique()
    if (existing) {
      // Only `model` is both an argument and a column on `agents`. Spreading
      // every arg here writes displayName/mode/temperature/prompt/toolsJson/
      // source, none of which are in the table validator, so the patch is
      // rejected and no existing agent can ever be updated.
      await ctx.db.patch(existing._id, { model: args.model })
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
      })
    }
    return null
  },
})

export const upsertHarness = mutation({
  args: {
    name: v.string(),
    commandTemplate: v.string(),
    discoveryCommand: v.optional(v.string()),
    source: sourceKind,
  },
  returns: v.null(),
  handler: async (_ctx, _args) => {
    return null
  },
})

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
      reviewerId: v.optional(v.string()),
      mergerId: v.optional(v.string()),
      dependencies: v.array(v.string()),
      updatedAt: v.number(),
    }),
  ),
  handler: async (ctx, args) => {
    await resolveActor(ctx)
    // Resolve the public slug to the project ID used by imported task rows.
    // Keep the name fallback for older callers that persisted the project name
    // before the slug-scoped catalog contract existed.
    const project =
      (await ctx.db
        .query('projects')
        .withIndex('by_slug', q => q.eq('slug', args.projectSlug))
        .unique()) ??
      (await ctx.db
        .query('projects')
        .withIndex('by_name', q => q.eq('name', args.projectSlug))
        .unique())
    if (!project) return []

    const docs = await ctx.db
      .query('tasks')
      .withIndex('by_project', q => q.eq('projectId', project._id))
      .collect()

    const assigneeIds = [
      ...new Set(docs.flatMap(doc => (doc.assigneeId ? [doc.assigneeId] : []))),
    ]
    const assignees = await Promise.all(assigneeIds.map(assigneeId => ctx.db.get(assigneeId)))
    const assigneeNames = new Map(
      assigneeIds.map((assigneeId, index) => [assigneeId, assignees[index]?.name]),
    )

    return docs.map(doc => {
      const row = mapTaskDocToRow(doc, args.projectSlug)
      if (!row.assignee && doc.assigneeId) row.assignee = assigneeNames.get(doc.assigneeId)
      return { ...row, projectSlug: args.projectSlug }
    })
  },
})

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
      reviewerId: v.optional(v.string()),
      mergerId: v.optional(v.string()),
      dependencies: v.array(v.string()),
      updatedAt: v.number(),
    }),
  ),
  handler: async ctx => {
    await resolveActor(ctx)
    const docs = await ctx.db.query('tasks').collect()
    return docs.map(doc => mapTaskDocToRow(doc))
  },
})

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
      reviewerId: v.optional(v.string()),
      mergerId: v.optional(v.string()),
      dependencies: v.array(v.string()),
      updatedAt: v.number(),
    }),
    v.null(),
  ),
  handler: async (_ctx, _args) => {
    return null
  },
})

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
    await resolveActor(ctx)
    const project =
      (await ctx.db
        .query('projects')
        .withIndex('by_slug', q => q.eq('slug', args.projectSlug))
        .unique()) ??
      (await ctx.db
        .query('projects')
        .withIndex('by_name', q => q.eq('name', args.projectSlug))
        .unique())
    if (!project) return []

    const legacyDocs = await ctx.db
      .query('tracks')
      .withIndex('by_project', q => q.eq('projectSlug', project.name))
      .collect()
    const canonicalDocs =
      project.slug === project.name
        ? []
        : await ctx.db
            .query('tracks')
            .withIndex('by_project', q => q.eq('projectSlug', project.slug))
            .collect()
    const docs = [...legacyDocs, ...canonicalDocs]
    return docs.map(doc => ({
      projectSlug: args.projectSlug,
      trackId: doc.trackId,
      title: doc.title,
      status: doc.status,
      version: doc.version,
      updatedAt: doc.updatedAt,
    }))
  },
})

export const getSetting = query({
  args: { scope: v.string(), key: v.string() },
  returns: v.union(
    v.object({ scope: v.string(), key: v.string(), valueJson: v.string(), updatedAt: v.number() }),
    v.null(),
  ),
  handler: async (ctx, args) => {
    await resolveActor(ctx)
    const doc = await ctx.db
      .query('settings')
      .withIndex('by_scope_and_key', q => q.eq('scope', args.scope).eq('key', args.key))
      .unique()
    if (!doc) return null
    return {
      scope: doc.scope,
      key: doc.key,
      valueJson: doc.valueJson,
      updatedAt: doc.updatedAt,
    }
  },
})

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
    await resolveActor(ctx)
    const docs = await ctx.db
      .query('settings')
      .withIndex('by_scope', q => q.eq('scope', args.scope))
      .collect()
    return docs.map(doc => ({
      scope: doc.scope,
      key: doc.key,
      valueJson: doc.valueJson,
      updatedAt: doc.updatedAt,
    }))
  },
})

export const upsertTask = mutation({
  args: {
    projectSlug: v.string(),
    trackId: v.string(),
    taskKey: v.string(),
    title: v.string(),
    description: v.optional(v.string()),
    status: taskStatus,
    priority: v.optional(priority),
    storyPoints: v.optional(v.number()),
    assignee: v.optional(v.string()),
    dependencies: v.array(v.string()),
    sessionId: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await resolveActor(ctx)

    // The orchestration contract supplies the public project slug. Resolve it
    // first so imported projects whose display name differs from that slug are
    // not duplicated (or have their existing tasks reassigned) on status writes.
    // Keep the name lookup as a compatibility fallback for legacy callers.
    const project =
      (await ctx.db
        .query('projects')
        .withIndex('by_slug', q => q.eq('slug', args.projectSlug))
        .unique()) ??
      (await ctx.db
        .query('projects')
        .withIndex('by_name', q => q.eq('name', args.projectSlug))
        .unique())

    let projectId: string
    if (project) {
      projectId = project._id
    } else {
      const now = Date.now()
      const slug = args.projectSlug
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
      projectId = await ctx.db.insert('projects', {
        name: args.projectSlug,
        slug,
        description: '',
        createdAt: now,
        updatedAt: now,
      })
    }

    const projectIdTyped = projectId as any

    // Look up existing task by taskKey
    const existing = args.taskKey
      ? await ctx.db
          .query('tasks')
          .withIndex('by_task_key', q => q.eq('taskKey', args.taskKey))
          .unique()
      : null

    const now = Date.now()
    const next = {
      projectId: projectIdTyped,
      title: args.title,
      description: args.description ?? args.title,
      status: args.status,
      priority: args.priority ?? 'medium',
      storyPoints: args.storyPoints ?? 0,
      costEstimate: 0,
      projectSlug: args.projectSlug,
      trackId: args.trackId,
      taskKey: args.taskKey,
      dependencies: args.dependencies,
      sessionId: args.sessionId,
      assigneeName: args.assignee,
      updatedAt: now,
    }

    if (existing) {
      await ctx.db.patch(existing._id, next)
    } else {
      await ctx.db.insert('tasks', { ...next, createdAt: now } as any)
      await adjustCounter(ctx, COUNTER_KEYS.tasks, 1)
    }

    return null
  },
})

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
    await resolveActor(ctx)
    const existing = await ctx.db
      .query('issues')
      .withIndex('by_issue_id', q => q.eq('issueId', args.issueId))
      .unique()
    const next = { ...args, updatedAt: Date.now() }
    if (existing) {
      await ctx.db.patch(existing._id, next)
    } else {
      await ctx.db.insert('issues', next)
      await adjustCounter(ctx, COUNTER_KEYS.issues, 1)
    }
    return null
  },
})

export const setSetting = mutation({
  args: {
    scope: v.string(),
    key: v.string(),
    valueJson: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await resolveActor(ctx)
    const existing = await ctx.db
      .query('settings')
      .withIndex('by_scope_and_key', q => q.eq('scope', args.scope).eq('key', args.key))
      .unique()
    const next = { ...args, updatedAt: Date.now() }
    if (existing) {
      await ctx.db.patch(existing._id, next)
    } else {
      await ctx.db.insert('settings', next)
    }
    return null
  },
})

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
    await resolveActor(ctx)
    const existing = await ctx.db
      .query('workRuns')
      .withIndex('by_run_id', q => q.eq('runId', args.runId))
      .unique()
    if (existing) {
      await ctx.db.patch(existing._id, args)
    } else {
      await ctx.db.insert('workRuns', args)
      await adjustCounter(ctx, COUNTER_KEYS.workRuns, 1)
    }
    return null
  },
})

export const deleteAgent = mutation({
  args: { name: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    await resolveActor(ctx)
    const doc = await ctx.db
      .query('agents')
      .withIndex('by_name', q => q.eq('name', args.name))
      .unique()
    if (doc) await ctx.db.delete(doc._id)
    return null
  },
})

export const deleteHarness = mutation({
  args: { name: v.string() },
  returns: v.null(),
  handler: async (_ctx, _args) => {
    return null
  },
})

export const updateTaskStatus = mutation({
  args: {
    projectSlug: v.string(),
    taskKey: v.string(),
    status: taskStatus,
  },
  returns: v.null(),
  handler: async (_ctx, _args) => {
    return null
  },
})

export const getActiveSprintForProject = query({
  args: { projectSlug: v.string() },
  returns: v.union(
    v.object({
      _id: v.id('sprints'),
      projectId: v.id('projects'),
      name: v.string(),
      status: sprintStatus,
      budget: v.number(),
      actualCost: v.number(),
      pointsDelivered: v.number(),
      taskCount: v.number(),
      completedCount: v.number(),
      createdAt: v.number(),
      startedAt: v.optional(v.number()),
      closedAt: v.optional(v.number()),
    }),
    v.null(),
  ),
  handler: async (ctx, args) => {
    await resolveActor(ctx)
    const project = await ctx.db
      .query('projects')
      .withIndex('by_name', q => q.eq('name', args.projectSlug))
      .unique()
    if (!project) return null

    const sprint = await ctx.db
      .query('sprints')
      .withIndex('by_project', q => q.eq('projectId', project._id))
      .filter(q => q.eq(q.field('status'), 'active'))
      .first()
    return sprint ?? null
  },
})

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
    await resolveActor(ctx)
    const docs =
      args.projectSlug === '*'
        ? await ctx.db.query('workRuns').collect()
        : await ctx.db
            .query('workRuns')
            .withIndex('by_project', q => q.eq('projectSlug', args.projectSlug))
            .collect()
    return docs.map(doc => ({
      projectSlug: doc.projectSlug,
      runId: doc.runId,
      status: doc.status,
      selectedTaskKey: doc.selectedTaskKey,
      runnerHost: doc.runnerHost,
      startedAt: doc.startedAt,
      finishedAt: doc.finishedAt,
    }))
  },
})
