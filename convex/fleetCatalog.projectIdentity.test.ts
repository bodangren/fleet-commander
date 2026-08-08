import { describe, expect, it } from 'bun:test'
import { createMockCtx, sampleProject, sampleTask } from './__fixtures__/foundation'
import { listTasksByProject, listTracksByProject, upsertTask } from './fleetCatalog'

describe('fleet catalog project identity', () => {
  it('normalizes legacy name-backed task rows to the requested canonical slug', async () => {
    const ctx = createMockCtx()
    const projectId = await ctx.db.insert('projects', {
      ...sampleProject,
      name: 'Reading Advantage Benchmark',
      slug: 'reading-advantage-llm-benchmark',
    })
    await ctx.db.insert('tasks', {
      ...sampleTask,
      projectId,
      projectSlug: 'Reading Advantage Benchmark',
      taskKey: 'factory-task-1',
      status: 'ready',
    })

    const rows = await listTasksByProject(ctx, {
      projectSlug: 'reading-advantage-llm-benchmark',
    })

    expect(rows).toHaveLength(1)
    expect(rows[0].taskKey).toBe('factory-task-1')
    expect(rows[0].projectSlug).toBe('reading-advantage-llm-benchmark')
  })

  it('reads both legacy name-backed and canonical slug-backed tracks', async () => {
    const previousBootstrap = process.env.FLEET_ALLOW_ANON_BOOTSTRAP
    process.env.FLEET_ALLOW_ANON_BOOTSTRAP = '1'
    const ctx = createMockCtx()
    await ctx.db.insert('projects', {
      ...sampleProject,
      name: 'Reading Advantage Benchmark',
      slug: 'reading-advantage-llm-benchmark',
    })
    const baseTrack = {
      title: 'Factory path',
      status: 'active',
      version: 1,
      updatedAt: 1,
    }
    await ctx.db.insert('tracks', {
      ...baseTrack,
      projectSlug: 'Reading Advantage Benchmark',
      trackId: 'legacy-track',
    })
    await ctx.db.insert('tracks', {
      ...baseTrack,
      projectSlug: 'reading-advantage-llm-benchmark',
      trackId: 'canonical-track',
    })

    try {
      const rows = await listTracksByProject(ctx, {
        projectSlug: 'reading-advantage-llm-benchmark',
      })

      expect(rows.map(row => row.trackId).sort()).toEqual(['canonical-track', 'legacy-track'])
      expect(rows.every(row => row.projectSlug === 'reading-advantage-llm-benchmark')).toBe(true)
    } finally {
      if (previousBootstrap === undefined) delete process.env.FLEET_ALLOW_ANON_BOOTSTRAP
      else process.env.FLEET_ALLOW_ANON_BOOTSTRAP = previousBootstrap
    }
  })

  it('upserts imported task status by canonical slug without duplicating or reassigning the project', async () => {
    const previousBootstrap = process.env.FLEET_ALLOW_ANON_BOOTSTRAP
    process.env.FLEET_ALLOW_ANON_BOOTSTRAP = '1'
    const ctx = createMockCtx()
    const projectId = await ctx.db.insert('projects', {
      ...sampleProject,
      name: 'Reading Advantage Benchmark',
      slug: 'reading-advantage-llm-benchmark',
    })
    const taskId = await ctx.db.insert('tasks', {
      ...sampleTask,
      projectId,
      projectSlug: 'reading-advantage-llm-benchmark',
      trackId: 'factory-track',
      taskKey: 'factory-task-1',
      status: 'ready',
      dependencies: [],
    })

    try {
      // This is the same fleetCatalog.upsertTask write issued by the pivot
      // updateTaskStatus stage when an imported task changes status.
      await upsertTask(ctx, {
        projectSlug: 'reading-advantage-llm-benchmark',
        trackId: 'factory-track',
        taskKey: 'factory-task-1',
        title: 'Factory task',
        status: 'in_progress',
        dependencies: [],
      })

      const projects = await ctx.db.query('projects').collect()
      const task = await ctx.db.get(taskId)
      expect(projects).toHaveLength(1)
      expect(task?.projectId).toBe(projectId)
      expect(task?.status).toBe('in_progress')
    } finally {
      if (previousBootstrap === undefined) delete process.env.FLEET_ALLOW_ANON_BOOTSTRAP
      else process.env.FLEET_ALLOW_ANON_BOOTSTRAP = previousBootstrap
    }
  })
})
