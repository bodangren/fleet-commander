import { expect, test } from '@playwright/test'
import { seedScenario } from './helpers/seed'

test.describe('Insights Smoke Tests', () => {
  test('analytics tab loads without console errors', async ({ page }) => {
    const errors: string[] = []
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text())
      }
    })

    await seedScenario(page, 'demo')
    await page.goto('/insights/analytics')
    await page.waitForLoadState('networkidle')

    await expect(page).toHaveURL(/\/insights\/analytics/)
    await expect(page.getByRole('heading', { name: 'Analytics' })).toBeVisible()

    expect(errors).toEqual([])
  })

  test('performance tab loads without console errors', async ({ page }) => {
    const errors: string[] = []
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text())
      }
    })

    await seedScenario(page, 'demo')
    await page.goto('/insights/performance')
    await page.waitForLoadState('networkidle')

    await expect(page).toHaveURL(/\/insights\/performance/)
    await expect(page.getByRole('heading', { name: 'Performance' })).toBeVisible()

    expect(errors).toEqual([])
  })

  test('costs tab loads without console errors', async ({ page }) => {
    const errors: string[] = []
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text())
      }
    })

    await seedScenario(page, 'demo')
    await page.goto('/insights/costs')
    await page.waitForLoadState('networkidle')

    await expect(page).toHaveURL(/\/insights\/costs/)
    await expect(page.getByRole('heading', { name: 'Costs' })).toBeVisible()

    expect(errors).toEqual([])
  })

  test('switching tabs does not produce console errors', async ({ page }) => {
    const errors: string[] = []
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text())
      }
    })

    await seedScenario(page, 'demo')
    await page.goto('/insights/analytics')
    await page.waitForLoadState('networkidle')

    await page.getByRole('tab', { name: /Performance/i }).click()
    await expect(page).toHaveURL(/\/insights\/performance/)

    await page.getByRole('tab', { name: /Costs/i }).click()
    await expect(page).toHaveURL(/\/insights\/costs/)

    await page.getByRole('tab', { name: /Analytics/i }).click()
    await expect(page).toHaveURL(/\/insights\/analytics/)

    expect(errors).toEqual([])
  })
})
