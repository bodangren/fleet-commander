import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const setupLogApi = () => {
  const emitLogEntry = vi.fn()
  const onLogEntry = vi.fn()
  const offLogEntry = vi.fn()
  window.logApi = { emitLogEntry, onLogEntry, offLogEntry }
  return { emitLogEntry }
}

describe('renderer log streaming', () => {
  let originalLog: typeof console.log
  let originalWarn: typeof console.warn
  let originalError: typeof console.error

  beforeEach(() => {
    originalLog = console.log
    originalWarn = console.warn
    originalError = console.error
    vi.resetModules()
  })

  afterEach(() => {
    console.log = originalLog
    console.warn = originalWarn
    console.error = originalError
  })

  it('emits log entries for console output', async () => {
    const { emitLogEntry } = setupLogApi()
    const { initializeRendererLogStreaming } = await import('./log-stream')

    initializeRendererLogStreaming()

    console.log('Renderer log')

    expect(emitLogEntry).toHaveBeenCalledWith(
      expect.objectContaining({
        level: 'info',
        message: 'Renderer log',
        source: 'renderer',
      }),
    )
  })
})
