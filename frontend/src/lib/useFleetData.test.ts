import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
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
        return Promise.resolve({ ok: true, json: async () => [] })
      }
      return Promise.resolve({ ok: true, json: async () => ({}) })
    })
    vi.stubGlobal('fetch', mockFetch)

    const { result } = renderHook(() => useFleetData())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.healthStatus).toContain('Backend Status')
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
})
