import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'

import { AgentDefaultsSection } from './AgentDefaultsSection'
import { ToastProvider } from '@/lib/toast'

function renderSection() {
  return render(
    <ToastProvider>
      <AgentDefaultsSection />
    </ToastProvider>,
  )
}

describe('AgentDefaultsSection', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('renders a card titled "Agent Defaults" so the section is discoverable in the sidebar', () => {
    renderSection()
    expect(screen.getByRole('heading', { name: 'Agent Defaults', level: 3 })).toBeInTheDocument()
  })

  it('exposes the default-agent field that lives at /api/settings.general.defaultAgent', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn((url: string) => {
        if (url === '/api/settings') {
          return Promise.resolve({
            ok: true,
            json: async () => ({
              general: { defaultAgent: 'senior-frontend' },
              providers: { cacheTTL: 300 },
              websocket: { reconnectInterval: 5000 },
            }),
          })
        }
        if (url === '/api/agents') {
          return Promise.resolve({
            ok: true,
            json: async () => [
              { definition: { name: 'senior-frontend', description: 'Senior Frontend' } },
              { definition: { name: 'executor', description: 'Executor' } },
            ],
          })
        }
        return Promise.reject(new Error(`Unexpected URL: ${url}`))
      }),
    )

    renderSection()

    const combobox = await screen.findByRole('combobox')
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
    const calls: Array<{ url: string; init?: RequestInit }> = []
    vi.stubGlobal(
      'fetch',
      vi.fn((url: string, init?: RequestInit) => {
        calls.push({ url, init })
        if (url === '/api/settings' && init?.method === 'PUT') {
          return Promise.resolve({ ok: true, json: async () => ({}) })
        }
        if (url === '/api/settings') {
          return Promise.resolve({
            ok: true,
            json: async () => ({
              general: { defaultAgent: 'senior-frontend' },
              providers: { cacheTTL: 300 },
              websocket: { reconnectInterval: 5000 },
            }),
          })
        }
        if (url === '/api/agents') {
          return Promise.resolve({
            ok: true,
            json: async () => [
              { definition: { name: 'senior-frontend', description: 'Senior Frontend' } },
            ],
          })
        }
        return Promise.reject(new Error(`Unexpected URL: ${url}`))
      }),
    )

    renderSection()
    await screen.findByRole('combobox')
    // The save button label should make the action obvious. Phase 3 is free to
    // pick a different verb ("Save Defaults", "Apply", etc.) — keep the
    // assertion loose by using a regex.
    const saveButton = await screen.findByRole('button', { name: /save/i })
    saveButton.click()

    await waitFor(() => {
      const put = calls.find(c => c.init?.method === 'PUT')
      expect(put).toBeDefined()
    })
  })
})
