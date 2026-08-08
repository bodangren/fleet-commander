import { expect, test } from '@playwright/test'

const projectSlug = process.env.LIVE_PROJECT_SLUG ?? 'reading-advantage-llm-benchmark'
const acceptanceAgent = process.env.LIVE_FACTORY_AGENT ?? 'factory-acceptance-luna'
const acceptanceTask =
  process.env.LIVE_FACTORY_TASK_TITLE ?? 'Write schema validation tests for FrontendTask type'

interface ProjectTaskSnapshot {
  id: string
  description: string
  status: string
}

interface ProjectSummary {
  id: string
  slug: string
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

function flattenTasks(project: ProjectSnapshot): ProjectTaskSnapshot[] {
  return project.tracks.flatMap(track => track.phases.flatMap(phase => phase.tasks))
}

test.describe('Bounded live factory activation', () => {
  test('@live @factory-acceptance creates one agent, assigns one task, and runs one project cycle', async ({
    page,
  }) => {
    test.skip(
      process.env.RUN_LIVE_FACTORY !== '1',
      'Requires explicit approval because it creates live state and invokes a credentialed agent.',
    )
    test.setTimeout(15 * 60 * 1000)

    await test.step('create a Pi-backed agent and prove production readiness', async () => {
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
    })

    let sprintTaskId = ''
    let sprintTaskKey = ''
    let sprintId = ''
    let costBefore: ProjectCostSnapshot | undefined
    let runStartedAt = 0
    await test.step('create exactly one atomic one-task sprint', async () => {
      const projectsResponse = await page.request.get('/api/projects')
      expect(projectsResponse.ok()).toBe(true)
      const project = ((await projectsResponse.json()) as ProjectSummary[]).find(
        candidate => candidate.slug === projectSlug,
      )
      expect(project, `Project ${projectSlug} is not exposed by GET /api/projects`).toBeTruthy()

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
      const matchingBefore = beforeTasks.filter(task => task.description === acceptanceTask)
      expect(
        matchingBefore,
        'The acceptance task must be unique in the project catalog',
      ).toHaveLength(1)
      const selectedBefore = matchingBefore[0]
      expect(selectedBefore).toMatchObject({ status: 'backlog' })

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

      expect(sprintId).toBeTruthy()
    })

    await test.step('run one scoped project cycle and render its terminal truth', async () => {
      const modeBefore = await page.request.get('/api/orchestrator/status')
      expect(modeBefore.ok()).toBe(true)
      expect(await modeBefore.json()).toMatchObject({ enabled: false, state: 'idle' })

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
      ).not.toHaveLength(0)
      const receipt = exactReceipts[0]!
      expect(receipt.taskId).toBeTruthy()
      expect(typeof receipt.exitCode).toBe('number')
      expect(receipt.timeoutMs).toBeGreaterThan(0)
      expect(receipt.timeoutMs).toBeLessThanOrEqual(600_000)
      expect(receipt.maxTokens).toBeGreaterThan(0)
      expect(receipt.maxTokens).toBeLessThanOrEqual(16_000)
      expect(receipt.model).toBe('openai-codex/gpt-5.6-luna')
      expect(receipt.childAgent).toBe('coder-openai-gpt-5-6-luna-fast')
      expect(receipt.promptHash).toMatch(/^[a-f0-9]{64}$/)
      expect(receipt.outputHash).toMatch(/^[a-f0-9]{64}$/)
      expect(receipt).not.toHaveProperty('cwd')
      expect(receipt).not.toHaveProperty('logPath')
      expect(receipt).not.toHaveProperty('finalOutput')
      expect(receipt).not.toHaveProperty('stderr')
    })
  })
})
