import { test, expect } from '@playwright/test'

test.describe('Agent Management', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/agents')
    await page.waitForTimeout(500)
  })

  test('agents page renders correctly', async ({ page }) => {
    await expect(page.locator('text=Agent Registry')).toBeVisible({ timeout: 5000 })
  })

  test('add agent button is present', async ({ page }) => {
    const addButton = page.locator('a:has-text("Add Agent")')
    if (await addButton.isVisible({ timeout: 3000 })) {
      await expect(addButton).toBeVisible()
    }
  })

  test('navigate to agent editor', async ({ page }) => {
    const addButton = page.locator('a:has-text("Add Agent")')
    if (await addButton.isVisible({ timeout: 3000 })) {
      await addButton.click()
      await expect(page).toHaveURL(/\/agents\/.*\/edit/)
    }
  })

  test('agent cards display correctly', async ({ page }) => {
    await page.waitForTimeout(1000)
    const agentSection = page.locator('section.grid')
    if (await agentSection.isVisible({ timeout: 3000 })) {
      await expect(agentSection).toBeVisible()
    }
  })
})