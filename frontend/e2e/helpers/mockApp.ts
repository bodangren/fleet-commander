import { expect, type Page } from '@playwright/test'

type MockOptions = {
  emptyProjects?: boolean
}

export type ApiCall = {
  method: string
  path: string
  body: unknown
}

type SettingsPayload = {
  general: {
    defaultAgent: string
    orchestratorInterval: number
    logRetentionDays: number
  }
  harness: {
    cacheTTL: number
    defaultHarness: string
  }
  websocket: {
    reconnectInterval: number
  }
}

type SprintPayload = {
  id: string
  name: string
  goal: string
  startDate: string
  endDate: string
  status: string
  taskIds: string[]
}

const projectId = 'demo-project'

const projectSummary = {
  id: projectId,
  slug: projectId,
  name: 'Demo Project',
  path: '/tmp/demo-project',
  tracks: [{ name: 'Core UI Hardening', status: 'active' }],
  lastUpdated: 1712000000,
}

function makeProjectDetail() {
  return {
    id: projectId,
    name: 'Demo Project',
    path: '/tmp/demo-project',
    lastUpdated: 1712000000,
    tracks: [
      {
        id: 'track-core-ui',
        name: 'Core UI Hardening',
        type: 'feature',
        description: 'Stabilize feature workflows.',
        status: 'active',
        planPath: './conductor/tracks/core_ui_hardening/plan.md',
        phases: [
          {
            name: 'Phase 1: Stabilization',
            tasks: [
              {
                id: 'task-todo-1',
                description: 'Ship navigation regression fix',
                status: 'todo',
                agentTag: 'frontend',
                phase: 'Phase 1: Stabilization',
              },
              {
                id: 'task-blocked-1',
                description: 'Investigate dependency parser bug',
                status: 'blocked',
                agentTag: 'backend',
                phase: 'Phase 1: Stabilization',
              },
              {
                id: 'task-done-1',
                description: 'Validate release checklist',
                status: 'done',
                agentTag: 'qa',
                phase: 'Phase 1: Stabilization',
              },
            ],
          },
        ],
      },
    ],
  }
}

function decodeBody(rawBody: string | null): unknown {
  if (!rawBody) {
    return null
  }
  try {
    return JSON.parse(rawBody)
  } catch {
    return rawBody
  }
}

function fulfillJson(status: number, payload: unknown) {
  return {
    status,
    contentType: 'application/json',
    body: JSON.stringify(payload),
  }
}

