import { expect, test } from '@playwright/test'
import { seedScenario } from './helpers/seed'

test.describe('Alerts Page', () => {
  test('renders alerts with severity badges and resolve action', async ({ page }) => {
    const app = await seedScenario(page, 'demo')
    await page.goto('/alerts')

    await expect(page.getByRole('heading', { name: 'Alerts' })).toBeVisible()
    await expect(page.getByText('Circuit breaker open for agent executor')).toBeVisible()
    await expect(page.getByText('Budget threshold at 80%')).toBeVisible()
    await expect(page.getByText('RESOLVED')).toBeVisible()

    await expect(page.getByRole('button', { name: 'RESOLVE' }).first()).toBeVisible()

    await app.assertNoRuntimeErrors()
  })

  test('severity filter shows only critical alerts', async ({ page }) => {
    const app = await seedScenario(page, 'demo')
    await page.goto('/alerts')

    await page.getByRole('button', { name: 'critical', exact: true }).click()

    await expect(page.getByText('3 TOTAL')).not.toBeVisible()

    await app.assertNoRuntimeErrors()
  })

  test('resolve action triggers API call', async ({ page }) => {
    const app = await seedScenario(page, 'demo')
    await page.goto('/alerts')

    await page.getByRole('button', { name: 'RESOLVE' }).first().click()

    expect(
      app.calls.some(
        call =>
          call.method === 'PATCH' &&
          call.path.match(/^\/api\/alerts\/[^/]+\/resolve$/),
      ),
    ).toBe(true)

    await app.assertNoRuntimeErrors()
  })

  test('sidebar link navigates to alerts page', async ({ page }) => {
    const app = await seedScenario(page, 'demo')
    await page.goto('/')

    await page.getByRole('link', { name: 'Alerts' }).click()
    await expect(page).toHaveURL(/\/alerts$/)
    await expect(page.getByRole('heading', { name: 'Alerts' })).toBeVisible()

    await app.assertNoRuntimeErrors()
  })
})