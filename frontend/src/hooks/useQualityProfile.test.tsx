/**
 * Phase S4 Red tests for `frontend/src/hooks/useQualityProfile.ts`.
 *
 * These tests pin the S4 hook contract for the settings surface. They
 * cover the four sub-bullets of the S4 settings acceptance:
 *
 *   1. List profiles (with stable order: none, standard, strict,
 *      then any user-published versions).
 *   2. Read the effective project profile (defaults to none/v1 when
 *      no project selection exists).
 *   3. Read the effective task profile (task override > project
 *      selection > none).
 *   4. Pin the selected profile version in the snapshot view: once
 *      a project has selected "strict@v1", later versions of the
 *      strict profile must not retroactively change the project
 *      selection — the version is captured at selection time.
 *
 * The hook is consumed by the S4 `QualityProfileSection` and the
 * S4 quality-run / quality-attempt views; it is the typed bridge
 * between the frontend and the S1 Convex contract.
 *
 * The hook under test does not exist yet. These tests are
 * intentionally Red and are committed under the `*.test.tsx` suffix.
 * The Green sibling lands when `useQualityProfile.ts` is implemented
 * and these tests pass.
 *
 * Owned by Phase S4 Test task 1.
 */

import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { act, renderHook, waitFor } from '@testing-library/react'

import { useQualityProfile } from './useQualityProfile'

const NONE_V1 = {
  name: 'none',
  version: 1,
  kind: 'none',
  description: 'No quality workflow',
  stages: [],
}
const STANDARD_V1 = {
  name: 'standard',
  version: 1,
  kind: 'standard',
  description: 'Standard quality workflow',
  stages: [
    { kind: 'red', policy: { required: true, role: 'executor', attempts: 1, timeoutMs: 600_000 } },
    {
      kind: 'green',
      policy: { required: true, role: 'executor', attempts: 1, timeoutMs: 600_000 },
    },
  ],
}
const STRICT_V1 = {
  name: 'strict',
  version: 1,
  kind: 'strict',
  description: 'Full strict quality workflow v1',
  stages: [
    {
      kind: 'strategy',
      policy: { required: true, role: 'architect', attempts: 1, timeoutMs: 300_000 },
    },
    { kind: 'red', policy: { required: true, role: 'executor', attempts: 1, timeoutMs: 600_000 } },
    {
      kind: 'green',
      policy: { required: true, role: 'executor', attempts: 1, timeoutMs: 600_000 },
    },
  ],
}
const STRICT_V2 = {
  ...STRICT_V1,
  version: 2,
  description: 'Full strict quality workflow v2 (new stage added)',
  stages: [
    ...STRICT_V1.stages,
    {
      kind: 'adversarial',
      policy: { required: true, role: 'reviewer', attempts: 1, timeoutMs: 600_000 },
    },
  ],
}

