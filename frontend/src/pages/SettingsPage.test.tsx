import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SettingsPage } from './SettingsPage'

const mockConfig = {
  general: {
    defaultAgent: 'senior-frontend',
    orchestratorInterval: 30,
    logRetentionDays: 7,
  },
  providers: {
    cacheTTL: 300,
  },
  websocket: {
    reconnectInterval: 5000,
  },
}

describe('SettingsPage', () => {
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

    render(<SettingsPage />)

    expect(screen.getByText('Loading settings...')).toBeDefined()
  })

  it('loads and displays settings', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve({ ok: true, json: async () => mockConfig })),
    )

    render(<SettingsPage />)

    await waitFor(() => {
      expect(screen.getByDisplayValue('senior-frontend')).toBeDefined()
    })

    expect(screen.getByDisplayValue('30')).toBeDefined()
    expect(screen.getByDisplayValue('7')).toBeDefined()
    expect(screen.getByDisplayValue('300')).toBeDefined()
    expect(screen.getByDisplayValue('5000')).toBeDefined()
  })

  it('shows error state on fetch failure', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        Promise.resolve({
          ok: false,
          json: async () => ({ error: 'Settings unavailable' }),
        }),
      ),
    )

    render(<SettingsPage />)

    await waitFor(() => {
      expect(screen.getByText('Failed to load settings')).toBeDefined()
    })

    expect(screen.getByText('Settings unavailable')).toBeDefined()
  })

  it('shows error state on network failure', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.reject(new Error('Network error'))),
    )

    render(<SettingsPage />)

    await waitFor(() => {
      expect(screen.getByText('Failed to load settings')).toBeDefined()
    })
  })

  it('saves settings successfully', async () => {
    const user = userEvent.setup()

    vi.stubGlobal(
      'fetch',
      vi.fn((url: string, options?: RequestInit) => {
        if (options?.method === 'PUT') {
          return Promise.resolve({
            ok: true,
            json: async () => mockConfig,
          })
        }
        return Promise.resolve({ ok: true, json: async () => mockConfig })
      }),
    )

    render(<SettingsPage />)

    await waitFor(() => {
      expect(screen.getByDisplayValue('senior-frontend')).toBeDefined()
    })

    await user.click(screen.getByText('Save Settings'))

    await waitFor(() => {
      expect(screen.getByText('Settings saved successfully.')).toBeDefined()
    })
  })

  it('shows error toast on save failure', async () => {
    const user = userEvent.setup()

    vi.stubGlobal(
      'fetch',
      vi.fn((url: string, options?: RequestInit) => {
        if (options?.method === 'PUT') {
          return Promise.resolve({
            ok: false,
            json: async () => ({ error: 'Save failed' }),
          })
        }
        return Promise.resolve({ ok: true, json: async () => mockConfig })
      }),
    )

    render(<SettingsPage />)

    await waitFor(() => {
      expect(screen.getByDisplayValue('senior-frontend')).toBeDefined()
    })

    await user.click(screen.getByText('Save Settings'))

    await waitFor(() => {
      expect(screen.getByText('Save failed')).toBeDefined()
    })
  })

  it('disables save button while saving', async () => {
    const user = userEvent.setup()

    vi.stubGlobal(
      'fetch',
      vi.fn((url: string, options?: RequestInit) => {
        if (options?.method === 'PUT') {
          return new Promise(() => {}) // never resolves
        }
        return Promise.resolve({ ok: true, json: async () => mockConfig })
      }),
    )

    render(<SettingsPage />)

    await waitFor(() => {
      expect(screen.getByDisplayValue('senior-frontend')).toBeDefined()
    })

    await user.click(screen.getByText('Save Settings'))

    await waitFor(() => {
      expect(screen.getByText('Saving...')).toBeDefined()
    })
  })

  it('updates general settings', async () => {
    const user = userEvent.setup()

    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve({ ok: true, json: async () => mockConfig })),
    )

    render(<SettingsPage />)

    await waitFor(() => {
      expect(screen.getByDisplayValue('senior-frontend')).toBeDefined()
    })

    const defaultAgentInput = screen.getByDisplayValue('senior-frontend')
    await user.clear(defaultAgentInput)
    await user.type(defaultAgentInput, 'new-agent')

    expect(defaultAgentInput).toHaveValue('new-agent')
  })
})
