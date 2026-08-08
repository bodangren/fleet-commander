import { describe, expect, it } from 'bun:test'
import {
  listTasksHandler,
  getTaskHandler,
  createTaskHandler,
  updateTaskHandler,
  updateTaskStatusHandler,
  assignTaskHandler,
  moveTaskHandler,
  claimTaskForExecution,
} from './tasks'
import {
  createMockCtx,
  sampleProject,
  sampleSprint,
  sampleTask,
  sampleAgents,
} from './__fixtures__/foundation'

describe('listTasksHandler', () => {
  it('returns tasks for a project ordered by createdAt desc', async () => {
    expect(listTasksHandler).toBeDefined()
    const ctx = createMockCtx()
    const projectId = await ctx.db.insert('projects', sampleProject)
    await ctx.db.insert('tasks', {
      ...sampleTask,
      projectId,
      title: 'Task A',
      createdAt: 1000,
    })
    await ctx.db.insert('tasks', {
      ...sampleTask,
      projectId,
      title: 'Task B',
      createdAt: 2000,
    })
    await ctx.db.insert('tasks', {
      ...sampleTask,
      projectId: 'other',
      title: 'Task C',
      createdAt: 3000,
    })

    const result = await listTasksHandler(ctx, { projectId })

    expect(result.length).toBe(2)
    expect(result[0].title).toBe('Task B')
    expect(result[1].title).toBe('Task A')
  })

  it('returns empty array when no tasks exist for project', async () => {
    expect(listTasksHandler).toBeDefined()
    const ctx = createMockCtx()
    const projectId = await ctx.db.insert('projects', sampleProject)
    const result = await listTasksHandler(ctx, { projectId })
    expect(result).toEqual([])
  })

  it('strips _creationTime from results', async () => {
    expect(listTasksHandler).toBeDefined()
    const ctx = createMockCtx()
    const projectId = await ctx.db.insert('projects', sampleProject)
    await ctx.db.insert('tasks', { ...sampleTask, projectId })
    const result = await listTasksHandler(ctx, { projectId })
    expect(result[0]._creationTime).toBeUndefined()
    expect(result[0]._id).toBeDefined()
  })
})

describe('getTaskHandler', () => {
  it('returns task by id', async () => {
    expect(getTaskHandler).toBeDefined()
    const ctx = createMockCtx()
    const projectId = await ctx.db.insert('projects', sampleProject)
    const id = await ctx.db.insert('tasks', { ...sampleTask, projectId })
    const result = await getTaskHandler(ctx, { id })
    expect(result).toBeDefined()
    expect(result!.title).toBe(sampleTask.title)
  })

  it('returns null when task not found', async () => {
    expect(getTaskHandler).toBeDefined()
    const ctx = createMockCtx()
    const result = await getTaskHandler(ctx, { id: 'task-999' })
    expect(result).toBeNull()
  })

  it('strips _creationTime from result', async () => {
    expect(getTaskHandler).toBeDefined()
    const ctx = createMockCtx()
    const projectId = await ctx.db.insert('projects', sampleProject)
    const id = await ctx.db.insert('tasks', { ...sampleTask, projectId })
    const result = await getTaskHandler(ctx, { id })
    expect(result!._creationTime).toBeUndefined()
  })
})

