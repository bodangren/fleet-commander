import { expect, test } from '@playwright/test'
import { seedScenario } from './helpers/seed'

test.describe('Cross-route navigation and back-button', () => {
  test('portfolio project card navigates to project and browser back preserves portfolio state', async ({
    page,
  }) => {
    const app = await seedScenario(page, 'demo')

    await page.goto('/portfolio')
    await expect(page.getByRole('heading', { name: 'All Projects' })).toBeVisible()
    await page.getByPlaceholder('Search projects...').fill('Demo')
    await expect(page.getByText('1 project across your fleet')).toBeVisible()

    await page.getByRole('link', { name: /Demo Project/i }).click()
    await expect(page).toHaveURL(/\/project\/demo-project$/)
    await expect(page.getByRole('heading', { name: 'Demo Project' })).toBeVisible()

    await page.goBack()
    await expect(page).toHaveURL(/\/portfolio\?q=Demo$/)
    await expect(page.getByPlaceholder('Search projects...')).toHaveValue('Demo')
    await expect(page.getByRole('link', { name: /Demo Project/i })).toBeVisible()

    await app.assertNoRuntimeErrors()
  })

  test('direct project miss and settings index redirects resolve through real browser history', async ({
    page,
  }) => {
    const app = await seedScenario(page, 'demo')

    await page.goto('/project/non-existent-id')
    await expect(page).toHaveURL(/\/$/)

    await page.goto('/settings')
    await expect(page).toHaveURL(/\/settings\/app$/)
    await expect(page.getByText('General')).toBeVisible()

    await page.goto('/this/route/does/not/exist')
    await expect(page).toHaveURL(/\/$/)

    await app.assertNoRuntimeErrors()
  })
})
