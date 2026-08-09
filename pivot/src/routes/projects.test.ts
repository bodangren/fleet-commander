import { describe, expect, it, mock } from 'bun:test'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { Router } from './router'
import {
  registerProjectRoutes,
  makeTrackId,
  extractGoalFromSpec,
  mergeStoriesSection,
} from './projects'
import type { CatalogAgent } from './projectCatalog'
import { MANUAL_PROJECT_RUN_CONFIG, type ProjectGitLifecycle } from './projectRun'
import { ConvexHttpClient } from 'convex/browser'

function fakeGitLifecycle(): ProjectGitLifecycle {
  return {
    prepare: async () => ({ ok: true, branch: 'manual/test-task' }),
    snapshot: async () => ({
      branch: 'main',
      head: 'abc123',
      clean: true,
      changedPaths: [],
    }),
    hooks: {
      onTaskComplete: async () => undefined,
    },
  }
}

function git(cwd: string, ...args: string[]): string {
  return execFileSync('git', args, { cwd, encoding: 'utf8' }).trim()
}

function makeRequest(method: string, path: string, body?: Record<string, unknown>): Request {
  return new Request(`http://localhost${path}`, {
    method,
    headers: body ? { 'content-type': 'application/json' } : {},
    body: body ? JSON.stringify(body) : undefined,
  })
}

describe('Project route registration', () => {
  function createRouter(): Router {
    const router = new Router()
    const mockClient = {
      query: mock(async () => []),
      mutation: mock(async () => 'new-id'),
    } as unknown as ConvexHttpClient
    registerProjectRoutes(router, mockClient)
    return router
  }

  it('registers GET /api/health', () => {
    expect(createRouter().match('GET', '/api/health')).not.toBeNull()
  })

  it('registers GET /api/projects', () => {
    expect(createRouter().match('GET', '/api/projects')).not.toBeNull()
  })

  it('registers GET /api/projects/:id', () => {
    const result = createRouter().match('GET', '/api/projects/proj-1')
    expect(result).not.toBeNull()
    expect(result!.params).toEqual({ id: 'proj-1' })
  })

  it('registers DELETE /api/projects/:id', () => {
    expect(createRouter().match('DELETE', '/api/projects/proj-1')).not.toBeNull()
  })

  it('registers POST /api/projects', () => {
    expect(createRouter().match('POST', '/api/projects')).not.toBeNull()
  })

  it('registers POST /api/projects/scan', () => {
    expect(createRouter().match('POST', '/api/projects/scan')).not.toBeNull()
  })

  it('registers POST /api/projects/:id/run', () => {
    expect(
      createRouter().match('POST', '/api/projects/reading-advantage-llm-benchmark/run'),
    ).not.toBeNull()
  })
})

