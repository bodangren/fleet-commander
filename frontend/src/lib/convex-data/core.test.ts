import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const convexBrowserMocks = vi.hoisted(() => ({
  close: vi.fn(),
  client: vi.fn(),
  onUpdate: vi.fn(),
  unsubscribe: vi.fn(),
}))

vi.mock('convex/browser', () => ({
  ConvexClient: function ConvexClient() {
    convexBrowserMocks.client()
    return {
      close: convexBrowserMocks.close,
      onUpdate: convexBrowserMocks.onUpdate,
    }
  },
}))

import { useConvexQueryState } from './core'

describe('useConvexQueryState', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    convexBrowserMocks.onUpdate.mockReturnValue(convexBrowserMocks.unsubscribe)
  })

  it('retains a subscription error instead of remaining indistinguishably loading', async () => {
    let deliverError: ((error: unknown) => void) | undefined
    convexBrowserMocks.onUpdate.mockImplementation(
      (
        _queryName: string,
        _args: Record<string, unknown>,
        _onResult: (value: unknown) => void,
        onError: (error: unknown) => void,
      ) => {
        deliverError = onError
        return convexBrowserMocks.unsubscribe
      },
    )

    const { result } = renderHook(() =>
      useConvexQueryState<unknown[]>('audit:listAuditEventsHandler', {}, true),
    )

    await waitFor(() => expect(convexBrowserMocks.onUpdate).toHaveBeenCalledOnce())
    act(() => deliverError?.(new Error('audit offline')))

    expect(result.current.data).toBeUndefined()
    expect(result.current.error?.message).toBe('audit offline')
  })
})
