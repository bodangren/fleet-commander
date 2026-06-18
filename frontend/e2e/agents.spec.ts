import { test, expect } from '@playwright/test'
import { seedScenario } from './helpers/seed'

test.describe('Agent Management', () => {
  test('agent feature buttons navigate and trigger dry runs', async ({ page }) => {
    const app = await seedScenario(page, 'demo')
    await page.goto('/agents')

    await expect(page.getByRole('heading', { name: 'Agent Registry' })).toBeVisible()
    await page.getByRole('link', { name: 'Add Agent' }).click()
    await expect(page).toHaveURL(/\/agents\/new\/edit$/)
    await expect(page.getByText('New Agent', { exact: true })).toBeVisible()

    await page.goto('/agents/architect/edit')
    await expect(page.getByLabel('Name')).toHaveValue('architect')
    await expect(page.getByRole('button', { name: 'Save Agent' })).toBeVisible()
    await page.getByRole('button', { name: 'Test Agent' }).click()
    await expect(page.getByText('Agent Dry Run: architect')).toBeVisible()
    await expect(page.getByText('Agent dry run complete.')).toBeVisible()

    await app.assertNoRuntimeErrors()
  })
})
