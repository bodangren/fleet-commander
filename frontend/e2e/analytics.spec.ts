import { expect, test } from '@playwright/test'
import { seedScenario } from './helpers/seed'

test.describe('Analytics Dashboard', () => {
  test('page loads', async ({ page }) => {
    await seedScenario(page, 'demo')
    await page.goto('/analytics')

    // Wait for network to settle
    await page.waitForLoadState('networkidle')

    // Just verify we're on the right page and it loaded
    await expect(page).toHaveURL(/\/analytics/)
  })
})
