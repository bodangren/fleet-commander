import * as fs from 'node:fs'
import { ipcMain } from 'electron'
import { IPC_CHANNELS } from '../shared/ipc'
import type { TerminalDataEvent } from '../shared/terminal'
import { createTerminalSessionManager, TerminalSessionManager } from './terminal-session-manager'
import { spawnPty } from './terminal-pty'
import { loadPlanDetails } from './plan-detail-loader'
import { parsePlanFile } from '../shared/conductor'
import { expandAgentCommand } from './agent-execution'

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

  ipcMain.handle(IPC_CHANNELS.terminalLaunchAgent, async (event, request) => {
    const planResponse = loadPlanDetails(fs, {
      projectPath: request.projectPath,
      trackId: request.trackId,
    })

    if (!planResponse.ok) {
      return planResponse
    }

    const phases = parsePlanFile(planResponse.data.planContents)
    const phase = phases.find(p => p.title === request.phaseTitle)
    const task = phase?.tasks.find(t => t.title === request.taskTitle)

    if (!task) {
      return {
        ok: false,
        error: { code: 'not_found', message: 'Task not found in plan.' },
      }
    }

    const command = expandAgentCommand(request.template.command, task)

    const createResponse = manager.createSession({ projectPath: request.projectPath })
    if (!createResponse.ok) {
      return createResponse
    }

    const { sessionId } = createResponse.data
    const session = manager.getSession(sessionId)
    if (session) {
      session.pty.onData(data => {
        const payload: TerminalDataEvent = {
          sessionId,
          data,
        }
        event.sender.send(IPC_CHANNELS.terminalData, payload)
      })

      manager.writeToSession({ sessionId, data: `${command}\n` })
    }

    return createResponse
  })

  ipcMain.handle(IPC_CHANNELS.terminalClose, (_event, request) => {
    return manager.closeSession(request)
  })
}
