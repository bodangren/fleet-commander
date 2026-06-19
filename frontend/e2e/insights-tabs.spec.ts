import { expect, test } from '@playwright/test'
import { seedScenario } from './helpers/seed'

test.describe('Insights Pages', () => {
  test('page loads with analytics heading', async ({ page }) => {
    await seedScenario(page, 'demo')
    await page.goto('/analytics')
    await page.waitForLoadState('networkidle')

    await expect(page).toHaveURL(/\/analytics/)

    await expect(page.getByRole('heading', { name: 'Analytics' })).toBeVisible()
  })

  test('navigating to performance page updates URL', async ({ page }) => {
    await seedScenario(page, 'demo')
    await page.goto('/analytics')
    await page.waitForLoadState('networkidle')

    await page.goto('/performance')
    await expect(page).toHaveURL(/\/performance/)

    await expect(page.getByRole('heading', { name: 'Performance' })).toBeVisible()
  })

  test('navigating to costs page updates URL', async ({ page }) => {
    await seedScenario(page, 'demo')
    await page.goto('/analytics')
    await page.waitForLoadState('networkidle')

    await page.goto('/costs')
    await expect(page).toHaveURL(/\/costs/)

    await expect(page.getByRole('heading', { name: 'Costs' })).toBeVisible()
  })

  test('back button preserves page state', async ({ page }) => {
    await seedScenario(page, 'demo')
    await page.goto('/analytics')
    await page.waitForLoadState('networkidle')

    await page.goto('/performance')
    await expect(page).toHaveURL(/\/performance/)

    await page.goBack()
    await expect(page).toHaveURL(/\/analytics/)

    await expect(page.getByRole('heading', { name: 'Analytics' })).toBeVisible()
  })
})
