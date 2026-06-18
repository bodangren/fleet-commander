import { expect, test } from '@playwright/test'
import { seedScenario } from './helpers/seed'

test.describe('Settings Page', () => {
  test('settings sidebar navigation reaches every section', async ({ page }) => {
    const app = await seedScenario(page, 'demo')

    await page.goto('/settings')
    await expect(page).toHaveURL(/\/settings\/app$/)
    await expect(page.getByText('General')).toBeVisible()

    const settingsNav = page.getByLabel('Settings sections')
    await settingsNav.getByRole('link', { name: 'Notifications' }).click()
    await expect(page).toHaveURL(/\/settings\/notifications$/)
    await expect(page.getByText('Channel preferences and delivery settings.')).toBeVisible()

    await settingsNav.getByRole('link', { name: 'Agents' }).click()
    await expect(page).toHaveURL(/\/settings\/agents$/)
    await expect(page.getByRole('heading', { level: 3, name: 'Agent Defaults' })).toBeVisible()

    await settingsNav.getByRole('link', { name: 'Profile' }).click({ force: true })
    await expect(page).toHaveURL(/\/settings\/profile$/)
    await expect(page.getByRole('heading', { level: 3, name: 'Profile' })).toBeVisible()

    await app.assertNoRuntimeErrors()
  })

  test('settings agents and profile deep links resolve on cold load', async ({ page }) => {
    const app = await seedScenario(page, 'demo')

    await page.goto('/settings/agents', { waitUntil: 'domcontentloaded' })
    await expect(page.getByRole('heading', { level: 3, name: 'Agent Defaults' })).toBeVisible()
    await page.goto('/settings/profile', { waitUntil: 'domcontentloaded' })
    await expect(page.getByRole('heading', { level: 3, name: 'Profile' })).toBeVisible()

    await app.assertNoRuntimeErrors()
  })

  test('save settings persists updated values through API', async ({ page }) => {
    const app = await seedScenario(page, 'demo')
    await page.goto('/settings')

    await expect(page).toHaveURL(/\/settings\/app$/)
    await expect(page.getByText('General')).toBeVisible()
    await page.getByLabel('Default Agent').selectOption('principal-architect')
    await page.getByRole('button', { name: 'Save Settings' }).click()
    await expect(page.getByText('Settings saved successfully.')).toBeVisible()

    expect(
      app.calls.some(
        call =>
          call.method === 'PUT' &&
          call.path === '/api/settings' &&
          (call.body as { general?: { defaultAgent?: string } })?.general?.defaultAgent ===
            'principal-architect',
      ),
    ).toBe(true)

    await app.assertNoRuntimeErrors()
  })
})
