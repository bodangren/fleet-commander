import { expect, test } from '@playwright/test'
import { setupMockApp } from './helpers/mockApp'

test.describe('Analytics Dashboard', () => {
  test('page loads', async ({ page }) => {
    await setupMockApp(page)
    await page.goto('/analytics')

    // Wait for network to settle
    await page.waitForLoadState('networkidle')

    // Just verify we're on the right page and it loaded
    await expect(page).toHaveURL(/\/analytics/)
  })
})
