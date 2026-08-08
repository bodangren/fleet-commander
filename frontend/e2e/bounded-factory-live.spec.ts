import { expect, test } from '@playwright/test'

const projectSlug = process.env.LIVE_PROJECT_SLUG ?? 'reading-advantage-llm-benchmark'
const acceptanceAgent = process.env.LIVE_FACTORY_AGENT ?? 'factory-acceptance-luna'
const acceptanceTask =
  process.env.LIVE_FACTORY_TASK_TITLE ?? 'Write schema validation tests for FrontendTask type'
const acceptanceFleetModel = 'openai/gpt-5.6-luna'
const acceptancePiModel = 'openai-codex/gpt-5.6-luna'
const acceptancePiRole = 'coder-openai-gpt-5-6-luna-fast'

interface ProjectTaskSnapshot {
  id: string
  description: string
  status: string
}

interface ProjectSummary {
  id: string
  slug: string
}

interface AgentSummary {
  status?: string
  workload?: number
  maxWorkload?: number
  definition?: {
    name?: string
    model?: string
  }
}

interface ActiveSprintSnapshot {
  _id: string
  projectSlug: string
  status: string
  taskKeys: string[]
}

interface GitStatusSnapshot {
  branch: string
  dirty: boolean
  ahead: number
  behind: number
  staged: number
  modified: number
  untracked: number
}

interface SprintRecommendation {
  tasks: Array<{
    taskId: string
    taskTitle: string
    assignedAgentId?: string
  }>
}

interface ExecutionLogSnapshot {
  projectSlug: string
  runId: string
  trackId?: string
  status: string
  summary: string
  createdAt: number
}

interface ProjectCostSnapshot {
  projectSlug: string
  totalCostUSD: number
  totalInputTokens: number
  totalOutputTokens: number
  recordCount: number
}

interface WorkRunSnapshot {
  projectSlug: string
  runId: string
  status: string
  selectedTaskKey?: string
  startedAt: number
  finishedAt?: number
}

interface ProjectRunGitEvidence {
  before: {
    branch: string
    head: string
    clean: boolean
    changedPaths: string[]
  }
  branch: string
  after: {
    branch: string
    head: string
    clean: boolean
    changedPaths: string[]
    observedChangedPaths?: string[]
  }
  pushed: boolean
}

interface SanitizedPiReceipt {
  taskId: string
  parentSessionId: string
  parentAgent: string
  childAgent: string
  model?: string
  promptHash: string
  outputHash: string
  exitCode: number
  timeoutMs: number
  maxTokens?: number
  startedAt: string
  completedAt: string
}

interface ProjectSnapshot {
  tracks: Array<{
    phases: Array<{ tasks: ProjectTaskSnapshot[] }>
  }>
}

interface BoardSprintSnapshot {
  _id: string
  projectId: string
  status: string
}

function flattenTasks(project: ProjectSnapshot): ProjectTaskSnapshot[] {
  return project.tracks.flatMap(track => track.phases.flatMap(phase => phase.tasks))
}

