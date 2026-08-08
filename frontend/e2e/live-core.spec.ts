import { expect, test } from '@playwright/test'

const liveProjectSlug = process.env.LIVE_PROJECT_SLUG ?? 'reading-advantage-llm-benchmark'
const firstImportedTask = 'Write schema validation tests for FrontendTask type'

test.describe('Live core workflow', () => {
  test('@live real backend serves every repaired workflow', async ({ page }) => {
    test.setTimeout(2 * 60 * 1000)
    const automaticImports: string[] = []
    const qualityRequests: string[] = []
    const failedCoreResponses: string[] = []
    page.on('request', request => {
      const url = new URL(request.url())
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
      await projectLink.click()
      await expect(page).toHaveURL(new RegExp(`/project/${encodeURIComponent(liveProjectSlug)}$`))
      await expect(page.getByText(firstImportedTask).first()).toBeVisible({ timeout: 15_000 })
      await expect(page.getByText('Loading project board...')).toHaveCount(0)
      await expect(page.getByText('Load error')).toHaveCount(0)
      await expect(page.getByText('Selected from the imported project catalog.')).toBeVisible()
    })

    await test.step('dashboard returns real data instead of hanging', async () => {
      await page.goto('/')
      await expect(page.locator('[data-realtime-ready="true"]')).toBeVisible({ timeout: 15_000 })
      await expect(page.getByText('Loading dashboard...')).toHaveCount(0)
    })

    await test.step('planning renders the imported backlog honestly', async () => {
      await page.goto('/sprint-planning')
      await expect(page.getByRole('heading', { name: 'Sprint Planning' })).toBeVisible()
      await expect(page.getByText(firstImportedTask)).toBeVisible({ timeout: 15_000 })
      await expect(page.getByText('Loading recommendations...')).toHaveCount(0)
      await expect(page.getByText('Load error')).toHaveCount(0)
      await expect(page.getByRole('button', { name: 'Start Sprint' })).toBeVisible()
    })

    await test.step('board settles for the imported project at any honest sprint state', async () => {
      await page.goto('/board')
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
      const harnessResponse = page.waitForResponse(response => {
        const url = new URL(response.url())
        return response.request().method() === 'GET' && url.pathname === '/api/harnesses'
      })
      await page.goto('/harnesses')
      expect((await harnessResponse).ok()).toBe(true)
      await expect(page.getByRole('heading', { name: 'Pi Provider Catalog' })).toBeVisible()
      await expect
        .poll(
          async () => {
            const catalogCount = await page.getByText('pi', { exact: true }).count()
            const loadingCount = await page.getByText('Loading Pi provider catalog...').count()
            const errorCount = await page.getByText(/Unable to load Pi provider catalog:/).count()
            return catalogCount > 0 && loadingCount === 0 && errorCount === 0
          },
          { timeout: 15_000 },
        )
        .toBe(true)
      await expect(page.getByText('pi', { exact: true }).first()).toBeVisible()
      await expect(page.getByRole('link', { name: 'Add Custom Harness' })).toHaveCount(0)
      await expect(page.getByRole('link', { name: 'Edit' })).toHaveCount(0)

      for (const editorPath of ['/harnesses/new', '/harnesses/minimax-cn-coding-plan/edit']) {
        await page.goto(editorPath)
        await expect(page).toHaveURL(/\/harnesses$/)
        await expect(page.getByRole('heading', { name: 'Pi Provider Catalog' })).toBeVisible()
        await expect(page.getByText(/New Harness|Edit Harness:/)).toHaveCount(0)
      }
    })

    await test.step('quality routes use the imported slug, never demo-project', async () => {
      await page.goto('/settings/quality')
      await expect(page.getByRole('heading', { name: 'Quality' })).toBeVisible()
      await expect(page.getByRole('heading', { name: 'Quality workflow' })).toBeVisible({
        timeout: 15_000,
      })
      await expect
        .poll(() => qualityRequests.some(path => path.includes(liveProjectSlug)), {
          timeout: 15_000,
        })
        .toBe(true)
      await page.goto('/ops/quality')
      await expect(page.getByText(`Project: ${liveProjectSlug}`)).toBeVisible({ timeout: 15_000 })
      await expect(page.getByText('Loading imported projects...')).toHaveCount(0)
      expect(qualityRequests.some(path => path.includes('demo-project'))).toBe(false)
    })

    expect(automaticImports).toEqual([])
    expect(failedCoreResponses).toEqual([])
  })
})
