import { expect, test } from '@playwright/test'
import { seedScenario } from './helpers/seed'

test.describe('Performance Panel', () => {
  test('Performance tab renders chart on project page', async ({ page }) => {
    const app = await seedScenario(page, 'demo')

    await page.route('**/api/performance/employee-performance**', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            baselines: [
              {
                employeeId: 'emp-1',
                projectSlug: 'demo-project',
                taskKind: 'feature',
                avgDurationMs: 120000,
                p50DurationMs: 110000,
                p95DurationMs: 200000,
                completionRate: 0.85,
                sampleCount: 10,
                windowStart: Date.now() - 7 * 86400000,
                windowEnd: Date.now(),
              },
            ],
            runs: [],
          },
          message: undefined,
        }),
      })
    })

    await page.goto('/project/demo-project')
    await expect(page.getByText('Demo Project')).toBeVisible()

    await page.getByRole('button', { name: 'Performance' }).click()
    await expect(page.getByTestId('performance-bar-chart')).toBeVisible()

    await app.assertNoRuntimeErrors()
  })
})
