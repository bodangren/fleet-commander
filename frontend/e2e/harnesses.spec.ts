import { test, expect } from '@playwright/test'
import { seedScenario } from './helpers/seed'

test.describe('Harness Management', () => {
  test('harness feature buttons navigate and execute discovery', async ({ page }) => {
    const app = await seedScenario(page, 'demo')
    await page.goto('/harnesses')

    await expect(page.getByRole('heading', { name: 'Harness Registry' })).toBeVisible()
    await page.getByRole('link', { name: 'Add Custom Harness' }).click()
    await expect(page).toHaveURL(/\/harnesses\/new$/)
    await expect(page.getByText('New Harness', { exact: true })).toBeVisible()

    await page.goto('/harnesses/opencode/edit')
    await expect(page.getByRole('button', { name: 'Save Harness' })).toBeVisible()
    await page.getByRole('button', { name: 'Test Discovery' }).click()
    await expect(page.getByText('Discovery: opencode')).toBeVisible()
    await expect(page.getByText('gpt-5.4', { exact: true })).toBeVisible()

    await app.assertNoRuntimeErrors()
  })
})
