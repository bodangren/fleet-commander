import { test, expect } from '@playwright/test'
import { seedScenario } from './helpers/seed'

test.describe('Agent Editor Page', () => {
  test('loads existing agent and saves changes', async ({ page }) => {
    const app = await seedScenario(page, 'demo')

    await page.route('**/api/harnesses', route => {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([{ layer: 'bundled', definition: { name: 'opencode' } }]),
      })
    })

    await page.route('**/api/harnesses/opencode/models', route => {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ models: ['gpt-5.4', 'gpt-5.4-mini'] }),
      })
    })

    await page.goto('/agents/architect/edit')

    await expect(page.getByLabel('Name')).toHaveValue('architect')
    await expect(page.getByLabel('Description')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Save Agent' })).toBeVisible()

    await page.getByRole('button', { name: 'Test Agent' }).click()
    await expect(page.getByText('Agent Dry Run: architect')).toBeVisible()
    await expect(page.getByText('Agent dry run complete.')).toBeVisible()

    await app.assertNoRuntimeErrors()
  })

  test('creates new agent with form validation', async ({ page }) => {
    const app = await seedScenario(page, 'demo')

    await page.route('**/api/harnesses', route => {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([{ layer: 'bundled', definition: { name: 'opencode' } }]),
      })
    })

    await page.goto('/agents/new/edit')

    await expect(page.getByText('New Agent', { exact: true })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Save Agent' })).toBeVisible()

    await page.getByLabel('Name').fill('test-agent')
    await page.getByLabel('Description').fill('A test agent for e2e')

    await app.assertNoRuntimeErrors()
  })
})