export async function setupMockApp(page: Page, options: MockOptions = {}) {
  const runtimeErrors: string[] = []
  const calls: ApiCall[] = []

  page.on('pageerror', error => {
    runtimeErrors.push(`pageerror: ${error.message}\n${error.stack ?? ''}`)
  })

  page.on('console', message => {
    if (message.type() !== 'error') {
      return
    }
    const text = message.text()
    // Suppress expected noise in mock environment:
    // - favicon.ico: served from /public, not intercepted
    // - Failed to load resource: fonts/images/other assets may 404 when mock
    //   server returns 404 for unhandled static paths
    if (text.includes('favicon.ico') || text.includes('Failed to load resource')) {
      return
    }
    runtimeErrors.push(`console-error: ${text}`)
  })

  const settingsState: SettingsPayload = {
    general: {
      defaultAgent: 'architect',
      orchestratorInterval: 60,
      logRetentionDays: 14,
    },
    harness: {
      cacheTTL: 300,
      defaultHarness: 'opencode',
    },
    websocket: {
      reconnectInterval: 3000,
    },
  }

  const agents = [
    {
      layer: 'user',
      definition: {
        name: 'architect',
        description: 'Plans and decomposes implementation work.',
        mode: 'agent',
        model: 'opencode/gpt-5.4',
        temperature: 0.2,
        tools: {
          write: true,
          edit: true,
          bash: true,
        },
        body: 'Architect system prompt.',
      },
    },
  ]

  const harnesses = [
    {
      layer: 'bundled',
      binaryFound: true,
      definition: {
        name: 'opencode',
        binary: 'opencode',
        discovery: {
          command: 'opencode models',
          parseStrategy: 'line-per-model',
          pattern: '',
        },
        invocation: {
          template: 'opencode -m {model} run "{prompt}"',
          flags: { no_interactive: '--no-interactive' },
        },
      },
    },
  ]

  let projectDetail = makeProjectDetail()

  const issues = [
    {
      id: 'issue-1',
      title: 'Parser bug blocks deploy',
      description: 'Dependency parser returns invalid node ids.',
      type: 'blocker',
      status: 'open',
      createdAt: '2026-04-09T10:00:00.000Z',
      updatedAt: '2026-04-09T10:00:00.000Z',
      relatedTask: 'task-blocked-1',
      projectId,
    },
  ]

  const logs = [
    {
      type: 'dispatch',
      projectId,
      timestamp: '2026-04-09T10:00:00.000Z',
      data: {
        taskTitle: 'Ship navigation regression fix',
        agentTag: 'frontend',
      },
    },
    {
      type: 'completion',
      projectId,
      timestamp: '2026-04-09T10:01:00.000Z',
      data: {
        taskId: 'task-done-1',
        status: 'succeeded',
        durationMs: 1200,
      },
    },
  ]

  const logStats = {
    totalEntries: 2,
    dispatchCount: 1,
    completionCount: 1,
    errorCount: 0,
    avgDurationMs: 1200,
    successRate: 100,
    agentBreakdown: [
      {
        agent: 'frontend',
        runs: 1,
        avgMs: 1200,
        errors: 0,
      },
    ],
  }

  const graph = {
    nodes: [
      {
        taskId: 'task-todo-1',
        description: 'Ship navigation regression fix',
        status: 'todo',
        phase: 'Phase 1: Stabilization',
      },
      {
        taskId: 'task-blocked-1',
        description: 'Investigate dependency parser bug',
        status: 'blocked',
        phase: 'Phase 1: Stabilization',
      },
    ],
    edges: [{ from: 'task-todo-1', to: 'task-blocked-1' }],
  }

  const sprints: SprintPayload[] = [
    {
      id: 'sprint-1',
      name: 'Sprint Alpha',
      goal: 'Stabilize routing and workflows.',
      startDate: '2026-04-01',
      endDate: '2026-04-15',
      status: 'planning',
      taskIds: ['task-todo-1'],
    },
  ]

  const pipelines = [
    {
      executionId: 'exec-1',
      pipelineName: 'nightly',
      status: 'succeeded',
      startedAt: Date.parse('2026-04-08T23:00:00.000Z'),
    },
  ]

  function updateTaskStatus(taskId: string, status: string) {
    projectDetail = {
      ...projectDetail,
      tracks: projectDetail.tracks.map(track => ({
        ...track,
        phases: track.phases.map(phase => ({
          ...phase,
          tasks: phase.tasks.map(task => (task.id === taskId ? { ...task, status } : task)),
        })),
      })),
    }
  }

  await page.route('**/api/**', async route => {
    const request = route.request()
    const url = new URL(request.url())
    const method = request.method()
    const path = url.pathname
    const body = decodeBody(request.postData())

    calls.push({ method, path, body })

    if (path === '/api/health' && method === 'GET') {
      return route.fulfill(fulfillJson(200, { status: 'ok', message: 'ok' }))
    }

    if (path === '/api/projects/scan-and-import' && method === 'POST') {
      return route.fulfill(fulfillJson(200, { imported: 0 }))
    }

    if (path === '/api/projects/scan' && method === 'POST') {
      return route.fulfill(
        fulfillJson(200, {
          paths: ['/workspace/demo-alpha', '/workspace/demo-beta'],
        }),
      )
    }

    if (path === '/api/projects' && method === 'GET') {
      return route.fulfill(fulfillJson(200, options.emptyProjects ? [] : [projectSummary]))
    }

    if (path === '/api/projects' && method === 'POST') {
      return route.fulfill(fulfillJson(200, [projectSummary]))
    }

    if (path === '/api/agents' && method === 'GET') {
      return route.fulfill(fulfillJson(200, agents))
    }

    if (path === '/api/harnesses' && method === 'GET') {
      return route.fulfill(fulfillJson(200, harnesses))
    }

    if (path === '/api/stats/overview' && method === 'GET') {
      return route.fulfill(
        fulfillJson(200, {
          totalProjects: options.emptyProjects ? 0 : 1,
          totalTasks: 3,
          completedTasks: 1,
          activeAgents: 1,
          openIssues: 1,
        }),
      )
    }

    if (path === '/api/stats/agents' && method === 'GET') {
      return route.fulfill(
        fulfillJson(200, {
          agents: [
            {
              agentName: 'architect',
              totalExecutions: 4,
              totalDurationMs: 4600,
              successCount: 4,
              utilization: 72,
            },
          ],
        }),
      )
    }

    if (path === '/api/stats/velocity' && method === 'GET') {
      return route.fulfill(
        fulfillJson(200, {
          velocity: [
            { date: '2026-04-07', count: 1 },
            { date: '2026-04-08', count: 2 },
            { date: '2026-04-09', count: 1 },
          ],
        }),
      )
    }

    if (path === '/api/stats/issues' && method === 'GET') {
      return route.fulfill(
        fulfillJson(200, {
          openCount: 1,
          resolvedCount: 3,
          avgResolutionHours: 2.5,
        }),
      )
    }

    if (path === '/api/settings' && method === 'GET') {
      return route.fulfill(fulfillJson(200, settingsState))
    }

    if (path === '/api/settings' && method === 'PUT') {
      const payload = body as SettingsPayload
      settingsState.general = payload.general
      settingsState.harness = payload.harness
      settingsState.websocket = payload.websocket
      return route.fulfill(fulfillJson(200, settingsState))
    }

    if (path === '/api/pipelines' && method === 'GET') {
      return route.fulfill(fulfillJson(200, pipelines))
    }

    const triggerPipelineMatch = path.match(/^\/api\/pipelines\/([^/]+)\/trigger$/)
    if (triggerPipelineMatch && method === 'POST') {
      const pipelineName = decodeURIComponent(triggerPipelineMatch[1])
      const executionId = `exec-${pipelines.length + 1}`
      pipelines.unshift({
        executionId,
        pipelineName,
        status: 'running',
        startedAt: Date.now(),
      })
      return route.fulfill(fulfillJson(200, { executionId, status: 'running' }))
    }

    if (path === `/api/projects/${projectId}` && method === 'GET') {
      return route.fulfill(fulfillJson(200, projectDetail))
    }

    if (path === `/api/projects/${projectId}/next-task` && method === 'GET') {
      return route.fulfill(
        fulfillJson(200, {
          id: 'task-todo-1',
          title: 'Ship navigation regression fix',
          type: 'task',
          score: 88.4,
          rationale: 'Highest priority ready task.',
          agentTag: '@frontend',
          createdAt: '2026-04-09T10:00:00.000Z',
        }),
      )
    }

    if (path === `/api/projects/${projectId}/run` && method === 'POST') {
      return route.fulfill(fulfillJson(200, { status: 'started' }))
    }

    const taskStatusMatch = path.match(/^\/api\/projects\/demo-project\/tasks\/([^/]+)$/)
    if (taskStatusMatch && method === 'PATCH') {
      const taskId = decodeURIComponent(taskStatusMatch[1])
      const nextStatus = (body as { status?: string })?.status ?? 'todo'
      updateTaskStatus(taskId, nextStatus)
      return route.fulfill(fulfillJson(200, { status: nextStatus }))
    }

    const taskReviewMatch = path.match(/^\/api\/projects\/demo-project\/tasks\/([^/]+)\/review$/)
    if (taskReviewMatch && method === 'GET') {
      const taskId = decodeURIComponent(taskReviewMatch[1])
      return route.fulfill(
        fulfillJson(200, {
          taskId,
          status: 'failed',
          reviewedAt: '2026-04-09T11:00:00.000Z',
          results: [
            {
              category: 'lint',
              status: 'failed',
              errors: ['Expected explicit return type for orchestrator helper.'],
              durationMs: 120,
            },
          ],
          agentReview: {
            status: 'needs-changes',
            depth: 'deep',
            comments: [
              {
                file: 'frontend/src/pages/ProjectViewPage.tsx',
                line: 92,
                severity: 'medium',
                message: 'Add stronger guard around missing project state.',
              },
            ],
          },
        }),
      )
    }

    if (path === `/api/projects/${projectId}/issues/task-blocked-1` && method === 'GET') {
      return route.fulfill(
        fulfillJson(200, {
          fileName: 'issue-123-parser-bug.md',
          path: '/tmp/demo-project/conductor/broker/open/issue-123-parser-bug.md',
          content: '# Blocker\n\nTask: task-blocked-1\n\nParser fails for mixed IDs.',
          matchReason: 'task id match',
        }),
      )
    }

    // Task status update (drag-to-done in KanbanBoard)
    if (path.startsWith(`/api/projects/${projectId}/tasks/`) && method === 'PATCH') {
      const bodyPayload = body as { status?: string }
      return route.fulfill(fulfillJson(200, { status: bodyPayload.status ?? 'todo' }))
    }

    if (path === `/api/projects/${projectId}/issues` && method === 'GET') {
      const status = url.searchParams.get('status')
      const filtered = status ? issues.filter(issue => issue.status === status) : issues
      return route.fulfill(fulfillJson(200, { issues: filtered }))
    }

    if (path === `/api/projects/${projectId}/issues` && method === 'POST') {
      const payload = body as {
        title?: string
        description?: string
        type?: string
        relatedTask?: string
      }
      const nextIssue = {
        id: `issue-${issues.length + 1}`,
        title: payload.title ?? 'Untitled issue',
        description: payload.description,
        type: payload.type ?? 'blocker',
        status: 'open',
        createdAt: '2026-04-09T12:00:00.000Z',
        updatedAt: '2026-04-09T12:00:00.000Z',
        relatedTask: payload.relatedTask,
        projectId,
      }
      issues.unshift(nextIssue)
      return route.fulfill(fulfillJson(200, nextIssue))
    }

    const issuePatchMatch = path.match(/^\/api\/projects\/demo-project\/issues\/([^/]+)$/)
    if (issuePatchMatch && method === 'PATCH') {
      const issueId = decodeURIComponent(issuePatchMatch[1])
      const nextStatus = (body as { status?: string })?.status ?? 'open'
      const issue = issues.find(item => item.id === issueId)
      if (issue) {
        issue.status = nextStatus
        issue.updatedAt = '2026-04-09T12:30:00.000Z'
      }
      return route.fulfill(fulfillJson(200, { status: nextStatus }))
    }

    if (path === `/api/projects/${projectId}/dependencies` && method === 'GET') {
      return route.fulfill(fulfillJson(200, graph))
    }

    if (path === `/api/projects/${projectId}/critical-path` && method === 'GET') {
      return route.fulfill(
        fulfillJson(200, {
          criticalPath: ['task-todo-1', 'task-blocked-1'],
          hasCycle: false,
        }),
      )
    }

    if (path === `/api/projects/${projectId}/sprints` && method === 'GET') {
      return route.fulfill(fulfillJson(200, { sprints }))
    }

    if (path === `/api/projects/${projectId}/sprints` && method === 'POST') {
      const payload = body as {
        name?: string
        goal?: string
        startDate?: string
        endDate?: string
      }
      const created: SprintPayload = {
        id: `sprint-${sprints.length + 1}`,
        name: payload.name ?? 'New Sprint',
        goal: payload.goal ?? '',
        startDate: payload.startDate ?? '2026-04-10',
        endDate: payload.endDate ?? '2026-04-20',
        status: 'planning',
        taskIds: [],
      }
      sprints.push(created)
      return route.fulfill(fulfillJson(200, created))
    }

    const sprintUpdateMatch = path.match(/^\/api\/projects\/demo-project\/sprints\/([^/]+)$/)
    if (sprintUpdateMatch && method === 'PUT') {
      const sprintId = decodeURIComponent(sprintUpdateMatch[1])
      const payload = body as { status?: string }
      const sprint = sprints.find(item => item.id === sprintId)
      if (sprint) {
        sprint.status = payload.status ?? sprint.status
      }
      return route.fulfill(fulfillJson(200, sprint ?? { error: 'Sprint not found' }))
    }

    if (path === `/api/projects/${projectId}/logs` && method === 'GET') {
      return route.fulfill(fulfillJson(200, { logs }))
    }

    if (path === `/api/projects/${projectId}/logs/stats` && method === 'GET') {
      return route.fulfill(fulfillJson(200, logStats))
    }

    const harnessModelsMatch = path.match(/^\/api\/harnesses\/([^/]+)\/models$/)
    if (harnessModelsMatch && method === 'GET') {
      return route.fulfill(
        fulfillJson(200, {
          models: ['gpt-5.4', 'gpt-5.4-mini'],
        }),
      )
    }

    const harnessDetailMatch = path.match(/^\/api\/harnesses\/([^/]+)$/)
    if (harnessDetailMatch && method === 'GET') {
      const name = decodeURIComponent(harnessDetailMatch[1])
      return route.fulfill(
        fulfillJson(200, {
          layer: 'bundled',
          definition: {
            ...harnesses[0].definition,
            name,
          },
        }),
      )
    }

    if (harnessDetailMatch && method === 'PUT') {
      return route.fulfill(fulfillJson(200, { status: 'ok' }))
    }

    if (harnessDetailMatch && method === 'DELETE') {
      return route.fulfill(fulfillJson(200, { status: 'ok' }))
    }

    const harnessResetMatch = path.match(/^\/api\/harnesses\/([^/]+)\/reset$/)
    if (harnessResetMatch && method === 'POST') {
      return route.fulfill(fulfillJson(200, { status: 'ok' }))
    }

    const agentDetailMatch = path.match(/^\/api\/agents\/([^/]+)$/)
    if (agentDetailMatch && method === 'GET') {
      const name = decodeURIComponent(agentDetailMatch[1])
      return route.fulfill(
        fulfillJson(200, {
          layer: 'user',
          definition: {
            ...agents[0].definition,
            name,
          },
        }),
      )
    }

    if (agentDetailMatch && method === 'PUT') {
      return route.fulfill(fulfillJson(200, { status: 'ok' }))
    }

    if (agentDetailMatch && method === 'DELETE') {
      return route.fulfill(fulfillJson(200, { status: 'ok' }))
    }

    const agentCloneMatch = path.match(/^\/api\/agents\/([^/]+)\/clone$/)
    if (agentCloneMatch && method === 'POST') {
      const name = decodeURIComponent(agentCloneMatch[1])
      return route.fulfill(fulfillJson(200, { name: `${name}-copy` }))
    }

    const agentResetMatch = path.match(/^\/api\/agents\/([^/]+)\/reset$/)
    if (agentResetMatch && method === 'POST') {
      return route.fulfill(fulfillJson(200, { status: 'ok' }))
    }

    const agentTestMatch = path.match(/^\/api\/agents\/([^/]+)\/test$/)
    if (agentTestMatch && method === 'POST') {
      const name = decodeURIComponent(agentTestMatch[1])
      return route.fulfill(
        fulfillJson(200, {
          name,
          status: 'success',
          latencyMs: 111,
          output: 'Agent dry run complete.',
        }),
      )
    }

    if (path === '/api/fleet/status' && method === 'GET') {
      return route.fulfill(
        fulfillJson(200, {
          activeTasks: 3,
          blockedTasks: 1,
          openIssues: 2,
          activeRuns: 1,
          todayCost: 12.5,
          attentionProjects: [
            { slug: 'demo-project', name: 'Demo Project', reason: '1 blocked task' },
          ],
        }),
      )
    }

    if (path === '/api/fleet/blockers' && method === 'GET') {
      return route.fulfill(
        fulfillJson(200, {
          blockedTasks: [
            {
              projectSlug: 'demo-project',
              trackId: 'track-core-ui',
              taskKey: 'task-blocked-1',
              title: 'Investigate dependency parser bug',
              status: 'blocked',
              assignee: 'backend',
              updatedAt: Date.now() - 7200000,
              projectName: 'Demo Project',
            },
          ],
          openIssues: [
            {
              projectSlug: 'demo-project',
              issueId: 'issue-1',
              title: 'Parser bug blocks deploy',
              status: 'open',
              assignedAgent: 'backend',
              openedAt: Date.now() - 86400000,
              projectName: 'Demo Project',
            },
          ],
        }),
      )
    }

    if (path === '/api/fleet/queue' && method === 'GET') {
      return route.fulfill(
        fulfillJson(200, {
          activeRuns: [
            {
              projectSlug: 'demo-project',
              runId: 'run-1',
              status: 'running',
              startedAt: Date.now() - 300000,
              totalMs: 300000,
              projectName: 'Demo Project',
            },
          ],
        }),
      )
    }

    if (path === '/api/agents/workload' && method === 'GET') {
      return route.fulfill(
        fulfillJson(200, [
          {
            name: 'architect',
            displayName: 'Architect',
            mode: 'agent',
            model: 'opencode/gpt-5.4',
            currentTask: {
              taskKey: 'task-1',
              title: 'Plan refactor',
              projectSlug: 'demo-project',
              projectName: 'Demo Project',
            },
            successRate7d: 0.85,
            medianLatencyMs: 450,
            queueDepth: 2,
            circuitState: 'closed',
          },
        ]),
      )
    }

    if (path === '/api/alerts' && method === 'GET') {
      return route.fulfill(
        fulfillJson(200, {
          alerts: [
            {
              _id: 'alert-1',
              type: 'circuit_breaker',
              severity: 'critical',
              message: 'Circuit breaker open for agent executor',
              contextJson: '{}',
              resolved: false,
              createdAt: Date.now() - 3600000,
            },
            {
              _id: 'alert-2',
              type: 'budget',
              severity: 'warning',
              message: 'Budget threshold at 80%',
              contextJson: '{}',
              resolved: false,
              createdAt: Date.now() - 7200000,
            },
            {
              _id: 'alert-3',
              type: 'dispatch',
              severity: 'info',
              message: 'Task dispatched successfully',
              contextJson: '{}',
              resolved: true,
              resolvedAt: Date.now() - 1800000,
              createdAt: Date.now() - 14400000,
            },
          ],
        }),
      )
    }

    const alertResolveMatch = path.match(/^\/api\/alerts\/([^/]+)\/resolve$/)
    if (alertResolveMatch && method === 'PATCH') {
      return route.fulfill(
        fulfillJson(200, {
          _id: decodeURIComponent(alertResolveMatch[1]),
          resolved: true,
        }),
      )
    }

    if (path === `/api/projects/${projectId}/sprints/active` && method === 'GET') {
      return route.fulfill(
        fulfillJson(200, {
          _id: 'sprint-1',
          projectSlug: projectId,
          name: 'Sprint Alpha',
          status: 'active',
          startDate: '2026-04-01',
          endDate: '2026-04-15',
          goal: 'Stabilize routing and workflows.',
          taskKeys: ['task-todo-1'],
          updatedAt: Date.now(),
        }),
      )
    }

    if (path.startsWith(`/api/projects/${projectId}/sprints/`) && path.endsWith('/tasks') && method === 'GET') {
      return route.fulfill(fulfillJson(200, []))
    }

    // Analytics endpoints
    if (path === '/api/analytics/completion-trends' && method === 'GET') {
      return route.fulfill(
        fulfillJson(200, [
          { date: '2026-04-01', completed: 5, failed: 1, created: 6 },
          { date: '2026-04-02', completed: 3, failed: 0, created: 4 },
        ]),
      )
    }

    if (path === '/api/analytics/agent-utilization' && method === 'GET') {
      return route.fulfill(
        fulfillJson(200, [
          { agent: 'architect', runs: 10, avgMs: 5000, errors: 1 },
          { agent: 'frontend', runs: 8, avgMs: 3000, errors: 0 },
        ]),
      )
    }

    if (path === '/api/analytics/bottlenecks' && method === 'GET') {
      return route.fulfill(fulfillJson(200, []))
    }

    if (path === '/api/analytics/queue-depth' && method === 'GET') {
      return route.fulfill(fulfillJson(200, []))
    }

    if (path === '/api/analytics/hook-metrics' && method === 'GET') {
      return route.fulfill(fulfillJson(200, []))
    }

    if (path === '/api/analytics/session-metrics' && method === 'GET') {
      return route.fulfill(fulfillJson(200, []))
    }

    // Provider health + fallback endpoints (TD-235 / provider_health_resilience Phase 4/7)
    if (path === '/api/providers/health' && method === 'GET') {
      return route.fulfill(
        fulfillJson(200, [
          {
            _id: 'provider-openai',
            name: 'openai',
            models: ['gpt-4o', 'gpt-4o-mini'],
            status: 'active',
            healthStatus: 'healthy',
            avgLatencyMs: 800,
            failureCount: 0,
            lastCheckedAt: Date.now(),
            lastSuccessAt: Date.now(),
            createdAt: Date.now(),
          },
          {
            _id: 'provider-anthropic',
            name: 'anthropic',
            models: ['claude-3-opus'],
            status: 'active',
            healthStatus: 'unhealthy',
            avgLatencyMs: 30_000,
            failureCount: 5,
            lastCheckedAt: Date.now(),
            lastSuccessAt: Date.now() - 10 * 60 * 1000,
            createdAt: Date.now(),
          },
        ]),
      )
    }

    if (path === '/api/providers/fallbacks' && method === 'GET') {
      return route.fulfill(
        fulfillJson(200, [
          {
            _id: 'fallback-1',
            taskKey: 'task-1',
            fallbackFrom: 'openai/gpt-4o',
            fallbackTo: 'anthropic/claude-3-opus',
            fallbackReason: 'provider error: 503',
            attemptNumber: 1,
            createdAt: Date.now() - 60_000,
          },
        ]),
      )
    }

    return route.fulfill(fulfillJson(404, { error: `No mock handler for ${method} ${path}` }))
  })

  return {
    calls,
    async assertNoRuntimeErrors() {
      expect(runtimeErrors, runtimeErrors.join('\n')).toEqual([])
    },
  }
}
