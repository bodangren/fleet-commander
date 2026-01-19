import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from './App'

describe('App Component', () => {
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

    // Setup default IPC mocks with resolved values to prevent errors
    window.ipcRenderer = {
      on: vi.fn(),
      off: vi.fn(),
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
  })

  it('should render the application title', async () => {
    render(<App />)
    expect(screen.getByText('Command Center')).toBeInTheDocument()

    // Wait for async operations to complete
    await waitFor(() => {
      expect(window.ipcRenderer.invoke).toHaveBeenCalled()
    })
  })

  it('should render sidebar navigation items', async () => {
    render(<App />)
    expect(screen.getByText('Board')).toBeInTheDocument()
    expect(screen.getByText('Tracks')).toBeInTheDocument()
    expect(screen.getByText('Terminal')).toBeInTheDocument()
    expect(screen.getByText('Settings')).toBeInTheDocument()

    // Wait for async operations to complete
    await waitFor(() => {
      expect(window.ipcRenderer.invoke).toHaveBeenCalled()
    })
  })

  it('should fetch system status on mount', async () => {
    render(<App />)

    await waitFor(() => {
      expect(window.ipcRenderer.invoke).toHaveBeenCalledWith('get-system-status')
    })

    await waitFor(() => {
      expect(screen.getByText('linux-x64')).toBeInTheDocument()
      expect(screen.getByText('123s')).toBeInTheDocument()
      expect(screen.getByText('50.00 MB')).toBeInTheDocument()
    })
  })

  it('should fetch database logs on mount', async () => {
    render(<App />)

    await waitFor(() => {
      expect(window.ipcRenderer.invoke).toHaveBeenCalledWith('get-db-logs')
    })

    await waitFor(() => {
      expect(screen.getByText('Test event 1')).toBeInTheDocument()
      expect(screen.getByText('Test event 2')).toBeInTheDocument()
    })
  })

  it('should increment counter when button is clicked', async () => {
    const user = userEvent.setup()
    render(<App />)

    // Wait for initial render
    await waitFor(() => {
      expect(window.ipcRenderer.invoke).toHaveBeenCalled()
    })

    const button = screen.getByText(/Hits: 0/)
    expect(button).toBeInTheDocument()

    await user.click(button)

    expect(screen.getByText(/Hits: 1/)).toBeInTheDocument()
  })

  it('should register IPC message listener on mount', async () => {
    render(<App />)

    expect(window.ipcRenderer.on).toHaveBeenCalledWith('main-process-message', expect.any(Function))

    // Wait for async operations to complete
    await waitFor(() => {
      expect(window.ipcRenderer.invoke).toHaveBeenCalled()
    })
  })

  it('should clean up IPC listener on unmount', async () => {
    const { unmount } = render(<App />)

    // Wait for async operations to complete before unmounting
    await waitFor(() => {
      expect(window.ipcRenderer.invoke).toHaveBeenCalled()
    })

    unmount()

    expect(window.ipcRenderer.off).toHaveBeenCalledWith(
      'main-process-message',
      expect.any(Function),
    )
  })

  it('should handle errors when fetching status', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    // Override invoke to reject for this test
    const mockInvoke = vi.fn().mockImplementation((channel: string) => {
      if (channel === 'get-system-status') {
        return Promise.reject(new Error('Fetch failed'))
      }
      return Promise.resolve(mockLogs)
    })
    window.ipcRenderer = {
      ...window.ipcRenderer,
      invoke: mockInvoke,
    } as unknown as Electron.IpcRenderer

    render(<App />)

    await waitFor(() => {
      expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to fetch status:', expect.any(Error))
    })

    consoleErrorSpy.mockRestore()
  })

  it('should refresh logs when refresh button is clicked', async () => {
    const user = userEvent.setup()
    const newMockLogs = [{ id: 3, event: 'Refreshed log', timestamp: new Date().toISOString() }]

    render(<App />)

    // Wait for initial render
    await waitFor(() => {
      expect(screen.getByText('Test event 1')).toBeInTheDocument()
    })

    // Setup mock for refresh
    window.ipcRenderer.invoke = vi.fn().mockResolvedValueOnce(newMockLogs)

    const refreshButton = screen.getByText('Refresh Logs')
    await user.click(refreshButton)

    await waitFor(() => {
      expect(screen.getByText('Refreshed log')).toBeInTheDocument()
    })
  })
})
