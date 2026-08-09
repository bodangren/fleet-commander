import { expect, test, type Page, type Response } from '@playwright/test'

const liveProjectSlug = process.env.LIVE_PROJECT_SLUG ?? 'reading-advantage-llm-benchmark'
const firstImportedTask = 'Write schema validation tests for FrontendTask type'
const mutationMethods = new Set(['POST', 'PUT', 'PATCH', 'DELETE'])

type DataSource = 'bun' | 'convex'
type LiveProjectDetail = {
  name: string
  description: string
  tracks: Array<{ phases: Array<{ tasks: unknown[] }> }>
  agents: unknown[]
}

async function getRuntimeHarnessesSource(page: Page): Promise<DataSource> {
  const source = await page.evaluate(async () => {
    const { getSliceConfig } = await import('/src/lib/dataAdapter.ts')
    return getSliceConfig().harnesses
  })
  if (source !== 'bun' && source !== 'convex') {
    throw new Error(`Unexpected harnesses source: ${source}`)
  }
  return source
}

function formatDashboardDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`
  const seconds = Math.floor(ms / 1000)
  if (seconds < 60) return `${seconds}s`
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60
  if (minutes < 60) return remainingSeconds > 0 ? `${minutes}m ${remainingSeconds}s` : `${minutes}m`
  const hours = Math.floor(minutes / 60)
  const remainingMinutes = minutes % 60
  return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`
}

function templateDescriptionDefault(projectDescription: string): string {
  return /^Imported from \/.+/.test(projectDescription) ? '' : projectDescription
}

