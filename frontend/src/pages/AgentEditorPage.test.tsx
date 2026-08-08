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
            model: 'minimax-cn-coding-plan/MiniMax-M3',
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
              name: 'minimax-cn-coding-plan',
              binary: 'pi',
              discovery: {
                command: 'pi --list-models',
                parseStrategy: 'pi-roster',
                pattern: '',
              },
              invocation: {
                template: 'pi --model {model} --mode json -p {prompt}',
                flags: { readiness: 'pi --list-models {model}' },
              },
            },
          },
        ])
      }

      if (url.endsWith('/api/harnesses/minimax-cn-coding-plan/models')) {
        return mockJsonResponse({
          models: ['MiniMax-M3'],
        })
      }

      if (url.endsWith('/api/agents/architect/clone')) {
        return mockJsonResponse({ name: 'architect-copy' })
      }

      if (url.endsWith('/api/agents/architect/test') && init?.method === 'POST') {
        return mockJsonResponse({
          name: 'architect',
          ok: true,
          status: 'ready',
          latencyMs: 42,
          output: 'Pi readiness confirmed',
          readiness: { ok: true, piRole: 'coder-minimax-m3', piModel: 'minimax-cn/MiniMax-M3' },
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
    expect(screen.getByRole('textbox', { name: 'Description' })).toBeDisabled()
    expect(screen.getByRole('combobox', { name: 'Mode' })).toBeDisabled()
    expect(screen.getByRole('slider', { name: 'Temperature' })).toBeDisabled()
    expect(screen.getByRole('combobox', { name: 'Provider' })).toBeEnabled()
    expect(screen.getByRole('combobox', { name: 'Model' })).toBeEnabled()

    fireEvent.click(screen.getByRole('button', { name: 'Save Agent' }))

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/agents/architect',
        expect.objectContaining({ method: 'PUT' }),
      )
    })

    fireEvent.click(screen.getByRole('button', { name: 'Check Readiness' }))

    expect(await screen.findByText('Agent Readiness: architect')).toBeInTheDocument()
    expect(screen.getByText('42 ms')).toBeInTheDocument()
    expect(screen.getByText('Pi readiness confirmed')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Clone' }))

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/agents/architect/clone',
        expect.objectContaining({ method: 'POST' }),
      )
    })
  })

  it('renders a contradictory ready response with an error as failed', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === 'string' ? input : input.toString()
      if (url.endsWith('/api/agents/architect') && !init?.method) {
        return mockJsonResponse({
          layer: 'manual',
          definition: {
            name: 'architect',
            description: 'Plans tracks',
            mode: 'agent',
            model: 'minimax-cn-coding-plan/MiniMax-M3',
            temperature: 0.2,
            tools: {},
            body: '',
          },
        })
      }
      if (url.endsWith('/api/harnesses')) {
        return mockJsonResponse([{ definition: { name: 'minimax-cn-coding-plan' } }])
      }
      if (url.endsWith('/api/harnesses/minimax-cn-coding-plan/models')) {
        return mockJsonResponse({ models: ['MiniMax-M3'] })
      }
      if (url.endsWith('/api/agents/architect/test')) {
        return mockJsonResponse({
          name: 'architect',
          ok: false,
          status: 'ready',
          latencyMs: 1,
          output: 'misleading success',
          error: 'Provider credentials unavailable',
          readiness: { ok: false, reason: 'Provider credentials unavailable' },
        })
      }
      return mockJsonResponse({ error: 'not found' }, false)
    })
    vi.stubGlobal('fetch', fetchMock)

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

    await screen.findByDisplayValue('architect')
    fireEvent.click(screen.getByRole('button', { name: 'Check Readiness' }))

    expect(await screen.findByText('Provider credentials unavailable')).toBeInTheDocument()
    expect(screen.queryByText('misleading success')).not.toBeInTheDocument()
  })
})