describe('Project route handlers', () => {
  it('GET /api/health returns ok status', async () => {
    const router = new Router()
    registerProjectRoutes(router, {
      query: mock(async () => []),
      mutation: mock(async () => 'id'),
    } as unknown as ConvexHttpClient)
    const match = router.match('GET', '/api/health')!
    const res = await match.handler(makeRequest('GET', '/api/health'), {})
    const body = await res.json()
    expect(body.status).toBe('ok')
  })

  it('POST /api/projects/:id/run requires one explicit task key', async () => {
    const router = new Router()
    const query = mock(async () => null)
    registerProjectRoutes(router, {
      query,
      mutation: mock(async () => 'id'),
    } as unknown as ConvexHttpClient)

    const match = router.match('POST', '/api/projects/project-a/run')!
    const response = await match.handler(
      makeRequest('POST', '/api/projects/project-a/run', {}),
      { id: 'project-a' },
    )

    expect(response.status).toBe(400)
    expect(query).not.toHaveBeenCalled()
  })

  it('POST /api/projects returns 400 when name is missing', async () => {
    const router = new Router()
    registerProjectRoutes(router, {
      query: mock(async () => []),
      mutation: mock(async () => 'id'),
    } as unknown as ConvexHttpClient)
    const match = router.match('POST', '/api/projects')!
    const res = await match.handler(makeRequest('POST', '/api/projects', {}), {})
    expect(res.status).toBe(400)
  })

  it('POST /api/projects creates project with valid body', async () => {
    const router = new Router()
    registerProjectRoutes(router, {
      query: mock(async () => []),
      mutation: mock(async () => 'new-id'),
    } as unknown as ConvexHttpClient)
    const match = router.match('POST', '/api/projects')!
    const res = await match.handler(
      makeRequest('POST', '/api/projects', { name: 'my-project' }),
      {},
    )
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.name).toBe('my-project')
  })

  it('GET /api/projects/:id returns 404 for missing project', async () => {
    const router = new Router()
    registerProjectRoutes(router, {
      query: mock(async () => null),
      mutation: mock(async () => 'id'),
    } as unknown as ConvexHttpClient)
    const match = router.match('GET', '/api/projects/missing')!
    const res = await match.handler(makeRequest('GET', '/api/projects/missing'), { id: 'missing' })
    expect(res.status).toBe(404)
  })

  it('GET /api/projects/:id resolves a slug and returns imported tracks/tasks', async () => {
    const router = new Router()
    const project = {
      _id: 'jproject1234567890123456789012',
      name: 'Reading Advantage',
      slug: 'reading-advantage-llm-benchmark',
      description: 'Imported benchmark',
      path: '/tmp/reading-advantage',
      createdAt: 100,
      updatedAt: 200,
    }
    let catalogQueryCount = 0
    const client = {
      query: mock(async (_ref: unknown, args: Record<string, unknown>) => {
        if ('slug' in args) return project
        if ('id' in args) return project
        if ('projectSlug' in args && args.projectSlug === project.slug) {
          catalogQueryCount += 1
          if (catalogQueryCount === 1) {
            return [
              {
                projectSlug: project.slug,
                trackId: 'track-1',
                title: 'Core workflow',
                status: 'active',
                version: 1,
                updatedAt: 300,
              },
            ]
          }
          return [
            {
              projectSlug: project.slug,
              trackId: 'track-1',
              taskKey: 'task-1',
              title: 'Restore project view',
              status: 'backlog',
              assignee: 'alice',
              dependencies: [],
              updatedAt: 300,
            },
          ]
        }
        if (Object.keys(args).length === 0) {
          return [
            {
              _id: 'agent-alice' as CatalogAgent['_id'],
              name: 'alice',
              role: 'architect',
              skills: ['typescript'],
              model: 'claude-opus',
              costPerPoint: 4.2,
            },
            {
              _id: 'agent-bob' as CatalogAgent['_id'],
              name: 'bob',
              role: 'executor',
              skills: ['react'],
              model: 'claude-sonnet',
              costPerPoint: 2.1,
            },
          ]
        }
        return null
      }),
      mutation: mock(async () => 'id'),
    } as unknown as ConvexHttpClient
    registerProjectRoutes(router, client)

    const match = router.match('GET', '/api/projects/reading-advantage-llm-benchmark')!
    const res = await match.handler(
      makeRequest('GET', '/api/projects/reading-advantage-llm-benchmark'),
      { id: 'reading-advantage-llm-benchmark' },
    )

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.id).toBe(project._id)
    expect(body.slug).toBe(project.slug)
    expect(body.description).toBe(project.description)
    expect(body.agents).toEqual([
      {
        _id: 'agent-alice',
        name: 'alice',
        role: 'architect',
        skills: ['typescript'],
        model: 'claude-opus',
        costPerPoint: 4.2,
      },
    ])
    expect(body.tracks[0].id).toBe('track-1')
    expect(body.tracks[0].phases[0].tasks[0].id).toBe('task-1')
    expect(body.tracks[0].phases[0].tasks[0].agentTag).toBe('alice')
  })

  it('GET /api/projects/:id returns tracks and tasks when the optional agent catalog is unavailable', async () => {
    const router = new Router()
    const project = {
      _id: 'jproject1234567890123456789012',
      name: 'Agent Catalog Resilience',
      slug: 'agent-catalog-resilience',
      description: 'Imported benchmark',
      path: '/tmp/agent-catalog-resilience',
      createdAt: 100,
      updatedAt: 200,
    }
    let catalogQueryCount = 0
    const client = {
      query: mock(async (_ref: unknown, args: Record<string, unknown>) => {
        if ('slug' in args || 'id' in args) return project
        if ('projectSlug' in args && args.projectSlug === project.slug) {
          catalogQueryCount += 1
          return catalogQueryCount === 1
            ? [
                {
                  projectSlug: project.slug,
                  trackId: 'resilience-track',
                  title: 'Resilience workflow',
                  status: 'active',
                  version: 1,
                  updatedAt: 300,
                },
              ]
            : [
                {
                  projectSlug: project.slug,
                  trackId: 'resilience-track',
                  taskKey: 'resilience-task',
                  title: 'Keep project details readable',
                  status: 'backlog',
                  dependencies: [],
                  updatedAt: 300,
                },
              ]
        }
        if (Object.keys(args).length === 0) {
          throw new Error('Agent catalog unavailable')
        }
        return null
      }),
      mutation: mock(async () => 'id'),
    } as unknown as ConvexHttpClient
    registerProjectRoutes(router, client)

    const match = router.match('GET', `/api/projects/${project.slug}`)!
    const response = await match.handler(makeRequest('GET', `/api/projects/${project.slug}`), {
      id: project.slug,
    })

    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body.agents).toEqual([])
    expect(body.tracks).toEqual([
      expect.objectContaining({
        id: 'resilience-track',
        phases: [
          expect.objectContaining({
            tasks: [expect.objectContaining({ id: 'resilience-task' })],
          }),
        ],
      }),
    ])
  })

  it('GET /api/projects/:id/next-task returns the first catalog backlog task', async () => {
    const router = new Router()
    const project = {
      _id: 'jproject1234567890123456789012',
      name: 'Reading Advantage',
      slug: 'reading-advantage-llm-benchmark',
      description: 'Imported benchmark',
      createdAt: 100,
      updatedAt: 200,
    }
    const client = {
      query: mock(async (_ref: unknown, args: Record<string, unknown>) => {
        if ('slug' in args || 'id' in args) return project
        return [
          {
            projectSlug: project.name,
            trackId: 'track-1',
            taskKey: 'task-1',
            title: 'Restore project view',
            status: 'backlog',
            dependencies: [],
            updatedAt: 300,
          },
        ]
      }),
      mutation: mock(async () => 'id'),
    } as unknown as ConvexHttpClient
    registerProjectRoutes(router, client)

    const match = router.match('GET', '/api/projects/reading-advantage-llm-benchmark/next-task')!
    const res = await match.handler(
      makeRequest('GET', '/api/projects/reading-advantage-llm-benchmark/next-task'),
      { id: 'reading-advantage-llm-benchmark' },
    )

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.id).toBe('task-1')
    expect(body.title).toBe('Restore project view')
  })

  it('crosses the production runner while injecting only executor and preflight seams', async () => {
    const router = new Router()
    const project = {
      _id: 'jproject1234567890123456789012',
      name: 'Reading Advantage',
      slug: 'reading-advantage-llm-benchmark',
      description: 'Imported benchmark',
      path: '/tmp',
      createdAt: 100,
      updatedAt: 200,
    }
    const task = {
      projectSlug: project.slug,
      trackId: 'track-1',
      taskKey: 'track-1-task-1',
      title: 'Bounded task',
      status: 'backlog',
      dependencies: [],
      updatedAt: 300,
    }
    let projectSlugQueryCount = 0
    const executeFn = mock(async () => ({
      taskKey: task.taskKey,
      status: 'succeeded' as const,
      durationMs: 1,
      output: 'must not spawn after failed preflight',
    }))
    const preflight = mock(async () => ({ ok: false, reason: 'Pi provider unavailable.' }))
    const client = {
      query: mock(async (_ref: unknown, args: Record<string, unknown>) => {
        if (args.slug === project.slug) return project
        if ('name' in args) return null
        if ('projectSlug' in args) {
          projectSlugQueryCount += 1
          return projectSlugQueryCount === 1 ? [task] : []
        }
        if ('limit' in args) return []
        if ('scope' in args) return null
        return { enabled: false }
      }),
      mutation: mock(async () => ({})),
    } as unknown as ConvexHttpClient
    registerProjectRoutes(router, client, undefined, {
      executeFn,
      preflight,
      worktreeCheck: async () => ({ clean: true, dirtyFiles: [] }),
      gitLifecycle: fakeGitLifecycle,
    })

    const match = router.match('POST', `/api/projects/${project.slug}/run`)!
    const res = await match.handler(
      makeRequest('POST', `/api/projects/${project.slug}/run`, { taskKey: task.taskKey }),
      { id: project.slug },
    )

    expect(res.status).toBe(200)
    expect(await res.json()).toMatchObject({
      ok: false,
      project: { id: project._id, slug: project.slug, name: project.name, path: project.path },
      taskKey: task.taskKey,
      status: 'failed',
      error: 'Pi provider unavailable.',
      git: {
        before: { branch: 'main', head: 'abc123', clean: true, changedPaths: [] },
        branch: 'manual/test-task',
        after: { branch: 'main', head: 'abc123', clean: true, changedPaths: [] },
        pushed: false,
      },
      run: {
        projectSlug: project.slug,
        taskKey: task.taskKey,
        status: 'failed',
      },
    })
    expect(preflight).toHaveBeenCalledTimes(1)
    expect(executeFn).not.toHaveBeenCalled()
  })

  it('fails closed before preflight or task execution when manual branch preparation fails', async () => {
    const router = new Router()
    const project = {
      _id: 'jproject1234567890123456789012',
      name: 'Reading Advantage',
      slug: 'reading-advantage-llm-benchmark',
      description: 'Imported benchmark',
      path: '/tmp',
      createdAt: 100,
      updatedAt: 200,
    }
    const preflight = mock(async () => ({ ok: true }))
    const executeFn = mock(async () => ({
      taskKey: 'task-1',
      status: 'succeeded' as const,
      durationMs: 1,
      output: 'must not execute after branch failure',
    }))
    let prepareCalls = 0
    const lifecycleFactory = (): ProjectGitLifecycle => ({
      prepare: async () => {
        prepareCalls += 1
        return { ok: false, error: 'branch creation denied' }
      },
      snapshot: async () => ({
        branch: 'main',
        head: 'abc123',
        clean: true,
        changedPaths: [],
      }),
      hooks: {},
    })
    const mutation = mock(async () => 'must-not-mutate')
    const client = {
      query: mock(async (_ref: unknown, args: Record<string, unknown>) => {
        if ('slug' in args) return project
        return { enabled: false }
      }),
      mutation,
    } as unknown as ConvexHttpClient
    registerProjectRoutes(router, client, undefined, {
      executeFn,
      preflight,
      worktreeCheck: async () => ({ clean: true, dirtyFiles: [] }),
      gitLifecycle: lifecycleFactory,
    })

    const match = router.match('POST', `/api/projects/${project.slug}/run`)!
    const response = await match.handler(
      makeRequest('POST', `/api/projects/${project.slug}/run`, { taskKey: 'task-1' }),
      { id: project.slug },
    )
    expect(response.status).toBe(409)
    expect(await response.json()).toMatchObject({
      ok: false,
      error: 'project_branch_prepare_failed',
      message: 'branch creation denied',
      git: {
        before: { branch: 'main', head: 'abc123', clean: true, changedPaths: [] },
        pushed: false,
      },
    })
    expect(prepareCalls).toBe(1)
    expect(preflight).not.toHaveBeenCalled()
    expect(executeFn).not.toHaveBeenCalled()
    expect(mutation).not.toHaveBeenCalled()
  })

  it('crosses the production manual Git lifecycle without an injected lifecycle', async () => {
    const workspace = mkdtempSync(join(tmpdir(), 'fc-manual-git-'))
    const remote = mkdtempSync(join(tmpdir(), 'fc-manual-remote-'))
    try {
      git(workspace, 'init', '-b', 'main')
      git(workspace, 'config', 'user.email', 'fleet-test@example.invalid')
      git(workspace, 'config', 'user.name', 'Fleet Test')
      writeFileSync(join(workspace, 'README.md'), 'clean acceptance fixture\n')
      git(workspace, 'add', 'README.md')
      git(workspace, 'commit', '-m', 'fixture')
      git(remote, 'init', '--bare')
      git(workspace, 'remote', 'add', 'origin', remote)

      const project = {
        _id: 'jproject1234567890123456789012',
        name: 'Reading Advantage',
        slug: 'reading-advantage-llm-benchmark',
        description: 'Imported benchmark',
        path: workspace,
        createdAt: 100,
        updatedAt: 200,
      }
      const task = {
        projectSlug: project.slug,
        trackId: 'track-1',
        taskKey: 'real-git-task',
        title: 'Real Git preflight fixture',
        status: 'backlog',
        assignee: 'factory-agent',
        dependencies: [],
        updatedAt: 300,
      }
      let projectSlugQueryCount = 0
      const preflight = mock(async () => ({
        ok: false,
        reason: 'provider unavailable after branch preparation',
      }))
      const executeFn = mock(async () => ({
        taskKey: task.taskKey,
        status: 'succeeded' as const,
        durationMs: 1,
        output: 'must not spawn after failed preflight',
      }))
      const mutation = mock(async () => ({}))
      const client = {
        query: mock(async (_ref: unknown, args: Record<string, unknown>) => {
          if (args.slug === project.slug) return project
          if ('name' in args) return null
          if ('projectSlug' in args && 'trackId' in args) return null
          if ('projectSlug' in args) {
            projectSlugQueryCount += 1
            return projectSlugQueryCount === 1 ? [task] : [
              {
                projectSlug: project.slug,
                trackId: task.trackId,
                title: 'Core workflow',
                status: 'active',
                version: 1,
                updatedAt: 300,
              },
            ]
          }
          if (args.limit === 1000 || args.limit === 100) return []
          return { enabled: false }
        }),
        mutation,
      } as unknown as ConvexHttpClient
      const router = new Router()
      registerProjectRoutes(router, client, undefined, { preflight, executeFn })

      const headBefore = git(workspace, 'rev-parse', 'HEAD')
      const response = await router.match(
        'POST',
        `/api/projects/${project.slug}/run`,
      )!.handler(
        makeRequest('POST', `/api/projects/${project.slug}/run`, { taskKey: task.taskKey }),
        { id: project.slug },
      )
      const rawBody = await response.text()
      const body = JSON.parse(rawBody)
      const taskBranch = body.git.branch as string
      expect(taskBranch).toContain(`fc/task-${task.taskKey}`)

      expect(response.status).toBe(200)
      expect(body).toMatchObject({
        ok: false,
        taskKey: task.taskKey,
        status: 'failed',
        error: 'provider unavailable after branch preparation',
        git: {
          branch: expect.stringContaining(`fc/task-${task.taskKey}`),
          pushed: false,
          before: { head: headBefore, clean: true },
          after: { head: headBefore, clean: true, changedPaths: [] },
        },
      })
      expect(git(workspace, 'branch', '--show-current')).toBe(taskBranch)
      expect(git(workspace, 'rev-parse', 'HEAD')).toBe(headBefore)
      expect(git(workspace, 'status', '--porcelain')).toBe('')
      expect(git(workspace, 'ls-remote', 'origin')).toBe('')
      expect(preflight).toHaveBeenCalledTimes(1)
      expect(executeFn).not.toHaveBeenCalled()
      expect(
        (mutation.mock.calls as unknown as Array<[unknown, Record<string, unknown>?]>).some(call => {
          const args = call[1]
          return args?.taskKey === task.taskKey && typeof args.status === 'string'
        }),
      ).toBe(false)
    } finally {
      rmSync(workspace, { recursive: true, force: true })
      rmSync(remote, { recursive: true, force: true })
    }
  })

  it('keeps manual execution explicitly bounded and retry-free', () => {
    expect(MANUAL_PROJECT_RUN_CONFIG).toEqual({
      maxRetries: 0,
      baseDelayMs: 0,
      maxDelayMs: 0,
      commandTimeoutMs: 600_000,
      maxTokens: 16_000,
    })
  })

  it('does not dispatch when continuous mode is enabled', async () => {
    const router = new Router()
    const project = {
      _id: 'jproject1234567890123456789012',
      name: 'Reading Advantage',
      slug: 'reading-advantage-llm-benchmark',
      description: 'Imported benchmark',
      path: '/tmp',
      createdAt: 100,
      updatedAt: 200,
    }
    const executeFn = mock(async () => ({
      taskKey: 'task-1',
      status: 'succeeded' as const,
      durationMs: 1,
      output: 'must not run while continuous mode is enabled',
    }))
    const preflight = mock(async () => ({ ok: true }))
    const client = {
      query: mock(async (_ref: unknown, args: Record<string, unknown>) => {
        if ('slug' in args) return project
        return { enabled: true }
      }),
      mutation: mock(async () => 'id'),
    } as unknown as ConvexHttpClient
    registerProjectRoutes(router, client, undefined, { executeFn, preflight })

    const match = router.match('POST', '/api/projects/reading-advantage-llm-benchmark/run')!
    const res = await match.handler(
      makeRequest('POST', '/api/projects/reading-advantage-llm-benchmark/run', {
        taskKey: 'task-1',
      }),
      { id: project.slug },
    )

    expect(res.status).toBe(409)
    expect((await res.json()).error).toBe('continuous_mode_enabled')
    expect(preflight).not.toHaveBeenCalled()
    expect(executeFn).not.toHaveBeenCalled()
  })

  it('fails closed when the target worktree is dirty', async () => {
    const router = new Router()
    const project = {
      _id: 'jproject1234567890123456789012',
      name: 'Reading Advantage',
      slug: 'reading-advantage-llm-benchmark',
      path: '/tmp',
      createdAt: 100,
      updatedAt: 200,
    }
    const preflight = mock(async () => ({ ok: true }))
    const executeFn = mock(async () => ({
      taskKey: 'task-1',
      status: 'succeeded' as const,
      durationMs: 1,
      output: 'must not run in a dirty worktree',
    }))
    const client = {
      query: mock(async (_ref: unknown, args: Record<string, unknown>) => {
        if ('slug' in args) return project
        return { enabled: false }
      }),
      mutation: mock(async () => 'id'),
    } as unknown as ConvexHttpClient
    registerProjectRoutes(router, client, undefined, {
      executeFn,
      preflight,
      worktreeCheck: async () => ({ clean: false, dirtyFiles: ['src/secrets.ts'] }),
    })

    const match = router.match('POST', `/api/projects/${project.slug}/run`)!
    const res = await match.handler(
      makeRequest('POST', `/api/projects/${project.slug}/run`, { taskKey: 'task-1' }),
      { id: project.slug },
    )

    expect(res.status).toBe(409)
    expect(await res.json()).toMatchObject({
      ok: false,
      error: 'project_worktree_dirty',
      dirtyFiles: ['src/secrets.ts'],
    })
    expect(preflight).not.toHaveBeenCalled()
    expect(executeFn).not.toHaveBeenCalled()
  })

  it('rejects a manual run while an automatic cycle owns the process guard', async () => {
    const router = new Router()
    const project = {
      _id: 'jproject1234567890123456789012',
      name: 'Reading Advantage',
      slug: 'reading-advantage-llm-benchmark',
      path: '/tmp',
      createdAt: 100,
      updatedAt: 200,
    }
    const task = {
      projectSlug: project.slug,
      trackId: 'track-1',
      taskKey: 'track-1-task-1',
      title: 'Bounded task',
      status: 'backlog',
      dependencies: [],
      updatedAt: 300,
    }
    let release: (() => void) | undefined
    let entered = false
    const preflight = mock(async () => {
      entered = true
      await new Promise<void>(resolve => {
        release = resolve
      })
      return { ok: false, reason: 'contention test preflight' }
    })
    const client = {
      query: mock(async (_ref: unknown, args: Record<string, unknown>) => {
        if ('slug' in args) return project
        if ('projectSlug' in args) return [task]
        return { enabled: false }
      }),
      mutation: mock(async () => 'id'),
    } as unknown as ConvexHttpClient
    registerProjectRoutes(router, client, undefined, {
      preflight,
      worktreeCheck: async () => ({ clean: true, dirtyFiles: [] }),
      gitLifecycle: fakeGitLifecycle,
    })

    const match = router.match('POST', `/api/projects/${project.slug}/run`)!
    const first = match.handler(
      makeRequest('POST', `/api/projects/${project.slug}/run`, { taskKey: task.taskKey }),
      { id: project.slug },
    )
    while (!entered) await new Promise(resolve => setTimeout(resolve, 0))

    const second = await match.handler(
      makeRequest('POST', `/api/projects/${project.slug}/run`, { taskKey: task.taskKey }),
      { id: project.slug },
    )
    expect(second.status).toBe(409)
    expect(await second.json()).toMatchObject({ ok: false, error: 'project_run_in_progress' })

    release?.()
    await first
  })

  it('returns a truthful terminal failure when the project runner throws', async () => {
    const router = new Router()
    const project = {
      _id: 'jproject1234567890123456789012',
      name: 'Reading Advantage',
      slug: 'reading-advantage-llm-benchmark',
      description: 'Imported benchmark',
      path: '/tmp',
      createdAt: 100,
      updatedAt: 200,
    }
    const task = {
      projectSlug: project.slug,
      trackId: 'track-1',
      taskKey: 'track-1-task-1',
      title: 'Bounded task',
      status: 'backlog',
      dependencies: [],
      updatedAt: 300,
    }
    const preflight = mock(async () => {
      throw new Error('Pi process could not start')
    })
    let projectSlugQueryCount = 0
    const client = {
      query: mock(async (_ref: unknown, args: Record<string, unknown>) => {
        if (args.slug === project.slug) return project
        if ('name' in args) return null
        if ('projectSlug' in args) {
          projectSlugQueryCount += 1
          return projectSlugQueryCount === 1 ? [task] : []
        }
        if ('limit' in args) return []
        return { enabled: false }
      }),
      mutation: mock(async () => 'id'),
    } as unknown as ConvexHttpClient
    registerProjectRoutes(router, client, undefined, {
      preflight,
      worktreeCheck: async () => ({ clean: true, dirtyFiles: [] }),
      gitLifecycle: fakeGitLifecycle,
    })

    const match = router.match('POST', `/api/projects/${project.slug}/run`)!
    const res = await match.handler(
      makeRequest('POST', `/api/projects/${project.slug}/run`, { taskKey: task.taskKey }),
      { id: project.slug },
    )

    expect(res.status).toBe(500)
    expect(await res.json()).toMatchObject({
      ok: false,
      status: 'failed',
      error: 'project_run_failed',
      message: 'Pi process could not start',
      run: {
        projectSlug: project.slug,
        taskKey: null,
        status: 'failed',
        error: 'Pi process could not start',
      },
    })
  })
})

