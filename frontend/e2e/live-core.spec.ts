import { expect, test } from '@playwright/test'

const liveProjectSlug = process.env.LIVE_PROJECT_SLUG ?? 'reading-advantage-llm-benchmark'
const firstImportedTask = 'Write schema validation tests for FrontendTask type'

test.describe('Live core workflow', () => {
  test('@live real backend serves every repaired workflow', async ({ page }) => {
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
      await expect(page.getByText('Loading project board...')).toHaveCount(0, { timeout: 10_000 })
      await expect(page.getByText('Load error')).toHaveCount(0)
      await expect(page.getByText(firstImportedTask).first()).toBeVisible()
      await expect(page.getByText('Selected from the imported project catalog.')).toBeVisible()
    })

    await test.step('dashboard returns real data instead of hanging', async () => {
      await page.goto('/')
      await expect(page.getByText('Loading dashboard...')).toHaveCount(0, { timeout: 10_000 })
      await expect(page.locator('[data-realtime-ready="true"]')).toBeVisible()
    })

    await test.step('planning renders the imported backlog honestly', async () => {
      await page.goto('/sprint-planning')
      await expect(page.getByRole('heading', { name: 'Sprint Planning' })).toBeVisible()
      await expect(page.getByText('Loading recommendations...')).toHaveCount(0, {
        timeout: 10_000,
      })
      await expect(page.getByText(firstImportedTask)).toBeVisible()
      await expect(page.getByText(/67 backlog tasks need an active agent/)).toBeVisible()
      await expect(page.getByRole('button', { name: 'Start Sprint' })).toBeDisabled()
    })

    await test.step('board shows the same project and an honest pre-sprint state', async () => {
      await page.goto('/board')
      await expect(page.getByRole('combobox', { name: 'Project' })).toContainText(liveProjectSlug)
      await expect(page.getByText('Loading board...')).toHaveCount(0, { timeout: 10_000 })
      await expect(page.getByText(/No sprints/)).toBeVisible()
      await expect(page.getByText('Select a sprint to view the board.')).toBeVisible()
    })

    await test.step('provider and performance routes leave loading states', async () => {
      await page.goto('/providers')
      await expect(page.getByRole('heading', { name: 'LLM Providers' })).toBeVisible()
      await expect(page.getByText('Loading providers...')).toHaveCount(0)
      await page.goto('/performance')
      await expect(page.getByRole('heading', { name: 'Phase Breakdown' })).toBeVisible({
        timeout: 10_000,
      })
      await expect(page.getByRole('cell', { name: '0ms' }).first()).toBeVisible()
    })

    await test.step('unavailable templates fail explicitly', async () => {
      await page.goto('/templates')
      await expect(page.getByText('Project templates are unavailable.')).toBeVisible({
        timeout: 10_000,
      })
      await page.getByRole('button', { name: 'Retry' }).click()
      await expect(page.getByText('Project templates are unavailable.')).toBeVisible({
        timeout: 10_000,
      })
      await expect(page.getByText('Loading project templates...')).toHaveCount(0)
    })

    await test.step('custom harness creation reaches the real editor', async () => {
      await page.goto('/harnesses')
      await page.getByRole('link', { name: 'Add Custom Harness' }).click()
      await expect(page).toHaveURL(/\/harnesses\/new$/)
      await expect(page.getByRole('heading', { name: 'New Harness' })).toBeVisible()
    })

    await test.step('quality routes use the imported slug, never demo-project', async () => {
      await page.goto('/settings/quality')
      await expect(page.getByRole('heading', { name: 'Quality' })).toBeVisible()
      await expect
        .poll(() => qualityRequests.some(path => path.includes(liveProjectSlug)))
        .toBe(true)
      await page.goto('/ops/quality')
      await expect(page.getByText('Loading imported projects...')).toHaveCount(0, {
        timeout: 10_000,
      })
      await expect(page.getByText(`Project: ${liveProjectSlug}`)).toBeVisible()
      expect(qualityRequests.some(path => path.includes('demo-project'))).toBe(false)
    })

    expect(automaticImports).toEqual([])
    expect(failedCoreResponses).toEqual([])
  })
})
