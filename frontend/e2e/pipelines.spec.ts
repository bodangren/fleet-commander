import { expect, test } from '@playwright/test'
import { seedScenario } from './helpers/seed'

test.describe('Pipelines Page', () => {
  test('trigger button starts a pipeline run', async ({ page }) => {
    const app = await seedScenario(page, 'demo')
    await page.goto('/pipelines')

    await expect(page.getByRole('heading', { level: 2, name: 'Pipelines' })).toBeVisible()
    await expect(page.getByText('nightly')).toBeVisible()

    await page.getByRole('button', { name: 'Trigger nightly' }).click()

    expect(
      app.calls.some(
        call => call.method === 'POST' && call.path === '/api/pipelines/nightly/trigger',
      ),
    ).toBe(true)

    await expect(page.getByText('running')).toBeVisible()
    await app.assertNoRuntimeErrors()
  })
})
