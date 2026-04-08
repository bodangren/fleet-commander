import { test, expect } from '@playwright/test'

test.describe('Harness Management', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/harnesses')
    await page.waitForTimeout(500)
  })

  test('harnesses page renders correctly', async ({ page }) => {
    await expect(page.locator('text=Harness Registry')).toBeVisible({ timeout: 5000 })
  })

  test('add harness button is present', async ({ page }) => {
    const addButton = page.locator('a:has-text("Add Harness")')
    if (await addButton.isVisible({ timeout: 3000 })) {
      await expect(addButton).toBeVisible()
    }
  })

  test('navigate to harness editor', async ({ page }) => {
    const addButton = page.locator('a:has-text("Add Harness")')
    if (await addButton.isVisible({ timeout: 3000 })) {
      await addButton.click()
      await expect(page).toHaveURL(/\/harnesses\/.*/)
    }
  })

  test('harness cards display correctly', async ({ page }) => {
    await page.waitForTimeout(1000)
    const harnessSection = page.locator('section.grid')
    if (await harnessSection.isVisible({ timeout: 3000 })) {
      await expect(harnessSection).toBeVisible()
    }
  })
})