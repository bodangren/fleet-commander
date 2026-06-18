import { test, expect } from '@playwright/test'
import { seedScenario } from './helpers/seed'

test.describe('Dashboard Page', () => {
  test('sidebar navigation and project entry buttons open feature pages', async ({ page }) => {
    const app = await seedScenario(page, 'demo')
    await page.goto('/')
    await page.locator('[data-realtime-ready="true"]').waitFor()

    await expect(page.getByRole('heading', { level: 2, name: 'Dashboard' })).toBeVisible()

    await page.getByRole('link', { name: 'Agents' }).click()
    await expect(page).toHaveURL(/\/agents$/)
    await expect(page.getByRole('heading', { level: 2, name: 'Agents' })).toBeVisible()

    await page.getByRole('link', { name: 'Harnesses' }).click()
    await expect(page).toHaveURL(/\/harnesses$/)
    await expect(page.getByRole('heading', { level: 2, name: 'Harnesses' })).toBeVisible()

    await page.getByRole('link', { name: 'Settings' }).click()
    await expect(page).toHaveURL(/\/settings$/)
    await expect(page.getByRole('heading', { level: 2, name: 'Settings' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Save Settings' })).toBeVisible()

    await page.getByRole('link', { name: 'Pipelines' }).click()
    await expect(page).toHaveURL(/\/pipelines$/)
    await expect(page.getByRole('heading', { level: 2, name: 'Pipelines' })).toBeVisible()

    await page.getByRole('link', { name: 'Dashboard' }).click()
    await expect(page).toHaveURL(/\/$/)

    await app.assertNoRuntimeErrors()
  })

  test('onboarding scan and import buttons work when no projects exist', async ({ page }) => {
    const app = await seedScenario(page, 'empty')
    await page.goto('/')
    await page.locator('[data-realtime-ready="true"]').waitFor()

    await expect(page.getByText('Bring a workspace into Fleet Commander.')).toBeVisible()
    await page.getByLabel('Workspace Root').fill('/workspace')
    await page.getByRole('button', { name: 'Scan workspace' }).click()
    await expect(page.getByText('/workspace/demo-alpha')).toBeVisible()
    await expect(page.getByText('/workspace/demo-beta')).toBeVisible()
    await page.getByRole('button', { name: 'Import selected (2)' }).click()
    await expect(page.getByText('Imported 2 projects.')).toBeVisible()

    await app.assertNoRuntimeErrors()
  })

  test('renders all 5 dashboard sections on the home page', async ({ page }) => {
    const app = await seedScenario(page, 'demo')
    await page.goto('/')
    await page.locator('[data-realtime-ready="true"]').waitFor()

    // Sprint Status
    await expect(page.getByText('Sprint Alpha')).toBeVisible()
    // Key Metrics
    await expect(page.getByText('Delivery Rate')).toBeVisible()
    await expect(page.getByText('Success Rate')).toBeVisible()
    // Agent Status
    await expect(page.getByText('Architect')).toBeVisible()
    // Attention Needed
    await expect(page.getByText('Circuit breaker open for agent executor')).toBeVisible()
    await expect(page.getByText('Budget threshold at 80%')).toBeVisible()
    // Recent Activity
    await expect(page.getByText('No recent activity')).toBeVisible()

    await app.assertNoRuntimeErrors()
  })

  test('dashboard grid layout is responsive at tablet width', async ({ page }) => {
    const app = await seedScenario(page, 'demo')
    await page.setViewportSize({ width: 768, height: 1024 })
    await page.goto('/')
    await page.locator('[data-realtime-ready="true"]').waitFor()

    await expect(page.getByText('Sprint Alpha')).toBeVisible()
    await expect(page.getByText('Delivery Rate')).toBeVisible()

    // Ensure no horizontal overflow at tablet width
    const hasHorizontalOverflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth
    })
    expect(hasHorizontalOverflow).toBe(false)

    await app.assertNoRuntimeErrors()
  })
})
