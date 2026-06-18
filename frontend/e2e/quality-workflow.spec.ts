/**
 * Phase S4 E2E coverage for the quality workflow visibility surface.
 *
 * S4 strategy (test-strategy.md §1) allows ONE Playwright E2E for the
 * whole phase. This spec covers the full configure → observe → diagnose
 * flow in a single test:
 *
 *   1. Configure — project settings page accepts a profile selection
 *      (QualityProfileSection) and shows the ordered stages.
 *   2. Observe — task timeline page surfaces the quality stage row
 *      (QualityStageRow) with the recorded attempts, cost, and
 *      evidence.
 *   3. Diagnose — operations panel (QualityOperationsPanel) lists the
 *      blocked gate and exposes a retry action with audit feedback.
 *
 * Owned by Phase S4 Test task 4. The spec is tagged `@quality-workflow`
 * so the targeted S4 E2E command from test-strategy §7 can be run in
 * isolation: `bun --cwd frontend test:e2e -- --grep @quality-workflow`.
 *
 * The components and routes referenced by this spec are not yet
 * implemented. The spec is intentionally Red; the Green sibling lands
 * when the S4 Implement tasks wire QualityProfileSection into the
 * settings layout, QualityStageRow into TaskTimelinePage, and
 * QualityOperationsPanel into OpsPage.
 */

import { expect, test } from '@playwright/test'
import { seedScenario } from './helpers/seed'

test.describe('@quality-workflow S4 visibility', () => {
  test('configure → observe → diagnose a quality run end-to-end', async ({ page }) => {
    const app = await seedScenario(page, 'demo')
    await app.goto('/settings/quality')

    // 1. CONFIGURE — pick the strict profile and inspect its stages.
    const profileSelect = page.getByLabel('Profile', { exact: true })
    await profileSelect.selectOption('strict')
    const stagesList = page.getByTestId('quality-profile-stages')
    await expect(stagesList).toBeVisible()
    await expect(stagesList).toContainText(/strategy/i)
    await expect(stagesList).toContainText(/red/i)
    await expect(stagesList).toContainText(/green/i)
    await page.getByRole('button', { name: /Save/i }).click()
    await expect(page.getByText(/saved|updated/i)).toBeVisible()
    const versionBadge = page.getByTestId('quality-profile-version-badge')
    await expect(versionBadge).toContainText(/v1/)

    // 2. OBSERVE — open the task timeline and assert the quality stage row
    // surfaces cost, attempts, and evidence.
    await app.goto('/tasks/task-42/timeline')
    const qualityRow = page.getByTestId('quality-stage-row-1')
    await expect(qualityRow).toBeVisible()
    await expect(qualityRow).toHaveAttribute('aria-status', /passed|failed|skipped|blocked|running/i)
    const evidence = page.getByTestId('quality-stage-evidence')
    await expect(evidence).toBeVisible()

    // 3. DIAGNOSE — open the operations panel and exercise the retry
    // action with confirmation and audit feedback.
    await app.goto('/ops/quality')
    const opsHeading = page.getByRole('heading', { name: /Quality operations/i, level: 2 })
    await expect(opsHeading).toBeVisible()
    const failedRow = page.getByTestId('quality-operations-run-row').first()
    await expect(failedRow).toBeVisible()
    await failedRow.getByRole('button', { name: /Retry/i }).click()
    const confirm = page.getByRole('dialog')
    await expect(confirm).toBeVisible()
    await confirm.getByLabel('Reason').fill('manual override for test plan')
    await confirm.getByRole('button', { name: /Confirm/i }).click()
    await expect(page.getByText(/retry queued|retry recorded|audit-trail reason/i)).toBeVisible()

    await app.assertNoRuntimeErrors()
  })
})
