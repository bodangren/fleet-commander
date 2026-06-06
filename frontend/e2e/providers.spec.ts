import { expect, test } from '@playwright/test'
import { setupMockApp } from './helpers/mockApp'

/**
 * Light Playwright spec for the /providers dashboard (TD-235 / provider_health_resilience
 * Phase 4 and Phase 6 verification follow-up, see
 * `measure/tracks/provider_health_resilience_20260605/test-strategy.md` §1).
 *
 * Asserts the page contract end-to-end via the mocked API:
 *   - Provider cards render for every configured provider.
 *   - Health badges use the `healthStatus` field (not the operational `status`).
 *   - An unhealthy transition surfaces a failure toast.
 */
test.describe('Providers Page', () => {
  test('renders provider cards with health badges for each provider', async ({ page }) => {
    const app = await setupMockApp(page)
    await page.goto('/providers')

    await expect(page.getByRole('heading', { name: 'LLM Providers' })).toBeVisible()

    await expect(page.getByText('openai', { exact: true }).first()).toBeVisible()
    await expect(page.getByText('anthropic', { exact: true }).first()).toBeVisible()

    await expect(page.getByText('Healthy', { exact: true })).toBeVisible()
    await expect(page.getByText('Unhealthy', { exact: true })).toBeVisible()

    await app.assertNoRuntimeErrors()
  })

  test('unhealthy provider triggers an error toast', async ({ page }) => {
    const app = await setupMockApp(page)
    await page.goto('/providers')

    await expect(page.getByRole('heading', { name: 'LLM Providers' })).toBeVisible()

    const toasts = page.locator('.text-red-200')
    await expect(toasts.first()).toBeVisible({ timeout: 5_000 })
    const toastText = (await toasts.first().textContent())?.toLowerCase() ?? ''
    expect(toastText).toContain('unhealthy')

    await app.assertNoRuntimeErrors()
  })

  test('sidebar Providers link navigates to the providers dashboard', async ({ page }) => {
    const app = await setupMockApp(page)
    await page.goto('/')

    await page.getByRole('link', { name: 'Providers', exact: true }).click()
    await expect(page).toHaveURL(/\/providers$/)
    await expect(page.getByRole('heading', { name: 'LLM Providers' })).toBeVisible()

    await app.assertNoRuntimeErrors()
  })
})
