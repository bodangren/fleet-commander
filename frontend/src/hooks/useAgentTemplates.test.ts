import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { useAgentTemplates, useAgentTemplateEditor } from './useAgentTemplates'

describe('useAgentTemplates', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('loads templates on mount', async () => {
    const mockTemplates = [
      {
        _id: 't1',
        name: 'alice',
        role: 'executor',
        model: 'claude-sonnet',
        temperature: 0.3,
        systemPrompt: '',
        skills: [],
        estimatedCostPer1kTokens: 0.003,
        createdAt: 1,
        updatedAt: 1,
      },
    ]
    const mockFetch = vi.fn(() => Promise.resolve({ ok: true, json: async () => mockTemplates }))
    vi.stubGlobal('fetch', mockFetch)

    const { result } = renderHook(() => useAgentTemplates())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.templates).toEqual(mockTemplates)
    expect(result.current.error).toBeNull()
    expect(mockFetch).toHaveBeenCalledWith('/api/agent-templates')
  })

  it('sets error on fetch failure', async () => {
    const mockFetch = vi.fn(() => Promise.resolve({ ok: false, json: async () => ({}) }))
    vi.stubGlobal('fetch', mockFetch)

    const { result } = renderHook(() => useAgentTemplates())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.error).toBe('Failed to load templates')
    expect(result.current.templates).toEqual([])
  })

  it('sets error on network failure', async () => {
    const mockFetch = vi.fn(() => Promise.reject(new Error('Network error')))
    vi.stubGlobal('fetch', mockFetch)

    const { result } = renderHook(() => useAgentTemplates())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.error).toBe('Network error')
  })

  it('cloneTemplate calls POST and refreshes', async () => {
    const initialTemplates = [
      {
        _id: 't1',
        name: 'alice',
        role: 'executor',
        model: 'claude-sonnet',
        temperature: 0.3,
        systemPrompt: '',
        skills: [],
        estimatedCostPer1kTokens: 0.003,
        createdAt: 1,
        updatedAt: 1,
      },
    ]
    const clonedTemplates = [
      ...initialTemplates,
      {
        _id: 't2',
        name: 'alice-clone',
        role: 'executor',
        model: 'claude-sonnet',
        temperature: 0.3,
        systemPrompt: '',
        skills: [],
        estimatedCostPer1kTokens: 0.003,
        createdAt: 2,
        updatedAt: 2,
      },
    ]

    let callCount = 0
    const mockFetch = vi.fn((input: string, init?: RequestInit) => {
      if (input === '/api/agent-templates' && !init) {
        callCount++
        const data = callCount === 1 ? initialTemplates : clonedTemplates
        return Promise.resolve({ ok: true, json: async () => data })
      }
      if (input.includes('/clone')) {
        return Promise.resolve({ ok: true, json: async () => ({}) })
      }
      return Promise.resolve({ ok: true, json: async () => [] })
    })
    vi.stubGlobal('fetch', mockFetch)

    const { result } = renderHook(() => useAgentTemplates())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    await act(async () => {
      await result.current.cloneTemplate('t1', 'alice-clone')
    })

    await waitFor(() => {
      expect(result.current.templates).toEqual(clonedTemplates)
    })
  })

  it('cloneTemplate sets error on failure', async () => {
    const mockFetch = vi.fn((input: string, init?: RequestInit) => {
      if (input === '/api/agent-templates' && !init) {
        return Promise.resolve({ ok: true, json: async () => [] })
      }
      if (input.includes('/clone')) {
        return Promise.resolve({ ok: false, json: async () => ({ message: 'Name taken' }) })
      }
      return Promise.resolve({ ok: true, json: async () => [] })
    })
    vi.stubGlobal('fetch', mockFetch)

    const { result } = renderHook(() => useAgentTemplates())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    await act(async () => {
      await result.current.cloneTemplate('t1', 'alice-clone')
    })

    await waitFor(() => {
      expect(result.current.error).toBe('Name taken')
    })
  })

  it('deleteTemplate calls DELETE and refreshes', async () => {
    const mockFetch = vi.fn((input: string, init?: RequestInit) => {
      if (input === '/api/agent-templates' && !init) {
        return Promise.resolve({ ok: true, json: async () => [] })
      }
      if (input.includes('/api/agent-templates/') && init?.method === 'DELETE') {
        return Promise.resolve({ ok: true, json: async () => ({}) })
      }
      return Promise.resolve({ ok: true, json: async () => [] })
    })
    vi.stubGlobal('fetch', mockFetch)

    const { result } = renderHook(() => useAgentTemplates())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    await act(async () => {
      await result.current.deleteTemplate('t1')
    })

    await waitFor(() => {
      expect(result.current.error).toBeNull()
    })
  })

  it('deleteTemplate sets error on failure', async () => {
    const mockFetch = vi.fn((input: string, init?: RequestInit) => {
      if (input === '/api/agent-templates' && !init) {
        return Promise.resolve({ ok: true, json: async () => [] })
      }
      if (init?.method === 'DELETE') {
        return Promise.resolve({ ok: false, json: async () => ({ message: 'Not found' }) })
      }
      return Promise.resolve({ ok: true, json: async () => [] })
    })
    vi.stubGlobal('fetch', mockFetch)

    const { result } = renderHook(() => useAgentTemplates())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    await act(async () => {
      await result.current.deleteTemplate('t1')
    })

    await waitFor(() => {
      expect(result.current.error).toBe('Not found')
    })
  })

  it('seedDefaults calls POST and returns ok on success', async () => {
    const mockFetch = vi.fn((input: string, init?: RequestInit) => {
      if (input === '/api/agent-templates' && !init) {
        return Promise.resolve({ ok: true, json: async () => [] })
      }
      if (input.includes('/seed-defaults')) {
        return Promise.resolve({ ok: true, json: async () => ({}) })
      }
      return Promise.resolve({ ok: true, json: async () => [] })
    })
    vi.stubGlobal('fetch', mockFetch)

    const { result } = renderHook(() => useAgentTemplates())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    let seedResult: { ok: true } | { ok: false; error: string } = { ok: false, error: '' }
    await act(async () => {
      seedResult = await result.current.seedDefaults()
    })

    expect(seedResult.ok).toBe(true)
    expect(result.current.error).toBeNull()
  })

  it('seedDefaults returns error and sets error on failure', async () => {
    const mockFetch = vi.fn((input: string, init?: RequestInit) => {
      if (input === '/api/agent-templates' && !init) {
        return Promise.resolve({ ok: true, json: async () => [] })
      }
      if (input.includes('/seed-defaults')) {
        return Promise.resolve({ ok: false, json: async () => ({}) })
      }
      return Promise.resolve({ ok: true, json: async () => [] })
    })
    vi.stubGlobal('fetch', mockFetch)

    const { result } = renderHook(() => useAgentTemplates())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    let seedResult: { ok: true } | { ok: false; error: string } = { ok: true }
    await act(async () => {
      seedResult = await result.current.seedDefaults()
    })

    expect(seedResult.ok).toBe(false)
    if (!seedResult.ok) {
      expect(seedResult.error).toBe('Seed failed')
    }
    await waitFor(() => {
      expect(result.current.error).toBe('Seed failed')
    })
  })

  it('clearError resets error state', async () => {
    const mockFetch = vi.fn(() => Promise.resolve({ ok: false, json: async () => ({}) }))
    vi.stubGlobal('fetch', mockFetch)

    const { result } = renderHook(() => useAgentTemplates())

    await waitFor(() => {
      expect(result.current.error).not.toBeNull()
    })

    act(() => {
      result.current.clearError()
    })
    expect(result.current.error).toBeNull()
  })
})