test.describe('Bounded live factory activation', () => {
  test('@live @factory-readiness read-only browser preflight proves imported project and Luna harness contracts', async ({
    page,
  }) => {
    const mutationRequests: string[] = []
    await page.route('**/*', async route => {
      const method = route.request().method()
      if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
        mutationRequests.push(`${method} ${route.request().url()}`)
        await route.abort()
        return
      }
      await route.continue()
    })

    const projectResponse = await page.request.get(
      `/api/projects/${encodeURIComponent(projectSlug)}`,
    )
    const agentsResponse = await page.request.get('/api/agents')
    const activeSprintResponse = await page.request.get(
      `/api/projects/${encodeURIComponent(projectSlug)}/sprints/active`,
    )
    const modeResponse = await page.request.get('/api/orchestrator/status')
    const gitResponse = await page.request.get(
      `/api/git/status?project=${encodeURIComponent(projectSlug)}`,
    )
    const harnessesResponse = await page.request.get('/api/harnesses')
    expect(projectResponse.ok()).toBe(true)
    expect(agentsResponse.ok()).toBe(true)
    expect(activeSprintResponse.ok()).toBe(true)
    expect(modeResponse.ok()).toBe(true)
    expect(gitResponse.ok()).toBe(true)
    expect(harnessesResponse.ok()).toBe(true)

    const project = (await projectResponse.json()) as ProjectSnapshot
    const tasks = flattenTasks(project)
    expect(
      tasks.some(task => task.description === acceptanceTask && task.status === 'backlog'),
    ).toBe(true)
    for (const agent of (await agentsResponse.json()) as AgentSummary[]) {
      expect(agent.definition?.name).toBeTruthy()
      expect(['active', 'inactive']).toContain(agent.status)
      expect(agent.workload).toEqual(expect.any(Number))
      expect(agent.maxWorkload).toEqual(expect.any(Number))
      expect(agent.maxWorkload).toBeGreaterThan(0)
      expect(agent.workload).toBeGreaterThanOrEqual(0)
    }
    expect(await activeSprintResponse.json()).toBeNull()
    expect(await modeResponse.json()).toMatchObject({ enabled: false, state: 'idle' })
    expect(await gitResponse.json()).toMatchObject({ dirty: false })

    const harnesses = (await harnessesResponse.json()) as Array<{
      models: string[]
      readiness: { ok: boolean; piModel?: string; piRole?: string }
    }>
    expect(
      harnesses.some(
        harness =>
          harness.models.includes('gpt-5.6-luna') &&
          harness.readiness.ok &&
          harness.readiness.piModel === acceptancePiModel &&
          harness.readiness.piRole === acceptancePiRole,
      ),
    ).toBe(true)

    await page.goto(`/project/${encodeURIComponent(projectSlug)}`)
    await expect(page.getByText(acceptanceTask).first()).toBeVisible({ timeout: 15_000 })
    await expect(page.getByText('Loading project board...')).toHaveCount(0)
    await expect(page.getByText('Load error')).toHaveCount(0)
    expect(mutationRequests).toEqual([])
  })

  test('@live @factory-acceptance creates one agent, assigns one task, and runs one project cycle', async ({
    page,
  }) => {
    test.skip(
      process.env.RUN_LIVE_FACTORY !== '1',
      'Requires explicit approval because it creates live state and invokes a credentialed agent.',
    )
    test.setTimeout(15 * 60 * 1000)

    let beforeAgentWorkloads = new Map<string, number>()

    await test.step('create a Pi-backed agent and prove production readiness', async () => {
      const beforeAgentsResponse = await page.request.get('/api/agents')
      expect(beforeAgentsResponse.ok()).toBe(true)
      const beforeAgents = (await beforeAgentsResponse.json()) as AgentSummary[]
      expect(
        beforeAgents.some(agent => agent.definition?.name === acceptanceAgent),
        `Acceptance agent ${acceptanceAgent} must not already exist; otherwise the test cannot prove creation`,
      ).toBe(false)

      beforeAgentWorkloads = new Map(
        beforeAgents.map(agent => [agent.definition?.name ?? '', agent.workload ?? 0]),
      )

      await page.goto('/agents/new/edit')
      await expect(page.getByRole('heading', { name: 'New Agent' })).toBeVisible()
      await page.getByRole('textbox', { name: 'Name' }).fill(acceptanceAgent)
      await page.getByRole('combobox', { name: 'Provider' }).selectOption('openai')
      await page.getByRole('combobox', { name: 'Model' }).selectOption('gpt-5.6-luna')

      const saveResponse = page.waitForResponse(
        response =>
          response.request().method() === 'PUT' &&
          new URL(response.url()).pathname === `/api/agents/${acceptanceAgent}`,
      )
      await page.getByRole('button', { name: 'Save Agent' }).click()
      expect((await saveResponse).status()).toBe(200)
      await expect(page).toHaveURL(new RegExp(`/agents/${acceptanceAgent}/edit$`))

      const readinessResponse = page.waitForResponse(
        response =>
          response.request().method() === 'POST' &&
          new URL(response.url()).pathname === `/api/agents/${acceptanceAgent}/test`,
      )
      await page.getByRole('button', { name: 'Check Readiness' }).click()
      const readiness = await readinessResponse
      expect(readiness.status()).toBe(200)
      expect(await readiness.json()).toMatchObject({
        ok: true,
        status: 'ready',
        readiness: {
          ok: true,
          piRole: 'coder-openai-gpt-5-6-luna-fast',
          piModel: 'openai-codex/gpt-5.6-luna',
        },
      })
      await expect(page.getByText('success', { exact: true })).toBeVisible()

      const afterAgentsResponse = await page.request.get('/api/agents')
      expect(afterAgentsResponse.ok()).toBe(true)
      const afterAgents = (await afterAgentsResponse.json()) as AgentSummary[]
      const newAgents = afterAgents.filter(
        agent =>
          agent.definition?.name &&
          !beforeAgents.some(previous => previous.definition?.name === agent.definition?.name),
      )
      expect(newAgents).toHaveLength(1)
      expect(newAgents[0]?.definition).toMatchObject({
        name: acceptanceAgent,
        model: acceptanceFleetModel,
      })
      expect(newAgents[0]).toMatchObject({ status: 'active', workload: 0 })
      expect(newAgents[0]?.maxWorkload).toBeGreaterThan(0)
    })

    let sprintTaskId = ''
    let sprintTaskKey = ''
    let sprintId = ''
    let costBefore: ProjectCostSnapshot | undefined
    let tasksBeforeSprint: ProjectTaskSnapshot[] = []
    let runStartedAt = 0
    await test.step('create exactly one atomic one-task sprint', async () => {
      const projectsResponse = await page.request.get('/api/projects')
      expect(projectsResponse.ok()).toBe(true)
      const project = ((await projectsResponse.json()) as ProjectSummary[]).find(
        candidate => candidate.slug === projectSlug,
      )
      expect(project, `Project ${projectSlug} is not exposed by GET /api/projects`).toBeTruthy()

      const sprintsBeforeResponse = await page.request.get(
        `/api/board/projects/${encodeURIComponent(project!.id)}/sprints`,
      )
      expect(sprintsBeforeResponse.ok()).toBe(true)
      const sprintsBeforePayload = (await sprintsBeforeResponse.json()) as {
        data: BoardSprintSnapshot[]
      }
      const sprintsBefore = sprintsBeforePayload.data
      expect(Array.isArray(sprintsBefore)).toBe(true)

      const recommendationResponse = await page.request.get(
        `/api/planning/recommendation?projectId=${encodeURIComponent(project!.id)}`,
      )
      expect(recommendationResponse.ok()).toBe(true)
      const recommendation = (await recommendationResponse.json()) as SprintRecommendation
      const recommendedTask = recommendation.tasks.filter(task => task.taskTitle === acceptanceTask)
      expect(
        recommendedTask,
        'The sprint recommendation must expose the acceptance task',
      ).toHaveLength(1)
      expect(
        recommendedTask[0]?.assignedAgentId,
        'The exact acceptance task must have an assigned agent',
      ).toBeTruthy()

      const beforeResponse = await page.request.get(
        `/api/projects/${encodeURIComponent(projectSlug)}`,
      )
      expect(beforeResponse.ok()).toBe(true)
      const beforeTasks = flattenTasks((await beforeResponse.json()) as ProjectSnapshot)
      tasksBeforeSprint = beforeTasks
      const matchingBefore = beforeTasks.filter(task => task.description === acceptanceTask)
      expect(
        matchingBefore,
        'The acceptance task must be unique in the project catalog',
      ).toHaveLength(1)
      const selectedBefore = matchingBefore[0]
      expect(selectedBefore).toMatchObject({ status: 'backlog' })

      const activeSprintBeforeResponse = await page.request.get(
        `/api/projects/${encodeURIComponent(projectSlug)}/sprints/active`,
      )
      expect(activeSprintBeforeResponse.ok()).toBe(true)
      expect(await activeSprintBeforeResponse.json()).toBeNull()

      const costResponse = await page.request.get(
        `/api/costs/by-project?days=30&projectSlug=${encodeURIComponent(projectSlug)}`,
      )
      expect(costResponse.ok()).toBe(true)
      costBefore = ((await costResponse.json()) as ProjectCostSnapshot[]).find(
        cost => cost.projectSlug === projectSlug,
      )

      await page.goto(`/sprint-planning?project=${encodeURIComponent(projectSlug)}`)
      const taskRow = page.locator('label').filter({ hasText: acceptanceTask }).first()
      await expect(taskRow).toBeVisible({ timeout: 15_000 })
      await expect(page.getByText('Loading recommendations...')).toHaveCount(0)
      await expect(page.getByText('Load error')).toHaveCount(0)
      const taskCheckbox = taskRow.getByRole('checkbox')
      await expect(taskCheckbox).toBeEnabled()
      await taskCheckbox.check()
      await expect(page.getByText(/1 of \d+ selected/)).toBeVisible()

      const sprintResponsePromise = page.waitForResponse(
        response =>
          response.request().method() === 'POST' &&
          new URL(response.url()).pathname === '/api/planning/sprints',
      )
      await page.getByRole('button', { name: 'Start Sprint' }).click()
      const sprintResponse = await sprintResponsePromise
      expect(sprintResponse.status()).toBe(200)
      const sprint = (await sprintResponse.json()) as {
        ok: boolean
        sprintId: string
        taskId: string
      }
      expect(sprint.ok).toBe(true)
      expect(sprint.sprintId).toBeTruthy()
      expect(sprint.taskId).toBeTruthy()
      sprintTaskId = sprint.taskId
      sprintId = sprint.sprintId
      sprintTaskKey = selectedBefore!.id

      // The response ID must be the exact recommendation ID selected by the UI;
      // a pair of unrelated truthy IDs would not prove the assignment.
      expect(sprint.taskId).toBe(recommendedTask[0]!.taskId)
      await expect(page.getByText('1 of', { exact: false })).toHaveCount(0)

      const afterResponse = await page.request.get(
        `/api/projects/${encodeURIComponent(projectSlug)}`,
      )
      expect(afterResponse.ok()).toBe(true)
      const afterTasks = flattenTasks((await afterResponse.json()) as ProjectSnapshot)
      const beforeStatus = new Map(beforeTasks.map(task => [task.id, task.status]))
      const changedTasks = afterTasks.filter(task => beforeStatus.get(task.id) !== task.status)
      expect(changedTasks).toEqual([
        expect.objectContaining({
          id: selectedBefore?.id,
          description: acceptanceTask,
          status: 'ready',
        }),
      ])

      const activeSprintAfterResponse = await page.request.get(
        `/api/projects/${encodeURIComponent(projectSlug)}/sprints/active`,
      )
      expect(activeSprintAfterResponse.ok()).toBe(true)
      const activeSprintAfter = (await activeSprintAfterResponse.json()) as ActiveSprintSnapshot
      expect(activeSprintAfter).toMatchObject({
        _id: sprintId,
        projectSlug,
        status: 'active',
        taskKeys: [sprintTaskKey],
      })

      const sprintsAfterResponse = await page.request.get(
        `/api/board/projects/${encodeURIComponent(project!.id)}/sprints`,
      )
      expect(sprintsAfterResponse.ok()).toBe(true)
      const sprintsAfterPayload = (await sprintsAfterResponse.json()) as {
        data: BoardSprintSnapshot[]
      }
      const sprintsAfter = sprintsAfterPayload.data
      expect(sprintsAfter).toHaveLength(sprintsBefore.length + 1)
      const newSprints = sprintsAfter.filter(
        sprintAfter => !sprintsBefore.some(sprintBefore => sprintBefore._id === sprintAfter._id),
      )
      expect(newSprints).toHaveLength(1)
      expect(newSprints[0]).toMatchObject({ _id: sprintId, status: 'active' })

      const afterAssignmentAgentsResponse = await page.request.get('/api/agents')
      expect(afterAssignmentAgentsResponse.ok()).toBe(true)
      const afterAssignmentAgents = (await afterAssignmentAgentsResponse.json()) as AgentSummary[]
      const assignedAgent = afterAssignmentAgents.find(
        agent => agent.definition?.name === acceptanceAgent,
      )
      expect(assignedAgent).toMatchObject({ status: 'active', workload: 1 })
      for (const [name, workload] of beforeAgentWorkloads) {
        const current = afterAssignmentAgents.find(agent => agent.definition?.name === name)
        expect(current, `Existing agent ${name} disappeared`).toBeTruthy()
        expect(current?.workload ?? 0).toBe(workload)
      }

      expect(sprintId).toBeTruthy()
    })

    await test.step('run one scoped project cycle and render its terminal truth', async () => {
      const modeBefore = await page.request.get('/api/orchestrator/status')
      expect(modeBefore.ok()).toBe(true)
      expect(await modeBefore.json()).toMatchObject({ enabled: false, state: 'idle' })

      const gitBeforeResponse = await page.request.get(
        `/api/git/status?project=${encodeURIComponent(projectSlug)}`,
      )
      expect(gitBeforeResponse.ok()).toBe(true)
      const gitBefore = (await gitBeforeResponse.json()) as GitStatusSnapshot
      expect(gitBefore.dirty).toBe(false)

      await page.goto(`/project/${encodeURIComponent(projectSlug)}`)
      await expect(page.getByText(acceptanceTask).first()).toBeVisible({ timeout: 15_000 })
      await expect(page.getByText('Loading project board...')).toHaveCount(0)
      await expect(page.getByText('Load error')).toHaveCount(0)
      const runResponsePromise = page.waitForResponse(
        response =>
          response.request().method() === 'POST' &&
          new URL(response.url()).pathname === `/api/projects/${projectSlug}/run`,
        { timeout: 14 * 60 * 1000 },
      )
      runStartedAt = Date.now()
      await page.getByRole('button', { name: 'Trigger Run' }).click()
      const runResponse = await runResponsePromise
      const run = (await runResponse.json()) as {
        ok: boolean
        project: { slug: string }
        taskKey: string | null
        status: string
        error?: string
        message?: string
        git?: ProjectRunGitEvidence
      }
      expect([200, 500]).toContain(runResponse.status())
      expect(runResponse.request().postDataJSON()).toEqual({ taskKey: sprintTaskKey })
      // Assert identity before interpreting failure details. A failed response
      // for another task is not an honest result for this bounded acceptance.
      expect(run.project.slug).toBe(projectSlug)
      expect(run.taskKey).toBe(sprintTaskKey)
      expect(['succeeded', 'failed']).toContain(run.status)
      expect(run.ok).toBe(run.status === 'succeeded')
      if (run.status === 'failed') expect(run.error ?? run.message).toBeTruthy()

      // This is part of the planned project-run response contract. It keeps
      // the acceptance independent of server logs: the response must prove
      // that the run started clean, identify its task branch/head, enumerate
      // observed changes, and never push the imported repository.
      expect(run.git).toMatchObject({
        before: {
          branch: expect.any(String),
          head: expect.stringMatching(/^[a-f0-9]{40}$/),
          clean: true,
          changedPaths: [],
        },
        branch: expect.stringContaining(sprintTaskKey),
        after: {
          branch: expect.stringContaining(sprintTaskKey),
          head: expect.stringMatching(/^[a-f0-9]{40}$/),
          changedPaths: expect.any(Array),
        },
        pushed: false,
      })
      expect(run.git?.before.clean).toBe(!gitBefore.dirty)
      expect(run.git?.after.branch).toBe(run.git?.branch)
      if (run.status === 'succeeded') {
        expect(run.git?.after.head).not.toBe(run.git?.before.head)
        expect(run.git?.after.clean).toBe(true)
        expect(run.git?.after.observedChangedPaths).toEqual(expect.any(Array))
        expect([
          ...(run.git?.after.changedPaths ?? []),
          ...(run.git?.after.observedChangedPaths ?? []),
        ]).not.toHaveLength(0)
      }

      // Positive terminal UI evidence comes before negative loading/error
      // assertions so an early render cannot masquerade as a settled run.
      await expect(page.getByText('RUN STATUS')).toBeVisible()
      await expect(page.getByText(run.status, { exact: true })).toBeVisible()
      await expect(page.getByText(`Task: ${run.taskKey}`, { exact: true })).toBeVisible()
      await expect(page.getByText('Loading project board...')).toHaveCount(0)
      await expect(page.getByText('Load error')).toHaveCount(0)

      const afterResponse = await page.request.get(
        `/api/projects/${encodeURIComponent(projectSlug)}`,
      )
      expect(afterResponse.ok()).toBe(true)
      const afterTasks = flattenTasks((await afterResponse.json()) as ProjectSnapshot)
      expect(afterTasks).toHaveLength(tasksBeforeSprint.length)
      expect(new Set(afterTasks.map(task => task.id))).toEqual(
        new Set(tasksBeforeSprint.map(task => task.id)),
      )
      const beforeById = new Map(tasksBeforeSprint.map(task => [task.id, task]))
      const collateralChanges = afterTasks.filter(task => {
        const before = beforeById.get(task.id)
        return before && task.id !== sprintTaskKey && task.status !== before.status
      })
      expect(collateralChanges).toEqual([])
      const executedTask = afterTasks.filter(task => task.id === sprintTaskKey)
      expect(
        executedTask,
        'The exact assigned task must remain readable after execution',
      ).toHaveLength(1)
      expect(executedTask[0]).toMatchObject({ id: sprintTaskKey, description: acceptanceTask })
      expect(['ready', 'in_progress', 'review', 'done', 'blocked']).toContain(
        executedTask[0]!.status,
      )
      if (run.status === 'succeeded') expect(executedTask[0]!.status).toBe('done')

      const logsResponse = await page.request.get(
        `/api/projects/${encodeURIComponent(projectSlug)}/logs`,
      )
      expect(logsResponse.ok()).toBe(true)
      const logs = (await logsResponse.json()) as ExecutionLogSnapshot[]
      const taskLogs = logs.filter(
        log =>
          log.projectSlug === projectSlug &&
          log.summary.includes(sprintTaskKey) &&
          log.createdAt >= runStartedAt,
      )
      const costResponse = await page.request.get(
        `/api/costs/by-project?days=30&projectSlug=${encodeURIComponent(projectSlug)}`,
      )
      expect(costResponse.ok()).toBe(true)
      const costAfter = ((await costResponse.json()) as ProjectCostSnapshot[]).find(
        cost => cost.projectSlug === projectSlug,
      )
      if (run.status === 'succeeded') {
        expect(
          costAfter,
          `Cost aggregate must expose ${projectSlug} after a successful run`,
        ).toBeTruthy()
        expect(costAfter!.recordCount).toBeGreaterThan(costBefore?.recordCount ?? 0)
        expect(costAfter!.totalInputTokens + costAfter!.totalOutputTokens).toBeGreaterThan(
          (costBefore?.totalInputTokens ?? 0) + (costBefore?.totalOutputTokens ?? 0),
        )
      }

      const modeAfter = await page.request.get('/api/orchestrator/status')
      expect(modeAfter.ok()).toBe(true)
      expect(await modeAfter.json()).toMatchObject({ enabled: false, state: 'idle' })
      expect(sprintTaskId).toBeTruthy()

      const workRunsResponse = await page.request.get(
        `/api/projects/${encodeURIComponent(projectSlug)}/work-runs`,
      )
      expect(workRunsResponse.ok()).toBe(true)
      const workRunsPayload = (await workRunsResponse.json()) as {
        project: { id: string; slug: string }
        workRuns: WorkRunSnapshot[]
      }
      expect(workRunsPayload.project.slug).toBe(projectSlug)
      const matchingWorkRuns = workRunsPayload.workRuns.filter(
        workRun =>
          workRun.projectSlug === projectSlug &&
          workRun.selectedTaskKey === sprintTaskKey &&
          workRun.startedAt >= runStartedAt,
      )
      expect(matchingWorkRuns.length).toBeLessThanOrEqual(1)
      if (matchingWorkRuns.length === 0) {
        expect(run.status).toBe('failed')
        expect(run.error ?? run.message).toMatch(
          /agent|budget|circuit|credential|preflight|readiness/i,
        )
        expect(
          taskLogs,
          'A run blocked before execution must not fabricate execution logs',
        ).toHaveLength(0)
        return
      }

      const persistedRun = matchingWorkRuns[0]!
      expect(persistedRun.status).toBe(run.status)
      expect(persistedRun.runId).toBeTruthy()
      if (persistedRun.finishedAt !== undefined) {
        expect(persistedRun.finishedAt).toBeGreaterThanOrEqual(persistedRun.startedAt)
      }

      expect(
        taskLogs,
        `GET /api/projects/${projectSlug}/logs must expose a persisted log for ${sprintTaskKey}`,
      ).not.toHaveLength(0)
      expect(new Set(taskLogs.map(log => log.runId))).toEqual(new Set([persistedRun.runId]))

      const receiptResponse = await page.request.get(
        `/api/projects/${encodeURIComponent(projectSlug)}/pi-receipt?taskKey=${encodeURIComponent(sprintTaskKey)}&runId=${encodeURIComponent(persistedRun.runId)}`,
      )
      if (run.status === 'failed' && receiptResponse.status() === 404) {
        expect(run.error ?? run.message).toBeTruthy()
        return
      }
      expect(receiptResponse.ok()).toBe(true)
      const receiptPayload = (await receiptResponse.json()) as {
        project: { id: string; slug: string }
        taskKey: string
        runId: string
        receipts: SanitizedPiReceipt[]
      }
      expect(receiptPayload.project.slug).toBe(projectSlug)
      expect(receiptPayload.taskKey).toBe(sprintTaskKey)
      expect(receiptPayload.runId).toBe(persistedRun.runId)
      const exactReceipts = receiptPayload.receipts.filter(receipt => {
        const startedAt = Date.parse(receipt.startedAt)
        const completedAt = Date.parse(receipt.completedAt)
        return (
          receipt.parentSessionId === sprintTaskKey &&
          Number.isFinite(startedAt) &&
          Number.isFinite(completedAt) &&
          startedAt >= runStartedAt &&
          completedAt >= startedAt &&
          (persistedRun.finishedAt === undefined || completedAt <= persistedRun.finishedAt + 60_000)
        )
      })
      expect(
        exactReceipts,
        `GET /api/projects/${projectSlug}/pi-receipt must expose the receipt for the exact run`,
      ).toHaveLength(1)
      const receipt = exactReceipts[0]!
      expect(receipt.taskId).toBeTruthy()
      expect(typeof receipt.exitCode).toBe('number')
      expect(receipt.timeoutMs).toBeGreaterThan(0)
      expect(receipt.timeoutMs).toBeLessThanOrEqual(600_000)
      expect(receipt.maxTokens).toBeGreaterThan(0)
      expect(receipt.maxTokens).toBeLessThanOrEqual(16_000)
      expect(receipt.model).toBe(acceptancePiModel)
      expect(receipt.childAgent).toBe(acceptancePiRole)
      expect(receipt.promptHash).toMatch(/^[a-f0-9]{64}$/)
      expect(receipt.outputHash).toMatch(/^[a-f0-9]{64}$/)
      expect(receipt).not.toHaveProperty('cwd')
      expect(receipt).not.toHaveProperty('logPath')
      expect(receipt).not.toHaveProperty('finalOutput')
      expect(receipt).not.toHaveProperty('stderr')
    })
  })
})
