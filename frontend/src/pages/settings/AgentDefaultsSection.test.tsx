import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { AgentDefaultsSection } from './AgentDefaultsSection'
import { ToastProvider } from '@/lib/toast'

function jsonResponse(body: unknown, ok = true): Response {
  return { ok, json: async () => body } as Response
}

function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>(resolvePromise => {
    resolve = resolvePromise
  })

  return { promise, resolve }
}

function renderSection() {
  return render(
    <ToastProvider>
      <AgentDefaultsSection />
    </ToastProvider>,
  )
}

describe('AgentDefaultsSection', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'fetch',
      vi.fn((url: string) => {
        if (url === '/api/settings') {
          return Promise.resolve(jsonResponse({ general: { defaultAgent: 'senior-frontend' } }))
        }
        if (url === '/api/agents') {
          return Promise.resolve(
            jsonResponse([
              { definition: { name: 'senior-frontend', description: 'Senior Frontend' } },
              { definition: { name: 'executor', description: 'Executor' } },
            ]),
          )
        }
        return Promise.reject(new Error(`Unexpected URL: ${url}`))
      }),
    )
  })
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('renders a card titled "Agent Defaults" so the section is discoverable in the sidebar', async () => {
    renderSection()

    expect(await screen.findByRole('combobox', { name: 'Default Agent' })).toHaveValue(
      'senior-frontend',
    )
    expect(screen.getByRole('heading', { name: 'Agent Defaults', level: 3 })).toBeInTheDocument()
  })

  it('keeps the loading state visible until the settings response settles', async () => {
    const settingsResponse = deferred<Response>()
    const fetchMock = vi.fn((url: string) => {
      if (url === '/api/settings') return settingsResponse.promise
      if (url === '/api/agents') {
        return Promise.resolve(
          jsonResponse([{ definition: { name: 'executor', description: 'Executor' } }]),
        )
      }
      return Promise.reject(new Error(`Unexpected URL: ${url}`))
    })
    vi.stubGlobal('fetch', fetchMock)

    renderSection()

    expect(screen.getByText('Loading agent defaults...')).toBeInTheDocument()
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith('/api/settings', expect.anything()))

    await act(async () => {
      settingsResponse.resolve(jsonResponse({ general: { defaultAgent: 'executor' } }))
    })

    expect(screen.getByRole('combobox', { name: 'Default Agent' })).toHaveValue('executor')
  })

  it('shows the settings error instead of an editable control', async () => {
    const settingsResponse = deferred<Response>()
    const fetchMock = vi.fn((url: string) => {
      if (url === '/api/settings') return settingsResponse.promise
      if (url === '/api/agents') return Promise.resolve(jsonResponse([]))
      return Promise.reject(new Error(`Unexpected URL: ${url}`))
    })
    vi.stubGlobal('fetch', fetchMock)

    renderSection()

    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith('/api/settings', expect.anything()))
    await act(async () => {
      settingsResponse.resolve(jsonResponse({ error: 'Settings unavailable' }, false))
    })

    expect(await screen.findByText('Settings unavailable')).toBeInTheDocument()
    expect(screen.queryByRole('combobox', { name: 'Default Agent' })).not.toBeInTheDocument()
  })

  it('exposes the default-agent field that lives at /api/settings.general.defaultAgent', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn((url: string) => {
        if (url === '/api/settings') {
          return Promise.resolve(
            jsonResponse({
              general: { defaultAgent: 'senior-frontend' },
              providers: { cacheTTL: 300 },
              websocket: { reconnectInterval: 5000 },
            }),
          )
        }
        if (url === '/api/agents') {
          return Promise.resolve(
            jsonResponse([
              { definition: { name: 'senior-frontend', description: 'Senior Frontend' } },
              { definition: { name: 'executor', description: 'Executor' } },
            ]),
          )
        }
        return Promise.reject(new Error(`Unexpected URL: ${url}`))
      }),
    )

    renderSection()

    const combobox = await screen.findByRole('combobox', { name: 'Default Agent' })
    expect(combobox).toHaveValue('senior-frontend')
    // The agent registry options should populate the <select> after the
    // parallel /api/agents call resolves.
    await waitFor(() => {
      const options = screen.getAllByRole('option') as HTMLOptionElement[]
      const values = options.map(o => o.value)
      expect(values).toEqual(expect.arrayContaining(['', 'senior-frontend', 'executor']))
    })
  })

  it('renders a save button and posts the selected default agent to /api/settings', async () => {
    const user = userEvent.setup()
    const calls: Array<{ url: string; init?: RequestInit }> = []
    const saveResponse = deferred<Response>()
    vi.stubGlobal(
      'fetch',
      vi.fn((url: string, init?: RequestInit) => {
        calls.push({ url, init })
        if (url === '/api/settings' && init?.method === 'PUT') {
          return saveResponse.promise
        }
        if (url === '/api/settings') {
          return Promise.resolve(
            jsonResponse({
              general: { defaultAgent: 'senior-frontend' },
              providers: { cacheTTL: 300 },
              websocket: { reconnectInterval: 5000 },
            }),
          )
        }
        if (url === '/api/agents') {
          return Promise.resolve(
            jsonResponse([
              { definition: { name: 'senior-frontend', description: 'Senior Frontend' } },
              { definition: { name: 'executor', description: 'Executor' } },
            ]),
          )
        }
        return Promise.reject(new Error(`Unexpected URL: ${url}`))
      }),
    )

    renderSection()
    const select = await screen.findByRole('combobox', { name: 'Default Agent' })
    await user.selectOptions(select, 'executor')
    const saveButton = await screen.findByRole('button', { name: /save/i })
    await user.click(saveButton)

    await waitFor(() => {
      const put = calls.find(c => c.init?.method === 'PUT')
      expect(put).toBeDefined()
      expect(put?.url).toBe('/api/settings')
      expect(put?.init?.headers).toEqual({ 'Content-Type': 'application/json' })
      expect(JSON.parse(String(put?.init?.body))).toEqual({ general: { defaultAgent: 'executor' } })
    })

    expect(saveButton).toBeDisabled()
    await act(async () => {
      saveResponse.resolve(jsonResponse({}))
    })

    expect(await screen.findByText('Default agent saved.')).toBeInTheDocument()
    expect(saveButton).toBeEnabled()
  })
})