describe('useAgentTemplateEditor', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('does not fetch when id is "new"', () => {
    const mockFetch = vi.fn(() => Promise.resolve({ ok: true, json: async () => ({}) }))
    vi.stubGlobal('fetch', mockFetch)

    const { result } = renderHook(() => useAgentTemplateEditor('new'))

    expect(result.current.loading).toBe(false)
    expect(result.current.template).toBeNull()
    expect(mockFetch).not.toHaveBeenCalled()
  })

  it('fetches template when id is not "new"', async () => {
    const mockTmpl = {
      _id: 't1',
      name: 'alice',
      role: 'executor',
      model: 'claude-sonnet',
      temperature: 0.3,
      systemPrompt: 'test',
      skills: ['react'],
      estimatedCostPer1kTokens: 0.003,
      createdAt: 1,
      updatedAt: 1,
    }
    const mockFetch = vi.fn(() => Promise.resolve({ ok: true, json: async () => mockTmpl }))
    vi.stubGlobal('fetch', mockFetch)

    const { result } = renderHook(() => useAgentTemplateEditor('t1'))

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.template).toEqual(mockTmpl)
    expect(result.current.error).toBeNull()
    expect(mockFetch).toHaveBeenCalledWith('/api/agent-templates/t1')
  })

  it('sets error when fetch fails', async () => {
    const mockFetch = vi.fn(() => Promise.resolve({ ok: false, json: async () => ({}) }))
    vi.stubGlobal('fetch', mockFetch)

    const { result } = renderHook(() => useAgentTemplateEditor('t1'))

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.error).toBe('Template not found')
  })

  it('saveTemplate creates new template via POST', async () => {
    const mockFetch = vi.fn((input: string, init?: RequestInit) => {
      if (input === '/api/agent-templates' && init?.method === 'POST') {
        return Promise.resolve({ ok: true, json: async () => ({}) })
      }
      return Promise.resolve({ ok: true, json: async () => ({}) })
    })
    vi.stubGlobal('fetch', mockFetch)

    const { result } = renderHook(() => useAgentTemplateEditor('new'))

    let success = false
    await act(async () => {
      success = await result.current.saveTemplate({
        name: 'alice',
        role: 'executor',
        model: 'claude-sonnet',
        temperature: 0.3,
        systemPrompt: '',
        skills: [],
        estimatedCostPer1kTokens: 0.003,
      })
    })

    expect(success).toBe(true)
    expect(mockFetch).toHaveBeenCalledWith(
      '/api/agent-templates',
      expect.objectContaining({ method: 'POST' }),
    )
  })

  it('saveTemplate updates existing template via PATCH', async () => {
    const mockTmpl = {
      _id: 't1',
      name: 'alice',
      role: 'executor',
      model: 'claude-sonnet',
      temperature: 0.3,
      systemPrompt: '',
      skills: [],
      estimatedCostPer1kTokens: 0.003,
      createdAt: 1,
      updatedAt: 1,
    }
    const mockFetch = vi.fn((input: string, init?: RequestInit) => {
      if (input === '/api/agent-templates/t1' && !init) {
        return Promise.resolve({ ok: true, json: async () => mockTmpl })
      }
      if (input === '/api/agent-templates/t1' && init?.method === 'PATCH') {
        return Promise.resolve({ ok: true, json: async () => ({}) })
      }
      return Promise.resolve({ ok: true, json: async () => ({}) })
    })
    vi.stubGlobal('fetch', mockFetch)

    const { result } = renderHook(() => useAgentTemplateEditor('t1'))

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    let success = false
    await act(async () => {
      success = await result.current.saveTemplate({
        name: 'alice',
        role: 'executor',
        model: 'claude-sonnet',
        temperature: 0.3,
        systemPrompt: 'updated',
        skills: [],
        estimatedCostPer1kTokens: 0.003,
      })
    })

    expect(success).toBe(true)
    expect(mockFetch).toHaveBeenCalledWith(
      '/api/agent-templates/t1',
      expect.objectContaining({ method: 'PATCH' }),
    )
  })

  it('saveTemplate returns false when name is empty', async () => {
    const { result } = renderHook(() => useAgentTemplateEditor('new'))

    let success = true
    await act(async () => {
      success = await result.current.saveTemplate({
        name: '',
        role: 'executor',
        model: 'claude-sonnet',
        temperature: 0.3,
        systemPrompt: '',
        skills: [],
        estimatedCostPer1kTokens: 0.003,
      })
    })

    expect(success).toBe(false)
    expect(result.current.error).toBe('Name is required')
  })

  it('saveTemplate returns false on server error', async () => {
    const mockFetch = vi.fn(() =>
      Promise.resolve({ ok: false, json: async () => ({ message: 'Duplicate name' }) }),
    )
    vi.stubGlobal('fetch', mockFetch)

    const { result } = renderHook(() => useAgentTemplateEditor('new'))

    let success = true
    await act(async () => {
      success = await result.current.saveTemplate({
        name: 'alice',
        role: 'executor',
        model: 'claude-sonnet',
        temperature: 0.3,
        systemPrompt: '',
        skills: [],
        estimatedCostPer1kTokens: 0.003,
      })
    })

    expect(success).toBe(false)
    await waitFor(() => {
      expect(result.current.error).toBe('Duplicate name')
    })
  })

  it('deleteTemplate calls DELETE and returns true', async () => {
    const mockFetch = vi.fn((input: string, init?: RequestInit) => {
      if (init?.method === 'DELETE') {
        return Promise.resolve({ ok: true, json: async () => ({}) })
      }
      return Promise.resolve({ ok: true, json: async () => ({}) })
    })
    vi.stubGlobal('fetch', mockFetch)

    const { result } = renderHook(() => useAgentTemplateEditor('t1'))

    let success = false
    await act(async () => {
      success = await result.current.deleteTemplate()
    })

    expect(success).toBe(true)
    expect(mockFetch).toHaveBeenCalledWith(
      '/api/agent-templates/t1',
      expect.objectContaining({ method: 'DELETE' }),
    )
  })

  it('deleteTemplate returns false for "new" id', async () => {
    const { result } = renderHook(() => useAgentTemplateEditor('new'))

    let success = true
    await act(async () => {
      success = await result.current.deleteTemplate()
    })

    expect(success).toBe(false)
  })
})
