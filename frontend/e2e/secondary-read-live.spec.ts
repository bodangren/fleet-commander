import { expect, test, type Page } from '@playwright/test'

const importedTask = 'Task: Full test suite and build'
const liveProjectSlug = process.env.LIVE_PROJECT_SLUG ?? 'reading-advantage-llm-benchmark'
const unknownPath = '/this-route-does-not-exist'

type ProjectsSource = 'bun' | 'convex'

async function gotoHistoryAndResolveLiveProjectId(page: Page, path: string): Promise<string> {
  const projectsResponse = page.waitForResponse(response => {
    const url = new URL(response.url())
    return response.request().method() === 'GET' && url.pathname === '/api/projects'
  })

  await page.goto(path)
  const response = await projectsResponse
  expect(response.status()).toBe(200)
  const projects = (await response.json()) as Array<{ id?: string; slug?: string }>
  const project = projects.find(candidate => candidate.slug === liveProjectSlug)
  if (!project?.id) {
    throw new Error(`Live project ${liveProjectSlug} was not returned by GET /api/projects`)
  }
  return project.id
}

function waitForScopedHistoryResponse(
  page: Page,
  projectId: string,
  resource: 'sprints' | 'tasks',
) {
  const expectedPath = `/api/history/projects/${encodeURIComponent(projectId)}/${resource}`
  return page.waitForResponse(
    response => {
      const url = new URL(response.url())
      return (
        response.request().method() === 'GET' &&
        url.pathname === expectedPath &&
        url.searchParams.get('limit') === '50'
      )
    },
    { timeout: 10_000 },
  )
}

async function getRuntimeProjectsSource(page: Page): Promise<ProjectsSource> {
  const source = await page.evaluate(async () => {
    const { getSliceConfig } = await import('/src/lib/dataAdapter.ts')
    return getSliceConfig().projects
  })
  if (source !== 'bun' && source !== 'convex') {
    throw new Error(`Unexpected projects source: ${source}`)
  }
  return source
}

