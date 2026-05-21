import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import {
  usePipelineList,
  triggerPipeline,
  getPipelineStatus,
  getPipelineLogs,
} from './usePipelineData'

describe('usePipelineList', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('returns loading state initially', () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => new Promise(() => {})),
    )
    const { result } = renderHook(() => usePipelineList())
    expect(result.current.loading).toBe(true)
    expect(result.current.executions).toEqual([])
    expect(result.current.error).toBeNull()
  })

  it('returns executions when fetch resolves', async () => {
    const mockExecutions = [
      { executionId: 'exec-1', pipelineName: 'deploy', status: 'succeeded', startedAt: 1712000000 },
    ]
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve({ ok: true, json: async () => mockExecutions })),
    )
    const { result } = renderHook(() => usePipelineList())
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.executions).toEqual(mockExecutions)
    expect(result.current.error).toBeNull()
  })

  it('returns empty list when data is empty array', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve({ ok: true, json: async () => [] })),
    )
    const { result } = renderHook(() => usePipelineList())
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.executions).toEqual([])
    expect(result.current.error).toBeNull()
  })
})

describe('triggerPipeline', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('triggers a pipeline successfully', async () => {
    const mockResponse = { executionId: 'exec-123', status: 'pending' }
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve({ ok: true, json: async () => mockResponse })),
    )

    const result = await triggerPipeline('deploy', { env: { BRANCH: 'main' } })

    expect(result).toEqual(mockResponse)
    expect(fetch).toHaveBeenCalledWith('/api/pipelines/deploy/trigger', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ env: { BRANCH: 'main' } }),
    })
  })

  it('throws on failure', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        Promise.resolve({
          ok: false,
          statusText: 'Bad Request',
          json: async () => ({ message: 'Pipeline not found' }),
        }),
      ),
    )

    await expect(triggerPipeline('nonexistent')).rejects.toThrow('Pipeline not found')
  })

  it('throws generic message when body has no error', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        Promise.resolve({
          ok: false,
          statusText: 'Bad Request',
          json: async () => ({}),
        }),
      ),
    )

    await expect(triggerPipeline('bad')).rejects.toThrow('Failed to trigger pipeline: Bad Request')
  })
})

describe('getPipelineStatus', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('returns status on success', async () => {
    const mockStatus = { status: 'running', startedAt: 1712000000 }
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve({ ok: true, json: async () => mockStatus })),
    )

    const result = await getPipelineStatus('deploy')
    expect(result).toEqual(mockStatus)
  })

  it('throws on failure', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve({ ok: false, statusText: 'Not Found' })),
    )

    await expect(getPipelineStatus('missing')).rejects.toThrow(
      'Failed to fetch pipeline status: Not Found',
    )
  })
})

describe('getPipelineLogs', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('returns logs on success', async () => {
    const mockLogs = { lines: ['line1', 'line2'] }
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve({ ok: true, json: async () => mockLogs })),
    )

    const result = await getPipelineLogs('exec-123')
    expect(result).toEqual(mockLogs)
  })

  it('throws on failure', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve({ ok: false, statusText: 'Gone' })),
    )

    await expect(getPipelineLogs('exec-404')).rejects.toThrow('Failed to fetch pipeline logs: Gone')
  })
})
