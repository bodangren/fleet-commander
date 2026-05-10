import { expect, test } from '@playwright/test'
import { setupMockApp } from './helpers/mockApp'

test.describe('Blockers Page', () => {
  test('renders blocked tasks and open issues across projects', async ({ page }) => {
    const app = await setupMockApp(page)
    await page.goto('/blockers')

    await expect(page.getByRole('heading', { name: 'Blockers' })).toBeVisible()
    await expect(page.getByText('BLOCKED TASKS')).toBeVisible()
    await expect(page.getByText('OPEN ISSUES')).toBeVisible()

    await expect(page.getByText('Investigate dependency parser bug')).toBeVisible()
    await expect(page.getByText('Parser bug blocks deploy')).toBeVisible()

    await expect(page.getByText('1 TASK')).toBeVisible()
    await expect(page.getByText('1 ISSUE')).toBeVisible()

    await app.assertNoRuntimeErrors()
  })

  test('filter tabs switch between blocked tasks and issues views', async ({ page }) => {
    const app = await setupMockApp(page)
    await page.goto('/blockers')

    await page.getByRole('button', { name: 'blocked' }).click()
    await expect(page.getByText('BLOCKED TASKS')).toBeVisible()
    await expect(page.getByText('OPEN ISSUES')).not.toBeVisible()

    await page.getByRole('button', { name: 'issues' }).click()
    await expect(page.getByText('OPEN ISSUES')).toBeVisible()
    await expect(page.getByText('BLOCKED TASKS')).not.toBeVisible()

    await app.assertNoRuntimeErrors()
  })

  test('sidebar link navigates to blockers page', async ({ page }) => {
    const app = await setupMockApp(page)
    await page.goto('/')

    await page.getByRole('link', { name: 'Blockers' }).click()
    await expect(page).toHaveURL(/\/blockers$/)
    await expect(page.getByRole('heading', { name: 'Blockers' })).toBeVisible()

    await app.assertNoRuntimeErrors()
  })
})