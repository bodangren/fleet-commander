import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

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

describe('useConvexQueryState', () => {
  beforeEach(() => {
    // core.ts captures VITE_CONVEX_URL at module evaluation. Set the
    // configured-subscription precondition before importing the hook so this
    // contract never depends on an ignored developer .env.local file.
    vi.stubEnv('VITE_CONVEX_URL', 'https://unit-test.convex.cloud')
    vi.resetModules()
    vi.clearAllMocks()
    convexBrowserMocks.onUpdate.mockReturnValue(convexBrowserMocks.unsubscribe)
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    vi.resetModules()
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

    const { useConvexQueryState } = await import('./core')
    const { result } = renderHook(() =>
      useConvexQueryState<unknown[]>('audit:listAuditEventsHandler', {}, true),
    )

    await act(async () => {
      await vi.dynamicImportSettled()
    })

    expect(convexBrowserMocks.client).toHaveBeenCalledOnce()
    expect(convexBrowserMocks.onUpdate).toHaveBeenCalledWith(
      'audit:listAuditEventsHandler',
      {},
      expect.any(Function),
      expect.any(Function),
    )
    expect(deliverError).toBeTypeOf('function')
    act(() => deliverError!(new Error('audit offline')))

    expect(result.current.data).toBeUndefined()
    expect(result.current.error?.message).toBe('audit offline')
  })
})
