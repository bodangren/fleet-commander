import { test, expect } from '@playwright/test'
import { setupMockApp } from './helpers/mockApp'

test.describe('Reconcile Page', () => {
  test('shows empty state when no pending proposals', async ({ page }) => {
    const app = await setupMockApp(page)

    await page.route('**/api/reconciliation/proposals', route => {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
      })
    })

    await page.goto('/ops/reconcile')

    await expect(page.getByText('Pending Proposals')).toBeVisible()
    await expect(page.getByText('No pending reconciliation proposals')).toBeVisible()

    await app.assertNoRuntimeErrors()
  })

  test('displays proposals with apply/reject actions', async ({ page }) => {
    const app = await setupMockApp(page)

    await page.route('**/api/reconciliation/proposals', route => {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            _id: 'prop-1',
            projectSlug: 'demo-project',
            artifactType: 'harness',
            artifactId: 'opencode',
            patchJson: '{"binary":"opencode-v2"}',
            sourceSide: 'canonical',
            reason: 'Binary path updated in canonical state',
            status: 'pending',
            createdAt: Date.now() - 300000,
          },
        ]),
      })
    })

    await page.route('**/api/reconciliation/proposals/*/apply', route => {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ status: 'applied' }),
      })
    })

    await page.route('**/api/reconciliation/proposals/*/reject', route => {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ status: 'rejected' }),
      })
    })

    await page.goto('/ops/reconcile')

    await expect(page.getByText('1 proposal(s) awaiting review')).toBeVisible()
    await expect(page.getByText('harness').first()).toBeVisible()
    await expect(page.getByText('opencode').first()).toBeVisible()

    await page.getByRole('button', { name: 'Diff' }).click()
    await expect(page.getByText('"binary": "opencode-v2"')).toBeVisible()

    await page.getByRole('button', { name: 'Apply' }).click()

    await app.assertNoRuntimeErrors()
  })
})
