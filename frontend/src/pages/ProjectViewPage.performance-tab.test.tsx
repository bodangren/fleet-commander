import { describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'

vi.mock('@/lib/useWebSocket', () => ({
  useWebSocket: () => ({
    lines: [],
    connected: true,
    clearLines: vi.fn(),
    wsRef: { current: null },
  }),
}))

import { ProjectViewPage } from './ProjectViewPage'

function mockJsonResponse(payload: unknown, ok = true) {
  return {
    ok,
    json: () => Promise.resolve(payload),
  } as Response
}

describe('ProjectViewPage Performance Tab', () => {
  it('renders a Performance tab in the project view', async () => {
    const fetchMock = vi.fn((input: RequestInfo | URL) => {
      const url = typeof input === 'string' ? input : input.toString()
      if (url.endsWith('/api/projects/demo-project')) {
        return Promise.resolve(
          mockJsonResponse({
            id: 'demo-project',
            name: 'Demo Project',
            path: '/tmp/demo-project',
            tracks: [
              {
                id: 'track-1',
                name: 'Core Track',
                type: 'feature',
                description: 'Core features',
                status: 'active',
                planPath: './tracks/core_track/plan.md',
                phases: [
                  {
                    name: 'Phase 1',
                    tasks: [
                      {
                        id: 'task-1',
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
          }),
        )
      }
      if (url.endsWith('/api/projects/demo-project/next-task')) {
        return Promise.resolve(mockJsonResponse({ error: 'not found' }, false))
      }
      return Promise.resolve(mockJsonResponse({ error: 'not found' }, false))
    })

    vi.stubGlobal('fetch', fetchMock)

    render(
      <MemoryRouter initialEntries={['/project/demo-project']}>
        <Routes>
          <Route path="/project/:id" element={<ProjectViewPage />} />
        </Routes>
      </MemoryRouter>,
    )

    expect(
      await screen.findByRole('button', { name: 'Performance' }, { timeout: 5000 }),
    ).toBeInTheDocument()
  })

  it('fetches performance data from pivot API when Performance tab is active', async () => {
    const fetchMock = vi.fn((input: RequestInfo | URL) => {
      const url = typeof input === 'string' ? input : input.toString()
      if (url.endsWith('/api/projects/demo-project')) {
        return Promise.resolve(
          mockJsonResponse({
            id: 'demo-project',
            name: 'Demo Project',
            path: '/tmp/demo-project',
            tracks: [
              {
                id: 'track-1',
                name: 'Core Track',
                type: 'feature',
                description: 'Core features',
                status: 'active',
                planPath: './tracks/core_track/plan.md',
                phases: [
                  {
                    name: 'Phase 1',
                    tasks: [
                      {
                        id: 'task-1',
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
          }),
        )
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
        return Promise.resolve(mockJsonResponse({ error: 'not found' }, false))
      }
      return Promise.resolve(mockJsonResponse({ error: 'not found' }, false))
    })

    vi.stubGlobal('fetch', fetchMock)

    render(
      <MemoryRouter initialEntries={['/project/demo-project']}>
        <Routes>
          <Route path="/project/:id" element={<ProjectViewPage />} />
        </Routes>
      </MemoryRouter>,
    )

    const performanceTab = await screen.findByRole(
      'button',
      { name: 'Performance' },
      { timeout: 5000 },
    )
    performanceTab.click()

    await waitFor(
      () => {
        expect(screen.getByTestId('performance-bar-chart')).toBeInTheDocument()
      },
      { timeout: 5000 },
    )

    expect(screen.getAllByText('feature').length).toBeGreaterThan(0)
    expect(screen.getAllByText('bugfix').length).toBeGreaterThan(0)

    const performanceCall = fetchMock.mock.calls.find(call => {
      const input = call[0] as string
      return input.includes('/api/performance/employee/demo-project')
    })
    expect(performanceCall).toBeDefined()
  })

  it('shows loading state while performance data is being fetched', async () => {
    const fetchMock = vi.fn((input: RequestInfo | URL) => {
      const url = typeof input === 'string' ? input : input.toString()
      if (url.endsWith('/api/projects/demo-project')) {
        return Promise.resolve(
          mockJsonResponse({
            id: 'demo-project',
            name: 'Demo Project',
            path: '/tmp/demo-project',
            tracks: [],
            lastUpdated: 1712000000,
          }),
        )
      }
      if (url.includes('/api/performance/employee/demo-project')) {
        return new Promise(resolve => {
          setTimeout(() => {
            resolve(
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
          }, 100)
        })
      }
      if (url.endsWith('/api/projects/demo-project/next-task')) {
        return Promise.resolve(mockJsonResponse({ error: 'not found' }, false))
      }
      return Promise.resolve(mockJsonResponse({ error: 'not found' }, false))
    })

    vi.stubGlobal('fetch', fetchMock)

    render(
      <MemoryRouter initialEntries={['/project/demo-project']}>
        <Routes>
          <Route path="/project/:id" element={<ProjectViewPage />} />
        </Routes>
      </MemoryRouter>,
    )

    const performanceTab = await screen.findByRole(
      'button',
      { name: 'Performance' },
      { timeout: 5000 },
    )
    fireEvent.click(performanceTab)

    expect(screen.getByText(/loading performance data/i)).toBeInTheDocument()
  })
})
