import { test, expect } from '@playwright/test'
import { setupMockApp } from './helpers/mockApp'

test.describe('Dashboard Page', () => {
  test('sidebar navigation and project entry buttons open feature pages', async ({ page }) => {
    const app = await setupMockApp(page)
    await page.goto('/')

    await expect(page.getByRole('heading', { level: 2, name: 'Dashboard' })).toBeVisible()

    await page.getByRole('link', { name: 'Agents' }).click()
    await expect(page).toHaveURL(/\/agents$/)
    await expect(page.getByRole('heading', { level: 2, name: 'Agents' })).toBeVisible()

    await page.getByRole('link', { name: 'Harnesses' }).click()
    await expect(page).toHaveURL(/\/harnesses$/)
    await expect(page.getByRole('heading', { level: 2, name: 'Harnesses' })).toBeVisible()

    await page.getByRole('link', { name: 'Settings' }).click()
    await expect(page).toHaveURL(/\/settings$/)
    await expect(page.getByRole('heading', { level: 2, name: 'Settings' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Save Settings' })).toBeVisible()

    await page.getByRole('link', { name: 'Pipelines' }).click()
    await expect(page).toHaveURL(/\/pipelines$/)
    await expect(page.getByRole('heading', { level: 2, name: 'Pipelines' })).toBeVisible()

    await page.getByRole('link', { name: 'Dashboard' }).click()
    await expect(page).toHaveURL(/\/$/)

    await app.assertNoRuntimeErrors()
  })

  test('onboarding scan and import buttons work when no projects exist', async ({ page }) => {
    const app = await setupMockApp(page, { emptyProjects: true })
    await page.goto('/')

    await expect(page.getByText('Bring a workspace into Fleet Commander.')).toBeVisible()
    await page.getByLabel('Workspace Root').fill('/workspace')
    await page.getByRole('button', { name: 'Scan workspace' }).click()
    await expect(page.getByText('/workspace/demo-alpha')).toBeVisible()
    await expect(page.getByText('/workspace/demo-beta')).toBeVisible()
    await page.getByRole('button', { name: 'Import selected (2)' }).click()
    await expect(page.getByText('Imported 2 projects.')).toBeVisible()

    await app.assertNoRuntimeErrors()
  })
})