describe('POST /api/projects/scan-and-import ingests tracks and tasks', () => {
  function makeWorkspace(): string {
    const root = mkdtempSync(join(tmpdir(), 'fc-route-import-'))
    const trackDir = join(root, 'measure', 'tracks', 'demo_track_20260101')
    mkdirSync(trackDir, { recursive: true })
    writeFileSync(
      join(trackDir, 'spec.md'),
      '# Demo Track\nStatus: active\n\n## Requirements\n- FR1',
    )
    writeFileSync(join(trackDir, 'plan.md'), '- [ ] Task one\n- [x] Task two')
    return root
  }

  it('upserts a track snapshot and tasks, returning counts', async () => {
    const workspace = makeWorkspace()
    try {
      const mutation = mock(async () => 'new-id')
      const client = {
        query: mock(async () => null), // project not found → route creates it
        mutation,
      } as unknown as ConvexHttpClient
      const router = new Router()
      registerProjectRoutes(router, client)

      const match = router.match('POST', '/api/projects/scan-and-import')!
      const res = await match.handler(
        makeRequest('POST', '/api/projects/scan-and-import', { paths: [workspace] }),
        {},
      )
      expect(res.status).toBe(200)
      const body = await res.json()

      expect(body.projects).toHaveLength(1)
      expect(body.projects[0].tracks).toBe(1)
      expect(body.projects[0].tasks).toBe(2)

      const args = mutation.mock.calls.map(c => (c as unknown[])[1] as Record<string, unknown>)
      expect(args.some(a => 'specMarkdown' in a && a.trackId === 'demo_track_20260101')).toBe(true)
      const taskArgs = args.filter(a => 'taskKey' in a)
      expect(taskArgs).toHaveLength(2)
      expect(taskArgs.map(a => a.taskKey)).toContain('demo_track_20260101-task-1')
    } finally {
      rmSync(workspace, { recursive: true, force: true })
    }
  })
})

