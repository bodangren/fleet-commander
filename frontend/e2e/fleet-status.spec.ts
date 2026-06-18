import { expect, test } from '@playwright/test'
import { seedScenario } from './helpers/seed'

test.describe('Fleet Status Widget', () => {
  test('dashboard shows fleet status metrics', async ({ page }) => {
    const app = await seedScenario(page, 'demo')
    await page.goto('/')

    await expect(page.getByText('ACTIVE', { exact: false })).toBeVisible()
    await expect(page.getByText('BLOCKED', { exact: false })).toBeVisible()
    await expect(page.getByText('OPEN_ISSUES', { exact: false })).toBeVisible()

    await app.assertNoRuntimeErrors()
  })

  test('blocked metric links to blockers page', async ({ page }) => {
    const app = await seedScenario(page, 'demo')
    await page.goto('/')

    const blockedLink = page.locator('a[href="/blockers"]').first()
    await expect(blockedLink).toBeVisible()

    await app.assertNoRuntimeErrors()
  })

  test('task card has timeline link on kanban board', async ({ page }) => {
    const app = await seedScenario(page, 'demo')
    await page.goto('/project/demo-project')

    await page.getByRole('button', { name: 'Kanban Board' }).click()

    const timelineLink = page.locator('a[title="View Timeline"]').first()
    await expect(timelineLink).toBeVisible()
    const href = await timelineLink.getAttribute('href')
    expect(href).toMatch(/\/tasks\/.+\/timeline/)

    await app.assertNoRuntimeErrors()
  })
})