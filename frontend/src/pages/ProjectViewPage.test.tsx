import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'

import type { ProjectDetail } from '@/lib/fleetTypes'

vi.mock('@/lib/useWebSocket', () => ({
  useWebSocket: () => ({
    lines: ['booting agent...'],
    connected: true,
    clearLines: vi.fn(),
    wsRef: { current: null },
  }),
}))

import { ProjectViewPage } from './ProjectViewPage'

const projectResponse = {
  id: 'kanban-conductor',
  name: 'kanban-conductor',
  path: '/home/daniel-bo/Desktop/kanban-conductor',
  tracks: [
    {
      id: 'frontend-project-kanban-board-20260325',
      name: 'Frontend - Project Kanban Board',
      type: 'feature',
      description: 'Project board',
      status: 'active',
      planPath: './tracks/frontend_project_kanban_board_20260325/',
      phases: [
        {
          name: 'Phase 1: Project Detail View & Data Fetching',
          taskCount: 2,
          doneCount: 0,
          tasks: [
            {
              id: 'phase-1-1',
              description: 'Create a ProjectView component mapped to the route /project/:id.',
              status: 'todo',
              agentTag: 'frontend',
              phase: 'Phase 1: Project Detail View & Data Fetching',
            },
            {
              id: 'phase-1-2',
              description: 'Fetch full project details from the Go API.',
              status: 'blocked',
              agentTag: 'backend',
              phase: 'Phase 1: Project Detail View & Data Fetching',
            },
          ],
        },
        {
          name: 'Phase 2: Kanban Board Skeleton',
          taskCount: 2,
          doneCount: 1,
          tasks: [
            {
              id: 'phase-2-1',
              description: 'Create the KanbanBoard component.',
              status: 'ready',
              agentTag: 'frontend',
              phase: 'Phase 2: Kanban Board Skeleton',
            },
            {
              id: 'phase-2-2',
              description: 'Write logic to map tasks into columns.',
              status: 'done',
              agentTag: 'frontend',
              phase: 'Phase 2: Kanban Board Skeleton',
            },
          ],
        },
      ],
    },
  ],
  lastUpdated: 1711600000,
} satisfies ProjectDetail

function mockJsonResponse(payload: unknown, ok = true, status = ok ? 200 : 500) {
  return {
    ok,
    status,
    json: async () => payload,
  } as Response
}

