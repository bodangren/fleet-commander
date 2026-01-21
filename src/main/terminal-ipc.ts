import { ipcMain } from 'electron'
import { IPC_CHANNELS } from '../shared/ipc'
import type { TerminalDataEvent } from '../shared/terminal'
import { createTerminalSessionManager, TerminalSessionManager } from './terminal-session-manager'
import { spawnPty } from './terminal-pty'

export interface TerminalIpcDependencies {
  manager?: TerminalSessionManager
}

export function registerTerminalIpcHandlers(deps: TerminalIpcDependencies = {}): void {
  const manager = deps.manager ?? createTerminalSessionManager({ spawnPty })

  ipcMain.handle(IPC_CHANNELS.terminalCreate, (event, request) => {
    const response = manager.createSession(request)

    if (response.ok) {
      const session = manager.getSession(response.data.sessionId)
      if (session) {
        session.pty.onData(data => {
          const payload: TerminalDataEvent = {
            sessionId: response.data.sessionId,
            data,
          }
          event.sender.send(IPC_CHANNELS.terminalData, payload)
        })
      }
    }

    return response
  })

  ipcMain.handle(IPC_CHANNELS.terminalWrite, (_event, request) => {
    return manager.writeToSession(request)
  })

  ipcMain.handle(IPC_CHANNELS.terminalClose, (_event, request) => {
    return manager.closeSession(request)
  })
}
