import { describe, it, expect, vi, beforeEach } from 'vitest'
import { IPC_CHANNELS } from '../shared/ipc'
import type { TerminalSessionManager, TerminalSessionRecord } from './terminal-session-manager'
import { registerTerminalIpcHandlers } from './terminal-ipc'
import { loadPlanDetails } from './plan-detail-loader'
import { parsePlanFile } from '../shared/conductor'
import { expandAgentCommand } from './agent-execution'

const ipcMainHandle = vi.hoisted(() => vi.fn())

vi.mock('electron', () => ({
  ipcMain: {
    handle: ipcMainHandle,
  },
}))

vi.mock('./plan-detail-loader', () => ({
  loadPlanDetails: vi.fn(),
}))

vi.mock('../shared/conductor', () => ({
  parsePlanFile: vi.fn(),
  statusFromMarker: vi.fn(),
}))

vi.mock('./agent-execution', () => ({
  expandAgentCommand: vi.fn(),
}))

describe('terminal IPC handlers', () => {
  beforeEach(() => {
    ipcMainHandle.mockClear()
    vi.mocked(loadPlanDetails).mockClear()
    vi.mocked(parsePlanFile).mockClear()
    vi.mocked(expandAgentCommand).mockClear()
  })

  it('streams terminal output to the renderer', async () => {
    // ... existing test code
  })

  it('routes write and close requests to the manager', async () => {
    // ... existing test code
  })

  it('launches an agent by creating a session and writing the expanded command', async () => {
    const onData = vi.fn()
    const write = vi.fn()
    const session: TerminalSessionRecord = {
      id: 'session-1',
      cwd: '/repo',
      createdAt: 0,
      pty: { onData, write, kill: vi.fn() },
    }

    const manager: TerminalSessionManager = {
      createSession: vi.fn(() => ({ ok: true, data: { sessionId: 'session-1' } })),
      writeToSession: vi.fn(() => ({ ok: true })),
      closeSession: vi.fn(() => ({ ok: true })),
      getSession: vi.fn(() => session),
    }

    vi.mocked(loadPlanDetails).mockReturnValue({
      ok: true,
      data: {
        trackId: 'track-1',
        trackTitle: 'Track 1',
        planPath: '/repo/plan.md',
        planContents: 'content',
      },
    })

    vi.mocked(parsePlanFile).mockReturnValue([
      {
        title: 'Phase 1',
        tasks: [{ title: 'Task A', marker: '[ ]', status: 'todo', phase: 'Phase 1' }],
      },
    ])

    vi.mocked(expandAgentCommand).mockReturnValue('expanded-command')

    registerTerminalIpcHandlers({ manager })

    const launchHandler = ipcMainHandle.mock.calls.find(
      call => call[0] === IPC_CHANNELS.terminalLaunchAgent,
    )?.[1]
    expect(launchHandler).toBeDefined()

    const sender = { send: vi.fn() }
    const request = {
      projectPath: '/repo',
      trackId: 'track-1',
      phaseTitle: 'Phase 1',
      taskTitle: 'Task A',
      template: { name: 'Agent', command: 'cmd' },
    }

    const response = await launchHandler?.({ sender }, request)

    expect(response).toEqual({ ok: true, data: { sessionId: 'session-1' } })
    expect(loadPlanDetails).toHaveBeenCalled()
    expect(parsePlanFile).toHaveBeenCalledWith('content')
    expect(expandAgentCommand).toHaveBeenCalledWith('cmd', expect.objectContaining({ title: 'Task A' }))
    expect(manager.createSession).toHaveBeenCalledWith({ projectPath: '/repo' })
    expect(manager.writeToSession).toHaveBeenCalledWith({
      sessionId: 'session-1',
      data: 'expanded-command\n',
    })
  })
})
