import { expect, test } from '@playwright/test'
import { seedScenario } from './helpers/seed'

test.describe('Insights Smoke Tests', () => {
  test('analytics tab loads without runtime errors', async ({ page }) => {
    const app = await seedScenario(page, 'demo')
    await page.goto('/analytics')
    await page.waitForLoadState('networkidle')

    await expect(page).toHaveURL(/\/analytics/)
    await expect(page.getByRole('heading', { name: 'Analytics' })).toBeVisible()

    await app.assertNoRuntimeErrors()
  })

  test('performance tab loads without runtime errors', async ({ page }) => {
    const app = await seedScenario(page, 'demo')
    await page.goto('/performance')
    await page.waitForLoadState('networkidle')

    await expect(page).toHaveURL(/\/performance/)
    await expect(page.getByRole('heading', { name: 'Performance' })).toBeVisible()

    await app.assertNoRuntimeErrors()
  })

  test('costs tab loads without runtime errors', async ({ page }) => {
    const app = await seedScenario(page, 'demo')
    await page.goto('/costs')
    await page.waitForLoadState('networkidle')

    await expect(page).toHaveURL(/\/costs/)
    await expect(page.getByRole('heading', { name: 'Costs' })).toBeVisible()

    await app.assertNoRuntimeErrors()
  })

  test('switching tabs does not produce runtime errors', async ({ page }) => {
    const app = await seedScenario(page, 'demo')
    await page.goto('/analytics')
    await page.waitForLoadState('networkidle')

    await page.goto('/performance')
    await expect(page).toHaveURL(/\/performance/)

    await page.goto('/costs')
    await expect(page).toHaveURL(/\/costs/)

    await page.goto('/analytics')
    await expect(page).toHaveURL(/\/analytics/)

    await app.assertNoRuntimeErrors()
  })
})
