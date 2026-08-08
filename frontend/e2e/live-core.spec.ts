import { expect, test } from '@playwright/test'

const liveProjectSlug = process.env.LIVE_PROJECT_SLUG

test.describe('Live core workflow', () => {
  test.skip(!liveProjectSlug, 'Set LIVE_PROJECT_SLUG to run against a real local stack')

  test('portfolio, dashboard, project, planning, and board share live state', async ({ page }) => {
    const automaticImports: string[] = []
    page.on('request', request => {
      if (
        request.method() === 'POST' &&
        new URL(request.url()).pathname === '/api/projects/scan-and-import'
      ) {
        automaticImports.push(request.url())
      }
    })

    await page.goto('/portfolio')
    const projectLink = page.locator(
      `a[href="/project/${encodeURIComponent(liveProjectSlug as string)}"]`,
    )
    await expect(projectLink).toBeVisible()

    await projectLink.click()
    await expect(page).toHaveURL(
      new RegExp(`/project/${encodeURIComponent(liveProjectSlug as string)}$`),
    )
    await expect(page.getByText('Loading project board...')).toHaveCount(0, { timeout: 10_000 })
    await expect(page.getByText('Load error')).toHaveCount(0)

    await page.goto('/')
    await expect(page.getByText('Loading dashboard...')).toHaveCount(0, { timeout: 10_000 })

    await page.goto('/sprint-planning')
    await expect(page.getByRole('heading', { name: 'Sprint Planning' })).toBeVisible()
    await expect(page.getByText('Loading recommendations...')).toHaveCount(0, { timeout: 10_000 })
    await expect(page.getByText(/No backlog tasks available/)).toHaveCount(0)

    await page.goto('/board')
    await expect(page.getByRole('combobox', { name: 'Project' })).toContainText(
      liveProjectSlug as string,
    )
    await expect(page.getByText('Loading board...')).toHaveCount(0, { timeout: 10_000 })

    expect(automaticImports).toEqual([])
  })
})