test.describe('Live core workflow', () => {
  test('@live real backend serves every repaired workflow', async ({ page }) => {
    test.setTimeout(2 * 60 * 1000)
    const automaticImports: string[] = []
    const qualityRequests: string[] = []
    const failedCoreResponses: string[] = []
    const mutationRequests: string[] = []
    page.on('request', request => {
      const url = new URL(request.url())
      if (mutationMethods.has(request.method())) {
        mutationRequests.push(`${request.method()} ${url.pathname}`)
      }
      if (request.method() === 'POST' && url.pathname === '/api/projects/scan-and-import') {
        automaticImports.push(request.url())
      }
      if (url.pathname.startsWith('/api/quality/')) qualityRequests.push(url.pathname)
    })
    page.on('response', response => {
      const url = new URL(response.url())
      if (
        response.status() >= 400 &&
        [
          '/api/dashboard',
          '/api/planning/recommendation',
          '/api/performance/phase-breakdown',
          '/api/providers/health',
          '/api/providers/fallbacks',
        ].includes(url.pathname)
      ) {
        failedCoreResponses.push(`${response.status()} ${url.pathname}`)
      }
    })

    await test.step('portfolio links to a slug-backed project view', async () => {
      await page.goto('/portfolio')
      const projectLink = page.locator(`a[href="/project/${encodeURIComponent(liveProjectSlug)}"]`)
      await expect(projectLink).toBeVisible()
      const detailPath = `/api/projects/${encodeURIComponent(liveProjectSlug)}`
      const detailResponsePromise = page.waitForResponse(response => {
        const url = new URL(response.url())
        return response.request().method() === 'GET' && url.pathname === detailPath
      })
      await projectLink.click()
      const detailResponse = await detailResponsePromise
      expect(detailResponse.status()).toBe(200)
      const detail = (await detailResponse.json()) as LiveProjectDetail
      expect(detail.name).toEqual(expect.any(String))
      expect(detail.description).toEqual(expect.any(String))
      expect(detail.tracks).toEqual(expect.any(Array))
      expect(detail.agents).toEqual(expect.any(Array))
      const taskCount = detail.tracks.reduce(
        (total, track) =>
          total + track.phases.reduce((phaseTotal, phase) => phaseTotal + phase.tasks.length, 0),
        0,
      )
      const agentCount = detail.agents.length
      const expectedTemplateDescription = templateDescriptionDefault(detail.description)

      await expect(page).toHaveURL(new RegExp(`/project/${encodeURIComponent(liveProjectSlug)}$`))
      await expect(page.getByText(firstImportedTask).first()).toBeVisible({ timeout: 15_000 })
      await expect(page.getByText('Loading project board...')).toHaveCount(0)
      await expect(page.getByText('Load error')).toHaveCount(0)
      await expect(page.getByText('Selected from the imported project catalog.')).toBeVisible()

      await page.getByRole('button', { name: 'Save as Template', exact: true }).click()
      await expect(
        page.getByRole('heading', { name: 'Save as Template', exact: true }),
      ).toBeVisible()
      await expect(page.getByRole('textbox', { name: 'Template name', exact: true })).toHaveValue(
        detail.name,
      )
      await expect(page.getByRole('textbox', { name: 'Description', exact: true })).toHaveValue(
        expectedTemplateDescription,
      )
      if (detail.description !== '' && expectedTemplateDescription === '') {
        const templateModal = page
          .getByRole('heading', { name: 'Save as Template', exact: true })
          .locator('xpath=../..')
        await expect(templateModal).not.toContainText(detail.description)
        await expect(
          page.getByRole('textbox', { name: 'Description', exact: true }),
        ).not.toHaveValue(detail.description)
      }
      await expect(
        page.getByText(`${taskCount} tasks · ${agentCount} agents`, { exact: true }),
      ).toBeVisible()
      await page.getByRole('button', { name: 'Cancel', exact: true }).click()
      await expect(
        page.getByRole('heading', { name: 'Save as Template', exact: true }),
      ).toHaveCount(0)
    })

    await test.step('dashboard returns real data instead of hanging', async () => {
      const dashboardResponse = page.waitForResponse(response => {
        const url = new URL(response.url())
        return response.request().method() === 'GET' && url.pathname === '/api/dashboard'
      })
      await page.goto('/dashboard')
      const response = await dashboardResponse
      expect(response.status()).toBe(200)
      const payload = (await response.json()) as {
        data?: {
          sprint: { name: string } | null
          tasks: Array<{ _id: string; projectSlug?: string; title?: string }>
          agents: unknown[]
          pipelineRuns: Array<{ taskId: string }>
          alerts: unknown[]
          metrics: {
            deliveryRate: number
            successRate: number
            avgPipelineTime: number
            rejectionRate: number
          }
        }
        error?: string
      }
      expect(payload.error).toBeUndefined()
      expect(payload.data).toMatchObject({
        tasks: expect.any(Array),
        agents: expect.any(Array),
        pipelineRuns: expect.any(Array),
        alerts: expect.any(Array),
        metrics: expect.any(Object),
      })
      const dashboard = payload.data
      expect(dashboard).toBeDefined()
      if (!dashboard) throw new Error('Dashboard response did not include data')

      const importedTask = dashboard.tasks.find(
        task => task.projectSlug === liveProjectSlug && task.title === firstImportedTask,
      )
      expect(importedTask).toBeDefined()
      expect(dashboard.metrics).toEqual({
        deliveryRate: expect.any(Number),
        successRate: expect.any(Number),
        avgPipelineTime: expect.any(Number),
        rejectionRate: expect.any(Number),
      })

      await expect(page.locator('[data-realtime-ready="true"]')).toBeVisible({ timeout: 15_000 })
      await expect(page).toHaveURL(/\/dashboard$/)
      await expect(page.getByText('Loading dashboard...')).toHaveCount(0)
      await expect(page.getByText('Dashboard unavailable')).toHaveCount(0)
      await expect(page.getByText('No dashboard data was returned.')).toHaveCount(0)
      await expect(page.getByText('Key Metrics')).toBeVisible()
      await expect(page.getByText('Delivery Rate')).toBeVisible()
      const deliveryRateRow = page
        .getByText('Delivery Rate', { exact: true })
        .locator('xpath=../..')
      const successRateRow = page.getByText('Success Rate', { exact: true }).locator('xpath=../..')
      const averagePipelineTimeRow = page
        .getByText('Avg Pipeline Time', { exact: true })
        .locator('xpath=../..')
      const rejectionRateRow = page
        .getByText('Rejection Rate', { exact: true })
        .locator('xpath=../..')
      await expect(
        deliveryRateRow.getByText(dashboard.metrics.deliveryRate.toFixed(2), { exact: true }),
      ).toBeVisible()
      await expect(
        successRateRow.getByText(`${dashboard.metrics.successRate.toFixed(0)}%`, { exact: true }),
      ).toBeVisible()
      await expect(
        averagePipelineTimeRow.getByText(
          formatDashboardDuration(dashboard.metrics.avgPipelineTime),
          { exact: true },
        ),
      ).toBeVisible()
      await expect(
        rejectionRateRow.getByText(`${dashboard.metrics.rejectionRate.toFixed(0)}%`, {
          exact: true,
        }),
      ).toBeVisible()
      if (dashboard.sprint) {
        await expect(page.getByRole('heading', { name: dashboard.sprint.name })).toBeVisible()
        await expect(page.getByText('Budget Burn Forecast')).toBeVisible()
      } else {
        await expect(page.getByRole('heading', { name: 'No Active Sprint' })).toBeVisible()
        await expect(page.getByText('Budget Burn Forecast')).toHaveCount(0)
      }
    })

    await test.step('planning renders the imported backlog honestly', async () => {
      await page.goto(`/sprint-planning?project=${encodeURIComponent(liveProjectSlug)}`)
      await expect(page.getByRole('heading', { name: 'Sprint Planning' })).toBeVisible()
      await expect(page.getByRole('combobox', { name: 'Project' })).toContainText(liveProjectSlug, {
        timeout: 15_000,
      })
      await expect(page.getByText(firstImportedTask)).toBeVisible({ timeout: 15_000 })
      await expect(page.getByText('Loading recommendations...')).toHaveCount(0)
      await expect(page.getByText('Load error')).toHaveCount(0)
      await expect(page.getByRole('button', { name: 'Start Sprint' })).toBeVisible()
    })

    await test.step('board settles for the imported project at any honest sprint state', async () => {
      await page.goto(`/board?project=${encodeURIComponent(liveProjectSlug)}`)
      await expect(page.getByRole('combobox', { name: 'Project' })).toContainText(liveProjectSlug, {
        timeout: 15_000,
      })
      await expect(
        page
          .locator('main')
          .getByText(/No sprints|Select a sprint|No tasks in this sprint|Backlog/)
          .first(),
      ).toBeVisible({ timeout: 15_000 })
      await expect(page.getByText('Loading board...')).toHaveCount(0)
      await expect(page.getByText('Load error')).toHaveCount(0)
    })

    await test.step('provider and performance routes leave loading states', async () => {
      const providerHealthResponse = page.waitForResponse(response => {
        const url = new URL(response.url())
        return response.request().method() === 'GET' && url.pathname === '/api/providers/health'
      })
      await page.goto('/providers')
      expect((await providerHealthResponse).ok()).toBe(true)
      await expect(page.getByText('Loading providers...')).toHaveCount(0)
      await expect(page.getByRole('heading', { name: 'LLM Providers' })).toBeVisible()
      await page.goto('/performance')
      await expect(page.getByText('Phase Breakdown', { exact: true })).toBeVisible({
        timeout: 10_000,
      })
      await expect(page.getByRole('cell', { name: '0ms' }).first()).toBeVisible()
    })

    await test.step('templates use their real public Convex query', async () => {
      await page.goto('/templates')
      await expect(page.getByText('No project templates yet.')).toBeVisible({ timeout: 15_000 })
      await expect(page.getByText('Loading project templates...')).toHaveCount(0)
      await expect(page.getByText('Project templates are unavailable.')).toHaveCount(0)
      await expect(page.getByRole('button', { name: 'Seed Defaults' })).toBeEnabled()
    })

    await test.step('provider catalog is truthful and read-only', async () => {
      const harnessResponses: Response[] = []
      const trackHarnessResponse = (response: Response) => {
        const url = new URL(response.url())
        if (response.request().method() === 'GET' && url.pathname === '/api/harnesses') {
          harnessResponses.push(response)
        }
      }
      page.on('response', trackHarnessResponse)

      try {
        await page.goto('/harnesses')
        const harnessesSource = await getRuntimeHarnessesSource(page)
        if (harnessesSource === 'bun') {
          await expect
            .poll(() => harnessResponses.some(response => response.status() === 200), {
              timeout: 15_000,
            })
            .toBe(true)
        } else {
          expect(
            harnessResponses,
            'Convex-backed harnesses must not request GET /api/harnesses from the page',
          ).toEqual([])
        }

        await expect(page.getByRole('heading', { name: 'Pi Provider Catalog' })).toBeVisible()
        await expect
          .poll(
            async () => {
              const catalogEntries = await page.getByText('Pi catalog entry — read-only.').count()
              const emptyCatalog = await page.getByText('No Pi providers are configured.').count()
              const loadingCount = await page.getByText('Loading Pi provider catalog...').count()
              const errorCount = await page.getByText(/Unable to load Pi provider catalog:/).count()
              return (
                (catalogEntries > 0 || emptyCatalog > 0) && loadingCount === 0 && errorCount === 0
              )
            },
            { timeout: 15_000 },
          )
          .toBe(true)
        if (harnessesSource === 'bun') {
          await expect(page.getByText('pi', { exact: true }).first()).toBeVisible()
        }
        await expect(page.getByRole('link', { name: 'Add Custom Harness' })).toHaveCount(0)
        await expect(page.getByRole('link', { name: 'Edit' })).toHaveCount(0)

        for (const editorPath of ['/harnesses/new', '/harnesses/minimax-cn-coding-plan/edit']) {
          await page.goto(editorPath)
          await expect(page).toHaveURL(/\/harnesses$/)
          await expect(page.getByRole('heading', { name: 'Pi Provider Catalog' })).toBeVisible()
          await expect(page.getByText(/New Harness|Edit Harness:/)).toHaveCount(0)
        }
      } finally {
        page.off('response', trackHarnessResponse)
      }
    })

    await test.step('quality routes use the imported slug, never demo-project', async () => {
      qualityRequests.length = 0
      await page.goto('/settings/quality')
      await expect(page.getByRole('heading', { name: 'Quality' })).toBeVisible()
      const projectSelect = page.getByRole('combobox', { name: 'Project' })
      await expect(projectSelect).toBeVisible()
      await projectSelect.selectOption(liveProjectSlug)
      await expect(page).toHaveURL(
        new RegExp(`/settings/quality\\?project=${encodeURIComponent(liveProjectSlug)}$`),
      )
      await expect(page.getByRole('heading', { name: 'Quality workflow' })).toBeVisible({
        timeout: 15_000,
      })
      await expect
        .poll(() => qualityRequests.some(path => path.includes(liveProjectSlug)), {
          timeout: 15_000,
        })
        .toBe(true)
      await page.goto(`/ops/quality?project=${encodeURIComponent(liveProjectSlug)}`)
      await expect(page.getByRole('combobox', { name: 'Project' })).toHaveValue(liveProjectSlug)
      await expect(page.getByText(`Project: ${liveProjectSlug}`)).toBeVisible({ timeout: 15_000 })
      await expect(page.getByRole('heading', { name: 'Quality operations' })).toBeVisible({
        timeout: 15_000,
      })
      await expect(page.getByText('Loading imported projects...')).toHaveCount(0)
      expect(qualityRequests.some(path => path.includes('demo-project'))).toBe(false)
    })

    expect(automaticImports).toEqual([])
    expect(mutationRequests).toEqual([])
    expect(failedCoreResponses).toEqual([])
  })
})