test.describe('Secondary read surfaces', () => {
  test('@live real backend settles every repaired read surface', async ({ page }) => {
    const pageErrors: string[] = []
    const consoleErrors: string[] = []
    const failedResponses: string[] = []
    const convexErrors: string[] = []
    const forbiddenMutations: string[] = []

    page.on('pageerror', error => pageErrors.push(error.message))
    page.on('console', message => {
      if (message.type() === 'error') consoleErrors.push(message.text())
    })
    page.on('request', request => {
      const url = new URL(request.url())
      if (
        (request.method() === 'POST' && url.pathname === '/api/projects/scan-and-import') ||
        url.pathname === '/api/mutation'
      ) {
        forbiddenMutations.push(`${request.method()} ${url.pathname}`)
      }
    })
    page.on('response', async response => {
      const url = new URL(response.url())
      if (response.status() >= 400 && (url.pathname.startsWith('/api/') || url.port === '3210')) {
        failedResponses.push(`${response.status()} ${url.pathname}`)
      }
      if (url.pathname === '/api/query') {
        const payload = (await response.json().catch(() => null)) as {
          status?: string
          errorMessage?: string
        } | null
        if (payload?.status === 'error') {
          convexErrors.push(payload.errorMessage ?? 'Unknown Convex query error')
        }
      }
    })

    await test.step('history selects the imported project and settles', async () => {
      const liveProjectId = await gotoHistoryAndResolveLiveProjectId(page, '/history/sprints')
      const projectsSource = await getRuntimeProjectsSource(page)
      await expect(page.getByRole('heading', { name: 'Sprint History' })).toBeVisible()
      const sprintProjectSelect = page.getByRole('combobox', { name: 'Project' })
      await expect(sprintProjectSelect).toBeVisible()
      const sprintHistoryResponse =
        projectsSource === 'bun'
          ? waitForScopedHistoryResponse(page, liveProjectId, 'sprints')
          : null
      await sprintProjectSelect.selectOption(liveProjectSlug)
      await expect(page).toHaveURL(
        new RegExp(`/history/sprints\\?project=${encodeURIComponent(liveProjectSlug)}$`),
      )
      await expect(sprintProjectSelect).toHaveValue(liveProjectSlug)
      if (sprintHistoryResponse) expect((await sprintHistoryResponse).status()).toBe(200)
      await expect(page.getByText('Loading sprint history…')).toHaveCount(0, { timeout: 10_000 })
      await expect(page.getByText(/Unable to load sprint history/)).toHaveCount(0)
      await expect(page.getByText('Select a valid project to view sprint history.')).toHaveCount(0)
      await expect
        .poll(
          async () => {
            const emptyState = await page.getByText('No sprint history').count()
            const rows = await page.locator('main table tbody tr').count()
            return emptyState + rows
          },
          { timeout: 10_000 },
        )
        .toBeGreaterThan(0)

      await page.goto('/history/tasks')
      await expect(page.getByRole('heading', { name: 'Task History' })).toBeVisible()
      const taskProjectSelect = page.getByRole('combobox', { name: 'Project' })
      await expect(taskProjectSelect).toBeVisible()
      const taskHistoryResponse =
        projectsSource === 'bun' ? waitForScopedHistoryResponse(page, liveProjectId, 'tasks') : null
      await taskProjectSelect.selectOption(liveProjectSlug)
      await expect(page).toHaveURL(
        new RegExp(`/history/tasks\\?project=${encodeURIComponent(liveProjectSlug)}$`),
      )
      await expect(taskProjectSelect).toHaveValue(liveProjectSlug)
      if (taskHistoryResponse) expect((await taskHistoryResponse).status()).toBe(200)
      await expect(page.getByText('Loading task history…')).toHaveCount(0, { timeout: 10_000 })
      await expect(page.getByText(/Unable to load task history/)).toHaveCount(0)
      await expect(page.getByText('Select a valid project to view task history.')).toHaveCount(0)
      await expect(page.getByText(importedTask).first()).toBeVisible()
      const taskStatusValues = await page
        .getByRole('combobox', { name: /status/i })
        .locator('option')
        .evaluateAll(options => options.map(option => (option as HTMLOptionElement).value))
      expect(taskStatusValues).toEqual([
        '',
        'backlog',
        'ready',
        'in_progress',
        'review',
        'done',
        'blocked',
      ])
      expect(taskStatusValues).not.toContain('todo')

      await page.goto('/history/agents')
      await expect(page.getByRole('heading', { name: 'Agent History' })).toBeVisible()
      await expect(page.getByText('Loading agent history…')).toHaveCount(0, { timeout: 10_000 })
      await expect(page.getByText(/Unable to load agent history/)).toHaveCount(0)
      await expect(page.getByText('No agent history')).toBeVisible()
    })

    await test.step('diagnose uses live audit and selected-project reads', async () => {
      await page.goto('/ops/diagnose')
      await expect(page.getByText('Drift Detection')).toBeVisible()
      await expect(page.getByText('Audit Trail')).toBeVisible()
      await expect(page.getByText('Loading reconciliation proposals...')).toHaveCount(0, {
        timeout: 10_000,
      })
      await expect(page.getByText('Loading audit events...')).toHaveCount(0, {
        timeout: 10_000,
      })
      await expect(page.getByText('No pending reconciliation proposals')).toBeVisible()
      await expect(page.getByText('No events found')).toBeVisible()
    })

    await test.step('analytics renders empty observations as empty, not loading', async () => {
      await page.goto('/analytics')
      await expect(page.getByRole('heading', { name: 'Analytics' })).toBeVisible()
      await expect(page.getByText('No agent utilization data yet.')).toBeVisible({
        timeout: 10_000,
      })
      await expect(page.getByText('Bottlenecks', { exact: true })).toBeVisible()
      await expect(page.getByText('Completion Trends', { exact: true })).toBeVisible()
      await expect(page.getByText('Queue Depth', { exact: true })).toBeVisible()
      await expect(
        page.getByText(
          'No hook execution data yet. Hook metrics populate after lifecycle hooks run.',
        ),
      ).toBeVisible()
      await expect(
        page.getByText(
          'No session data yet. Session metrics populate after opencode sessions are captured.',
        ),
      ).toBeVisible()
      await expect(page.locator('main .animate-spin')).toHaveCount(0)
    })

    await test.step('templates resolve through the public Convex function', async () => {
      await page.goto('/templates')
      await expect(page.getByText('Loading project templates...')).toHaveCount(0, {
        timeout: 10_000,
      })
      await expect(page.getByText('Project templates are unavailable.')).toHaveCount(0)
      await expect(page.getByText('No project templates yet.')).toBeVisible()
    })

    await test.step('unknown routes remain visible and recoverable', async () => {
      await page.goto(unknownPath)
      await expect(page).toHaveURL(new RegExp(`${unknownPath}$`))
      await expect(page.getByRole('heading', { name: 'Page not found' })).toBeVisible()
      await expect(page.getByText(unknownPath, { exact: true })).toBeVisible()
      await expect(page.getByRole('link', { name: 'Back to Portfolio' })).toBeVisible()
    })

    await expect.poll(() => convexErrors).toEqual([])
    expect(failedResponses).toEqual([])
    expect(pageErrors).toEqual([])
    expect(consoleErrors).toEqual([])
    expect(forbiddenMutations).toEqual([])
  })
})