describe('useQualityProfile (S4 hook)', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  function mockFetchSequence(responses: Array<{ match: (url: string) => boolean; body: unknown }>) {
    const fetcher = vi.fn(async (input: RequestInfo | URL) => {
      const url = typeof input === 'string' ? input : input.toString()
      const r = responses.find(r => r.match(url))
      if (!r) throw new Error(`Unexpected fetch: ${url}`)
      return { ok: true, json: async () => r.body } as Response
    })
    vi.stubGlobal('fetch', fetcher)
    return fetcher
  }

  it('returns loading=true on first render and resolves with the profiles list', async () => {
    mockFetchSequence([
      {
        match: u => u.endsWith('/api/quality/profiles'),
        body: [NONE_V1, STANDARD_V1, STRICT_V1],
      },
      {
        match: u => /\/api\/quality\/projects\/[^/]+\/profile$/.test(u),
        body: { profileName: 'none', profileVersion: 1, source: 'default' },
      },
    ])
    const { result } = renderHook(() => useQualityProfile('fleet-commander'))
    expect(result.current.loading).toBe(true)
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.profiles?.map(p => p.name)).toEqual(['none', 'standard', 'strict'])
  })

  it('returns the effective project profile (defaults to none/v1/source=default)', async () => {
    mockFetchSequence([
      { match: u => u.endsWith('/api/quality/profiles'), body: [NONE_V1, STANDARD_V1, STRICT_V1] },
      {
        match: u => /\/api\/quality\/projects\/[^/]+\/profile$/.test(u),
        body: { profileName: 'none', profileVersion: 1, source: 'default' },
      },
    ])
    const { result } = renderHook(() => useQualityProfile('fleet-commander'))
    await waitFor(() => expect(result.current.effectiveProjectProfile).toBeDefined())
    expect(result.current.effectiveProjectProfile).toEqual({
      profileName: 'none',
      profileVersion: 1,
      source: 'default',
    })
  })

  it('returns the effective project profile when one is selected (source=project)', async () => {
    mockFetchSequence([
      { match: u => u.endsWith('/api/quality/profiles'), body: [NONE_V1, STANDARD_V1, STRICT_V1] },
      {
        match: u => /\/api\/quality\/projects\/[^/]+\/profile$/.test(u),
        body: { profileName: 'strict', profileVersion: 1, source: 'project' },
      },
    ])
    const { result } = renderHook(() => useQualityProfile('fleet-commander'))
    await waitFor(() => expect(result.current.effectiveProjectProfile?.source).toBe('project'))
    expect(result.current.effectiveProjectProfile).toEqual({
      profileName: 'strict',
      profileVersion: 1,
      source: 'project',
    })
  })

  it('pins the selected profile version in the snapshot view (immutable) — the project selection does not advance when the source strict@v2 is published', async () => {
    const fetcher = mockFetchSequence([
      { match: u => u.endsWith('/api/quality/profiles'), body: [NONE_V1, STANDARD_V1, STRICT_V1] },
      {
        match: u => /\/api\/quality\/projects\/[^/]+\/profile$/.test(u),
        body: { profileName: 'strict', profileVersion: 1, source: 'project' },
      },
    ])
    const { result } = renderHook(() => useQualityProfile('fleet-commander'))
    await waitFor(() => expect(result.current.effectiveProjectProfile?.profileName).toBe('strict'))
    expect(result.current.effectiveProjectProfile?.profileVersion).toBe(1)

    // Simulate the source profile advancing: the next refetch returns
    // a new published v2 in the profiles list, but the project
    // selection (separate query) still returns strict@v1 because
    // the selection was recorded at v1.
    fetcher.mockImplementation(async (input: RequestInfo | URL) => {
      const url = typeof input === 'string' ? input : input.toString()
      if (url.endsWith('/api/quality/profiles')) {
        return { ok: true, json: async () => [NONE_V1, STANDARD_V1, STRICT_V2] } as Response
      }
      if (/\/api\/quality\/projects\/[^/]+\/profile$/.test(url)) {
        return {
          ok: true,
          json: async () => ({ profileName: 'strict', profileVersion: 1, source: 'project' }),
        } as Response
      }
      throw new Error(`Unexpected fetch: ${url}`)
    })

    await act(async () => {
      await result.current.refresh()
    })

    await waitFor(() =>
      expect(result.current.profiles?.find(p => p.name === 'strict')?.version).toBe(2),
    )
    expect(result.current.effectiveProjectProfile?.profileVersion).toBe(1)
  })

  it('returns a populated effectiveTaskProfile when a task override exists (source=task-override)', async () => {
    mockFetchSequence([
      { match: u => u.endsWith('/api/quality/profiles'), body: [NONE_V1, STANDARD_V1, STRICT_V1] },
      {
        match: u => /\/api\/quality\/projects\/[^/]+\/profile$/.test(u),
        body: { profileName: 'standard', profileVersion: 1, source: 'project' },
      },
      {
        match: u => /\/api\/quality\/projects\/[^/]+\/tasks\/[^/]+\/profile$/.test(u),
        body: { profileName: 'strict', profileVersion: 1, source: 'task-override' },
      },
    ])
    const { result } = renderHook(() => useQualityProfile('fleet-commander', 'task-1'))
    await waitFor(() => expect(result.current.effectiveTaskProfile?.source).toBe('task-override'))
    expect(result.current.effectiveTaskProfile).toEqual({
      profileName: 'strict',
      profileVersion: 1,
      source: 'task-override',
    })
  })

  it('exposes an error string when the profiles query fails', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL) => {
        const url = typeof input === 'string' ? input : input.toString()
        if (url.endsWith('/api/quality/profiles')) {
          return { ok: false, status: 500, json: async () => ({}) } as Response
        }
        return { ok: true, json: async () => ({}) } as Response
      }),
    )
    const { result } = renderHook(() => useQualityProfile('fleet-commander'))
    await waitFor(() => expect(result.current.error).toBeTruthy())
    expect(result.current.error).toMatch(/quality profiles|500|failed/i)
  })

  it('does not fetch when projectSlug is empty (defensive: no project selected)', async () => {
    const fetcher = vi.fn()
    vi.stubGlobal('fetch', fetcher)
    const { result } = renderHook(() => useQualityProfile(''))
    expect(fetcher).not.toHaveBeenCalled()
    expect(result.current.loading).toBe(false)
  })
})
