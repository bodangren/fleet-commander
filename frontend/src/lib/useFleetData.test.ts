import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { act, renderHook, waitFor } from '@testing-library/react'
import { useFleetData } from './useFleetData'

// Mock the convex data hooks
vi.mock('./useConvexData', () => ({
  useConvexProjectsTransformed: vi.fn(() => null),
  useConvexAgentsTransformed: vi.fn(() => null),
  useConvexHarnessesTransformed: vi.fn(() => null),
}))

describe('useFleetData', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('loads data on mount', async () => {
    const mockFetch = vi.fn((input: string) => {
      if (input.includes('/api/health')) {
        return Promise.resolve({ ok: true, json: async () => ({ message: 'OK' }) })
      }
      if (input.includes('/api/projects')) {
        return Promise.resolve({ ok: true, json: async () => [{ id: 'test', name: 'Test' }] })
      }
      if (input.includes('/api/agents')) {
        return Promise.resolve({ ok: true, json: async () => [] })
      }
      if (input.includes('/api/harnesses')) {
        return Promise.resolve({
          ok: true,
          json: async () => [
            {
              layer: 'bundled',
              binaryFound: true,
              models: ['MiniMax-M3'],
              definition: {
                name: 'minimax-cn-coding-plan',
                binary: 'pi',
                discovery: {
                  command: 'pi --list-models',
                  parseStrategy: 'pi-roster',
                  pattern: 'minimax-cn-coding-plan/*',
                },
                invocation: { template: 'pi --model {model}', flags: {} },
              },
            },
          ],
        })
      }
      return Promise.resolve({ ok: true, json: async () => ({}) })
    })
    vi.stubGlobal('fetch', mockFetch)

    const { result } = renderHook(() => useFleetData())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.healthStatus).toContain('Backend Status')
    expect(result.current.harnesses[0].definition.binary).toBe('pi')
    expect(mockFetch).not.toHaveBeenCalledWith(
      '/api/projects/scan-and-import',
      expect.objectContaining({ method: 'POST' }),
    )
  })

  it('handles fetch errors', async () => {
    const mockFetch = vi.fn(() => Promise.resolve({ ok: false }))
    vi.stubGlobal('fetch', mockFetch)

    const { result } = renderHook(() => useFleetData())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.error).toBeDefined()
  })

  it('fails closed when an agent response claims ready but reports an error', async () => {
    const mockFetch = vi.fn((input: string, init?: RequestInit) => {
      if (input.endsWith('/api/agents/architect/test') && init?.method === 'POST') {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            name: 'architect',
            ok: false,
            status: 'ready',
            latencyMs: 1,
            output: 'misleading success',
            error: 'Provider credentials unavailable',
            readiness: { ok: false, reason: 'Provider credentials unavailable' },
          }),
        })
      }
      if (input.includes('/api/health')) {
        return Promise.resolve({ ok: true, json: async () => ({ message: 'OK' }) })
      }
      return Promise.resolve({ ok: true, json: async () => [] })
    })
    vi.stubGlobal('fetch', mockFetch)
    const { result } = renderHook(() => useFleetData())
    await waitFor(() => expect(result.current.loading).toBe(false))

    await act(async () => {
      await result.current.testAgent('architect')
    })

    expect(result.current.agentTestResult).toMatchObject({
      ok: false,
      status: 'blocked',
      output: '',
      error: 'Provider credentials unavailable',
    })
  })
})
