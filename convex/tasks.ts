import { v } from 'convex/values'
import { mutation, query } from './_generated/server'
import { taskStatus, priority, type TaskStatus } from './lib/validators'

const taskResponse = v.object({
  _id: v.id('tasks'),
  projectId: v.id('projects'),
  sprintId: v.optional(v.id('sprints')),
  title: v.string(),
  description: v.string(),
  storyPoints: v.number(),
  status: taskStatus,
  priority: priority,
  costEstimate: v.number(),
  actualCost: v.optional(v.number()),
  assigneeId: v.optional(v.id('agents')),
  reviewerId: v.optional(v.id('agents')),
  mergerId: v.optional(v.id('agents')),
  projectSlug: v.optional(v.string()),
  trackId: v.optional(v.string()),
  taskKey: v.optional(v.string()),
  dependencies: v.optional(v.array(v.string())),
  sessionId: v.optional(v.string()),
  assigneeName: v.optional(v.string()),
  createdAt: v.number(),
  updatedAt: v.number(),
})

export const listTasksHandler = query({
  args: { projectId: v.id('projects') },
  returns: v.array(taskResponse),
  handler: async (ctx, args) => {
    const docs = await ctx.db
      .query('tasks')
      .withIndex('by_project', q => q.eq('projectId', args.projectId))
      .order('desc')
      .collect()
    return docs.map(doc => {
      const { _creationTime, ...rest } = doc as any
      return rest
    })
  },
})

export const getTaskHandler = query({
  args: { id: v.id('tasks') },
  returns: v.union(v.null(), taskResponse),
  handler: async (ctx, args) => {
    const doc = await ctx.db.get(args.id)
    if (!doc) return null
    const { _creationTime, ...rest } = doc as any
    return rest
  },
})

export const createTaskHandler = mutation({
  args: {
    projectId: v.id('projects'),
    sprintId: v.optional(v.id('sprints')),
    title: v.string(),
    description: v.string(),
    storyPoints: v.number(),
    priority: priority,
    assigneeId: v.optional(v.id('agents')),
  },
  returns: v.id('tasks'),
  handler: async (ctx, args) => {
    const now = Date.now()
    const insertDoc: Record<string, unknown> = {
      projectId: args.projectId,
      sprintId: args.sprintId ?? undefined,
      title: args.title,
      description: args.description,
      storyPoints: args.storyPoints,
      priority: args.priority,
      status: 'backlog',
      costEstimate: 0,
      actualCost: undefined,
      assigneeId: undefined,
      reviewerId: undefined,
      mergerId: undefined,
      createdAt: now,
      updatedAt: now,
    }

    if (args.assigneeId) {
      const agent = await ctx.db.get(args.assigneeId)
      if (agent) {
        insertDoc.assigneeId = args.assigneeId
        insertDoc.costEstimate = args.storyPoints * (agent.costPerPoint as number)
      }
    }

    return ctx.db.insert('tasks', insertDoc as any)
  },
})

export const updateTaskHandler = mutation({
  args: {
    id: v.id('tasks'),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    storyPoints: v.optional(v.number()),
    priority: v.optional(priority),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const patch: Record<string, unknown> = { updatedAt: Date.now() }
    if (args.title !== undefined) patch.title = args.title
    if (args.description !== undefined) patch.description = args.description
    if (args.storyPoints !== undefined) patch.storyPoints = args.storyPoints
    if (args.priority !== undefined) patch.priority = args.priority
    await ctx.db.patch(args.id, patch)
    return null
  },
})

export const updateTaskStatusHandler = mutation({
  args: {
    id: v.id('tasks'),
    status: taskStatus,
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, { status: args.status, updatedAt: Date.now() })
    return null
  },
})

export const assignTaskHandler = mutation({
  args: {
    taskId: v.id('tasks'),
    agentId: v.id('agents'),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const agent = await ctx.db.get(args.agentId)
    if (!agent) throw new Error('Agent not found')

    const workload = agent.workload as number
    const maxWorkload = agent.maxWorkload as number
    if (workload >= maxWorkload) {
      throw new Error('Agent workload exceeded')
    }

    const task = await ctx.db.get(args.taskId)
    if (!task) throw new Error('Task not found')

    const costPerPoint = agent.costPerPoint as number
    const storyPoints = task.storyPoints as number
    const costEstimate = storyPoints * costPerPoint

    await ctx.db.patch(args.taskId, {
      assigneeId: args.agentId,
      costEstimate,
      updatedAt: Date.now(),
    })

    await ctx.db.patch(args.agentId, {
      workload: workload + 1,
    })

    return null
  },
})

export const moveTaskHandler = mutation({
  args: {
    taskId: v.id('tasks'),
    sprintId: v.id('sprints'),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const sprint = await ctx.db.get(args.sprintId)
    if (!sprint) throw new Error('Sprint not found')

    const status = sprint.status as string
    if (status !== 'active') {
      throw new Error('Sprint is not active')
    }

    await ctx.db.patch(args.taskId, {
      sprintId: args.sprintId,
      updatedAt: Date.now(),
    })

    return null
  },
})

/**
 * Atomically claims a task for execution. Returns `{ claimed: true }` if and
 * only if the task's current status equals `expectedStatus` at read-time; the
 * mutation then patches the row to `in_progress` with `claimedAt` and
 * `claimedByRunId` set. Convex serializes mutations on a single document, so
 * concurrent callers see the patched row and return `{ claimed: false }`.
 *
 * Used by the orchestrator's race-free dispatch path to prevent two runners
 * from picking the same task between candidate selection and status write.
 */
export const claimTaskForExecution = mutation({
  args: {
    projectSlug: v.string(),
    trackId: v.string(),
    taskKey: v.string(),
    expectedStatus: taskStatus,
    runId: v.string(),
  },
  returns: v.object({
    claimed: v.boolean(),
    currentStatus: v.optional(taskStatus),
    reason: v.optional(v.string()),
  }),
  handler: async (ctx, args) => {
    const doc = await ctx.db
      .query('tasks')
      .withIndex('by_task_key', q => q.eq('taskKey', args.taskKey))
      .unique()

    if (!doc) {
      return { claimed: false, reason: 'Task not found' }
    }

    const project = await ctx.db.get(doc.projectId)
    const canonicalProjectSlug = project?.slug ?? doc.projectSlug ?? ''
    if (canonicalProjectSlug !== args.projectSlug) {
      return { claimed: false, currentStatus: doc.status as TaskStatus, reason: 'Project mismatch' }
    }

    if ((doc.trackId ?? '') !== args.trackId) {
      return { claimed: false, currentStatus: doc.status as TaskStatus, reason: 'Track mismatch' }
    }

    if (doc.status !== args.expectedStatus) {
      return {
        claimed: false,
        currentStatus: doc.status as TaskStatus,
        reason: `Expected status ${args.expectedStatus}, got ${doc.status}`,
      }
    }

    await ctx.db.patch(doc._id, {
      status: 'in_progress',
      claimedAt: Date.now(),
      claimedByRunId: args.runId,
      updatedAt: Date.now(),
    })

    return { claimed: true, currentStatus: 'in_progress' as const }
  },
})
