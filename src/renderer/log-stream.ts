import type { AppLogPayload, LogLevel } from '../shared/logging'

let isInitialized = false

const formatMessage = (args: unknown[]): string => {
  return args
    .map(value => {
      if (typeof value === 'string') {
        return value
      }
      try {
        return JSON.stringify(value)
      } catch (error) {
        return String(value)
      }
    })
    .join(' ')
}

const emitLog = (level: LogLevel, args: unknown[]) => {
  const payload: AppLogPayload = {
    level,
    message: formatMessage(args),
    source: 'renderer',
    timestamp: new Date().toISOString(),
    id: globalThis.crypto?.randomUUID?.(),
  }

  window.logApi?.emitLogEntry(payload)
}

export const initializeRendererLogStreaming = (): void => {
  if (isInitialized) {
    return
  }
  isInitialized = true

  const originalLog = console.log
  const originalWarn = console.warn
  const originalError = console.error

  console.log = (...args: unknown[]) => {
    originalLog(...args)
    emitLog('info', args)
  }

  console.warn = (...args: unknown[]) => {
    originalWarn(...args)
    emitLog('warn', args)
  }

  console.error = (...args: unknown[]) => {
    originalError(...args)
    emitLog('error', args)
  }
}
