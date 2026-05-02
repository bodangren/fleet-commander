import { describe, expect, it, vi, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { PipelinesPage } from './PipelinesPage'

const mockExecutions = [
  {
    executionId: 'exec-1',
    pipelineName: 'deploy-prod',
    status: 'succeeded',
    startedAt: Date.now() - 60000,
    completedAt: Date.now(),
  },
  {
    executionId: 'exec-2',
    pipelineName: 'test-ci',
    status: 'running',
    startedAt: Date.now() - 30000,
  },
]

const mockLogs = [
  {
    stage: 'build',
    step: 'compile',
    status: 'succeeded',
    output: 'Build complete',
  },
  {
    stage: 'deploy',
    step: 'upload',
    status: 'failed',
    error: 'Upload timeout',
  },
]

function jsonResponse(data: unknown, status = 200) {
  return Promise.resolve({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(data),
  })
}

describe('PipelinesPage', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('shows loading spinner initially', () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => new Promise(() => {})),
    )

    const { container } = render(<PipelinesPage />)

    const spinner = container.querySelector('.animate-spin')
    expect(spinner).toBeDefined()
  })

  it('renders list of pipeline executions', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn((url: string) => {
        if (url === '/api/pipelines') {
          return jsonResponse(mockExecutions)
        }
        return jsonResponse([])
      }),
    )

    render(<PipelinesPage />)

    await waitFor(() => {
      expect(screen.getByText('deploy-prod')).toBeDefined()
    })

    expect(screen.getByText('test-ci')).toBeDefined()
    expect(screen.getByText('succeeded')).toBeDefined()
    expect(screen.getByText('running')).toBeDefined()
  })

  it('shows empty state when no executions', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn((url: string) => {
        if (url === '/api/pipelines') {
          return jsonResponse([])
        }
        return jsonResponse([])
      }),
    )

    render(<PipelinesPage />)

    await waitFor(() => {
      expect(screen.getByText(/No pipeline executions yet/)).toBeDefined()
    })
  })

  it('shows error state on fetch failure', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn((url: string) => {
        if (url === '/api/pipelines') {
          return jsonResponse({ error: 'Server error' }, 500)
        }
        return jsonResponse([])
      }),
    )

    render(<PipelinesPage />)

    await waitFor(() => {
      expect(screen.getByText(/Failed to fetch executions/)).toBeDefined()
    })
  })

  it('selects execution and shows logs', async () => {
    const user = userEvent.setup()

    vi.stubGlobal(
      'fetch',
      vi.fn((url: string) => {
        if (url === '/api/pipelines') {
          return jsonResponse(mockExecutions)
        }
        if (url === '/api/pipelines/exec-1/logs') {
          return jsonResponse(mockLogs)
        }
        return jsonResponse([])
      }),
    )

    render(<PipelinesPage />)

    await waitFor(() => {
      expect(screen.getByText('deploy-prod')).toBeDefined()
    })

    const executionItem = screen.getByText('deploy-prod').closest('[class*="cursor-pointer"]')!
    await user.click(executionItem)

    await waitFor(() => {
      expect(screen.getByText('Execution Logs')).toBeDefined()
    })

    expect(screen.getByText('compile')).toBeDefined()
    expect(screen.getByText('upload')).toBeDefined()
    expect(screen.getByText('Build complete')).toBeDefined()
    expect(screen.getByText('Upload timeout')).toBeDefined()
  })

  it('does not show logs when no execution selected', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn((url: string) => {
        if (url === '/api/pipelines') {
          return jsonResponse(mockExecutions)
        }
        return jsonResponse([])
      }),
    )

    render(<PipelinesPage />)

    await waitFor(() => {
      expect(screen.getByText('deploy-prod')).toBeDefined()
    })

    expect(screen.queryByText('Execution Logs')).toBeNull()
  })
})
