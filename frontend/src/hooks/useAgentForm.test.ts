import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import {
  useAgentForm,
  useAgentLoader,
  useHarnessList,
  useModelDiscovery,
  validateAgentForm,
} from './useAgentForm'

describe('useAgentForm', () => {
  it('initializes with default values', () => {
    const { result } = renderHook(() => useAgentForm())

    expect(result.current.form.name).toBe('')
    expect(result.current.form.description).toBe('')
    expect(result.current.form.mode).toBe('agent')
    expect(result.current.form.harness).toBe('')
    expect(result.current.form.model).toBe('')
    expect(result.current.form.temperature).toBe('0.2')
    expect(result.current.form.tools).toEqual({ write: true, edit: true, bash: true })
    expect(result.current.form.body).toBe('')
  })

  it('setName updates name', () => {
    const { result } = renderHook(() => useAgentForm())
    act(() => result.current.setName('test-agent'))
    expect(result.current.form.name).toBe('test-agent')
  })

  it('setDescription updates description', () => {
    const { result } = renderHook(() => useAgentForm())
    act(() => result.current.setDescription('A test agent'))
    expect(result.current.form.description).toBe('A test agent')
  })

  it('setMode updates mode', () => {
    const { result } = renderHook(() => useAgentForm())
    act(() => result.current.setMode('subagent'))
    expect(result.current.form.mode).toBe('subagent')
  })

  it('setHarness updates harness and clears model', () => {
    const { result } = renderHook(() => useAgentForm())
    act(() => result.current.setModel('gpt-4'))
    act(() => result.current.setHarness('openai'))
    expect(result.current.form.harness).toBe('openai')
    expect(result.current.form.model).toBe('')
  })

  it('setModel updates model', () => {
    const { result } = renderHook(() => useAgentForm())
    act(() => result.current.setModel('claude-3'))
    expect(result.current.form.model).toBe('claude-3')
  })

  it('setTemperature updates temperature', () => {
    const { result } = renderHook(() => useAgentForm())
    act(() => result.current.setTemperature('0.8'))
    expect(result.current.form.temperature).toBe('0.8')
  })

  it('toggleTool updates individual tool', () => {
    const { result } = renderHook(() => useAgentForm())
    act(() => result.current.toggleTool('bash', false))
    expect(result.current.form.tools.bash).toBe(false)
    expect(result.current.form.tools.write).toBe(true)
    expect(result.current.form.tools.edit).toBe(true)
  })

  it('setBody updates body', () => {
    const { result } = renderHook(() => useAgentForm())
    act(() => result.current.setBody('You are helpful.'))
    expect(result.current.form.body).toBe('You are helpful.')
  })

  it('resetForm restores defaults', () => {
    const { result } = renderHook(() => useAgentForm())
    act(() => result.current.setName('modified'))
    act(() => result.current.setDescription('changed'))
    act(() => result.current.resetForm())
    expect(result.current.form.name).toBe('')
    expect(result.current.form.description).toBe('')
  })
})

describe('useAgentLoader', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('sets loading=false immediately for "new" agent', () => {
    const { result } = renderHook(() => useAgentLoader('new', ''))
    expect(result.current.loading).toBe(false)
    expect(result.current.scopeLayer).toBe('new')
  })

  it('fetches agent data on mount for existing agent', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: async () => ({
            layer: 'user',
            definition: {
              name: 'coder',
              description: 'Code writer',
              mode: 'agent',
              model: 'anthropic/claude-3',
              temperature: 0.5,
              tools: { write: true, edit: false, bash: true },
              body: 'Be concise.',
            },
          }),
        }),
      ),
    )

    const { result } = renderHook(() => useAgentLoader('coder', ''))

    const { waitFor: wait } = await import('@testing-library/react')
    await wait(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.scopeLayer).toBe('user')
    expect(result.current.form.name).toBe('coder')
    expect(result.current.form.description).toBe('Code writer')
    expect(result.current.form.harness).toBe('anthropic')
    expect(result.current.form.model).toBe('claude-3')
    expect(result.current.form.temperature).toBe('0.5')
    expect(result.current.form.tools).toEqual({ write: true, edit: false, bash: true })
    expect(result.current.form.body).toBe('Be concise.')
  })

  it('sets error on fetch failure', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        Promise.resolve({
          ok: false,
          json: async () => ({ error: 'Agent not found' }),
        }),
      ),
    )

    const { result } = renderHook(() => useAgentLoader('missing', ''))

    const { waitFor: wait } = await import('@testing-library/react')
    await wait(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.error).toBe('Agent not found')
  })
})