describe('createTaskHandler', () => {
  it('inserts a new task with provided fields and timestamps', async () => {
    expect(createTaskHandler).toBeDefined()
    const ctx = createMockCtx()
    const projectId = await ctx.db.insert('projects', sampleProject)
    const id = await createTaskHandler(ctx, {
      projectId,
      title: 'New Task',
      description: 'A new task',
      storyPoints: 5,
      priority: 'high',
    })

    const created = await ctx.db.get(id)
    expect(created).toBeDefined()
    expect(created.title).toBe('New Task')
    expect(created.description).toBe('A new task')
    expect(created.storyPoints).toBe(5)
    expect(created.priority).toBe('high')
    expect(created.status).toBe('backlog')
    expect(created.costEstimate).toBe(0)
    expect(created.createdAt).toBeGreaterThan(0)
    expect(created.updatedAt).toBeGreaterThan(0)
  })

  it('calculates costEstimate when assigneeId is provided', async () => {
    expect(createTaskHandler).toBeDefined()
    const ctx = createMockCtx()
    const projectId = await ctx.db.insert('projects', sampleProject)
    const agentId = await ctx.db.insert('agents', sampleAgents[0]) // costPerPoint: 4.2

    const id = await createTaskHandler(ctx, {
      projectId,
      title: 'Costed Task',
      description: '',
      storyPoints: 5,
      priority: 'medium',
      assigneeId: agentId,
    })

    const created = await ctx.db.get(id)
    expect(created.costEstimate).toBe(21) // 5 * 4.2
  })
})

describe('updateTaskHandler', () => {
  it('updates task fields without touching others', async () => {
    expect(updateTaskHandler).toBeDefined()
    const ctx = createMockCtx()
    const projectId = await ctx.db.insert('projects', sampleProject)
    const id = await ctx.db.insert('tasks', {
      ...sampleTask,
      projectId,
      title: 'Original',
      storyPoints: 3,
    })
    await updateTaskHandler(ctx, {
      id,
      title: 'Updated',
      storyPoints: 8,
    })

    const updated = await ctx.db.get(id)
    expect(updated.title).toBe('Updated')
    expect(updated.storyPoints).toBe(8)
    expect(updated.description).toBe(sampleTask.description)
    expect(updated.priority).toBe(sampleTask.priority)
  })
})

describe('updateTaskStatusHandler', () => {
  it('transitions backlog to ready', async () => {
    expect(updateTaskStatusHandler).toBeDefined()
    const ctx = createMockCtx()
    const projectId = await ctx.db.insert('projects', sampleProject)
    const id = await ctx.db.insert('tasks', {
      ...sampleTask,
      projectId,
      status: 'backlog',
    })
    await updateTaskStatusHandler(ctx, { id, status: 'ready' })
    const updated = await ctx.db.get(id)
    expect(updated.status).toBe('ready')
  })

  it('transitions ready to in_progress', async () => {
    expect(updateTaskStatusHandler).toBeDefined()
    const ctx = createMockCtx()
    const projectId = await ctx.db.insert('projects', sampleProject)
    const id = await ctx.db.insert('tasks', {
      ...sampleTask,
      projectId,
      status: 'ready',
    })
    await updateTaskStatusHandler(ctx, { id, status: 'in_progress' })
    const updated = await ctx.db.get(id)
    expect(updated.status).toBe('in_progress')
  })

  it('transitions in_progress to review', async () => {
    expect(updateTaskStatusHandler).toBeDefined()
    const ctx = createMockCtx()
    const projectId = await ctx.db.insert('projects', sampleProject)
    const id = await ctx.db.insert('tasks', {
      ...sampleTask,
      projectId,
      status: 'in_progress',
    })
    await updateTaskStatusHandler(ctx, { id, status: 'review' })
    const updated = await ctx.db.get(id)
    expect(updated.status).toBe('review')
  })

  it('transitions review to done', async () => {
    expect(updateTaskStatusHandler).toBeDefined()
    const ctx = createMockCtx()
    const projectId = await ctx.db.insert('projects', sampleProject)
    const id = await ctx.db.insert('tasks', {
      ...sampleTask,
      projectId,
      status: 'review',
    })
    await updateTaskStatusHandler(ctx, { id, status: 'done' })
    const updated = await ctx.db.get(id)
    expect(updated.status).toBe('done')
  })

  it('transitions in_progress to blocked', async () => {
    expect(updateTaskStatusHandler).toBeDefined()
    const ctx = createMockCtx()
    const projectId = await ctx.db.insert('projects', sampleProject)
    const id = await ctx.db.insert('tasks', {
      ...sampleTask,
      projectId,
      status: 'in_progress',
    })
    await updateTaskStatusHandler(ctx, { id, status: 'blocked' })
    const updated = await ctx.db.get(id)
    expect(updated.status).toBe('blocked')
  })

  it('transitions blocked to ready', async () => {
    expect(updateTaskStatusHandler).toBeDefined()
    const ctx = createMockCtx()
    const projectId = await ctx.db.insert('projects', sampleProject)
    const id = await ctx.db.insert('tasks', {
      ...sampleTask,
      projectId,
      status: 'blocked',
    })
    await updateTaskStatusHandler(ctx, { id, status: 'ready' })
    const updated = await ctx.db.get(id)
    expect(updated.status).toBe('ready')
  })
})

