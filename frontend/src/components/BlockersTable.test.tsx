/**
 * Phase 5 Red gate: `BlockersTable` is a dedicated table component for
 * blocked tasks. It must render one row per blocked task with the columns
 * described in plan.md (task, project, sprint, blocker chain, estimated
 * unblock time) and provide action buttons for "view task" and
 * "reassign blocker". The current `BlockersPage` inlines a similar table
 * inside the same file, so the extraction is the Green-phase work.
 *
 * See measure/tracks/task_dependencies_critical_path_20260605/plan.md
 * Phase 5 task 2 and test-strategy.md §5 Phase 5 row.
 *
 * The module-resolution Red gate is the headline: the file
 * `frontend/src/components/BlockersTable.tsx` does not exist, so the import
 * at the top of this test fails and vitest exits non-zero with "Cannot
 * find module".
 */
import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { BlockersTable } from './BlockersTable'
import type { BlockedTask, BlockersData } from '@/lib/useFleetApi'

// ----------------------------------------------------------------------
// Inline fixtures (Red-phase boundary: no separate fixture file).
// Mirrors the pivot `__fixtures__/dependencyFixtures.ts` API; scenario
// names (`chain3`, `multiProject`) line up across packages so the same
// graph drives tests in both pivot and frontend.
// ----------------------------------------------------------------------

function makeBlockedTask(input: {
  taskKey: string
  projectSlug?: string
  trackId?: string
  title?: string
  status?: string
  assignee?: string
  updatedAt?: number
  projectName?: string
}): BlockedTask {
  return {
    projectSlug: input.projectSlug ?? 'test-project',
    trackId: input.trackId ?? 'test-track',
    taskKey: input.taskKey,
    title: input.title ?? `Task ${input.taskKey}`,
    status: input.status ?? 'blocked',
    assignee: input.assignee,
    updatedAt: input.updatedAt ?? Date.now() - 3_600_000,
    projectName: input.projectName,
  }
}

const chain3BlockedFixture: BlockersData = {
  blockedTasks: [
    makeBlockedTask({ taskKey: 'TASK-A', title: 'Root', assignee: 'agent-1' }),
    makeBlockedTask({
      taskKey: 'TASK-B',
      title: 'Middle',
      assignee: 'agent-2',
      projectSlug: 'project-2',
    }),
    makeBlockedTask({
      taskKey: 'TASK-C',
      title: 'Leaf',
      assignee: 'agent-3',
      projectSlug: 'project-3',
    }),
  ],
  openIssues: [],
}

const multiProjectFixture: BlockersData = {
  blockedTasks: [
    makeBlockedTask({
      taskKey: 'P1-T1',
      title: 'Auth backend',
      projectSlug: 'auth',
      projectName: 'Auth Service',
      assignee: 'agent-1',
    }),
    makeBlockedTask({
      taskKey: 'P2-T1',
      title: 'Billing flow',
      projectSlug: 'billing',
      projectName: 'Billing Service',
      assignee: 'agent-2',
    }),
  ],
  openIssues: [],
}

function renderTable(
  tasks: BlockedTask[],
  handlers: {
    onViewTask?: (taskKey: string) => void
    onReassignBlocker?: (taskKey: string) => void
  } = {},
) {
  return render(
    <BlockersTable
      tasks={tasks}
      onViewTask={handlers.onViewTask ?? vi.fn()}
      onReassignBlocker={handlers.onReassignBlocker ?? vi.fn()}
    />,
  )
}

describe('BlockersTable (Phase 5 Red gate — module resolution)', () => {
  it('imports without throwing (Red gate: module must exist)', () => {
    expect(BlockersTable).toBeDefined()
  })

  it('renders one table row per blocked task', () => {
    renderTable(chain3BlockedFixture.blockedTasks)
    for (const task of chain3BlockedFixture.blockedTasks) {
      expect(screen.getByText(task.title)).toBeInTheDocument()
    }
  })

  it('renders the task key as a monospaced badge for each row [Red gate]', () => {
    renderTable(chain3BlockedFixture.blockedTasks)
    for (const task of chain3BlockedFixture.blockedTasks) {
      expect(screen.getAllByText(task.taskKey).length).toBeGreaterThan(0)
    }
  })

  it('renders a PROJECT column showing the project slug or name [Red gate]', () => {
    renderTable(multiProjectFixture.blockedTasks)
    expect(screen.getByText('Auth Service')).toBeInTheDocument()
    expect(screen.getByText('Billing Service')).toBeInTheDocument()
  })

  it('renders a SPRINT column (placeholder or sprint name) for each task [Red gate]', () => {
    renderTable(chain3BlockedFixture.blockedTasks)
    // The column header is required by plan.md; assert it exists even if
    // the cell content is "—" (no sprint assigned).
    expect(screen.getByRole('columnheader', { name: /sprint/i })).toBeInTheDocument()
  })

  it('renders a BLOCKER CHAIN column with a BlockerChain component per row [Red gate]', () => {
    renderTable([
      makeBlockedTask({
        taskKey: 'T-DOWN',
        title: 'Downstream',
        status: 'blocked',
      }),
    ])
    // The chain column should render something visibly different from
    // "—" — e.g. an inline breadcrumb of upstream tasks. The simplest
    // characterization is a status dot (the BlockerChain component draws
    // a `rounded-full` span per entry).
    const dots = document.querySelectorAll('span.rounded-full')
    expect(dots.length).toBeGreaterThan(0)
  })

  it('renders an ESTIMATED UNBLOCK TIME column for each row [Red gate]', () => {
    renderTable(chain3BlockedFixture.blockedTasks)
    expect(screen.getByRole('columnheader', { name: /unblock|estimate/i })).toBeInTheDocument()
  })

  it('renders a "View task" action button per row [Red gate]', () => {
    renderTable(chain3BlockedFixture.blockedTasks)
    const buttons = screen.getAllByRole('button', { name: /view task/i })
    expect(buttons.length).toBe(chain3BlockedFixture.blockedTasks.length)
  })

  it('renders a "Reassign blocker" action button per row [Red gate]', () => {
    renderTable(chain3BlockedFixture.blockedTasks)
    const buttons = screen.getAllByRole('button', { name: /reassign/i })
    expect(buttons.length).toBe(chain3BlockedFixture.blockedTasks.length)
  })

  it('calls onViewTask with the task key when "View task" is clicked [Red gate]', async () => {
    const onViewTask = vi.fn()
    renderTable(chain3BlockedFixture.blockedTasks, { onViewTask })
    await userEvent.click(screen.getAllByRole('button', { name: /view task/i })[0]!)
    expect(onViewTask).toHaveBeenCalledWith(chain3BlockedFixture.blockedTasks[0]!.taskKey)
  })

  it('calls onReassignBlocker with the task key when "Reassign blocker" is clicked [Red gate]', async () => {
    const onReassignBlocker = vi.fn()
    renderTable(chain3BlockedFixture.blockedTasks, { onReassignBlocker })
    await userEvent.click(screen.getAllByRole('button', { name: /reassign/i })[0]!)
    expect(onReassignBlocker).toHaveBeenCalledWith(chain3BlockedFixture.blockedTasks[0]!.taskKey)
  })

  it('renders an empty state when no tasks are passed [Red gate]', () => {
    renderTable([])
    // Some non-empty placeholder text — avoid the literal "No data".
    const body = document.body.textContent ?? ''
    expect(body.length).toBeGreaterThan(0)
    // No rows.
    expect(screen.queryAllByRole('row').length).toBeLessThanOrEqual(1)
  })
})