describe('useHarnessList', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('loads harnesses and extracts sorted names', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: async () => [
            { definition: { name: 'claude' } },
            { definition: { name: 'opencode' } },
            { definition: { name: 'aider' } },
          ],
        }),
      ),
    )

    const { result } = renderHook(() => useHarnessList(''))

    const { waitFor: wait } = await import('@testing-library/react')
    await wait(() => {
      expect(result.current.harnesses).toHaveLength(3)
    })

    expect(result.current.harnessNames).toEqual(['aider', 'claude', 'opencode'])
    expect(result.current.error).toBeNull()
  })

  it('sets error on failure', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        Promise.resolve({
          ok: false,
          json: async () => ({ error: 'Failed to load' }),
        }),
      ),
    )

    const { result } = renderHook(() => useHarnessList(''))

    const { waitFor: wait } = await import('@testing-library/react')
    await wait(() => {
      expect(result.current.error).toBe('Failed to load')
    })
  })
})

describe('useModelDiscovery', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('clears models when harness is empty', () => {
    const setModel = vi.fn()
    const { result } = renderHook(() => useModelDiscovery('', '', '', setModel))

    expect(result.current.availableModels).toEqual([])
    expect(result.current.modelLoading).toBe(false)
    expect(result.current.modelError).toBeNull()
  })

  it('fetches models when harness is set', async () => {
    const setModel = vi.fn()
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: async () => ({ models: ['gpt-4', 'gpt-3.5-turbo'] }),
        }),
      ),
    )

    const { result } = renderHook(() => useModelDiscovery('openai', '', '', setModel))

    const { waitFor: wait } = await import('@testing-library/react')
    await wait(() => {
      expect(result.current.modelLoading).toBe(false)
    })

    expect(result.current.availableModels).toEqual(['gpt-4', 'gpt-3.5-turbo'])
    expect(setModel).toHaveBeenCalledWith('gpt-4')
  })

  it('sets model error on failure', async () => {
    const setModel = vi.fn()
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        Promise.resolve({
          ok: false,
          json: async () => ({ error: 'Discovery failed' }),
        }),
      ),
    )

    const { result } = renderHook(() => useModelDiscovery('bad-harness', '', '', setModel))

    const { waitFor: wait } = await import('@testing-library/react')
    await wait(() => {
      expect(result.current.modelLoading).toBe(false)
    })

    expect(result.current.modelError).toBe('Discovery failed')
    expect(result.current.availableModels).toEqual([])
  })

  it('does not override current model if it is in the list', async () => {
    const setModel = vi.fn()
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: async () => ({ models: ['gpt-4', 'gpt-3.5-turbo'] }),
        }),
      ),
    )

    const { result } = renderHook(() => useModelDiscovery('openai', '', 'gpt-4', setModel))

    const { waitFor: wait } = await import('@testing-library/react')
    await wait(() => {
      expect(result.current.modelLoading).toBe(false)
    })

    expect(setModel).not.toHaveBeenCalled()
  })
})

describe('validateAgentForm', () => {
  it('returns errors for missing provider and model', () => {
    const result = validateAgentForm({ name: 'test', provider: '', model: '' })
    expect(result.valid).toBe(false)
    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ field: 'provider' }),
        expect.objectContaining({ field: 'model' }),
      ]),
    )
  })

  it('returns valid: true for a fully populated form', () => {
    const result = validateAgentForm({ name: 'test', provider: 'openai', model: 'gpt-4' })
    expect(result.valid).toBe(true)
    expect(result.errors).toEqual([])
  })

  it('returns an error for missing name', () => {
    const result = validateAgentForm({ name: '', provider: 'openai', model: 'gpt-4' })
    expect(result.valid).toBe(false)
    expect(result.errors).toEqual(
      expect.arrayContaining([expect.objectContaining({ field: 'name' })]),
    )
  })
})
