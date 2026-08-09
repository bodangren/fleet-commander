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

  it('clears a subscription error when a later successful update arrives', async () => {
    let deliverError: ((error: unknown) => void) | undefined
    let deliverResult: ((value: unknown[]) => void) | undefined
    convexBrowserMocks.onUpdate.mockImplementation(
      (
        _queryName: string,
        _args: Record<string, unknown>,
        onResult: (value: unknown[]) => void,
        onError: (error: unknown) => void,
      ) => {
        deliverResult = onResult
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

    expect(deliverError).toBeTypeOf('function')
    expect(deliverResult).toBeTypeOf('function')
    act(() => deliverError!(new Error('audit offline')))
    expect(result.current.error?.message).toBe('audit offline')

    act(() => deliverResult!([{ _id: 'audit-1' }]))

    expect(result.current.data).toEqual([{ _id: 'audit-1' }])
    expect(result.current.error).toBeNull()
  })

  it('withholds retained data during a refresh and ignores the superseded subscription', async () => {
    const subscriptions: Array<{
      onResult: (value: unknown[]) => void
      onError: (error: unknown) => void
    }> = []
    convexBrowserMocks.onUpdate.mockImplementation(
      (
        _queryName: string,
        _args: Record<string, unknown>,
        onResult: (value: unknown[]) => void,
        onError: (error: unknown) => void,
      ) => {
        subscriptions.push({ onResult, onError })
        return convexBrowserMocks.unsubscribe
      },
    )

    const { useConvexQueryState } = await import('./core')
    const { result, rerender } = renderHook(
      ({ refreshKey }: { refreshKey: number }) =>
        useConvexQueryState<unknown[]>(
          'audit:listAuditEventsHandler',
          {},
          true,
          undefined,
          refreshKey,
        ),
      { initialProps: { refreshKey: 0 } },
    )

    await act(async () => {
      await vi.dynamicImportSettled()
    })
    expect(subscriptions).toHaveLength(1)

    act(() => subscriptions[0].onResult([{ _id: 'audit-1' }]))
    expect(result.current.data).toEqual([{ _id: 'audit-1' }])

    rerender({ refreshKey: 1 })
    expect(result.current.data).toBeUndefined()
    expect(result.current.error).toBeNull()

    act(() => subscriptions[0].onError(new Error('superseded offline')))
    expect(result.current.data).toBeUndefined()
    expect(result.current.error).toBeNull()

    await act(async () => {
      await vi.dynamicImportSettled()
    })
    expect(subscriptions).toHaveLength(2)
    act(() => subscriptions[1].onError(new Error('retry offline')))
    expect(result.current.data).toBeUndefined()
    expect(result.current.error?.message).toBe('retry offline')
  })
})
