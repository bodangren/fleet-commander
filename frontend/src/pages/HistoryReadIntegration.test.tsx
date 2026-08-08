import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/dataAdapter', () => ({
  getSliceConfig: () => ({
    projects: 'convex',
    agents: 'convex',
    harnesses: 'convex',
    tasks: 'convex',
    issues: 'convex',
    logs: 'convex',
    settings: 'convex',
  }),
}))

vi.mock('@/lib/convex-data/core', async importOriginal => {
  const actual = await importOriginal<typeof import('@/lib/convex-data/core')>()
  return { ...actual, useConvexQuery: vi.fn() }
})

import { useConvexQuery } from '@/lib/convex-data/core'
import { SprintsHistoryPage } from './SprintsHistoryPage'
import { TasksHistoryPage } from './TasksHistoryPage'

const useConvexQueryMock = vi.mocked(useConvexQuery)
const importedProject = {
  _id: 'project-1',
  name: 'Reading Advantage benchmark',
  slug: 'reading-advantage-llm-benchmark',
  description: '',
  totalSprints: 0,
  lastSprint: null,
  totalSpend: 0,
  health: 'red' as const,
  healthReason: 'No sprints',
}

describe('History page read integration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('selects the sole project and settles sprint history as loaded empty', () => {
    useConvexQueryMock.mockImplementation(queryName => {
      if (queryName === 'portfolio:getPortfolioHandler') return [importedProject]
      if (queryName === 'history/sprints:listSprintHistoryHandler') return []
      return undefined
    })

    render(
      <MemoryRouter initialEntries={['/history/sprints']}>
        <SprintsHistoryPage />
      </MemoryRouter>,
    )

    expect(screen.getByText('No sprint history')).toBeInTheDocument()
    expect(useConvexQueryMock).toHaveBeenCalledWith(
      'history/sprints:listSprintHistoryHandler',
      { projectId: 'project-1', limit: 50 },
      true,
    )
  })

  it('keeps task rows visible when project selection uses an id', () => {
    useConvexQueryMock.mockImplementation(queryName => {
      if (queryName === 'portfolio:getPortfolioHandler') return [importedProject]
      if (queryName === 'history/tasks:listTaskHistoryHandler') {
        return [
          {
            _id: 'task-1',
            projectId: 'project-1',
            title: 'Task: Full test suite and build',
            description: 'Imported task',
            status: 'done',
            priority: 'medium',
            projectSlug: 'reading-advantage-llm-benchmark',
            costEstimate: 25,
            actualCost: 7.5,
            storyPoints: 3,
            createdAt: 100,
            updatedAt: 200,
          },
        ]
      }
      return undefined
    })

    render(
      <MemoryRouter initialEntries={['/history/tasks?project=project-1']}>
        <TasksHistoryPage />
      </MemoryRouter>,
    )

    expect(screen.getByText('Task: Full test suite and build')).toBeInTheDocument()
    expect(useConvexQueryMock).toHaveBeenCalledWith(
      'history/tasks:listTaskHistoryHandler',
      { projectId: 'project-1', status: undefined, search: undefined, limit: 50 },
      true,
    )
  })

  it('forwards combined URL status and search filters through the task-history query boundary', () => {
    useConvexQueryMock.mockImplementation(queryName => {
      if (queryName === 'portfolio:getPortfolioHandler') return [importedProject]
      if (queryName === 'history/tasks:listTaskHistoryHandler') return []
      return undefined
    })

    render(
      <MemoryRouter
        initialEntries={[
          '/history/tasks?project=project-1&status=backlog&search=Full%20test%20suite',
        ]}
      >
        <TasksHistoryPage />
      </MemoryRouter>,
    )

    expect(useConvexQueryMock).toHaveBeenCalledWith(
      'history/tasks:listTaskHistoryHandler',
      {
        projectId: 'project-1',
        status: 'backlog',
        search: 'Full test suite',
        limit: 50,
      },
      true,
    )
  })

  it('shows project-selection failure instead of a false loaded-empty state', () => {
    useConvexQueryMock.mockImplementation(queryName => {
      if (queryName === 'portfolio:getPortfolioHandler') return []
      return undefined
    })

    render(
      <MemoryRouter initialEntries={['/history/tasks']}>
        <TasksHistoryPage />
      </MemoryRouter>,
    )

    expect(screen.getByText('Select a valid project to view task history.')).toBeInTheDocument()
    expect(screen.queryByText('No task history')).not.toBeInTheDocument()
  })
})
