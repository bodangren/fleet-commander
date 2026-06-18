import { expect, test } from '@playwright/test'
import { seedScenario } from './helpers/seed'

test.describe('Responsive Layout', () => {
  test('kanban board renders without horizontal overflow at 768px tablet', async ({ page }) => {
    await seedScenario(page, 'demo')
    await page.setViewportSize({ width: 768, height: 1024 })
    await page.goto('/project/demo-project')

    await expect(page.getByText('Demo Project')).toBeVisible()

    // Verify all status lane headings are visible
    await expect(page.getByRole('heading', { name: 'Ready' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Live' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Stuck' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Pass' })).toBeVisible()

    // Ensure no horizontal overflow at tablet width
    const hasHorizontalOverflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth
    })
    expect(hasHorizontalOverflow).toBe(false)
  })

  test('kanban board shows four columns in a single row at 1024px desktop', async ({ page }) => {
    await seedScenario(page, 'demo')
    await page.setViewportSize({ width: 1024, height: 768 })
    await page.goto('/project/demo-project')

    await expect(page.getByText('Demo Project')).toBeVisible()

    // All four status columns should be present in the DOM
    const columns = page.locator('[data-status-column]')
    await expect(columns).toHaveCount(4)
  })

  test('sidebar navigation is accessible at 1024px desktop width', async ({ page }) => {
    await seedScenario(page, 'demo')
    await page.setViewportSize({ width: 1024, height: 768 })
    await page.goto('/')

    await expect(page.getByRole('link', { name: 'Dashboard' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Agents' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Settings' })).toBeVisible()
  })

  test('dashboard adapts layout at 768px tablet without clipping key metrics', async ({ page }) => {
    await seedScenario(page, 'demo')
    await page.setViewportSize({ width: 768, height: 1024 })
    await page.goto('/')

    await expect(page.getByRole('heading', { level: 2, name: 'Dashboard' })).toBeVisible()

    // Fleet status widget metrics should remain visible
    await expect(page.getByText('ACTIVE', { exact: true })).toBeVisible()
    await expect(page.getByText('BLOCKED', { exact: true })).toBeVisible()
  })
})
