import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router-dom'

import { HarnessEditorPage } from './HarnessEditorPage'

function mockJsonResponse(payload: unknown, ok = true) {
  return {
    ok,
    json: async () => payload,
  } as Response
}

describe('HarnessEditorPage', () => {
  it('loads a harness and saves updates', async () => {
    const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === 'string' ? input : input.toString()
      if (url.includes('/api/harnesses/Claude%20Code') && (!init || init.method === undefined)) {
        return Promise.resolve(
          mockJsonResponse({
            definition: {
              name: 'Claude Code',
              binary: 'claude',
              discovery: {
                command: 'claude --help',
                parse_strategy: 'regex',
                pattern: 'claude-(\\S+)',
              },
              invocation: {
                template: 'claude --model {model} --prompt {prompt}',
                flags: { dangerously_skip_permissions: '--dangerously-skip-permissions' },
              },
            },
          }),
        )
      }
      if (url.includes('/api/harnesses/Claude%20Code') && init?.method === 'PUT') {
        return Promise.resolve(mockJsonResponse({ status: 'ok' }))
      }
      return Promise.resolve(mockJsonResponse({ error: 'not found' }, false))
    })

    vi.stubGlobal('fetch', fetchMock)

    render(
      <MemoryRouter
        initialEntries={['/harnesses/Claude%20Code/edit']}
        future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
      >
        <Routes>
          <Route path="/harnesses/:name/edit" element={<HarnessEditorPage />} />
        </Routes>
      </MemoryRouter>,
    )

    expect(await screen.findByDisplayValue('Claude Code')).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText('Parse Strategy'), { target: { value: 'json' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save Harness' }))

    await waitFor(() => {
      const putCall = fetchMock.mock.calls.find(call => call[1]?.method === 'PUT')
      expect(putCall).toBeTruthy()
      const body = JSON.parse(String(putCall?.[1]?.body ?? '{}'))
      expect(body.discovery.parse_strategy).toBe('json')
    })
  })

  it('requires a name before saving a new harness', async () => {
    const fetchMock = vi.fn(() => Promise.resolve(mockJsonResponse({})))
    vi.stubGlobal('fetch', fetchMock)

    render(
      <MemoryRouter
        initialEntries={['/harnesses/new']}
        future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
      >
        <Routes>
          <Route path="/harnesses/new" element={<HarnessEditorPage />} />
        </Routes>
      </MemoryRouter>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Save Harness' }))
    expect(await screen.findByText('Harness name is required before saving.')).toBeInTheDocument()
  })
})
