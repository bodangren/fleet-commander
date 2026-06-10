import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

vi.mock('@/lib/useConvexData', async importOriginal => {
  const actual = (await importOriginal()) as Record<string, unknown>
  return {
    ...actual,
    useNotificationPreferences: vi.fn(),
  }
})

import * as useConvexData from '@/lib/useConvexData'
import { NotificationSettingsSection } from './NotificationSettingsSection'
import { ToastProvider } from '@/lib/toast'

const mockedHook = vi.mocked(useConvexData.useNotificationPreferences)

const basePrefs = {
  _id: 'pref1',
  userId: 'admin:system',
  muteAll: false,
  inAppEnabled: true,
  webhookEnabled: false,
  webhookUrl: undefined,
  emailEnabled: false,
  email: undefined,
  updatedAt: 0,
}

function renderSection() {
  return render(
    <ToastProvider>
      <NotificationSettingsSection />
    </ToastProvider>,
  )
}

describe('NotificationSettingsSection', () => {
  beforeEach(() => {
    mockedHook.mockReset()
    mockedHook.mockReturnValue(basePrefs)
    vi.stubGlobal('fetch', vi.fn())
  })
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('renders toggles seeded from the Convex query', () => {
    mockedHook.mockReturnValue({ ...basePrefs, muteAll: true, inAppEnabled: false })
    renderSection()
    expect((screen.getByLabelText('Mute all notifications') as HTMLInputElement).checked).toBe(true)
    expect((screen.getByLabelText('Enable in-app notifications') as HTMLInputElement).checked).toBe(
      false,
    )
  })

  it('shows a loading hint while the query is undefined', () => {
    mockedHook.mockReturnValue(undefined)
    renderSection()
    expect(screen.getByText('Loading preferences...')).toBeDefined()
  })

  it('shows a config hint when Convex is not configured (query returns null)', () => {
    mockedHook.mockReturnValue(null)
    renderSection()
    expect(
      screen.getByText('Convex is not configured — changes will not be persisted.'),
    ).toBeDefined()
  })

  it('optimistically reflects the toggle and POSTs the inverted value', async () => {
    const user = userEvent.setup()
    const calls: Array<Record<string, unknown>> = []
    let resolvePost!: (value: { ok: boolean; json: () => Promise<unknown> }) => void
    vi.stubGlobal(
      'fetch',
      vi.fn((url: string, options?: RequestInit) => {
        if (url === '/api/notifications/preferences' && options?.method === 'POST') {
          calls.push(JSON.parse(options.body as string) as Record<string, unknown>)
          return new Promise(resolve => {
            resolvePost = resolve as typeof resolvePost
          })
        }
        return Promise.reject(new Error('unexpected'))
      }),
    )

    renderSection()
    const muteAll = screen.getByLabelText('Mute all notifications') as HTMLInputElement
    expect(muteAll.checked).toBe(false)

    await user.click(muteAll)

    // Optimistic: UI reflects the new value immediately while the mutation is in-flight.
    expect(muteAll.checked).toBe(true)
    expect(calls.length).toBe(1)
    expect(calls[0]?.muteAll).toBe(true)
    expect(calls[0]?.userId).toBe('admin:system')

    await act(async () => {
      resolvePost({ ok: true, json: async () => ({}) })
    })
    await waitFor(() => {
      expect(screen.getByText('Notification preferences saved.')).toBeDefined()
    })
  })

  it('rolls back the toggle and shows an error toast when the mutation fails', async () => {
    const user = userEvent.setup()
    vi.stubGlobal(
      'fetch',
      vi.fn((url: string, options?: RequestInit) => {
        if (url === '/api/notifications/preferences' && options?.method === 'POST') {
          return Promise.resolve({
            ok: false,
            json: async () => ({ error: 'Preferences write rejected' }),
          })
        }
        return Promise.reject(new Error('unexpected'))
      }),
    )

    renderSection()
    const muteAll = screen.getByLabelText('Mute all notifications') as HTMLInputElement
    expect(muteAll.checked).toBe(false)

    await user.click(muteAll)

    await waitFor(() => {
      expect(screen.getByText('Preferences write rejected')).toBeDefined()
    })
    // Rolled back to the previous value (false).
    expect((screen.getByLabelText('Mute all notifications') as HTMLInputElement).checked).toBe(
      false,
    )
  })

  it('reflects updated query results once the override clears (no source-of-truth race)', async () => {
    const user = userEvent.setup()
    let resolvePost!: (value: { ok: boolean; json: () => Promise<unknown> }) => void
    vi.stubGlobal(
      'fetch',
      vi.fn(
        () =>
          new Promise(resolve => {
            resolvePost = resolve as typeof resolvePost
          }),
      ),
    )

    const { rerender } = renderSection()
    const muteAll = screen.getByLabelText('Mute all notifications') as HTMLInputElement
    await user.click(muteAll)
    expect(muteAll.checked).toBe(true) // optimistic

    // Resolve the mutation and emit the new query result.
    mockedHook.mockReturnValue({ ...basePrefs, muteAll: true })
    await act(async () => {
      resolvePost({ ok: true, json: async () => ({}) })
    })
    rerender(
      <ToastProvider>
        <NotificationSettingsSection />
      </ToastProvider>,
    )

    await waitFor(() => {
      expect((screen.getByLabelText('Mute all notifications') as HTMLInputElement).checked).toBe(
        true,
      )
    })
  })
})
