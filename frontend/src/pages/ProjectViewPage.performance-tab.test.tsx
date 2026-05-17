import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
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
})