describe('POST /api/projects/:id/tracks creates a new sprint/track', () => {
  it('returns 400 when title or goal is missing', async () => {
    const router = new Router()
    const client = {
      query: mock(async () => ({ _id: 'proj-1', name: 'demo', slug: 'demo' })),
      mutation: mock(async () => 'snap-1'),
    } as unknown as ConvexHttpClient
    registerProjectRoutes(router, client)

    const match = router.match('POST', '/api/projects/proj-1/tracks')!
    const res = await match.handler(
      makeRequest('POST', '/api/projects/proj-1/tracks', { title: '' }),
      { id: 'proj-1' },
    )
    expect(res.status).toBe(400)
  })

  it('returns 404 when project is not found', async () => {
    const router = new Router()
    const client = {
      query: mock(async () => null),
      mutation: mock(async () => 'snap-1'),
    } as unknown as ConvexHttpClient
    registerProjectRoutes(router, client)

    const match = router.match('POST', '/api/projects/proj-missing/tracks')!
    const res = await match.handler(
      makeRequest('POST', '/api/projects/proj-missing/tracks', {
        title: 'New Sprint',
        goal: 'Test goal',
      }),
      { id: 'proj-missing' },
    )
    expect(res.status).toBe(404)
  })

  it('creates a track and returns trackId + projectSlug', async () => {
    const router = new Router()
    const query = mock(async (_ref: any, args: any) => {
      // getProjectHandler returns the project
      if ('id' in args) {
        return { _id: args.id, name: 'demo', slug: 'demo' }
      }
      return null
    })
    const mutation = mock(async (_ref: any, args: any) => {
      return {
        projectSlug: args.projectSlug,
        trackId: args.trackId,
        title: args.title,
        status: 'new',
        version: 1,
      }
    })
    const client = { query, mutation } as unknown as ConvexHttpClient
    registerProjectRoutes(router, client)

    const match = router.match('POST', '/api/projects/proj-1/tracks')!
    const res = await match.handler(
      makeRequest('POST', '/api/projects/proj-1/tracks', {
        title: 'My New Sprint',
        goal: 'Ship the feature so users are happy.',
      }),
      { id: 'proj-1' },
    )
    expect(res.status).toBe(201)
    const body = await res.json()

    expect(body.projectSlug).toBe('demo')
    expect(typeof body.trackId).toBe('string')
    expect(body.trackId.length).toBeGreaterThan(0)
    expect(body.title).toBe('My New Sprint')

    expect(mutation).toHaveBeenCalled()
    const callArgs = (mutation.mock.calls[0] as unknown[])[1] as Record<string, unknown>
    expect(callArgs.title).toBe('My New Sprint')
    expect(callArgs.goal).toBe('Ship the feature so users are happy.')
    expect(callArgs.projectSlug).toBe('demo')
  })
})

