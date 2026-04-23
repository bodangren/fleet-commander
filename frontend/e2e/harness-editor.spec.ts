import { test, expect } from '@playwright/test'
import { setupMockApp } from './helpers/mockApp'

test.describe('Harness Editor Page', () => {
  test('loads existing harness and saves changes', async ({ page }) => {
    const app = await setupMockApp(page)

    await page.goto('/harnesses/opencode/edit')

    await expect(page.getByText('Edit Harness: opencode')).toBeVisible()
    await expect(page.getByLabel('Name')).toHaveValue('opencode')
    await expect(page.getByRole('button', { name: 'Save Harness' })).toBeVisible()

    await page.getByRole('button', { name: 'Test Discovery' }).click()
    await expect(page.getByText('Discovered models')).toBeVisible()

    await app.assertNoRuntimeErrors()
  })

  test('creates new harness with form fields', async ({ page }) => {
    const app = await setupMockApp(page)

    await page.goto('/harnesses/new')

    await expect(page.getByText('New Harness', { exact: true })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Save Harness' })).toBeVisible()

    await page.getByLabel('Name').fill('test-harness')
    await page.getByLabel('Binary').fill('test-binary')

    await app.assertNoRuntimeErrors()
  })
})
