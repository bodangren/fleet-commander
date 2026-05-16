import { expect, test } from '@playwright/test'
import { setupMockApp } from './helpers/mockApp'

test.describe('Full User Journey Smoke Test', () => {
  test('onboards project, adds task, assigns employee, runs scheduler, and verifies result', async ({
    page,
  }) => {
    const app = await setupMockApp(page, { emptyProjects: true })
    await page.goto('/')

    // 1. Onboard a project from workspace scan
    await expect(page.getByText('Bring a workspace into Fleet Commander.')).toBeVisible()
    await page.getByLabel('Workspace Root').fill('/workspace')
    await page.getByRole('button', { name: 'Scan workspace' }).click()
    await expect(page.getByText('/workspace/demo-alpha')).toBeVisible()
    await expect(page.getByText('/workspace/demo-beta')).toBeVisible()
    await page.getByRole('button', { name: 'Import selected (2)' }).click()
    await expect(page.getByText('Imported 2 projects.')).toBeVisible()

    // 2. Navigate to project board
    await page.getByRole('link', { name: /Demo Project/i }).click()
    await expect(page).toHaveURL(/\/project\/demo-project/)
    await expect(page.getByText('Demo Project')).toBeVisible()

    // 3. Add a task via creation modal
    await page.getByRole('button', { name: 'New Task' }).click()
    await expect(page.getByRole('dialog')).toBeVisible()
    await page.getByPlaceholder('Task title').fill('Smoke Test Task')
    await page.getByPlaceholder('Description').fill('End-to-end smoke test task')
    await page.getByRole('button', { name: 'Create' }).click()
    await expect(page.getByRole('dialog')).not.toBeVisible()
    await expect(page.getByText('Smoke Test Task')).toBeVisible()

    // 4. Assign task to an employee
    await page.getByRole('link', { name: 'Employees' }).click()
    await expect(page).toHaveURL(/\/employees$/)
    await expect(page.getByText('Employee Roster')).toBeVisible()
    await page.getByRole('button', { name: /assign/i }).first().click()
    await expect(page.getByText('Smoke Test Task')).toBeVisible()

    // 5. Run scheduler from project board
    await page.goto('/project/demo-project')
    await page.getByRole('button', { name: 'TRIGGER_RUN' }).click()
    await expect(page.getByText('RUN_STATUS')).toBeVisible()

    // 6. Verify scheduler result
    await expect(page.getByText('started')).toBeVisible()

    await app.assertNoRuntimeErrors()
  })
})
