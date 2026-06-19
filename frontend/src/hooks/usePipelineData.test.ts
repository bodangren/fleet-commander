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

// ──────────────────────────────────────────────────────────────────────────────
// Phase 4 (Red): usePipelineData contract and error-state coverage.
//
// Test-strategy §5 says "extend PipelinesPage.test.tsx to assert response
// shape matches the new server contract and add a malformed-response error
// case." The hook is the layer between fetch and the page; locking the
// contract here protects the page from regressions in either the server
// contract or the hook's shape assumption.
//
// Track: operations_api_contract_closure_20260618
// ──────────────────────────────────────────────────────────────────────────────

describe('Phase 4: usePipelineList — production response shape and error states', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('exposes executions that match the production PipelineExecution shape (executionId, pipelineName, status, startedAt)', async () => {
    const mockExecutions = [
      {
        executionId: 'exec-1',
        pipelineName: 'deploy-prod',
        status: 'succeeded',
        startedAt: 1_700_000_000_000,
        completedAt: 1_700_000_060_000,
      },
    ]
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve({ ok: true, json: async () => mockExecutions })),
    )

    const { result } = renderHook(() => usePipelineList())
    await waitFor(() => expect(result.current.loading).toBe(false))

    // The hook must return the full array unchanged. The page consumes these
    // fields directly (see PipelineList.tsx:79,81,89).
    expect(result.current.executions).toEqual(mockExecutions)
    expect(result.current.error).toBeNull()
  })

  it('sets error when the server returns a 5xx response', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        Promise.resolve({
          ok: false,
          statusText: 'Internal Server Error',
        }),
      ),
    )

    const { result } = renderHook(() => usePipelineList())
    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.error).toBe('Failed to fetch executions')
    expect(result.current.executions).toEqual([])
  })

  it('sets error when the server returns malformed JSON (Red: currently treats as empty array)', async () => {
    // The P3 server contract requires the response to be an array of
    // PipelineExecution objects. A malformed response (e.g. an object or
    // null) is a server-contract violation; the hook must surface it as
    // an error rather than silently passing it downstream.
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: async () => ({ error: 'something went wrong' }),
        }),
      ),
    )

    const { result } = renderHook(() => usePipelineList())
    await waitFor(() => expect(result.current.loading).toBe(false))

    // At HEAD the hook trusts the response and returns it as `executions`,
    // which then breaks PipelineList.tsx (`.length` on an object, `.map` on
    // undefined, etc.). Phase 4 Green must add a guard.
    expect(result.current.error).toBeTruthy()
    expect(result.current.executions).toEqual([])
  })
})
