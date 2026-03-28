import { afterEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'

import { AgentEditorPage } from './AgentEditorPage'

function mockJsonResponse(payload: unknown, ok = true) {
  return {
    ok,
    json: async () => payload,
  } as Response
}

describe('AgentEditorPage', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('loads an agent, saves edits, and supports cloning', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === 'string' ? input : input.toString()

      if (url.endsWith('/api/agents/architect') && (!init || init.method === undefined)) {
        return mockJsonResponse({
          layer: 'bundled',
          definition: {
            name: 'architect',
            description: 'Plans tracks',
            mode: 'agent',
            model: 'opencode/anthropic/claude-sonnet-4-6',
            temperature: 0.2,
            tools: { write: true, edit: true, bash: false },
            body: 'Original prompt.',
          },
        })
      }

      if (url.endsWith('/api/harnesses')) {
        return mockJsonResponse([
          {
            layer: 'bundled',
            binaryFound: true,
            definition: {
              name: 'Opencode',
              binary: 'opencode',
              discovery: {
                command: 'opencode models',
                parseStrategy: 'line-per-model',
                pattern: '',
              },
              invocation: {
                template: 'opencode -m {model} run "{prompt}"',
                flags: { no_interactive: '--no-interactive' },
              },
            },
          },
        ])
      }

      if (url.endsWith('/api/harnesses/Opencode/models')) {
        return mockJsonResponse({
          models: ['anthropic/claude-sonnet-4-6', 'anthropic/claude-haiku-3-5'],
        })
      }

      if (url.endsWith('/api/agents/architect/clone')) {
        return mockJsonResponse({ name: 'architect-copy' })
      }

      if (url.endsWith('/api/agents/architect/test') && init?.method === 'POST') {
        return mockJsonResponse({
          name: 'architect',
          status: 'success',
          latencyMs: 42,
          output: 'OK',
        })
      }

      if (url.endsWith('/api/agents/architect') && init?.method === 'PUT') {
        return mockJsonResponse({ status: 'ok' })
      }

      return mockJsonResponse({ error: 'not found' }, false)
    })

    vi.stubGlobal('fetch', fetchMock)
    vi.stubGlobal(
      'prompt',
      vi.fn(() => 'architect-copy'),
    )
    vi.stubGlobal(
      'confirm',
      vi.fn(() => true),
    )

    render(
      <MemoryRouter
        initialEntries={['/agents/architect/edit']}
        future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
      >
        <Routes>
          <Route path="/agents/:name/edit" element={<AgentEditorPage />} />
        </Routes>
      </MemoryRouter>,
    )

    expect(await screen.findByDisplayValue('architect')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Plans tracks')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Original prompt.')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Save Agent' }))

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/agents/architect',
        expect.objectContaining({ method: 'PUT' }),
      )
    })

    fireEvent.click(screen.getByRole('button', { name: 'Test Agent' }))

    expect(await screen.findByText('Agent Dry Run: architect')).toBeInTheDocument()
    expect(screen.getByText('42 ms')).toBeInTheDocument()
    expect(screen.getByText('OK')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Clone' }))

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/agents/architect/clone',
        expect.objectContaining({ method: 'POST' }),
      )
    })
  })
})
