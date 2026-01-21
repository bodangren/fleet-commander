import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent, within, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from './App'
import type { ProjectLoadResponse } from '../shared/board-data'
import { IPC_CHANNELS } from '../shared/ipc'
import type { AppLogEntry } from '../shared/logging'

describe('App Component', () => {
  let ipcListeners: Map<string, (event: Electron.IpcRendererEvent, payload: unknown) => void>
  let logListeners: Set<(event: unknown, payload: AppLogEntry) => void>

  const emitMenuLoad = async (response: ProjectLoadResponse) => {
    const listener = ipcListeners.get(IPC_CHANNELS.menuProjectLoad)
    if (listener) {
      await act(async () => {
        listener({} as Electron.IpcRendererEvent, response)
      })
    }
  }
  const mockBoardData = {
    projectPath: '/repo/path',
    tracks: [],
    tasks: [],
  }
  const mockStatus = {
    platform: 'linux',
    arch: 'x64',
    version: '1.0.0',
    uptime: 123,
    memoryUsage: {
      rss: 1024 * 1024 * 50, // 50 MB
      heapTotal: 1024 * 1024 * 30,
      heapUsed: 1024 * 1024 * 20,
    },
  }
  const mockLogs = [
    { id: 1, event: 'Test event 1', timestamp: new Date().toISOString() },
    { id: 2, event: 'Test event 2', timestamp: new Date().toISOString() },
  ]
  beforeEach(() => {
    // Reset mocks before each test
    vi.clearAllMocks()
    ipcListeners = new Map()
    logListeners = new Set()

    // Setup default IPC mocks with resolved values to prevent errors
    window.ipcRenderer = {
      on: vi.fn((channel: string, listener: (event: Electron.IpcRendererEvent, payload: unknown) => void) => {
        ipcListeners.set(channel, listener)
      }),
      off: vi.fn((channel: string, listener: (event: Electron.IpcRendererEvent, payload: unknown) => void) => {
        if (ipcListeners.get(channel) === listener) {
          ipcListeners.delete(channel)
        }
      }),
      send: vi.fn(),
      invoke: vi.fn().mockImplementation((channel: string) => {
        if (channel === 'get-system-status') {
          return Promise.resolve(mockStatus)
        }
        if (channel === 'get-db-logs') {
          return Promise.resolve(mockLogs)
        }
        return Promise.resolve({})
      }),
    } as unknown as Electron.IpcRenderer

    window.projectApi = {
      selectProject: vi.fn().mockResolvedValue({
        ok: true,
        data: mockBoardData,
      }),
      loadProject: vi.fn().mockResolvedValue({ ok: true, data: mockBoardData }),
      refreshBoard: vi.fn().mockResolvedValue({ ok: true, data: mockBoardData }),
      getPlanDetails: vi.fn().mockResolvedValue({
        ok: true,
        data: {
          trackId: 'track-1',
          trackTitle: 'Track One',
          planPath: '/repo/path/conductor/tracks/track-1/plan.md',
          planContents: '# Plan',
        },
      }),
      updatePlanContents: vi.fn().mockResolvedValue({ ok: true }),
      getLastProjectPath: vi.fn().mockResolvedValue('/repo/path'),
      updateTaskStatus: vi.fn().mockResolvedValue({ ok: true, updatedTaskId: 'track-1::Phase 1::Task A' }),
    }

    let sessionCount = 0
    window.terminalApi = {
      createSession: vi.fn().mockImplementation(() => {
        sessionCount += 1
        return Promise.resolve({ ok: true, data: { sessionId: `session-${sessionCount}` } })
      }),
      writeToSession: vi.fn().mockResolvedValue({ ok: true }),
      closeSession: vi.fn().mockResolvedValue({ ok: true }),
      onSessionData: vi.fn(),
      offSessionData: vi.fn(),
    }

    window.logApi = {
      emitLogEntry: vi.fn(),
      onLogEntry: vi.fn(listener => {
        logListeners.add(listener)
      }),
      offLogEntry: vi.fn(listener => {
        logListeners.delete(listener)
      }),
    }
  })

  it('should render the application title', async () => {
    render(<App />)
    expect(screen.getByText('Command Center')).toBeInTheDocument()
  })

  it('should render sidebar navigation items', async () => {
    render(<App />)
    expect(screen.getByRole('button', { name: 'Board' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Tracks' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Terminal' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Settings' })).toBeInTheDocument()
  })

  it('renders terminal session tabs and session list', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: 'Terminal' }))

    expect(screen.getByTestId('terminal-tab')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Terminal' })).toBeInTheDocument()
    const sessionList = screen.getByTestId('terminal-session-list')
    expect(within(sessionList).getByRole('tab', { name: 'Session 1' })).toBeInTheDocument()
    expect(within(sessionList).getByRole('tab', { name: 'Session 2' })).toBeInTheDocument()
  })

  it('switches terminal sessions when a tab is selected', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: 'Terminal' }))

    const sessionPane = screen.getByTestId('terminal-session-pane')
    expect(sessionPane).toHaveTextContent('Session 1')

    const sessionTwoTab = screen.getByRole('tab', { name: 'Session 2' })
    await user.click(sessionTwoTab)

    expect(sessionTwoTab).toHaveAttribute('aria-selected', 'true')
    expect(sessionPane).toHaveTextContent('Session 2')
  })

  it('creates terminal sessions when a project is loaded', async () => {
    const user = userEvent.setup()
    render(<App />)

    await emitMenuLoad({
      ok: true,
      data: {
        projectPath: '/repo/path',
        tracks: [],
        tasks: [],
      },
    })

    await user.click(screen.getByRole('button', { name: 'Terminal' }))

    await waitFor(() => {
      expect(window.terminalApi.createSession).toHaveBeenCalledTimes(2)
    })

    expect(window.terminalApi.createSession).toHaveBeenCalledWith({
      projectPath: '/repo/path',
    })
  })

  it('streams log entries into the Logs view', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: 'Terminal' }))
    await user.click(screen.getByRole('tab', { name: 'Logs' }))

    const entry: AppLogEntry = {
      id: 'log-1',
      level: 'info',
      message: 'Log message from main',
      source: 'main',
      timestamp: '2026-01-21T00:00:00.000Z',
    }

    await act(async () => {
      logListeners.forEach(listener => listener({}, entry))
    })

    expect(screen.getByTestId('terminal-logs-pane')).toBeInTheDocument()
    expect(screen.getByText('Log message from main')).toBeInTheDocument()
    expect(screen.getByText('main')).toBeInTheDocument()
  })

  it('does not render status, logs, or walking skeleton copy', () => {
    render(<App />)

    expect(
      screen.queryByText('Walking Skeleton successfully initialized.'),
    ).not.toBeInTheDocument()
    expect(screen.queryByText('System Status')).not.toBeInTheDocument()
    expect(screen.queryByText('Database Logs')).not.toBeInTheDocument()
    expect(screen.queryByText('IPC Test')).not.toBeInTheDocument()
  })

  it('does not request system status or database logs on mount', async () => {
    render(<App />)

    await waitFor(() => {
      expect(window.ipcRenderer.invoke).not.toHaveBeenCalledWith('get-system-status')
      expect(window.ipcRenderer.invoke).not.toHaveBeenCalledWith('get-db-logs')
    })
  })

  it('does not render the project loader UI', () => {
    render(<App />)

    expect(screen.queryByText('Project Loader')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Project Path')).not.toBeInTheDocument()
    expect(screen.queryByText('Select Project')).not.toBeInTheDocument()
    expect(screen.queryByText('Get Last Project')).not.toBeInTheDocument()
    expect(screen.queryByText('Load Project')).not.toBeInTheDocument()
  })

  it('loads board data when a menu project load event is received', async () => {
    render(<App />)

    await emitMenuLoad({
      ok: true,
      data: {
        projectPath: '/repo/path',
        tracks: [],
        tasks: [
          {
            id: 'track-1::Phase 1::Task A',
            title: 'Task A',
            trackId: 'track-1',
            trackTitle: 'Track One',
            phase: 'Phase 1',
            status: 'todo',
            statusSource: 'explicit',
            needsSync: false,
            activity: null,
          },
        ],
      },
    })

    expect(await screen.findByText('Task A')).toBeInTheDocument()
  })

  it('should refresh the board with the menu-loaded project path', async () => {
    const user = userEvent.setup()
    render(<App />)

    await emitMenuLoad({
      ok: true,
      data: {
        projectPath: '/repo/path',
        tracks: [],
        tasks: [],
      },
    })

    const button = await screen.findByRole('button', { name: 'Refresh Board' })
    await user.click(button)

    await waitFor(() => {
      expect(window.projectApi.refreshBoard).toHaveBeenCalledWith('/repo/path')
    })
  })

  it('shows the full track plan in the Tracks tab', async () => {
    const user = userEvent.setup()
    const boardWithTasks = {
      projectPath: '/repo/path',
      tracks: [],
      tasks: [
        {
          id: 'track-1::Phase 1::Task A',
          title: 'Task A',
          trackId: 'track-1',
          trackTitle: 'Track One',
          phase: 'Phase 1',
          status: 'todo',
          statusSource: 'explicit',
          needsSync: false,
          activity: null,
        },
        {
          id: 'track-2::Phase 1::Task B',
          title: 'Task B',
          trackId: 'track-2',
          trackTitle: 'Track Two',
          phase: 'Phase 1',
          status: 'todo',
          statusSource: 'explicit',
          needsSync: false,
          activity: null,
        },
      ],
    }

    window.projectApi.getPlanDetails = vi.fn().mockImplementation(({ trackId }: { trackId: string }) => {
      if (trackId === 'track-2') {
        return Promise.resolve({
          ok: true,
          data: {
            trackId: 'track-2',
            trackTitle: 'Track Two',
            planPath: '/repo/path/conductor/tracks/track-2/plan.md',
            planContents: ['# Plan', '## Phase 1', '- [ ] Task: Task B'].join('\n'),
          },
        })
      }
      return Promise.resolve({
        ok: true,
        data: {
          trackId: 'track-1',
          trackTitle: 'Track One',
          planPath: '/repo/path/conductor/tracks/track-1/plan.md',
          planContents: [
            '# Plan',
            '## Phase 1',
            '- [ ] Task: Task A',
            '  - [ ] Sub-task one',
            '- [ ] Task: Task B',
          ].join('\n'),
        },
      })
    })

    render(<App />)

    await emitMenuLoad({ ok: true, data: boardWithTasks })

    await user.click(screen.getByRole('button', { name: 'Tracks' }))

    await waitFor(() => {
      expect(window.projectApi.getPlanDetails).toHaveBeenCalledWith({
        projectPath: '/repo/path',
        trackId: 'track-1',
        trackTitle: 'Track One',
      })
    })

    expect(screen.queryByTestId('board-tab')).not.toBeInTheDocument()
    expect(screen.getByTestId('track-plan-view')).toBeInTheDocument()
    expect(screen.getByText('Phase 1')).toBeInTheDocument()
    expect(screen.getByText('Task A')).toBeInTheDocument()
    expect(screen.getByText('Sub-task one')).toBeInTheDocument()

    await user.selectOptions(screen.getByTestId('track-select'), 'track-2')

    await waitFor(() => {
      expect(window.projectApi.getPlanDetails).toHaveBeenCalledWith({
        projectPath: '/repo/path',
        trackId: 'track-2',
        trackTitle: 'Track Two',
      })
    })

    await user.click(screen.getByRole('button', { name: 'Board' }))
    expect(screen.getByTestId('board-tab')).toBeInTheDocument()
  })

  it('disables track selection when no tracks are loaded', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: 'Tracks' }))

    const select = screen.getByTestId('track-select') as HTMLSelectElement
    expect(select.disabled).toBe(true)
    expect(within(select).getByText('Load a project to view tracks')).toBeInTheDocument()
  })

  it('shows a track error when project path is missing', async () => {
    const user = userEvent.setup()
    render(<App />)

    await emitMenuLoad({
      ok: true,
      data: {
        projectPath: '   ',
        tracks: [],
        tasks: [
          {
            id: 'track-1::Phase 1::Task A',
            title: 'Task A',
            trackId: 'track-1',
            trackTitle: 'Track One',
            phase: 'Phase 1',
            status: 'todo',
            statusSource: 'explicit',
            needsSync: false,
            activity: null,
          },
        ],
      },
    })
    await user.click(screen.getByRole('button', { name: 'Tracks' }))

    expect(screen.getByText('Track error: Project path is required.')).toBeInTheDocument()
  })

  it('updates task status when a card is dropped into another column', async () => {
    const user = userEvent.setup()
    const boardWithTasks = {
      projectPath: '/repo/path',
      tracks: [],
      tasks: [
        {
          id: 'track-1::Phase 1::Task A',
          title: 'Task A',
          trackId: 'track-1',
          trackTitle: 'Track One',
          phase: 'Phase 1',
          status: 'todo',
          statusSource: 'explicit',
          needsSync: false,
          activity: null,
        },
      ],
    }

    render(<App />)

    await emitMenuLoad({ ok: true, data: boardWithTasks })

    await waitFor(() => {
      expect(screen.getByText('Task A')).toBeInTheDocument()
    })

    const card = screen.getByTestId('task-card-track-1::Phase 1::Task A')
    const doneColumn = screen.getByTestId('column-done')

    fireEvent.dragStart(card)
    fireEvent.dragOver(doneColumn)
    fireEvent.drop(doneColumn)

    await waitFor(() => {
      expect(window.projectApi.updateTaskStatus).toHaveBeenCalledWith({
        projectPath: '/repo/path',
        trackId: 'track-1',
        trackTitle: 'Track One',
        phase: 'Phase 1',
        title: 'Task A',
        nextStatus: 'done',
      })
    })
  })

  it('opens the plan detail panel when a task card is clicked', async () => {
    const user = userEvent.setup()
    const boardWithTasks = {
      projectPath: '/repo/path',
      tracks: [],
      tasks: [
        {
          id: 'track-1::Phase 1::Task A',
          title: 'Task A',
          trackId: 'track-1',
          trackTitle: 'Track One',
          phase: 'Phase 1',
          status: 'todo',
          statusSource: 'explicit',
          needsSync: false,
          activity: null,
        },
      ],
    }

    render(<App />)

    await emitMenuLoad({ ok: true, data: boardWithTasks })

    await waitFor(() => {
      expect(screen.getByText('Task A')).toBeInTheDocument()
    })

    await user.click(screen.getByText('Task A'))

    const panel = screen.getByTestId('plan-detail-panel')
    expect(panel).toBeInTheDocument()
    expect(within(panel).getByText('Plan Detail')).toBeInTheDocument()
    expect(within(panel).getByText('Track One')).toBeInTheDocument()

    await user.click(within(panel).getByRole('button', { name: 'Close' }))
    expect(screen.queryByTestId('plan-detail-panel')).not.toBeInTheDocument()
  })

  it('toggles a plan task marker and dispatches an update', async () => {
    const user = userEvent.setup()
    const boardWithTasks = {
      projectPath: '/repo/path',
      tracks: [],
      tasks: [
        {
          id: 'track-1::Phase 1::Task A',
          title: 'Task A',
          trackId: 'track-1',
          trackTitle: 'Track One',
          phase: 'Phase 1',
          status: 'todo',
          statusSource: 'explicit',
          needsSync: false,
          activity: null,
        },
      ],
    }

    window.projectApi.getPlanDetails = vi.fn().mockResolvedValue({
      ok: true,
      data: {
        trackId: 'track-1',
        trackTitle: 'Track One',
        planPath: '/repo/path/conductor/tracks/track-1/plan.md',
        planContents: ['# Plan', '## Phase 1', '- [ ] Task: Task A'].join('\n'),
      },
    })
    window.projectApi.updateTaskStatus = vi
      .fn()
      .mockResolvedValue({ ok: true, updatedTaskId: 'track-1::Phase 1::Task A' })

    render(<App />)

    await emitMenuLoad({ ok: true, data: boardWithTasks })
    await user.click(screen.getByText('Task A'))

    const toggleButton = await screen.findByRole('button', { name: 'Toggle Task A' })
    await user.click(toggleButton)

    expect(window.projectApi.updateTaskStatus).toHaveBeenCalledWith({
      projectPath: '/repo/path',
      trackId: 'track-1',
      trackTitle: 'Track One',
      phase: 'Phase 1',
      title: 'Task A',
      nextStatus: 'in_progress',
    })
  })

  it('edits phase and task titles with auto-save', async () => {
    const user = userEvent.setup()
    const boardWithTasks = {
      projectPath: '/repo/path',
      tracks: [],
      tasks: [
        {
          id: 'track-1::Phase 1::Task A',
          title: 'Task A',
          trackId: 'track-1',
          trackTitle: 'Track One',
          phase: 'Phase 1',
          status: 'todo',
          statusSource: 'explicit',
          needsSync: false,
          activity: null,
        },
      ],
    }

    window.projectApi.getPlanDetails = vi.fn().mockResolvedValue({
      ok: true,
      data: {
        trackId: 'track-1',
        trackTitle: 'Track One',
        planPath: '/repo/path/conductor/tracks/track-1/plan.md',
        planContents: ['# Plan', '## Phase 1', '- [ ] Task: Task A'].join('\n'),
      },
    })
    window.projectApi.updatePlanContents = vi.fn().mockResolvedValue({ ok: true })

    render(<App />)

    await emitMenuLoad({ ok: true, data: boardWithTasks })
    await user.click(screen.getByText('Task A'))

    const phaseInput = await screen.findByLabelText('Edit phase Phase 1')
    await user.type(phaseInput, '{selectall}Phase One')

    await waitFor(() => {
      expect(window.projectApi.updatePlanContents).toHaveBeenCalledWith(
        expect.objectContaining({
          planContents: expect.stringContaining('## Phase One'),
        }),
      )
    })

    const taskInput = await screen.findByLabelText('Edit task Task A')
    await user.type(taskInput, '{selectall}Task Alpha')

    await waitFor(() => {
      expect(window.projectApi.updatePlanContents).toHaveBeenCalledWith(
        expect.objectContaining({
          planContents: expect.stringContaining('Task: Task Alpha'),
        }),
      )
    })
  })

  it('toggles a plan sub-task marker and dispatches a plan update', async () => {
    const user = userEvent.setup()
    const boardWithTasks = {
      projectPath: '/repo/path',
      tracks: [],
      tasks: [
        {
          id: 'track-1::Phase 1::Task A',
          title: 'Task A',
          trackId: 'track-1',
          trackTitle: 'Track One',
          phase: 'Phase 1',
          status: 'todo',
          statusSource: 'explicit',
          needsSync: false,
          activity: null,
        },
      ],
    }

    window.projectApi.getPlanDetails = vi.fn().mockResolvedValue({
      ok: true,
      data: {
        trackId: 'track-1',
        trackTitle: 'Track One',
        planPath: '/repo/path/conductor/tracks/track-1/plan.md',
        planContents: [
          '# Plan',
          '## Phase 1',
          '- [ ] Task: Task A',
          '  - [ ] Sub-task one',
        ].join('\n'),
      },
    })
    window.projectApi.updatePlanContents = vi.fn().mockResolvedValue({ ok: true })

    render(<App />)

    await emitMenuLoad({ ok: true, data: boardWithTasks })
    await user.click(screen.getByText('Task A'))

    const toggleButton = await screen.findByRole('button', {
      name: 'Toggle sub-task Sub-task one',
    })
    await user.click(toggleButton)

    await waitFor(() => {
      expect(window.projectApi.updatePlanContents).toHaveBeenCalledWith(
        expect.objectContaining({
          planContents: expect.stringContaining('- [~] Sub-task one'),
        }),
      )
    })
  })

  it('edits sub-task titles with auto-save', async () => {
    const user = userEvent.setup()
    const boardWithTasks = {
      projectPath: '/repo/path',
      tracks: [],
      tasks: [
        {
          id: 'track-1::Phase 1::Task A',
          title: 'Task A',
          trackId: 'track-1',
          trackTitle: 'Track One',
          phase: 'Phase 1',
          status: 'todo',
          statusSource: 'explicit',
          needsSync: false,
          activity: null,
        },
      ],
    }

    window.projectApi.getPlanDetails = vi.fn().mockResolvedValue({
      ok: true,
      data: {
        trackId: 'track-1',
        trackTitle: 'Track One',
        planPath: '/repo/path/conductor/tracks/track-1/plan.md',
        planContents: [
          '# Plan',
          '## Phase 1',
          '- [ ] Task: Task A',
          '  - [ ] Sub-task one',
        ].join('\n'),
      },
    })
    window.projectApi.updatePlanContents = vi.fn().mockResolvedValue({ ok: true })

    render(<App />)

    await emitMenuLoad({ ok: true, data: boardWithTasks })
    await user.click(screen.getByText('Task A'))

    const subTaskInput = await screen.findByLabelText('Edit sub-task Sub-task one')
    await user.type(subTaskInput, '{selectall}Sub-task updated')

    await waitFor(() => {
      expect(window.projectApi.updatePlanContents).toHaveBeenCalledWith(
        expect.objectContaining({
          planContents: expect.stringContaining('- [ ] Sub-task updated'),
        }),
      )
    })
  })

  it('surfaces save errors in the plan detail panel', async () => {
    const user = userEvent.setup()
    const boardWithTasks = {
      projectPath: '/repo/path',
      tracks: [],
      tasks: [
        {
          id: 'track-1::Phase 1::Task A',
          title: 'Task A',
          trackId: 'track-1',
          trackTitle: 'Track One',
          phase: 'Phase 1',
          status: 'todo',
          statusSource: 'explicit',
          needsSync: false,
          activity: null,
        },
      ],
    }

    window.projectApi.getPlanDetails = vi.fn().mockResolvedValue({
      ok: true,
      data: {
        trackId: 'track-1',
        trackTitle: 'Track One',
        planPath: '/repo/path/conductor/tracks/track-1/plan.md',
        planContents: ['# Plan', '## Phase 1', '- [ ] Task: Task A'].join('\n'),
      },
    })
    window.projectApi.updatePlanContents = vi.fn().mockResolvedValue({
      ok: false,
      error: { code: 'write_failed', message: 'Failed to write plan.md.' },
    })

    render(<App />)

    await emitMenuLoad({ ok: true, data: boardWithTasks })
    await user.click(screen.getByText('Task A'))

    const phaseInput = await screen.findByLabelText('Edit phase Phase 1')
    fireEvent.change(phaseInput, { target: { value: 'Phase One' } })

    await waitFor(() => {
      expect(screen.getByText('Plan error: Failed to write plan.md.')).toBeInTheDocument()
    })
  })
})
