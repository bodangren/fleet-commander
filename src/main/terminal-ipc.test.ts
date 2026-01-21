import { describe, it, expect, vi, beforeEach } from 'vitest'
import { IPC_CHANNELS } from '../shared/ipc'
import type { TerminalSessionManager, TerminalSessionRecord } from './terminal-session-manager'
import { registerTerminalIpcHandlers } from './terminal-ipc'

const ipcMainHandle = vi.hoisted(() => vi.fn())

vi.mock('electron', () => ({
  ipcMain: {
    handle: ipcMainHandle,
  },
}))

describe('terminal IPC handlers', () => {
  beforeEach(() => {
    ipcMainHandle.mockClear()
  })

  it('streams terminal output to the renderer', async () => {
    const onData = vi.fn()
    const write = vi.fn()
    const kill = vi.fn()
    const session: TerminalSessionRecord = {
      id: 'session-1',
      cwd: '/repo',
      createdAt: 0,
      pty: {
        onData,
        write,
        kill,
      },
    }

    const manager: TerminalSessionManager = {
      createSession: vi.fn(() => ({ ok: true, data: { sessionId: 'session-1' } })),
      writeToSession: vi.fn(() => ({ ok: true })),
      closeSession: vi.fn(() => ({ ok: true })),
      getSession: vi.fn(() => session),
    }

    registerTerminalIpcHandlers({ manager })

    const createHandler = ipcMainHandle.mock.calls.find(call => call[0] === IPC_CHANNELS.terminalCreate)?.[1]
    expect(createHandler).toBeDefined()

    const sender = { send: vi.fn() }
    await createHandler?.({ sender }, { projectPath: '/repo' })

    expect(onData).toHaveBeenCalledWith(expect.any(Function))

    const dataHandler = onData.mock.calls[0]?.[0]
    dataHandler?.('output')

    expect(sender.send).toHaveBeenCalledWith(IPC_CHANNELS.terminalData, {
      sessionId: 'session-1',
      data: 'output',
    })
  })

  it('routes write and close requests to the manager', async () => {
    const manager: TerminalSessionManager = {
      createSession: vi.fn(() => ({ ok: true, data: { sessionId: 'session-1' } })),
      writeToSession: vi.fn(() => ({ ok: true })),
      closeSession: vi.fn(() => ({ ok: true })),
      getSession: vi.fn(() => null),
    }

    registerTerminalIpcHandlers({ manager })

    const writeHandler = ipcMainHandle.mock.calls.find(call => call[0] === IPC_CHANNELS.terminalWrite)?.[1]
    const closeHandler = ipcMainHandle.mock.calls.find(call => call[0] === IPC_CHANNELS.terminalClose)?.[1]

    await writeHandler?.({}, { sessionId: 'session-1', data: 'ls' })
    await closeHandler?.({}, { sessionId: 'session-1' })

    expect(manager.writeToSession).toHaveBeenCalledWith({ sessionId: 'session-1', data: 'ls' })
    expect(manager.closeSession).toHaveBeenCalledWith({ sessionId: 'session-1' })
  })
})
