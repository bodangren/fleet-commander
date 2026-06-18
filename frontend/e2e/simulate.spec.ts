import { test, expect } from '@playwright/test'
import { seedScenario } from './helpers/seed'

test.describe('Simulate Page', () => {
  test('renders form with default weights and runs simulation', async ({ page }) => {
    const app = await seedScenario(page, 'demo')

    await page.route('**/api/policy/simulate', route => {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          totalDispatches: 42,
          throughputDelta: 0.15,
          costDelta: -0.08,
          passRateDelta: 0.05,
          retryRateDelta: -0.12,
          coverageRegressionDelta: 0.02,
          starvationMaxAgeDelta: -0.05,
          rejectionRate: 0.15,
          misconfigurationWarning: false,
          divergences: [
            {
              historicalChoice: 'architect',
              simulatedChoice: 'frontend',
              matched: false,
              deltaImpact: 0.3,
            },
          ],
        }),
      })
    })

    await page.goto('/ops/simulate')

    await expect(page.getByText('Policy Simulation')).toBeVisible()
    await expect(page.getByTestId('window-days-input')).toHaveValue('7')
    await expect(page.getByTestId('weights-json-input')).toBeVisible()

    await page.getByTestId('run-simulation-button').click()

    await expect(page.getByTestId('simulation-report')).toBeVisible()
    await expect(page.getByText('42 dispatches analyzed')).toBeVisible()
    await expect(page.getByTestId('delta-throughput')).toContainText('+15.0%')
    await expect(page.getByTestId('delta-cost')).toContainText('-8.0%')
    await expect(page.getByTestId('divergences-count')).toContainText('1')
    await expect(page.getByTestId('rejection-rate')).toContainText('15.0%')

    await app.assertNoRuntimeErrors()
  })

  test('shows misconfiguration warning when flagged', async ({ page }) => {
    const app = await seedScenario(page, 'demo')

    await page.route('**/api/policy/simulate', route => {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          totalDispatches: 10,
          throughputDelta: 0,
          costDelta: 0,
          passRateDelta: 0,
          retryRateDelta: 0,
          coverageRegressionDelta: 0,
          starvationMaxAgeDelta: 0,
          rejectionRate: 0.35,
          misconfigurationWarning: true,
          divergences: [],
        }),
      })
    })

    await page.goto('/ops/simulate')

    await page.getByTestId('run-simulation-button').click()

    await expect(page.getByTestId('misconfiguration-warning')).toBeVisible()
    await expect(page.getByText('>25% of historical tasks')).toBeVisible()

    await app.assertNoRuntimeErrors()
  })
})
