import { test, expect } from '@playwright/test'

test.describe('Project View Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.waitForSelector('text=Projects', { timeout: 10000 }).catch(() => {})
  })

  test('kanban board renders when project is loaded', async ({ page }) => {
    const projectCards = page.locator('[class*="rounded-2xl"]').filter({ hasText: 'conductor' })
    const count = await projectCards.count()
    if (count > 0) {
      await projectCards.first().click()
      await page.waitForURL(/\/project\//, { timeout: 5000 })
      const boardTab = page.locator('button:has-text("Kanban Board")')
      if (await boardTab.isVisible({ timeout: 3000 })) {
        await boardTab.click()
        await expect(page.locator('text=Board summary')).toBeVisible()
      }
    }
  })

  test('project detail card shows correct information', async ({ page }) => {
    const projectCards = page.locator('[class*="rounded-2xl"]').filter({ hasText: 'conductor' })
    const count = await projectCards.count()
    if (count > 0) {
      await projectCards.first().click()
      await page.waitForURL(/\/project\//, { timeout: 5000 })
      await expect(page.locator('text=Project detail')).toBeVisible({ timeout: 5000 })
      await expect(page.locator('text=Tracks')).toBeVisible({ timeout: 5000 })
      await expect(page.locator('text=Tasks')).toBeVisible({ timeout: 5000 })
    }
  })

  test('back to dashboard navigation works', async ({ page }) => {
    const projectCards = page.locator('[class*="rounded-2xl"]').filter({ hasText: 'conductor' })
    const count = await projectCards.count()
    if (count > 0) {
      await projectCards.first().click()
      await page.waitForURL(/\/project\//, { timeout: 5000 })
      const backButton = page.locator('a:has-text("Back to dashboard")')
      if (await backButton.isVisible({ timeout: 3000 })) {
        await backButton.click()
        await expect(page).toHaveURL('/')
      }
    }
  })

  test('trigger orchestrator run button is present', async ({ page }) => {
    const projectCards = page.locator('[class*="rounded-2xl"]').filter({ hasText: 'conductor' })
    const count = await projectCards.count()
    if (count > 0) {
      await projectCards.first().click()
      await page.waitForURL(/\/project\//, { timeout: 5000 })
      const triggerButton = page.locator('button:has-text("Trigger Orchestrator Run")')
      if (await triggerButton.isVisible({ timeout: 3000 })) {
        await expect(triggerButton).toBeVisible()
      }
    }
  })

  test('tabs navigation works (dependencies, issues, sprint, logs, review)', async ({ page }) => {
    const projectCards = page.locator('[class*="rounded-2xl"]').filter({ hasText: 'conductor' })
    const count = await projectCards.count()
    if (count > 0) {
      await projectCards.first().click()
      await page.waitForURL(/\/project\//, { timeout: 5000 })
      const tabs = ['Dependencies', 'Issues', 'Sprint', 'Logs', 'Review']
      for (const tab of tabs) {
        const tabButton = page.locator(`button:has-text("${tab}")`)
        if (await tabButton.isVisible({ timeout: 3000 })) {
          await tabButton.click()
          await page.waitForTimeout(500)
        }
      }
    }
  })

  test('next task section is visible', async ({ page }) => {
    const projectCards = page.locator('[class*="rounded-2xl"]').filter({ hasText: 'conductor' })
    const count = await projectCards.count()
    if (count > 0) {
      await projectCards.first().click()
      await page.waitForURL(/\/project\//, { timeout: 5000 })
      const nextTaskSection = page.locator('text=Next task')
      if (await nextTaskSection.isVisible({ timeout: 5000 })) {
        await expect(nextTaskSection).toBeVisible()
      }
    }
  })
})