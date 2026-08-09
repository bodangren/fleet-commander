import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'

import type { ProjectDetail } from '@/lib/fleetTypes'

vi.mock('@/lib/useWebSocket', () => ({
  useWebSocket: () => ({
    lines: [],
    connected: true,
    clearLines: vi.fn(),
    wsRef: { current: null },
  }),
}))

import { ProjectViewPage } from './ProjectViewPage'

const demoProject = {
  id: 'demo-project',
  name: 'Demo Project',
  path: '/tmp/demo-project',
  tracks: [
    {
      id: 'track-core',
      name: 'Core Track',
      type: 'feature',
      description: 'Core features',
      status: 'active',
      planPath: './tracks/core_track/plan.md',
      phases: [
        {
          name: 'Phase 1',
          taskCount: 1,
          doneCount: 0,
          tasks: [
            {
              id: 'task-initial',
              description: 'Initial task',
              status: 'todo',
              agentTag: 'frontend',
              phase: 'Phase 1',
            },
          ],
        },
      ],
    },
  ],
  lastUpdated: 1712000000,
} satisfies ProjectDetail

function mockJsonResponse(payload: unknown, ok = true, status = ok ? 200 : 500) {
  return {
    ok,
    status,
    json: async () => payload,
  } as Response
}

function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>(resolvePromise => {
    resolve = resolvePromise
  })

  return { promise, resolve }
}

function renderProjectView() {
  return render(
    <MemoryRouter initialEntries={['/project/demo-project']}>
      <Routes>
        <Route path="/project/:id" element={<ProjectViewPage />} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('ProjectViewPage Performance Tab', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('renders a Performance tab in the project view', async () => {
    const fetchMock = vi.fn((input: RequestInfo | URL) => {
      const url = typeof input === 'string' ? input : input.toString()
      if (url.endsWith('/api/projects/demo-project')) {
        return Promise.resolve(mockJsonResponse(demoProject))
      }
      if (url.endsWith('/api/projects/demo-project/next-task')) {
        return Promise.resolve(mockJsonResponse({ error: 'not found' }, false, 404))
      }
      return Promise.resolve(mockJsonResponse({ error: 'not found' }, false))
    })

    vi.stubGlobal('fetch', fetchMock)

    renderProjectView()

    expect(await screen.findByRole('button', { name: 'Performance' })).toBeInTheDocument()
    expect(await screen.findByText('No tasks available')).toBeInTheDocument()
    expect(screen.queryByText('not found')).not.toBeInTheDocument()
  })

  it('fetches performance data from pivot API when Performance tab is active', async () => {
    const user = userEvent.setup()
    const fetchMock = vi.fn((input: RequestInfo | URL) => {
      const url = typeof input === 'string' ? input : input.toString()
      if (url.endsWith('/api/projects/demo-project')) {
        return Promise.resolve(mockJsonResponse(demoProject))
      }
      if (url.includes('/api/performance/employee/demo-project')) {
        return Promise.resolve(
          mockJsonResponse({
            data: {
              baselines: [
                {
                  taskKind: 'feature',
                  avgDurationMs: 120000,
                  p50DurationMs: 110000,
                  p95DurationMs: 200000,
                  completionRate: 0.85,
                  sampleCount: 10,
                },
                {
                  taskKind: 'bugfix',
                  avgDurationMs: 80000,
                  p50DurationMs: 75000,
                  p95DurationMs: 150000,
                  completionRate: 0.92,
                  sampleCount: 8,
                },
              ],
              runs: [],
            },
          }),
        )
      }
      if (url.endsWith('/api/projects/demo-project/next-task')) {
        return Promise.resolve(mockJsonResponse({ error: 'not found' }, false, 404))
      }
      return Promise.resolve(mockJsonResponse({ error: 'not found' }, false))
    })

    vi.stubGlobal('fetch', fetchMock)

    renderProjectView()

    const performanceTab = await screen.findByRole('button', { name: 'Performance' })
    await screen.findByText('No tasks available')
    expect(screen.queryByText('not found')).not.toBeInTheDocument()
    await user.click(performanceTab)

    await waitFor(() => {
      expect(screen.getByTestId('performance-bar-chart')).toBeInTheDocument()
    })

    expect(screen.getAllByText('feature').length).toBeGreaterThan(0)
    expect(screen.getAllByText('bugfix').length).toBeGreaterThan(0)
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/performance/employee/demo-project?projectId=demo-project&windowDays=30',
    )
  })

  it('shows loading state while performance data is being fetched', async () => {
    const user = userEvent.setup()
    const performanceResponse = deferred<Response>()
    const fetchMock = vi.fn((input: RequestInfo | URL) => {
      const url = typeof input === 'string' ? input : input.toString()
      if (url.endsWith('/api/projects/demo-project')) {
        return Promise.resolve(mockJsonResponse(demoProject))
      }
      if (url.includes('/api/performance/employee/demo-project')) {
        return performanceResponse.promise
      }
      if (url.endsWith('/api/projects/demo-project/next-task')) {
        return Promise.resolve(mockJsonResponse({ error: 'not found' }, false, 404))
      }
      return Promise.resolve(mockJsonResponse({ error: 'not found' }, false))
    })

    vi.stubGlobal('fetch', fetchMock)

    renderProjectView()

    const performanceTab = await screen.findByRole('button', { name: 'Performance' })
    await screen.findByText('No tasks available')
    expect(screen.queryByText('not found')).not.toBeInTheDocument()
    await user.click(performanceTab)

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/performance/employee/demo-project?projectId=demo-project&windowDays=30',
      )
    })
    expect(screen.getByText(/loading performance data/i)).toBeInTheDocument()

    await act(async () => {
      performanceResponse.resolve(
        mockJsonResponse({
          data: {
            baselines: [
              {
                taskKind: 'feature',
                avgDurationMs: 120000,
                p50DurationMs: 110000,
                p95DurationMs: 200000,
                completionRate: 0.85,
                sampleCount: 10,
              },
            ],
            runs: [],
          },
        }),
      )
      await performanceResponse.promise
    })

    expect(await screen.findByTestId('performance-bar-chart')).toBeInTheDocument()
  })
})
