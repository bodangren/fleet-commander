import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useHarnessForm, useHarnessLoader } from './useHarnessForm'

describe('useHarnessForm', () => {
  it('initializes with default values', () => {
    const { result } = renderHook(() => useHarnessForm())

    expect(result.current.form.name).toBe('')
    expect(result.current.form.binary).toBe('')
    expect(result.current.form.discoveryCommand).toBe('')
    expect(result.current.form.parseStrategy).toBe('line-per-model')
    expect(result.current.form.pattern).toBe('')
    expect(result.current.form.invocationTemplate).toBe('')
    expect(result.current.form.flagsText).toBe('{}')
  })

  it('setName updates name', () => {
    const { result } = renderHook(() => useHarnessForm())
    act(() => result.current.setName('opencode'))
    expect(result.current.form.name).toBe('opencode')
  })

  it('setBinary updates binary', () => {
    const { result } = renderHook(() => useHarnessForm())
    act(() => result.current.setBinary('/usr/bin/opencode'))
    expect(result.current.form.binary).toBe('/usr/bin/opencode')
  })

  it('setDiscoveryCommand updates command', () => {
    const { result } = renderHook(() => useHarnessForm())
    act(() => result.current.setDiscoveryCommand('opencode models'))
    expect(result.current.form.discoveryCommand).toBe('opencode models')
  })

  it('setParseStrategy updates strategy', () => {
    const { result } = renderHook(() => useHarnessForm())
    act(() => result.current.setParseStrategy('regex'))
    expect(result.current.form.parseStrategy).toBe('regex')
  })

  it('setPattern updates pattern', () => {
    const { result } = renderHook(() => useHarnessForm())
    act(() => result.current.setPattern('model-(.+)'))
    expect(result.current.form.pattern).toBe('model-(.+)')
  })

  it('setInvocationTemplate updates template', () => {
    const { result } = renderHook(() => useHarnessForm())
    act(() => result.current.setInvocationTemplate('{{prompt}}'))
    expect(result.current.form.invocationTemplate).toBe('{{prompt}}')
  })

  it('setFlagsText updates flags text', () => {
    const { result } = renderHook(() => useHarnessForm())
    act(() => result.current.setFlagsText('{"verbose": true}'))
    expect(result.current.form.flagsText).toBe('{"verbose": true}')
  })

  it('resetForm restores defaults', () => {
    const { result } = renderHook(() => useHarnessForm())
    act(() => result.current.setName('modified'))
    act(() => result.current.setBinary('/usr/bin/test'))
    act(() => result.current.resetForm())
    expect(result.current.form.name).toBe('')
    expect(result.current.form.binary).toBe('')
  })
})

describe('useHarnessLoader', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('sets loading=false immediately for "new" harness', () => {
    const { result } = renderHook(() => useHarnessLoader('new', ''))
    expect(result.current.loading).toBe(false)
    expect(result.current.scopeLayer).toBe('new')
  })

  it('fetches harness data on mount for existing harness', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: async () => ({
            layer: 'bundled',
            definition: {
              name: 'opencode',
              binary: '/usr/bin/opencode',
              discovery: {
                command: 'opencode models',
                parseStrategy: 'line-per-model',
                pattern: '^model-(.+)',
              },
              invocation: {
                template: '{{prompt}}',
                flags: { verbose: 'true' },
              },
            },
          }),
        }),
      ),
    )

    const { result } = renderHook(() => useHarnessLoader('opencode', ''))

    const { waitFor: wait } = await import('@testing-library/react')
    await wait(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.scopeLayer).toBe('bundled')
    expect(result.current.form.name).toBe('opencode')
    expect(result.current.form.binary).toBe('/usr/bin/opencode')
    expect(result.current.form.discoveryCommand).toBe('opencode models')
    expect(result.current.form.parseStrategy).toBe('line-per-model')
    expect(result.current.form.pattern).toBe('^model-(.+)')
    expect(result.current.form.invocationTemplate).toBe('{{prompt}}')
    expect(result.current.form.flagsText).toBe(JSON.stringify({ verbose: 'true' }, null, 2))
  })

  it('sets error on fetch failure', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        Promise.resolve({
          ok: false,
          json: async () => ({ error: 'Harness not found' }),
        }),
      ),
    )

    const { result } = renderHook(() => useHarnessLoader('missing', ''))

    const { waitFor: wait } = await import('@testing-library/react')
    await wait(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.error).toBe('Harness not found')
  })

  it('sets error when definition is missing', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: async () => ({ layer: 'user' }),
        }),
      ),
    )

    const { result } = renderHook(() => useHarnessLoader('incomplete', ''))

    const { waitFor: wait } = await import('@testing-library/react')
    await wait(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.error).toBe('Harness payload missing definition')
  })

  it('defaults parseStrategy to line-per-model for unknown values', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: async () => ({
            layer: 'user',
            definition: {
              name: 'test',
              discovery: { parseStrategy: 'unknown' },
            },
          }),
        }),
      ),
    )

    const { result } = renderHook(() => useHarnessLoader('test', ''))

    const { waitFor: wait } = await import('@testing-library/react')
    await wait(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.form.parseStrategy).toBe('line-per-model')
  })
})