describe('assignTaskHandler', () => {
  it('assigns agent to task and calculates costEstimate', async () => {
    expect(assignTaskHandler).toBeDefined()
    const ctx = createMockCtx()
    const projectId = await ctx.db.insert('projects', sampleProject)
    const agentId = await ctx.db.insert('agents', sampleAgents[1]) // bob, costPerPoint: 2.1
    const taskId = await ctx.db.insert('tasks', {
      ...sampleTask,
      projectId,
      storyPoints: 4,
      costEstimate: 0,
    })

    await assignTaskHandler(ctx, { taskId, agentId })

    const task = await ctx.db.get(taskId)
    expect(task.assigneeId).toBe(agentId)
    expect(task.costEstimate).toBe(8.4) // 4 * 2.1

    const agent = await ctx.db.get(agentId)
    expect(agent.workload).toBe(1)
  })

  it('rejects assignment when agent workload >= maxWorkload', async () => {
    expect(assignTaskHandler).toBeDefined()
    const ctx = createMockCtx()
    const projectId = await ctx.db.insert('projects', sampleProject)
    const agentId = await ctx.db.insert('agents', {
      ...sampleAgents[0],
      workload: 5,
      maxWorkload: 5,
    })
    const taskId = await ctx.db.insert('tasks', { ...sampleTask, projectId })

    await expect(assignTaskHandler(ctx, { taskId, agentId })).rejects.toThrow(
      'Agent workload exceeded',
    )
  })
})

describe('moveTaskHandler', () => {
  it('moves task to an active sprint', async () => {
    expect(moveTaskHandler).toBeDefined()
    const ctx = createMockCtx()
    const projectId = await ctx.db.insert('projects', sampleProject)
    const sprintId = await ctx.db.insert('sprints', {
      ...sampleSprint,
      projectId,
      status: 'active',
    })
    const taskId = await ctx.db.insert('tasks', { ...sampleTask, projectId })

    await moveTaskHandler(ctx, { taskId, sprintId })

    const task = await ctx.db.get(taskId)
    expect(task.sprintId).toBe(sprintId)
  })

  it('rejects move when sprint is not active', async () => {
    expect(moveTaskHandler).toBeDefined()
    const ctx = createMockCtx()
    const projectId = await ctx.db.insert('projects', sampleProject)
    const sprintId = await ctx.db.insert('sprints', {
      ...sampleSprint,
      projectId,
      status: 'planned',
    })
    const taskId = await ctx.db.insert('tasks', { ...sampleTask, projectId })

    await expect(moveTaskHandler(ctx, { taskId, sprintId })).rejects.toThrow('Sprint is not active')
  })
})

