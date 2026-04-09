import { expect, test } from '@playwright/test'
import { setupMockApp } from './helpers/mockApp'

test.describe('Settings Page', () => {
  test('save settings persists updated values through API', async ({ page }) => {
    const app = await setupMockApp(page)
    await page.goto('/settings')

    await expect(page.getByRole('heading', { level: 2, name: 'Settings' })).toBeVisible()
    await page.getByPlaceholder('e.g. senior-frontend').fill('principal-architect')
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
