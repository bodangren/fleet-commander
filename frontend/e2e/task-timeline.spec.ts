import { test, expect } from '@playwright/test'
import { seedScenario } from './helpers/seed'

test.describe('TaskTimelinePage', () => {
  test('shows no run contract state when run contract is null', async ({ page }) => {
    const app = await seedScenario(page, 'demo')

    await page.goto('/tasks/task-123/timeline')

    await expect(page.getByText('No run contract — legacy task')).toBeVisible()
    await expect(page.getByText('Task task-123 predates the Run Contract rollout')).toBeVisible()
    await expect(page.getByRole('link', { name: 'Back to dashboard' })).toBeVisible()

    await app.assertNoRuntimeErrors()
  })

  test('navigates back to dashboard from no run contract state', async ({ page }) => {
    const app = await seedScenario(page, 'demo')

    await page.goto('/tasks/task-123/timeline')

    await expect(page.getByText('No run contract — legacy task')).toBeVisible()

    await page.getByRole('link', { name: 'Back to dashboard' }).click()

    await expect(page).toHaveURL('/')

    await app.assertNoRuntimeErrors()
  })
})
