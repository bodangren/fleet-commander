import type { ConvexHttpClient } from 'convex/browser'
import { api } from '../../../convex/_generated/api'
import type { Id } from '../../../convex/_generated/dataModel'
import type { Router } from './router'
import { badRequest, json } from './router'

const TASK_STATUSES = ['backlog', 'ready', 'in_progress', 'review', 'done', 'blocked'] as const

type TaskStatus = (typeof TASK_STATUSES)[number]

function parseLimit(url: URL): number | undefined | Response {
  const rawLimit = url.searchParams.get('limit')
  if (rawLimit === null || rawLimit === '') return undefined

  const limit = Number(rawLimit)
  if (!Number.isInteger(limit) || limit < 1) {
    return badRequest('limit must be a positive integer')
  }
  return limit
}

function parseTaskStatus(url: URL): TaskStatus | undefined | Response {
  const rawStatus = url.searchParams.get('status')
  if (rawStatus === null || rawStatus === '') return undefined
  if (!(TASK_STATUSES as readonly string[]).includes(rawStatus)) {
    return badRequest(`status must be one of ${TASK_STATUSES.join(', ')}`)
  }
  return rawStatus as TaskStatus
}

/**
 * Registers read-only history routes backed by the public Convex history handlers.
 * @param router - Router that receives the GET route registrations
 * @param client - Convex HTTP client used to execute the public queries
 * @returns Nothing; the routes are registered on the provided router
 */
export function registerHistoryRoutes(router: Router, client: ConvexHttpClient): void {
  router.get('/api/history/projects/:projectId/sprints', async (request, params) => {
    const url = new URL(request.url)
    const parsedLimit = parseLimit(url)
    if (parsedLimit instanceof Response) return parsedLimit

    try {
      const sprints = await client.query(api.history.sprints.listSprintHistoryHandler, {
        projectId: params.projectId as Id<'projects'>,
        ...(parsedLimit === undefined ? {} : { limit: parsedLimit }),
      })
      return json(sprints)
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      return json({ error: message }, 500)
    }
  })

  router.get('/api/history/projects/:projectId/tasks', async (request, params) => {
    const url = new URL(request.url)
    const parsedLimit = parseLimit(url)
    if (parsedLimit instanceof Response) return parsedLimit
    const parsedStatus = parseTaskStatus(url)
    if (parsedStatus instanceof Response) return parsedStatus

    try {
      const tasks = await client.query(api.history.tasks.listTaskHistoryHandler, {
        projectId: params.projectId as Id<'projects'>,
        ...(parsedStatus === undefined ? {} : { status: parsedStatus }),
        ...(url.searchParams.get('search') ? { search: url.searchParams.get('search')! } : {}),
        ...(parsedLimit === undefined ? {} : { limit: parsedLimit }),
      })
      return json(tasks)
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      return json({ error: message }, 500)
    }
  })
}
