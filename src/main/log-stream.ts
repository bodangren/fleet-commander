import { BrowserWindow, ipcMain } from 'electron'
import { randomUUID } from 'node:crypto'
import { IPC_CHANNELS } from '../shared/ipc'
import type { AppLogEntry, AppLogPayload, LogLevel, LogSource } from '../shared/logging'

export interface LogStreamDependencies {
  now?: () => string
  createId?: () => string
  getWindows?: () => BrowserWindow[]
}

const formatLogMessage = (args: unknown[]): string => {
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

const buildLogEntry = (
  payload: AppLogPayload,
  source: LogSource,
  createId: () => string,
  now: () => string,
): AppLogEntry => {
  return {
    id: payload.id ?? createId(),
    timestamp: payload.timestamp ?? now(),
    level: payload.level,
    message: payload.message,
    source: payload.source ?? source,
  }
}

export const registerLogStreaming = (deps: LogStreamDependencies = {}): void => {
  const now = deps.now ?? (() => new Date().toISOString())
  const createId = deps.createId ?? (() => randomUUID())
  const getWindows = deps.getWindows ?? (() => BrowserWindow.getAllWindows())

  const broadcast = (entry: AppLogEntry) => {
    getWindows().forEach(win => {
      win.webContents.send(IPC_CHANNELS.appLog, entry)
    })
  }

  const wrapConsole = (level: LogLevel, original: (...args: unknown[]) => void) => {
    return (...args: unknown[]) => {
      original(...args)
      broadcast(
        buildLogEntry(
          {
            level,
            message: formatLogMessage(args),
            source: 'main',
          },
          'main',
          createId,
          now,
        ),
      )
    }
  }

  console.log = wrapConsole('info', console.log)
  console.warn = wrapConsole('warn', console.warn)
  console.error = wrapConsole('error', console.error)

  ipcMain.on(IPC_CHANNELS.appLogEmit, (_event, payload: AppLogPayload) => {
    const entry = buildLogEntry(payload, 'renderer', createId, now)
    broadcast(entry)
  })
}
