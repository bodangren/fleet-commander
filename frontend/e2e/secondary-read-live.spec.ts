import { expect, test } from '@playwright/test'

const importedTask = 'Task: Full test suite and build'
const unknownPath = '/this-route-does-not-exist'

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
      if (
        response.status() >= 400 &&
        (url.pathname.startsWith('/api/') || url.port === '3210')
      ) {
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
      await page.goto('/history/sprints')
      await expect(page.getByRole('heading', { name: 'Sprint History' })).toBeVisible()
      await expect(page.getByText('Loading sprint history…')).toHaveCount(0, { timeout: 10_000 })
      await expect(page.getByText(/Unable to load sprint history/)).toHaveCount(0)
      await expect(page.getByText('No sprint history')).toBeVisible()

      await page.goto('/history/tasks')
      await expect(page.getByRole('heading', { name: 'Task History' })).toBeVisible()
      await expect(page.getByText('Loading task history…')).toHaveCount(0, { timeout: 10_000 })
      await expect(page.getByText(/Unable to load task history/)).toHaveCount(0)
      await expect(page.getByText(importedTask)).toBeVisible()

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
      await expect(page.getByText('No bottleneck data yet.')).toHaveCount(0)
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
