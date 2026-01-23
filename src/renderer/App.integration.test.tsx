import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from './App'
import type { ProjectLoadResponse } from '../shared/board-data'
import { IPC_CHANNELS } from '../shared/ipc'

describe('App Agent Launch Integration', () => {
  let ipcListeners: Map<string, (event: Electron.IpcRendererEvent, payload: unknown) => void>

  const emitMenuLoad = async (response: ProjectLoadResponse) => {
    const listener = ipcListeners.get(IPC_CHANNELS.menuProjectLoad)
    if (listener) {
      listener({} as Electron.IpcRendererEvent, response)
    }
  }

  beforeEach(() => {
    vi.clearAllMocks()
    ipcListeners = new Map()

    window.ipcRenderer = {
      on: vi.fn((channel: string, listener: any) => ipcListeners.set(channel, listener)),
      off: vi.fn((channel: string) => ipcListeners.delete(channel)),
      invoke: vi.fn().mockResolvedValue({}),
      send: vi.fn(),
    } as any

    window.projectApi = {
      selectProject: vi.fn(),
      loadProject: vi.fn(),
      refreshBoard: vi.fn(),
      getPlanDetails: vi.fn().mockResolvedValue({
        ok: true,
        data: {
          trackId: 'track-1',
          trackTitle: 'Track One',
          planPath: 'plan.md',
          planContents: '# Plan\n## Phase 1\n- [ ] Task: Task A @Gemini',
        },
      }),
      updatePlanContents: vi.fn(),
      getLastProjectPath: vi.fn(),
      updateTaskStatus: vi.fn(),
    } as any

    window.settingsApi = {
      getAgentTemplates: vi.fn().mockResolvedValue({
        ok: true,
        templates: [{ name: 'Gemini', command: 'gemini run' }],
      }),
      setAgentTemplates: vi.fn(),
    } as any

    window.terminalApi = {
      createSession: vi.fn(),
      launchAgent: vi.fn().mockResolvedValue({
        ok: true,
        data: { sessionId: 'session-agent-123' },
      }),
      writeToSession: vi.fn(),
      closeSession: vi.fn().mockResolvedValue({ ok: true }),
      onSessionData: vi.fn(),
      offSessionData: vi.fn(),
    } as any

    window.logApi = {
        emitLogEntry: vi.fn(),
        onLogEntry: vi.fn(),
        offLogEntry: vi.fn(),
    } as any
  })

  it('switches to terminal tab and focuses session when agent is launched', async () => {
    const user = userEvent.setup()
    render(<App />)

    await emitMenuLoad({
      ok: true,
      data: {
        projectPath: '/repo',
        tracks: [],
        tasks: [{
          id: 'task-1',
          title: 'Task A @Gemini',
          trackId: 'track-1',
          trackTitle: 'Track One',
          phase: 'Phase 1',
          status: 'todo',
          statusSource: 'explicit',
          needsSync: false,
          activity: null
        }],
      },
    })

    // Open detail panel
    const taskCard = await screen.findByText('Task A @Gemini')
    await user.click(taskCard)

    // Click Run button
    const runButton = await screen.findByLabelText('Run agent for Task A @Gemini')
    await user.click(runButton)

    // Check if terminal tab is active
    const terminalTab = await screen.findByTestId('terminal-tab')
    expect(terminalTab).toBeInTheDocument()

    // Check if new session is in the list and active
    // Title is constructed as "AgentName: TaskTitle" -> "Gemini: Task A"
    const sessionButton = await screen.findByRole('tab', { name: 'Gemini: Task A' })
    expect(sessionButton).toBeInTheDocument()
    expect(sessionButton).toHaveAttribute('aria-selected', 'true')
  })
})
