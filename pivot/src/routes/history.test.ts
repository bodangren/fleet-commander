import { describe, expect, it, mock } from 'bun:test'
import type { ConvexHttpClient } from 'convex/browser'
import { Router } from './router'
import { registerHistoryRoutes } from './history'

function createRouter(query: ReturnType<typeof mock>): Router {
  const router = new Router()
  registerHistoryRoutes(router, { query } as unknown as ConvexHttpClient)
  return router
}

describe('history routes', () => {
  it('registers project-id scoped read endpoints without changing the sprint panel route', () => {
    const query = mock(async () => [])
    const router = createRouter(query)

    expect(router.match('GET', '/api/history/projects/project-1/sprints')).not.toBeNull()
    expect(router.match('GET', '/api/history/projects/project-1/tasks')).not.toBeNull()
    expect(router.match('GET', '/api/projects/project-1/sprints')).toBeNull()
  })

  it('queries sprint history with the selected project id and limit', async () => {
    const query = mock(async () => [{ _id: 'sprint-1', name: 'Sprint 1' }])
    const router = createRouter(query)
    const match = router.match('GET', '/api/history/projects/project-1/sprints')!

    const response = await match.handler(
      new Request('http://localhost/api/history/projects/project-1/sprints?limit=50'),
      match.params,
    )

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual([{ _id: 'sprint-1', name: 'Sprint 1' }])
    expect(query).toHaveBeenCalledWith(expect.anything(), {
      projectId: 'project-1',
      limit: 50,
    })
  })

  it('queries task history with optional filters and returns the array directly', async () => {
    const query = mock(async () => [{ _id: 'task-1', title: 'Imported task' }])
    const router = createRouter(query)
    const match = router.match('GET', '/api/history/projects/project-1/tasks')!

    const response = await match.handler(
      new Request(
        'http://localhost/api/history/projects/project-1/tasks?limit=25&status=done&search=imported',
      ),
      match.params,
    )

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual([{ _id: 'task-1', title: 'Imported task' }])
    expect(query).toHaveBeenCalledWith(expect.anything(), {
      projectId: 'project-1',
      status: 'done',
      search: 'imported',
      limit: 25,
    })
  })

  it('rejects invalid limits and task statuses before calling Convex', async () => {
    const query = mock(async () => [])
    const router = createRouter(query)
    const match = router.match('GET', '/api/history/projects/project-1/tasks')!

    const invalidLimit = await match.handler(
      new Request('http://localhost/api/history/projects/project-1/tasks?limit=0'),
      match.params,
    )
    const invalidStatus = await match.handler(
      new Request('http://localhost/api/history/projects/project-1/tasks?status=todo'),
      match.params,
    )

    expect(invalidLimit.status).toBe(400)
    expect(invalidStatus.status).toBe(400)
    expect(query).not.toHaveBeenCalled()
  })

  it('returns a finite error response when Convex rejects a read', async () => {
    const query = mock(async () => {
      throw new Error('Project not found')
    })
    const router = createRouter(query)
    const match = router.match('GET', '/api/history/projects/project-1/sprints')!

    const response = await match.handler(
      new Request('http://localhost/api/history/projects/project-1/sprints'),
      match.params,
    )

    expect(response.status).toBe(500)
    expect(await response.json()).toEqual({ error: 'Project not found' })
  })
})