describe('claimTaskForExecution', () => {
  /**
   * Seed a single task with the orchestrator-owned fields (projectSlug,
   * trackId, taskKey) so the claim mutation can resolve it.
   */
  function seedTask(ctx: any, overrides: Record<string, any> = {}) {
    const projectId = 'p1'
    return ctx.db.insert('tasks', {
      ...sampleTask,
      projectId,
      projectSlug: 'demo',
      trackId: 'demo_track',
      taskKey: 'T-1',
      status: 'ready',
      ...overrides,
    })
  }

  it('claims a task in expected status and patches it to in_progress with run metadata', async () => {
    const ctx = createMockCtx()
    await seedTask(ctx)

    const result = await (claimTaskForExecution as any)(ctx, {
      projectSlug: 'demo',
      trackId: 'demo_track',
      taskKey: 'T-1',
      expectedStatus: 'ready',
      runId: 'run-A',
    })

    expect(result.claimed).toBe(true)
    expect(result.currentStatus).toBe('in_progress')

    const task = await ctx.db
      .query('tasks')
      .withIndex('by_task_key', (q: any) => q.eq('taskKey', 'T-1'))
      .unique()
    expect(task.status).toBe('in_progress')
    expect(task.claimedByRunId).toBe('run-A')
    expect(typeof task.claimedAt).toBe('number')
  })

  it('returns claimed:false when the row was already claimed (status mismatch)', async () => {
    const ctx = createMockCtx()
    await seedTask(ctx, { status: 'in_progress', claimedByRunId: 'run-prior' })

    const result = await (claimTaskForExecution as any)(ctx, {
      projectSlug: 'demo',
      trackId: 'demo_track',
      taskKey: 'T-1',
      expectedStatus: 'ready',
      runId: 'run-B',
    })

    expect(result.claimed).toBe(false)
    expect(result.currentStatus).toBe('in_progress')
    expect(result.reason).toContain('Expected status ready')
  })

  it('returns claimed:false when the task does not exist', async () => {
    const ctx = createMockCtx()

    const result = await (claimTaskForExecution as any)(ctx, {
      projectSlug: 'demo',
      trackId: 'demo_track',
      taskKey: 'missing',
      expectedStatus: 'ready',
      runId: 'run-C',
    })

    expect(result.claimed).toBe(false)
    expect(result.reason).toBe('Task not found')
  })

  it('returns claimed:false on projectSlug mismatch (cross-project safety)', async () => {
    const ctx = createMockCtx()
    await seedTask(ctx, { projectSlug: 'other-project' })

    const result = await (claimTaskForExecution as any)(ctx, {
      projectSlug: 'demo',
      trackId: 'demo_track',
      taskKey: 'T-1',
      expectedStatus: 'ready',
      runId: 'run-D',
    })

    expect(result.claimed).toBe(false)
    expect(result.reason).toBe('Project mismatch')
  })

  it('claims a legacy name-backed task through its canonical project slug', async () => {
    const ctx = createMockCtx()
    const projectId = await ctx.db.insert('projects', {
      ...sampleProject,
      name: 'Reading Advantage Benchmark',
      slug: 'reading-advantage-llm-benchmark',
    })
    await seedTask(ctx, {
      projectId,
      projectSlug: 'Reading Advantage Benchmark',
    })

    const result = await (claimTaskForExecution as any)(ctx, {
      projectSlug: 'reading-advantage-llm-benchmark',
      trackId: 'demo_track',
      taskKey: 'T-1',
      expectedStatus: 'ready',
      runId: 'run-canonical',
    })

    expect(result.claimed).toBe(true)
  })

  it('exactly one of 50 sequential claim attempts succeeds; 49 fail with status mismatch (concurrent semantics under Convex serialization)', async () => {
    // Convex mutations on a single document serialize. Under that
    // contract, 50 callers attempting the same claim see exactly one
    // success and 49 failures (the row's `status` is no longer `ready`
    // after the first patch commits). We simulate that contract here by
    // awaiting each claim in turn; in production Convex's transaction
    // model enforces the same outcome under true parallelism.
    const ctx = createMockCtx()
    await seedTask(ctx)

    const results: any[] = []
    for (let i = 0; i < 50; i++) {
      results.push(
        await (claimTaskForExecution as any)(ctx, {
          projectSlug: 'demo',
          trackId: 'demo_track',
          taskKey: 'T-1',
          expectedStatus: 'ready',
          runId: `run-${i}`,
        }),
      )
    }

    const winners = results.filter((r: any) => r.claimed === true)
    const losers = results.filter((r: any) => r.claimed === false)

    expect(winners.length).toBe(1)
    expect(losers.length).toBe(49)
    for (const l of losers) {
      expect(l.currentStatus).toBe('in_progress')
    }
  })
})