describe('ProjectViewPage', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('renders project detail, board lanes, and the run action', async () => {
    const user = userEvent.setup()
    const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === 'string' ? input : input.toString()
      if (url.endsWith('/api/projects/kanban-conductor')) {
        return Promise.resolve(mockJsonResponse(projectResponse))
      }
      if (url.endsWith('/api/projects/kanban-conductor/run') && init?.method === 'POST') {
        return Promise.resolve(mockJsonResponse({ status: 'succeeded', taskKey: 'phase-2-1' }))
      }
      if (url.endsWith('/api/projects/kanban-conductor/next-task')) {
        return Promise.resolve(mockJsonResponse({ error: 'not found' }, false, 404))
      }
      if (url.endsWith('/api/projects/kanban-conductor/issues')) {
        return Promise.resolve(
          mockJsonResponse({
            issues: [
              {
                id: 'issue-123',
                title: 'API Error in Phase 1',
                type: 'blocker',
                status: 'open',
                relatedTask: 'phase-1-2',
                description: 'Task phase-1-2 has an API error.',
                createdAt: Date.now(),
              },
            ],
          }),
        )
      }
      if (
        url.endsWith('/api/projects/kanban-conductor/tasks/phase-1-1') &&
        init?.method === 'PATCH'
      ) {
        return Promise.resolve(mockJsonResponse({ status: 'done' }))
      }
      return Promise.resolve(mockJsonResponse({ error: 'not found' }, false))
    })

    vi.stubGlobal('fetch', fetchMock)

    render(
      <MemoryRouter initialEntries={['/project/kanban-conductor']}>
        <Routes>
          <Route path="/project/:id" element={<ProjectViewPage />} />
        </Routes>
      </MemoryRouter>,
    )

    expect(await screen.findByText('kanban-conductor')).toBeInTheDocument()
    expect(screen.getByText('Ready')).toBeInTheDocument()
    expect(screen.getByText('Live')).toBeInTheDocument()
    expect(screen.getAllByText('Stuck').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Pass').length).toBeGreaterThan(0)
    expect(screen.getByText('booting agent...')).toBeInTheDocument()
    expect(await screen.findByText('No tasks available')).toBeInTheDocument()
    expect(screen.queryByText('not found')).not.toBeInTheDocument()

    await screen.findByText('Create a ProjectView component mapped to the route /project/:id.')

    const runButton = await screen.findByRole('button', { name: /trigger run/i })
    expect(runButton).toBeEnabled()
    await user.click(runButton)

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/projects/kanban-conductor/run',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ taskKey: 'phase-2-1' }),
        }),
      )
      expect(screen.getByText('succeeded')).toBeInTheDocument()
      expect(screen.getByText('Task: phase-2-1')).toBeInTheDocument()
      expect(runButton).toBeEnabled()
    })

    const task = screen
      .getByText('Create a ProjectView component mapped to the route /project/:id.')
      .closest('[data-task-id="phase-1-1"]')
    const doneColumn = screen
      .getAllByText('Pass')
      .map(node => node.closest('[data-status-column="done"]'))
      .find(Boolean)

    expect(task).not.toBeNull()
    expect(doneColumn).not.toBeNull()
    if (!task || !doneColumn) {
      throw new Error('Expected draggable task and done column to be present')
    }

    const dataTransfer = {
      data: {} as Record<string, string>,
      effectAllowed: 'move',
      setData(format: string, value: string) {
        this.data[format] = value
      },
      getData(format: string) {
        return this.data[format] ?? ''
      },
    } as DataTransfer

    fireEvent.dragStart(task, { dataTransfer })
    fireEvent.dragOver(doneColumn, { dataTransfer })
    fireEvent.drop(doneColumn, { dataTransfer })

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/projects/kanban-conductor/tasks/phase-1-1',
        expect.objectContaining({
          method: 'PATCH',
          body: JSON.stringify({ status: 'done' }),
        }),
      )
      expect(
        within(doneColumn).getByText(
          'Create a ProjectView component mapped to the route /project/:id.',
        ),
      ).toBeInTheDocument()
    })
  })

  it('renders terminal failures and prevents a second run until refreshed state has one ready task', async () => {
    const user = userEvent.setup()
    const refreshedProjectResponse = {
      ...projectResponse,
      tracks: projectResponse.tracks.map(track => ({
        ...track,
        phases: track.phases.map(phase => ({
          ...phase,
          tasks: phase.tasks.map(task =>
            task.id === 'phase-2-1' ? { ...task, status: 'blocked' } : task,
          ),
        })),
      })),
    }
    let projectFetchCount = 0
    let runPostCount = 0
    const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === 'string' ? input : input.toString()
      if (url.endsWith('/api/projects/kanban-conductor')) {
        projectFetchCount += 1
        return Promise.resolve(
          mockJsonResponse(projectFetchCount === 1 ? projectResponse : refreshedProjectResponse),
        )
      }
      if (url.endsWith('/api/projects/kanban-conductor/run') && init?.method === 'POST') {
        runPostCount += 1
        return Promise.resolve(
          mockJsonResponse({
            status: 'failed',
            taskKey: 'phase-2-1',
            error: 'Pi process could not start',
          }),
        )
      }
      if (url.endsWith('/api/projects/kanban-conductor/next-task')) {
        return Promise.resolve(mockJsonResponse({ error: 'not found' }, false, 404))
      }
      return Promise.resolve(mockJsonResponse({ error: 'not found' }, false))
    })

    vi.stubGlobal('fetch', fetchMock)

    render(
      <MemoryRouter initialEntries={['/project/kanban-conductor']}>
        <Routes>
          <Route path="/project/:id" element={<ProjectViewPage />} />
        </Routes>
      </MemoryRouter>,
    )

    const runButton = await screen.findByRole('button', { name: /trigger run/i })
    expect(await screen.findByText('No tasks available')).toBeInTheDocument()
    expect(screen.queryByText('not found')).not.toBeInTheDocument()
    await user.click(runButton)

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/projects/kanban-conductor/run',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ taskKey: 'phase-2-1' }),
        }),
      )
      expect(screen.getByText('failed')).toBeInTheDocument()
      expect(screen.getByText('Task: phase-2-1')).toBeInTheDocument()
      expect(screen.getByText('Reason: Pi process could not start')).toBeInTheDocument()
      expect(projectFetchCount).toBe(2)
      expect(runButton).toBeDisabled()
    })

    await user.click(runButton)
    expect(runPostCount).toBe(1)
  })
})
