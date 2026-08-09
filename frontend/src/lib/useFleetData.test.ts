import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { act, renderHook, waitFor } from '@testing-library/react'
import { useFleetData } from './useFleetData'

const {
  mockGetSliceConfig,
  mockUseConvexAgentsTransformed,
  mockUseConvexHarnessesTransformed,
  mockUseConvexProjectsTransformed,
} = vi.hoisted(() => ({
  mockGetSliceConfig: vi.fn(),
  mockUseConvexAgentsTransformed: vi.fn(),
  mockUseConvexHarnessesTransformed: vi.fn(),
  mockUseConvexProjectsTransformed: vi.fn(),
}))

vi.mock('./useConvexData', () => ({
  useConvexProjectsTransformed: mockUseConvexProjectsTransformed,
  useConvexAgentsTransformed: mockUseConvexAgentsTransformed,
  useConvexHarnessesTransformed: mockUseConvexHarnessesTransformed,
}))

vi.mock('./dataAdapter', () => ({
  getSliceConfig: mockGetSliceConfig,
}))

const BUN_SOURCES = {
  projects: 'bun',
  agents: 'bun',
  harnesses: 'bun',
  tasks: 'bun',
  issues: 'bun',
  logs: 'bun',
  settings: 'bun',
} as const

const project = {
  id: 'project-reading-advantage',
  slug: 'reading-advantage-llm-benchmark',
  name: 'Reading Advantage LLM Benchmark',
  path: '/workspace/reading-advantage-llm-benchmark',
  tracks: [],
  lastUpdated: 1,
}

const refreshedProject = {
  ...project,
  id: 'project-reading-advantage-refreshed',
  name: 'Reading Advantage LLM Benchmark (refreshed)',
  lastUpdated: 2,
}

const harness = {
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
}

function jsonResponse(body: unknown, ok = true): Response {
  return { ok, json: async () => body } as Response
}

function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (reason?: unknown) => void
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise
    reject = rejectPromise
  })
  return { promise, resolve, reject }
}

