import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'

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
      status: 'todo',
      planPath: './tracks/frontend_project_kanban_board_20260325/',
      phases: [
        {
          name: 'Phase 1: Project Detail View & Data Fetching',
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
          tasks: [
            {
              id: 'phase-2-1',
              description: 'Create the KanbanBoard component.',
              status: 'active',
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
}

function mockJsonResponse(payload: unknown, ok = true) {
  return {
    ok,
    json: async () => payload,
  } as Response
}

describe('ProjectViewPage', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('renders project detail, board lanes, and the run action', async () => {
    const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === 'string' ? input : input.toString()
      if (url.endsWith('/api/projects/kanban-conductor')) {
        return Promise.resolve(mockJsonResponse(projectResponse))
      }
      if (url.endsWith('/api/projects/kanban-conductor/run') && init?.method === 'POST') {
        return Promise.resolve(mockJsonResponse({ status: 'started' }))
      }
      if (url.endsWith('/api/projects/kanban-conductor/issues/phase-1-2')) {
        return Promise.resolve(
          mockJsonResponse({
            fileName: 'issue-123-api-error.md',
            path: '/home/daniel-bo/Desktop/kanban-conductor/conductor/broker/open/issue-123-api-error.md',
            content: '# Blocker\n\nTask: phase-1-2\n',
            matchReason: 'content matches task id',
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

    expect(await screen.findByText('/home/daniel-bo/Desktop/kanban-conductor')).toBeInTheDocument()
    expect(screen.getByText('Ready / Todo')).toBeInTheDocument()
    expect(screen.getByText('In Progress')).toBeInTheDocument()
    expect(screen.getAllByText('Blocked').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Done').length).toBeGreaterThan(0)
    expect(screen.getByText('booting agent...')).toBeInTheDocument()

    await screen.findByText('Create a ProjectView component mapped to the route /project/:id.')

    fireEvent.click(
      screen.getByRole('button', {
        name: /fetch full project details from the go api/i,
      }),
    )

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith('/api/projects/kanban-conductor/issues/phase-1-2')
    })

    expect(await screen.findByText(/File: issue-123-api-error\.md/i)).toBeInTheDocument()
    expect(await screen.findByText(/Task: phase-1-2/)).toBeInTheDocument()

    const runButton = await screen.findByRole('button', { name: 'Trigger Orchestrator Run' })
    fireEvent.click(runButton)

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/projects/kanban-conductor/run',
        expect.objectContaining({ method: 'POST' }),
      )
    })

    const task = screen
      .getByText('Create a ProjectView component mapped to the route /project/:id.')
      .closest('[data-task-id="phase-1-1"]')
    const doneColumn = screen
      .getAllByText('Done')
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
    })
  })
})
