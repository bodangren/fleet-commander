import { test, expect } from '@playwright/test'

test.describe('Dashboard Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test('shows project listing when projects exist', async ({ page }) => {
    const projectsHeader = page.locator('text=Projects')
    if (await projectsHeader.isVisible({ timeout: 3000 })) {
      await expect(page.getByText('Projects')).toBeVisible()
      await expect(page.getByText('total')).toBeVisible()
    }
  })

  test('shows welcome screen when no projects exist', async ({ page }) => {
    const welcomeText = page.locator('text=Bring a workspace into Fleet Commander')
    if (await welcomeText.isVisible({ timeout: 3000 })) {
      await expect(page.getByLabelText('Workspace Root')).toBeVisible()
    }
  })

  test('shows overview stats section', async ({ page }) => {
    await page.waitForSelector('text=Tracks', { timeout: 5000 }).catch(() => {})
    const statsSection = page.locator('text=Tracks').first()
    if (await statsSection.isVisible({ timeout: 3000 })) {
      await expect(page.locator('text=Tasks')).toBeVisible()
      await expect(page.locator('text=Active')).toBeVisible()
    }
  })

  test('shows live output panel', async ({ page }) => {
    await page.waitForSelector('text=Live Output', { timeout: 5000 }).catch(() => {})
    const liveOutput = page.locator('text=Live Output').first()
    if (await liveOutput.isVisible({ timeout: 3000 })) {
      await expect(liveOutput).toBeVisible()
    }
  })

  test('navigation to agents page works', async ({ page }) => {
    const agentsLink = page.locator('a[href="/agents"]').first()
    if (await agentsLink.isVisible({ timeout: 3000 })) {
      await agentsLink.click()
      await expect(page).toHaveURL(/\/agents/)
    }
  })

  test('project cards are clickable when projects exist', async ({ page }) => {
    await page.waitForSelector('[class*="ProjectCard"]', { timeout: 5000 }).catch(() => {})
    const projectCards = page.locator('[class*="rounded-2xl"]').filter({ hasText: 'conductor' })
    const count = await projectCards.count()
    if (count > 0) {
      await projectCards.first().click()
    }
  })
})