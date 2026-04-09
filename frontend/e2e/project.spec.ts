import { expect, test } from '@playwright/test'
import { setupMockApp } from './helpers/mockApp'

test.describe('Project View Page', () => {
  test('project-level feature buttons and tabs execute their flows', async ({ page }) => {
    const app = await setupMockApp(page)
    await page.goto('/project/demo-project')

    await expect(page.getByText('Project detail')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Trigger Orchestrator Run' })).toBeVisible()

    await page.getByRole('button', { name: 'Trigger Orchestrator Run' }).click()
    await expect(page.getByText('Run status')).toBeVisible()
    await expect(page.getByText('started')).toBeVisible()

    await page.getByRole('button', { name: 'Refresh Next Task' }).click()
    await expect(page.getByText('Ship navigation regression fix').first()).toBeVisible()

    await page.getByRole('button', { name: 'Dependencies' }).click()
    await expect(page.getByText('Dependency Graph')).toBeVisible()

    await page.getByRole('button', { name: 'Issues' }).click()
    await expect(page.getByText('Broker issues reported by agents')).toBeVisible()
    await page.getByRole('button', { name: 'New Issue' }).click()
    await expect(page.getByPlaceholder('Brief summary of the issue')).toBeVisible()
    await page.getByPlaceholder('Brief summary of the issue').fill('Pipeline timeout')
    await page.getByRole('button', { name: 'Create Issue' }).click()
    await expect(page.getByPlaceholder('Brief summary of the issue')).not.toBeVisible()
    expect(
      app.calls.some(
        call =>
          call.method === 'POST' &&
          call.path === '/api/projects/demo-project/issues' &&
          (call.body as { title?: string })?.title === 'Pipeline timeout',
      ),
    ).toBe(true)

    await page.getByRole('button', { name: 'Sprint' }).click()
    await expect(page.getByText('Sprints')).toBeVisible()
    await page.getByRole('button', { name: '+ New' }).click()
    await page.getByPlaceholder('Sprint name').fill('Sprint Beta')
    await page.getByPlaceholder('Sprint goal').fill('Stabilize project workflows')
    await page.locator('input[name="startDate"]').fill('2026-04-10')
    await page.locator('input[name="endDate"]').fill('2026-04-24')
    await page.getByRole('button', { name: 'Create Sprint' }).click()
    await expect(page.getByText('Sprint Beta')).toBeVisible()

    await page.getByRole('button', { name: 'Logs' }).click()
    await expect(page.getByText('Execution Timeline')).toBeVisible()
    await expect(page.getByText('Execution Stats')).toBeVisible()

    await page.getByRole('button', { name: 'Review' }).click()
    await expect(page.getByText('Code Review Results')).toBeVisible()

    await app.assertNoRuntimeErrors()
  })

  test('board interactions trigger blocked issue, review fetch, drag update, and log clear', async ({
    page,
  }) => {
    const app = await setupMockApp(page)
    await page.goto('/project/demo-project')

    await page.getByRole('button', { name: /Investigate dependency parser bug/i }).click()
    await expect(page.getByText('Blocked task issue')).toBeVisible()
    await expect(page.getByText('File: issue-123-parser-bug.md')).toBeVisible()

    await page.getByRole('button', { name: /Validate release checklist/i }).click()
    await expect(page.getByRole('heading', { name: 'Review Results' })).toBeVisible()
    await expect(page.getByText('Add stronger guard around missing project state.')).toBeVisible()

    await page.getByRole('button', { name: 'Kanban Board' }).click()
    const source = page.locator('[data-task-id="task-todo-1"]').first()
    const doneColumn = page.locator('[data-status-column="done"]')
    await source.dragTo(doneColumn)
    await expect(page.getByText('Updated task-todo-1 to done.')).toBeVisible()

    await page.getByRole('button', { name: 'Clear Live Log' }).click()

    await app.assertNoRuntimeErrors()
  })
})
