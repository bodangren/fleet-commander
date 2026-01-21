import { describe, it, expect, vi, beforeEach } from 'vitest'
import { IPC_CHANNELS } from '../shared/ipc'
import { registerLogStreaming } from './log-stream'

const ipcMainOn = vi.hoisted(() => vi.fn())
const send = vi.hoisted(() => vi.fn())

vi.mock('electron', () => ({
  ipcMain: {
    on: ipcMainOn,
  },
  BrowserWindow: {
    getAllWindows: vi.fn(() => [{ webContents: { send } }]),
  },
}))

describe('log streaming', () => {
  beforeEach(() => {
    ipcMainOn.mockClear()
    send.mockClear()
  })

  it('broadcasts renderer log payloads to windows', () => {
    registerLogStreaming({
      now: () => '2026-01-21T00:00:00.000Z',
      createId: () => 'log-1',
      getWindows: () => [{ webContents: { send } }] as Array<{ webContents: { send: typeof send } }>,
    })

    const handler = ipcMainOn.mock.calls.find(call => call[0] === IPC_CHANNELS.appLogEmit)?.[1]
    expect(handler).toBeDefined()

    handler?.({}, { level: 'info', message: 'Renderer log', source: 'renderer' })

    expect(send).toHaveBeenCalledWith(IPC_CHANNELS.appLog, {
      id: 'log-1',
      timestamp: '2026-01-21T00:00:00.000Z',
      level: 'info',
      message: 'Renderer log',
      source: 'renderer',
    })
  })

  it('wraps console output to broadcast main logs', () => {
    const sendMain = vi.fn()
    const originalLog = console.log
    const originalWarn = console.warn
    const originalError = console.error
    const circular: { self?: unknown } = {}
    circular.self = circular

    registerLogStreaming({
      now: () => '2026-01-21T00:00:01.000Z',
      createId: () => 'log-2',
      getWindows: () => [{ webContents: { send: sendMain } }] as Array<{
        webContents: { send: typeof sendMain }
      }>,
    })

    console.log('Main log', circular)

    expect(sendMain).toHaveBeenCalledWith(
      IPC_CHANNELS.appLog,
      expect.objectContaining({
        id: 'log-2',
        timestamp: '2026-01-21T00:00:01.000Z',
        level: 'info',
        message: expect.stringContaining('Main log'),
        source: 'main',
      }),
    )

    console.log = originalLog
    console.warn = originalWarn
    console.error = originalError
  })
})