describe('useFleetData', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
    mockGetSliceConfig.mockReturnValue(BUN_SOURCES)
    mockUseConvexProjectsTransformed.mockReturnValue(null)
    mockUseConvexAgentsTransformed.mockReturnValue(null)
    mockUseConvexHarnessesTransformed.mockReturnValue(null)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.clearAllMocks()
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

  it('publishes projects while agents and harnesses remain pending', async () => {
    const pendingAgents = deferred<Response>()
    const pendingHarnesses = deferred<Response>()
    const mockFetch = vi.fn((input: string) => {
      if (input === '/api/health') return Promise.resolve(jsonResponse({ message: 'OK' }))
      if (input === '/api/projects') return Promise.resolve(jsonResponse([project]))
      if (input === '/api/agents') return pendingAgents.promise
      if (input === '/api/harnesses') return pendingHarnesses.promise
      throw new Error(`Unexpected request: ${input}`)
    })
    vi.stubGlobal('fetch', mockFetch)

    const { result } = renderHook(() => useFleetData())

    await waitFor(() => expect(result.current.projects).toEqual([project]))

    expect(result.current.projectsLoading).toBe(false)
    expect(result.current.projectsError).toBeNull()
    expect(result.current.healthLoading).toBe(false)
    expect(result.current.healthError).toBeNull()
    expect(result.current.agentsLoading).toBe(true)
    expect(result.current.harnessesLoading).toBe(true)
  })

  it('settles a successful empty Bun project response without representing it as a project failure', async () => {
    const mockFetch = vi.fn((input: string) => {
      if (input === '/api/health') return Promise.resolve(jsonResponse({ message: 'OK' }))
      if (input === '/api/projects') return Promise.resolve(jsonResponse([]))
      if (input === '/api/agents') return Promise.resolve(jsonResponse([]))
      if (input === '/api/harnesses') return Promise.resolve(jsonResponse([harness]))
      throw new Error(`Unexpected request: ${input}`)
    })
    vi.stubGlobal('fetch', mockFetch)

    const { result } = renderHook(() => useFleetData())

    await waitFor(() => expect(result.current.projectsLoading).toBe(false))

    expect(result.current.projects).toEqual([])
    expect(result.current.projectsError).toBeNull()
    expect(result.current.loading).toBe(false)
  })

  it('keeps projects ready when only the agent catalog fails', async () => {
    const mockFetch = vi.fn((input: string) => {
      if (input === '/api/health') return Promise.resolve(jsonResponse({ message: 'OK' }))
      if (input === '/api/projects') return Promise.resolve(jsonResponse([project]))
      if (input === '/api/agents') {
        return Promise.resolve(jsonResponse({ error: 'Agent catalog unavailable' }, false))
      }
      if (input === '/api/harnesses') return Promise.resolve(jsonResponse([harness]))
      throw new Error(`Unexpected request: ${input}`)
    })
    vi.stubGlobal('fetch', mockFetch)

    const { result } = renderHook(() => useFleetData())

    await waitFor(() => expect(result.current.agentsLoading).toBe(false))

    expect(result.current.projects).toEqual([project])
    expect(result.current.projectsLoading).toBe(false)
    expect(result.current.projectsError).toBeNull()
    expect(result.current.agentsError).toMatch(/agent catalog unavailable/i)
    expect(result.current.healthError).toBeNull()
    expect(result.current.harnessesError).toBeNull()
    expect(mockFetch.mock.calls.filter(([input]) => input === '/api/projects')).toHaveLength(1)
  })

  it('keeps projects ready when only backend health fails', async () => {
    const mockFetch = vi.fn((input: string) => {
      if (input === '/api/health') {
        return Promise.resolve(jsonResponse({ error: 'Backend health unavailable' }, false))
      }
      if (input === '/api/projects') return Promise.resolve(jsonResponse([project]))
      if (input === '/api/agents') return Promise.resolve(jsonResponse([]))
      if (input === '/api/harnesses') return Promise.resolve(jsonResponse([harness]))
      throw new Error(`Unexpected request: ${input}`)
    })
    vi.stubGlobal('fetch', mockFetch)

    const { result } = renderHook(() => useFleetData())

    await waitFor(() => expect(result.current.healthLoading).toBe(false))

    expect(result.current.projects).toEqual([project])
    expect(result.current.projectsLoading).toBe(false)
    expect(result.current.projectsError).toBeNull()
    expect(result.current.healthError).toMatch(/backend health unavailable/i)
    expect(result.current.agentsError).toBeNull()
    expect(result.current.harnessesError).toBeNull()
    expect(mockFetch.mock.calls.filter(([input]) => input === '/api/projects')).toHaveLength(1)
  })

  it.each([
    [
      'a non-OK response',
      () => Promise.resolve(jsonResponse({ error: 'Pi catalog unavailable' }, false)),
    ],
    ['a rejected response', () => Promise.reject(new Error('Pi catalog offline'))],
  ])(
    'keeps projects ready and retries only harnesses after %s',
    async (_description, firstHarnessResponse) => {
      let harnessAttempts = 0
      const mockFetch = vi.fn((input: string) => {
        if (input === '/api/health') return Promise.resolve(jsonResponse({ message: 'OK' }))
        if (input === '/api/projects') return Promise.resolve(jsonResponse([project]))
        if (input === '/api/agents') return Promise.resolve(jsonResponse([]))
        if (input === '/api/harnesses') {
          harnessAttempts += 1
          return harnessAttempts === 1
            ? firstHarnessResponse()
            : Promise.resolve(jsonResponse([harness]))
        }
        throw new Error(`Unexpected request: ${input}`)
      })
      vi.stubGlobal('fetch', mockFetch)

      const { result } = renderHook(() => useFleetData())

      await waitFor(() => expect(result.current.harnessesLoading).toBe(false))
      expect(result.current.projects).toEqual([project])
      expect(result.current.projectsError).toBeNull()
      expect(result.current.harnessesError).toBeTruthy()
      expect(result.current.agentsError).toBeNull()

      await act(async () => {
        await result.current.refreshHarnesses()
      })

      expect(mockFetch.mock.calls.filter(([input]) => input === '/api/harnesses')).toHaveLength(2)
      expect(mockFetch.mock.calls.filter(([input]) => input === '/api/projects')).toHaveLength(1)
      expect(result.current.harnesses).toEqual([harness])
      expect(result.current.harnessesError).toBeNull()
      expect(result.current.harnessesLoading).toBe(false)
    },
  )

  it('exposes project failure separately from an empty project list and retries only projects', async () => {
    let projectAttempts = 0
    const mockFetch = vi.fn((input: string) => {
      if (input === '/api/health') return Promise.resolve(jsonResponse({ message: 'OK' }))
      if (input === '/api/projects') {
        projectAttempts += 1
        return projectAttempts === 1
          ? Promise.resolve(jsonResponse({ error: 'Project catalog unavailable' }, false))
          : Promise.resolve(jsonResponse([project]))
      }
      if (input === '/api/agents') return Promise.resolve(jsonResponse([]))
      if (input === '/api/harnesses') return Promise.resolve(jsonResponse([harness]))
      throw new Error(`Unexpected request: ${input}`)
    })
    vi.stubGlobal('fetch', mockFetch)

    const { result } = renderHook(() => useFleetData())

    await waitFor(() => expect(result.current.projectsLoading).toBe(false))
    expect(result.current.projects).toEqual([])
    expect(result.current.projectsError).toBeTruthy()
    expect(result.current.projectsError).toMatch(/project catalog unavailable/i)

    await act(async () => {
      await result.current.refreshProjects()
    })

    expect(mockFetch.mock.calls.filter(([input]) => input === '/api/projects')).toHaveLength(2)
    expect(mockFetch.mock.calls.filter(([input]) => input === '/api/agents')).toHaveLength(1)
    expect(mockFetch.mock.calls.filter(([input]) => input === '/api/harnesses')).toHaveLength(1)
    expect(result.current.projects).toEqual([project])
    expect(result.current.projectsError).toBeNull()
    expect(result.current.projectsLoading).toBe(false)
  })

  it('does not let a slower initial project request overwrite a faster scoped retry', async () => {
    const firstProjectsResponse = deferred<Response>()
    let projectRequests = 0
    const mockFetch = vi.fn((input: string) => {
      if (input === '/api/health') return Promise.resolve(jsonResponse({ message: 'OK' }))
      if (input === '/api/projects') {
        projectRequests += 1
        return projectRequests === 1
          ? firstProjectsResponse.promise
          : Promise.resolve(jsonResponse([refreshedProject]))
      }
      if (input === '/api/agents') return Promise.resolve(jsonResponse([]))
      if (input === '/api/harnesses') return Promise.resolve(jsonResponse([harness]))
      throw new Error(`Unexpected request: ${input}`)
    })
    vi.stubGlobal('fetch', mockFetch)

    const { result } = renderHook(() => useFleetData())

    await waitFor(() => expect(projectRequests).toBe(1))
    await act(async () => {
      await result.current.refreshProjects()
    })

    expect(result.current.projects).toEqual([refreshedProject])
    expect(result.current.projectsLoading).toBe(false)
    expect(mockFetch.mock.calls.filter(([input]) => input === '/api/projects')).toHaveLength(2)
    expect(mockFetch.mock.calls.filter(([input]) => input === '/api/agents')).toHaveLength(1)
    expect(mockFetch.mock.calls.filter(([input]) => input === '/api/harnesses')).toHaveLength(1)

    await act(async () => {
      firstProjectsResponse.resolve(jsonResponse([project]))
      await firstProjectsResponse.promise
    })

    await waitFor(() => expect(result.current.projects).toEqual([refreshedProject]))
    expect(result.current.projectsError).toBeNull()
  })

  it('does not request Bun projects or agents when those slices are configured for Convex', async () => {
    mockGetSliceConfig.mockReturnValue({ ...BUN_SOURCES, projects: 'convex', agents: 'convex' })
    mockUseConvexProjectsTransformed.mockReturnValue([project])
    mockUseConvexAgentsTransformed.mockReturnValue([])
    const mockFetch = vi.fn((input: string) => {
      if (input === '/api/health') return Promise.resolve(jsonResponse({ message: 'OK' }))
      if (input === '/api/harnesses') return Promise.resolve(jsonResponse([harness]))
      throw new Error(`Bun must not receive ${input} when its slice is Convex-backed`)
    })
    vi.stubGlobal('fetch', mockFetch)

    const { result } = renderHook(() => useFleetData())

    await waitFor(() => expect(mockFetch).toHaveBeenCalledWith('/api/health'))
    expect(mockFetch).not.toHaveBeenCalledWith('/api/projects')
    expect(mockFetch).not.toHaveBeenCalledWith('/api/agents')
    expect(result.current.projects).toEqual([project])
  })

  it('clears a Convex project error when a later subscription result is defined', async () => {
    let onProjectsError: ((error: unknown) => void) | undefined
    const convexProjects: { current: (typeof project)[] | undefined } = {
      current: undefined,
    }
    mockGetSliceConfig.mockReturnValue({ ...BUN_SOURCES, projects: 'convex' })
    mockUseConvexProjectsTransformed.mockImplementation(onError => {
      onProjectsError = onError
      return convexProjects.current
    })
    const mockFetch = vi.fn((input: string) => {
      if (input === '/api/health') return Promise.resolve(jsonResponse({ message: 'OK' }))
      if (input === '/api/agents') return Promise.resolve(jsonResponse([]))
      if (input === '/api/harnesses') return Promise.resolve(jsonResponse([harness]))
      throw new Error(`Convex-backed projects must not fetch ${input}`)
    })
    vi.stubGlobal('fetch', mockFetch)

    const { result, rerender } = renderHook(() => useFleetData())

    await waitFor(() => expect(onProjectsError).toBeTypeOf('function'))
    act(() => onProjectsError!(new Error('Convex project subscription offline')))

    await waitFor(() => expect(result.current.projectsError).toMatch(/subscription offline/i))
    expect(result.current.projectsLoading).toBe(false)

    convexProjects.current = [project]
    rerender()

    await waitFor(() => expect(result.current.projects).toEqual([project]))
    expect(result.current.projectsLoading).toBe(false)
    expect(result.current.projectsError).toBeNull()
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
