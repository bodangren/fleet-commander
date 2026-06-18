import { test, expect } from '@playwright/test'
import { seedScenario } from './helpers/seed'

test.describe('History Views Navigation', () => {
  test('navigates to Sprint History and sees the page title', async ({ page }) => {
    const app = await seedScenario(page, 'demo')
    await page.goto('/history/sprints')

    await expect(page.getByRole('heading', { name: 'Sprint History' })).toBeVisible()
    await app.assertNoRuntimeErrors()
  })

  test('navigates to Agent History and sees the page title', async ({ page }) => {
    const app = await seedScenario(page, 'demo')
    await page.goto('/history/agents')

    await expect(page.getByRole('heading', { name: 'Agent History' })).toBeVisible()
    await app.assertNoRuntimeErrors()
  })

  test('navigates to Task History and sees the page title', async ({ page }) => {
    const app = await seedScenario(page, 'demo')
    await page.goto('/history/tasks')

    await expect(page.getByRole('heading', { name: 'Task History' })).toBeVisible()
    await app.assertNoRuntimeErrors()
  })

  test('drill-down from sprint list to sprint detail and back', async ({ page }) => {
    const app = await seedScenario(page, 'demo')
    await page.goto('/history/sprints')

    await expect(page.getByRole('heading', { name: 'Sprint History' })).toBeVisible()

    // Select first sprint row to open detail view
    const firstRow = page.locator('table tbody tr').first()
    await firstRow.click()

    // Detail view should show sprint name
    await expect(page.getByText('Sprint Alpha')).toBeVisible()

    // Click back to return to list
    await page.getByRole('button', { name: /back/i }).click()
    await expect(page.getByRole('heading', { name: 'Sprint History' })).toBeVisible()

    await app.assertNoRuntimeErrors()
  })

  test('drill-down from agent list to agent detail and back', async ({ page }) => {
    const app = await seedScenario(page, 'demo')
    await page.goto('/history/agents')

    await expect(page.getByRole('heading', { name: 'Agent History' })).toBeVisible()

    const firstRow = page.locator('table tbody tr').first()
    await firstRow.click()

    await expect(page.getByText('Alice')).toBeVisible()

    await page.getByRole('button', { name: /back/i }).click()
    await expect(page.getByRole('heading', { name: 'Agent History' })).toBeVisible()

    await app.assertNoRuntimeErrors()
  })

  test('task history search filters results', async ({ page }) => {
    const app = await seedScenario(page, 'demo')
    await page.goto('/history/tasks')

    await expect(page.getByRole('heading', { name: 'Task History' })).toBeVisible()

    const searchInput = page.getByPlaceholder(/search/i)
    await searchInput.fill('auth')

    // Only matching tasks should be visible
    await expect(page.getByText('Fix auth bug')).toBeVisible()

    await app.assertNoRuntimeErrors()
  })

  test('history views are responsive at tablet width', async ({ page }) => {
    const app = await seedScenario(page, 'demo')
    await page.setViewportSize({ width: 768, height: 1024 })
    await page.goto('/history/sprints')

    await expect(page.getByRole('heading', { name: 'Sprint History' })).toBeVisible()

    const hasHorizontalOverflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth
    })
    expect(hasHorizontalOverflow).toBe(false)

    await app.assertNoRuntimeErrors()
  })
})
