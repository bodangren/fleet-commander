import { expect, test } from '@playwright/test'
import { setupMockApp } from './helpers/mockApp'

test.describe('Kanban Board', () => {
  test('creates a task via modal, drags it to a different column, and verifies status update', async ({
    page,
  }) => {
    const app = await setupMockApp(page)
    await page.goto('/board/demo-project')

    // Board loads with columns
    await expect(page.getByText('Backlog')).toBeVisible()
    await expect(page.getByText('Ready')).toBeVisible()
    await expect(page.getByText('In Progress')).toBeVisible()
    await expect(page.getByText('Review')).toBeVisible()
    await expect(page.getByText('Done')).toBeVisible()
    await expect(page.getByText('Blocked')).toBeVisible()

    // Create a new task via modal
    await page.getByRole('button', { name: 'New Task' }).click()
    await expect(page.getByRole('dialog')).toBeVisible()
    await page.getByPlaceholder('Task title').fill('E2E Test Task')
    await page.getByPlaceholder('Description').fill('Task created during E2E test')
    await page.getByRole('button', { name: 'Create' }).click()
    await expect(page.getByRole('dialog')).not.toBeVisible()

    // Verify task appears in Backlog
    await expect(page.getByText('E2E Test Task')).toBeVisible()

    // Drag task from Backlog to Ready
    const task = page.locator('[data-task-id]').filter({ hasText: 'E2E Test Task' })
    const readyColumn = page.locator('[data-column-id="col-ready"]').first()
    await task.dragTo(readyColumn)

    // Verify status update was sent
    expect(
      app.calls.some(
        (call) =>
          call.method === 'PATCH' &&
          call.path.includes('/tasks/') &&
          (call.body as { status?: string })?.status === 'ready',
      ),
    ).toBe(true)

    await app.assertNoRuntimeErrors()
  })

  test('shows task detail modal with assignee and priority', async ({ page }) => {
    await setupMockApp(page)
    await page.goto('/board/demo-project')

    const task = page.locator('[data-task-id]').first()
    await task.click()

    await expect(page.getByRole('dialog')).toBeVisible()
    await expect(page.getByText('Priority')).toBeVisible()
    await expect(page.getByText('Assignee')).toBeVisible()
  })
})
