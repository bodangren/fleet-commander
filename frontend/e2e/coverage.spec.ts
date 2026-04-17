import { expect, test } from '@playwright/test'
import { setupMockApp } from './helpers/mockApp'

test.describe('Coverage Tab', () => {
  test('Coverage tab shows "No coverage data" when no records exist', async ({ page }) => {
    const app = await setupMockApp(page)
    await page.goto('/project/demo-project')

    await page.getByRole('button', { name: 'Coverage' }).click()
    await expect(page.getByText('No coverage data', { exact: true })).toBeVisible()

    await app.assertNoRuntimeErrors()
  })

  test('Coverage tab shows chart when coverage history exists', async ({ page }) => {
    const app = await setupMockApp(page)
    await page.goto('/project/demo-project')

    await page.getByRole('button', { name: 'Coverage' }).click()
    await expect(page.getByText('Coverage Trend')).toBeVisible()

    await app.assertNoRuntimeErrors()
  })
})