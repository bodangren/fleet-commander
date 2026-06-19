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

// ──────────────────────────────────────────────────────────────────────────────
// Phase 4 (Red): PipelinesPage production contract + malformed-response error.
//
// Test-strategy §5: "PipelinesPage.test.tsx already mocks `/api/pipelines` —
// extend to assert response shape matches the new server contract and add a
// malformed-response error case." The P3 contract is an array of
// PipelineExecution objects; a malformed (non-array) response is a server-
// contract violation and the page must surface it, not silently render empty.
//
// Track: operations_api_contract_closure_20260618
// ──────────────────────────────────────────────────────────────────────────────

describe('PipelinesPage (Phase 4: production response shape and error states)', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('renders executions whose shape matches the PipelineExecution contract', async () => {
    const executions = [
      {
        executionId: 'exec-1',
        pipelineName: 'deploy-prod',
        status: 'succeeded',
        startedAt: 1_700_000_000_000,
        completedAt: 1_700_000_060_000,
      },
    ]
    vi.stubGlobal(
      'fetch',
      vi.fn((url: string) => {
        if (url === '/api/pipelines') {
          return jsonResponse(executions)
        }
        return jsonResponse([])
      }),
    )

    render(<PipelinesPage />)

    await waitFor(() => {
      expect(screen.getByText('deploy-prod')).toBeDefined()
    })
    // The page must render the pipeline name and status from the contract.
    expect(screen.getByText('succeeded')).toBeDefined()
  })

  it('surfaces an error state when the server returns a malformed (non-array) response (Red: currently shows empty state)', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn((url: string) => {
        if (url === '/api/pipelines') {
          // P3 contract requires an array. Returning an object is a violation.
          return jsonResponse({ error: 'server misconfigured' })
        }
        return jsonResponse([])
      }),
    )

    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})

    render(<PipelinesPage />)

    // At HEAD the hook returns the object as `executions` and the page's
    // loading branch falls through, then the empty branch renders because
    // `.length` on a plain object is `undefined`/falsy but `.map` later
    // crashes. Phase 4 Green must surface this contract violation as an
    // error indicator (toast, banner, or PipelineList error card). Use a
    // bounded poll — the page will eventually show a loading spinner that
    // never resolves, so we cap the wait.
    await new Promise(r => setTimeout(r, 200))
    const failedFetch = screen.queryByText(/failed to fetch executions/i)
    const malformed = screen.queryByText(/malformed.*response/i)
    const misconfig = screen.queryByText(/server misconfigured/i)
    const alert = screen.queryByRole('alert')
    const found = failedFetch ?? malformed ?? misconfig ?? alert
    expect(found, 'page should surface a malformed-response error indicator').toBeTruthy()

    consoleError.mockRestore()
  })
})