describe('helpers: makeTrackId / extractGoalFromSpec / mergeStoriesSection', () => {
  it('makeTrackId produces slug_<yyyymmdd>', () => {
    const id = makeTrackId('My Cool Sprint!', new Date('2026-06-10T12:00:00Z'))
    expect(id).toBe('my_cool_sprint_20260610')
  })

  it('makeTrackId falls back to "track" when title is empty', () => {
    const id = makeTrackId('!!!', new Date('2026-06-10T12:00:00Z'))
    expect(id).toBe('track_20260610')
  })

  it('extractGoalFromSpec reads the ## Goal section body', () => {
    const spec = ['# Title', '', '## Goal', '', 'Ship the thing.', '', '## Other'].join('\n')
    expect(extractGoalFromSpec(spec)).toBe('Ship the thing.')
  })

  it('extractGoalFromSpec falls back to the # Title when no goal section exists', () => {
    expect(extractGoalFromSpec('# Awesome Track\n\nNo goal here.')).toBe('Awesome Track')
  })

  it('mergeStoriesSection appends ## Stories when missing', () => {
    const result = mergeStoriesSection(
      '# Title\n\n## Goal\n\nShip.\n',
      '## Stories\n\n### Story 1: x\n',
    )
    expect(result).toContain('## Goal')
    expect(result).toContain('## Stories')
    expect(result).toContain('### Story 1: x')
  })

  it('mergeStoriesSection replaces an existing ## Stories section', () => {
    const original = ['# T', '', '## Stories', '', '### Story 1: old', '', '## After', ''].join(
      '\n',
    )
    const updated = mergeStoriesSection(original, '## Stories\n\n### Story 1: new\n')
    expect(updated).toContain('### Story 1: new')
    expect(updated).not.toContain('### Story 1: old')
    expect(updated).toContain('## After')
  })
})

