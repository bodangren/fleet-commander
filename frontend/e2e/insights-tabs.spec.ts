import { expect, test } from '@playwright/test'
import { setupMockApp } from './helpers/mockApp'

test.describe('Insights Tabs', () => {
  test('page loads with analytics tab active', async ({ page }) => {
    await setupMockApp(page)
    await page.goto('/insights/analytics')
    await page.waitForLoadState('networkidle')

    await expect(page).toHaveURL(/\/insights\/analytics/)

    const analyticsTab = page.getByRole('tab', { name: /Analytics/i })
    await expect(analyticsTab).toHaveAttribute('aria-selected', 'true')
  })

  test('clicking Performance tab updates URL', async ({ page }) => {
    await setupMockApp(page)
    await page.goto('/insights/analytics')
    await page.waitForLoadState('networkidle')

    await page.getByRole('tab', { name: /Performance/i }).click()
    await expect(page).toHaveURL(/\/insights\/performance/)

    const performanceTab = page.getByRole('tab', { name: /Performance/i })
    await expect(performanceTab).toHaveAttribute('aria-selected', 'true')
  })

  test('clicking Costs tab updates URL', async ({ page }) => {
    await setupMockApp(page)
    await page.goto('/insights/analytics')
    await page.waitForLoadState('networkidle')

    await page.getByRole('tab', { name: /Costs/i }).click()
    await expect(page).toHaveURL(/\/insights\/costs/)

    const costsTab = page.getByRole('tab', { name: /Costs/i })
    await expect(costsTab).toHaveAttribute('aria-selected', 'true')
  })

  test('back button preserves tab state', async ({ page }) => {
    await setupMockApp(page)
    await page.goto('/insights/analytics')
    await page.waitForLoadState('networkidle')

    await page.getByRole('tab', { name: /Performance/i }).click()
    await expect(page).toHaveURL(/\/insights\/performance/)

    await page.goBack()
    await expect(page).toHaveURL(/\/insights\/analytics/)

    const analyticsTab = page.getByRole('tab', { name: /Analytics/i })
    await expect(analyticsTab).toHaveAttribute('aria-selected', 'true')
  })
})
