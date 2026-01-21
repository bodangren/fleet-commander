export type LogLevel = 'info' | 'warn' | 'error'

export type LogSource = 'main' | 'renderer'

export interface AppLogEntry {
  id: string
  timestamp: string
  level: LogLevel
  message: string
  source: LogSource
}

export interface AppLogPayload {
  id?: string
  timestamp?: string
  level: LogLevel
  message: string
  source?: LogSource
}