describe('POST /api/projects/:id/tracks/:trackId/generate (preview)', () => {
  function makeClientWith({
    project,
    snapshot,
  }: {
    project: any
    snapshot: any
  }): ConvexHttpClient {
    return {
      query: mock(async (ref: any, args: any) => {
        if ('id' in args) return project
        if ('trackId' in args && 'projectSlug' in args) return snapshot
        return null
      }),
      mutation: mock(async () => 'id'),
    } as unknown as ConvexHttpClient
  }

  it('returns 503 when no story runner is configured', async () => {
    const router = new Router()
    const client = makeClientWith({
      project: { _id: 'p1', slug: 'demo', name: 'Demo' },
      snapshot: {
        specMarkdown: '# T\n## Goal\nShip.\n',
        planMarkdown: '',
        title: 'T',
        status: 'new',
        version: 1,
        trackId: 'tr1',
      },
    })
    registerProjectRoutes(router, client) // no runner

    const match = router.match('POST', '/api/projects/p1/tracks/tr1/generate')!
    const res = await match.handler(
      makeRequest('POST', '/api/projects/p1/tracks/tr1/generate', {}),
      { id: 'p1', trackId: 'tr1' },
    )
    expect(res.status).toBe(503)
    const body = await res.json()
    expect(body.code).toBe('HARNESS_UNAVAILABLE')
  })

  it('returns 404 when the project is missing', async () => {
    const router = new Router()
    const client = makeClientWith({ project: null, snapshot: null })
    registerProjectRoutes(router, client, async () => '[]')

    const match = router.match('POST', '/api/projects/missing/tracks/tr1/generate')!
    const res = await match.handler(
      makeRequest('POST', '/api/projects/missing/tracks/tr1/generate', {}),
      { id: 'missing', trackId: 'tr1' },
    )
    expect(res.status).toBe(404)
  })

  it('returns 404 when the track snapshot is missing', async () => {
    const router = new Router()
    const client = makeClientWith({
      project: { _id: 'p1', slug: 'demo', name: 'Demo' },
      snapshot: null,
    })
    registerProjectRoutes(router, client, async () => '[]')

    const match = router.match('POST', '/api/projects/p1/tracks/missing/generate')!
    const res = await match.handler(
      makeRequest('POST', '/api/projects/p1/tracks/missing/generate', {}),
      { id: 'p1', trackId: 'missing' },
    )
    expect(res.status).toBe(404)
  })

  it('returns 200 with parsed stories on a clean LLM response', async () => {
    const story = {
      title: 'Sign up',
      asA: 'new user',
      iWant: 'to register',
      soThat: 'I can use the app',
      acceptanceCriteria: ['Email required'],
      estimate: 'M',
      priority: 'Must',
    }
    const runner = mock(async () => JSON.stringify([story]))
    const router = new Router()
    const client = makeClientWith({
      project: { _id: 'p1', slug: 'demo', name: 'Demo' },
      snapshot: {
        specMarkdown: '# T\n\n## Goal\n\nShip.\n',
        planMarkdown: '',
        title: 'T',
        status: 'new',
        version: 1,
        trackId: 'tr1',
      },
    })
    registerProjectRoutes(router, client, runner as any)

    const match = router.match('POST', '/api/projects/p1/tracks/tr1/generate')!
    const res = await match.handler(
      makeRequest('POST', '/api/projects/p1/tracks/tr1/generate', { goal: 'override goal' }),
      { id: 'p1', trackId: 'tr1' },
    )
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.projectSlug).toBe('demo')
    expect(body.trackId).toBe('tr1')
    expect(body.stories).toHaveLength(1)
    expect(body.stories[0].title).toBe('Sign up')
    expect(runner).toHaveBeenCalled()
    const prompt = (runner.mock.calls[0] as unknown[])[0] as string
    expect(prompt).toContain('override goal')
  })

  it('returns 502 PARSE_ERROR when the LLM returns invalid JSON', async () => {
    const router = new Router()
    const client = makeClientWith({
      project: { _id: 'p1', slug: 'demo', name: 'Demo' },
      snapshot: {
        specMarkdown: '# T',
        planMarkdown: '',
        title: 'T',
        status: 'new',
        version: 1,
        trackId: 'tr1',
      },
    })
    registerProjectRoutes(router, client, async () => 'not json at all')

    const match = router.match('POST', '/api/projects/p1/tracks/tr1/generate')!
    const res = await match.handler(
      makeRequest('POST', '/api/projects/p1/tracks/tr1/generate', {}),
      { id: 'p1', trackId: 'tr1' },
    )
    expect(res.status).toBe(502)
    const body = await res.json()
    expect(body.code).toBe('PARSE_ERROR')
  })

  it('returns 502 HARNESS_ERROR when the runner throws', async () => {
    const router = new Router()
    const client = makeClientWith({
      project: { _id: 'p1', slug: 'demo', name: 'Demo' },
      snapshot: {
        specMarkdown: '# T',
        planMarkdown: '',
        title: 'T',
        status: 'new',
        version: 1,
        trackId: 'tr1',
      },
    })
    registerProjectRoutes(router, client, async () => {
      throw new Error('boom')
    })

    const match = router.match('POST', '/api/projects/p1/tracks/tr1/generate')!
    const res = await match.handler(
      makeRequest('POST', '/api/projects/p1/tracks/tr1/generate', {}),
      { id: 'p1', trackId: 'tr1' },
    )
    expect(res.status).toBe(502)
    const body = await res.json()
    expect(body.code).toBe('HARNESS_ERROR')
  })
})

