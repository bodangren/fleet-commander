import { expect, test } from '@playwright/test'
import { setupMockApp } from './helpers/mockApp'

test.describe('Ops Console Page', () => {
  test('renders tabs and switches content', async ({ page }) => {
    const app = await setupMockApp(page)
    await page.goto('/ops')

    await expect(page.getByTestId('ops-page')).toBeVisible()
    await expect(page.getByText('Queue Health', { exact: true })).toBeVisible()

    await page.getByTestId('tab-fleet').click()
    await expect(page.getByText('Fleet Health', { exact: true })).toBeVisible()

    await page.getByTestId('tab-timeline').click()
    await expect(page.getByText('Dispatch Timeline', { exact: true })).toBeVisible()

    await page.getByTestId('tab-governance').click()
    await expect(page.getByTestId('governance')).toBeVisible()

    await app.assertNoRuntimeErrors()
  })

  test('keyboard shortcuts 1–4 switch tabs', async ({ page }) => {
    const app = await setupMockApp(page)
    await page.goto('/ops')

    await page.getByTestId('ops-page').click()
    await page.keyboard.press('2')
    await expect(page.getByText('Fleet Health', { exact: true })).toBeVisible()

    await page.keyboard.press('3')
    await expect(page.getByText('Dispatch Timeline', { exact: true })).toBeVisible()

    await page.keyboard.press('4')
    await expect(page.getByTestId('governance')).toBeVisible()

    await page.keyboard.press('1')
    await expect(page.getByText('Queue Health', { exact: true })).toBeVisible()

    await app.assertNoRuntimeErrors()
  })

  test('sidebar link navigates to ops', async ({ page }) => {
    const app = await setupMockApp(page)
    await page.goto('/')

    await page.getByRole('link', { name: 'Ops' }).click()
    await expect(page).toHaveURL(/\/ops$/)
    await expect(page.getByText('Ops Console')).toBeVisible()

    await app.assertNoRuntimeErrors()
  })
})
