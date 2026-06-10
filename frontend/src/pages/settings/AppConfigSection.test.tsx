import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { AppConfigSection } from './AppConfigSection'
import { ToastProvider } from '@/lib/toast'

const mockConfig = {
  general: {
    defaultAgent: 'senior-frontend',
    orchestratorInterval: 30,
    logRetentionDays: 7,
  },
  providers: { cacheTTL: 300 },
  websocket: { reconnectInterval: 5000 },
}

const mockAgents = [
  { definition: { name: 'senior-frontend', description: 'Senior Frontend' } },
  { definition: { name: 'executor', description: 'Executor' } },
]

function mockFetch(
  settingsOverride?: Partial<{ ok: boolean; json: () => Promise<unknown> }>,
  putOverride?: (url: string, options?: RequestInit) => Promise<unknown>,
) {
  vi.stubGlobal(
    'fetch',
    vi.fn((url: string, options?: RequestInit) => {
      if (options?.method === 'PUT' && putOverride) return putOverride(url, options)
      if (url === '/api/settings') {
        if (settingsOverride) return Promise.resolve(settingsOverride)
        return Promise.resolve({ ok: true, json: async () => mockConfig })
      }
      if (url === '/api/agents') return Promise.resolve({ ok: true, json: async () => mockAgents })
      return Promise.reject(new Error('Unknown URL'))
    }),
  )
}

function renderSection() {
  return render(
    <ToastProvider>
      <AppConfigSection />
    </ToastProvider>,
  )
}

describe('AppConfigSection', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('shows loading state initially', () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => new Promise(() => {})),
    )
    renderSection()
    expect(screen.getByText('Loading settings...')).toBeDefined()
  })

  it('loads and displays settings', async () => {
    mockFetch()
    renderSection()
    await waitFor(() => expect(screen.getByRole('combobox')).toBeDefined())
    expect(screen.getByDisplayValue('30')).toBeDefined()
    expect(screen.getByDisplayValue('7')).toBeDefined()
    expect(screen.getByDisplayValue('300')).toBeDefined()
    expect(screen.getByDisplayValue('5000')).toBeDefined()
    expect(screen.getByRole('combobox')).toHaveValue('senior-frontend')
  })

  it('shows error state on fetch failure', async () => {
    mockFetch({ ok: false, json: async () => ({ error: 'Settings unavailable' }) })
    renderSection()
    await waitFor(() => expect(screen.getByText('Failed to load settings')).toBeDefined())
    expect(screen.getByText('Settings unavailable')).toBeDefined()
  })

  it('saves settings successfully and toasts success', async () => {
    const user = userEvent.setup()
    mockFetch(undefined, () => Promise.resolve({ ok: true, json: async () => mockConfig }))
    renderSection()
    await waitFor(() => expect(screen.getByRole('combobox')).toBeDefined())
    await user.click(screen.getByText('Save Settings'))
    await waitFor(() => expect(screen.getByText('Settings saved successfully.')).toBeDefined())
  })

  it('shows error toast on save failure', async () => {
    const user = userEvent.setup()
    mockFetch(undefined, () =>
      Promise.resolve({ ok: false, json: async () => ({ error: 'Save failed' }) }),
    )
    renderSection()
    await waitFor(() => expect(screen.getByRole('combobox')).toBeDefined())
    await user.click(screen.getByText('Save Settings'))
    await waitFor(() => expect(screen.getByText('Save failed')).toBeDefined())
  })

  it('updates default agent via select dropdown', async () => {
    const user = userEvent.setup()
    mockFetch()
    renderSection()
    await waitFor(() => expect(screen.getByRole('combobox')).toBeDefined())
    const select = screen.getByRole('combobox') as HTMLSelectElement
    await user.selectOptions(select, 'executor')
    expect(select).toHaveValue('executor')
  })
})