describe('POST /api/projects/:id/tracks/:trackId/generate/commit', () => {
  const stories = [
    {
      title: 'Sign up',
      asA: 'new user',
      iWant: 'to register',
      soThat: 'I can use the app',
      acceptanceCriteria: ['Email required'],
      estimate: 'M',
      priority: 'Must',
    },
    {
      title: 'Log in',
      asA: 'returning user',
      iWant: 'to log in',
      soThat: 'I can resume',
      acceptanceCriteria: ['Password required'],
      estimate: 'S',
      priority: 'Should',
    },
  ]

  it('rejects empty story arrays with 400', async () => {
    const router = new Router()
    const client = {
      query: mock(async () => ({ _id: 'p1', slug: 'demo', name: 'Demo' })),
      mutation: mock(async () => 'id'),
    } as unknown as ConvexHttpClient
    registerProjectRoutes(router, client)

    const match = router.match('POST', '/api/projects/p1/tracks/tr1/generate/commit')!
    const res = await match.handler(
      makeRequest('POST', '/api/projects/p1/tracks/tr1/generate/commit', { stories: [] }),
      { id: 'p1', trackId: 'tr1' },
    )
    expect(res.status).toBe(400)
  })

  it('returns 404 when the track snapshot is missing', async () => {
    const router = new Router()
    const client = {
      query: mock(async (ref: any, args: any) => {
        if ('id' in args) return { _id: 'p1', slug: 'demo', name: 'Demo' }
        return null
      }),
      mutation: mock(async () => 'id'),
    } as unknown as ConvexHttpClient
    registerProjectRoutes(router, client)

    const match = router.match('POST', '/api/projects/p1/tracks/tr1/generate/commit')!
    const res = await match.handler(
      makeRequest('POST', '/api/projects/p1/tracks/tr1/generate/commit', { stories }),
      { id: 'p1', trackId: 'tr1' },
    )
    expect(res.status).toBe(404)
  })

  it('upserts the spec with ## Stories + one task per story', async () => {
    const router = new Router()
    const mutation = mock(async () => 'id')
    const query = mock(async (ref: any, args: any) => {
      if ('id' in args) return { _id: 'p1', slug: 'demo', name: 'Demo' }
      if ('trackId' in args) {
        return {
          projectSlug: 'demo',
          trackId: 'tr1',
          title: 'Tr1',
          status: 'new',
          specMarkdown: '# Tr1\n\n## Goal\n\nShip.\n',
          planMarkdown: '# Plan',
          version: 2,
          updatedAt: 0,
        }
      }
      return null
    })
    const client = { query, mutation } as unknown as ConvexHttpClient
    registerProjectRoutes(router, client)

    const match = router.match('POST', '/api/projects/p1/tracks/tr1/generate/commit')!
    const res = await match.handler(
      makeRequest('POST', '/api/projects/p1/tracks/tr1/generate/commit', { stories }),
      { id: 'p1', trackId: 'tr1' },
    )
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.stories).toBe(2)
    expect(body.tasks).toBe(2)

    const args = mutation.mock.calls.map(c => (c as unknown[])[1] as Record<string, unknown>)
    // upsertTrackSnapshot call carries the spec with ## Stories
    const trackUpsert = args.find(a => 'specMarkdown' in a)
    expect(trackUpsert).toBeDefined()
    expect(String(trackUpsert!.specMarkdown)).toContain('## Stories')
    expect(String(trackUpsert!.specMarkdown)).toContain('Sign up')
    expect(trackUpsert!.expectedVersion).toBe(2)

    const taskArgs = args.filter(a => 'taskKey' in a)
    expect(taskArgs).toHaveLength(2)
    expect(taskArgs[0].taskKey).toBe('tr1-story-1')
    expect(taskArgs[0].priority).toBe('high')
    expect(taskArgs[0].storyPoints).toBe(3)
    expect(taskArgs[1].priority).toBe('medium')
    expect(taskArgs[1].storyPoints).toBe(1)
  })
})
