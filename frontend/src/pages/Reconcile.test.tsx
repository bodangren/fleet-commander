import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, expect, it, vi, afterEach } from 'vitest'

import ReconcilePage, { ReconcilePanel, type ReconciliationProposalEntry } from './Reconcile'

function createProposal(
  overrides?: Partial<ReconciliationProposalEntry>,
): ReconciliationProposalEntry {
  return {
    _id: 'prop-1',
    projectSlug: 'test-project',
    artifactType: 'task',
    artifactId: 'task-1',
    patchJson: '{"action":"keep_canonical","divergenceType":"modified"}',
    sourceSide: 'convex',
    reason: 'Strategy prefer_canonical: Task modified',
    status: 'pending',
    createdAt: Date.now(),
    ...overrides,
  }
}

describe('ReconcilePanel', () => {
  it('renders loading state', () => {
    render(<ReconcilePanel loading={true} />)
    expect(screen.getByText('Loading reconciliation proposals...')).toBeInTheDocument()
  })

  it('renders empty state when no pending proposals', () => {
    render(<ReconcilePanel proposals={[]} loading={false} />)
    expect(screen.getByText('No pending reconciliation proposals')).toBeInTheDocument()
  })

  it('renders list of pending proposals', () => {
    const proposals = [createProposal()]
    render(<ReconcilePanel proposals={proposals} loading={false} />)

    expect(screen.getByText('1 proposal(s) awaiting review')).toBeInTheDocument()
    expect(screen.getByTestId('proposal-prop-1')).toBeInTheDocument()
    expect(screen.getByText('task-1')).toBeInTheDocument()
  })

  it('filters out non-pending proposals', () => {
    const proposals = [
      createProposal({ _id: 'prop-1', status: 'applied' }),
      createProposal({ _id: 'prop-2', status: 'pending' }),
    ]
    render(<ReconcilePanel proposals={proposals} loading={false} />)

    expect(screen.queryByTestId('proposal-prop-1')).not.toBeInTheDocument()
    expect(screen.getByTestId('proposal-prop-2')).toBeInTheDocument()
  })

  it('expands and collapses diff view', () => {
    const proposals = [createProposal()]
    render(<ReconcilePanel proposals={proposals} loading={false} />)

    const toggleBtn = screen.getByTestId('toggle-prop-1')
    expect(toggleBtn).toHaveTextContent('Diff')

    fireEvent.click(toggleBtn)
    expect(toggleBtn).toHaveTextContent('Hide')
    expect(screen.getByText(/"action"/)).toBeInTheDocument()

    fireEvent.click(toggleBtn)
    expect(toggleBtn).toHaveTextContent('Diff')
  })

  it('calls onApply when apply button is clicked', () => {
    const onApply = vi.fn()
    const proposals = [createProposal()]
    render(<ReconcilePanel proposals={proposals} loading={false} onApply={onApply} />)

    fireEvent.click(screen.getByTestId('apply-prop-1'))
    expect(onApply).toHaveBeenCalledWith('prop-1')
  })

  it('calls onReject when reject button is clicked', () => {
    const onReject = vi.fn()
    const proposals = [createProposal()]
    render(<ReconcilePanel proposals={proposals} loading={false} onReject={onReject} />)

    fireEvent.click(screen.getByTestId('reject-prop-1'))
    expect(onReject).toHaveBeenCalledWith('prop-1')
  })

  it('displays multiple proposals', () => {
    const proposals = [
      createProposal({ _id: 'prop-1', artifactId: 'task-1' }),
      createProposal({ _id: 'prop-2', artifactId: 'task-2', artifactType: 'issue' }),
    ]
    render(<ReconcilePanel proposals={proposals} loading={false} />)

    expect(screen.getByTestId('proposal-prop-1')).toBeInTheDocument()
    expect(screen.getByTestId('proposal-prop-2')).toBeInTheDocument()
    expect(screen.getByText('task-1')).toBeInTheDocument()
    expect(screen.getByText('task-2')).toBeInTheDocument()
  })
})

// ──────────────────────────────────────────────────────────────────────────────
// Phase 4 (Red): ReconcilePage (default export) page-level coverage.
//
// Test-strategy §5 says "extend `Reconcile.test.tsx` to wrap the existing
// `ReconcilePanel` cases with a `<ReconcilePage />` render that mocks
// `fetch('/api/reconciliation/proposals')` with the shared fixture; add error
// and empty paths." The page-level fetch/apply/reject flows are the missing
// coverage. The error-display tests are intentionally Red at HEAD: the
// current `ReconcilePage` catches fetch failures in `.catch` and only logs to
// console.error, never surfacing an error to the user. Phase 4 Green must
// add an error state to the page; until then these tests fail.
//
// Track: operations_api_contract_closure_20260618
// ──────────────────────────────────────────────────────────────────────────────

function jsonResponse(data: unknown, status = 200) {
  return Promise.resolve({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(data),
  })
}

describe('ReconcilePage (Phase 4: page-level fetch/apply/reject)', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('fetches /api/reconciliation/proposals on mount and renders the results', async () => {
    const proposals = [
      createProposal({ _id: 'prop-1' }),
      createProposal({ _id: 'prop-2', artifactId: 'task-2' }),
    ]
    const fetchMock = vi.fn((url: string) => {
      if (url === '/api/reconciliation/proposals') {
        return jsonResponse(proposals)
      }
      return jsonResponse({})
    })
    vi.stubGlobal('fetch', fetchMock)

    render(<ReconcilePage />)

    await waitFor(() => {
      expect(screen.getByTestId('proposal-prop-1')).toBeInTheDocument()
    })
    expect(screen.getByTestId('proposal-prop-2')).toBeInTheDocument()
    expect(fetchMock).toHaveBeenCalledWith('/api/reconciliation/proposals')
  })

  it('renders the empty state when the server returns []', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn((url: string) => {
        if (url === '/api/reconciliation/proposals') {
          return jsonResponse([])
        }
        return jsonResponse({})
      }),
    )

    render(<ReconcilePage />)

    await waitFor(() => {
      expect(screen.getByText('No pending reconciliation proposals')).toBeInTheDocument()
    })
  })

  it('server response shape matches the ReconciliationProposalEntry contract', async () => {
    const proposals = [createProposal()]
    vi.stubGlobal(
      'fetch',
      vi.fn((url: string) => {
        if (url === '/api/reconciliation/proposals') {
          return jsonResponse(proposals)
        }
        return jsonResponse({})
      }),
    )

    render(<ReconcilePage />)

    await waitFor(() => {
      expect(screen.getByTestId('proposal-prop-1')).toBeInTheDocument()
    })
    // The page must render all required fields from the server contract.
    // P2 contract requires these 9 fields on every proposal entry. Use the
    // single proposal element (testid) to scope the assertion.
    const proposalEl = screen.getByTestId('proposal-prop-1')
    expect(proposalEl).toHaveTextContent('task-1') // artifactId
    expect(proposalEl).toHaveTextContent('task') // artifactType
    expect(proposalEl).toHaveTextContent('convex') // sourceSide
    expect(proposalEl).toHaveTextContent('Strategy prefer_canonical: Task modified') // reason
  })

  it('POSTs to /api/reconciliation/proposals/:id/apply when Apply is clicked', async () => {
    const proposals = [createProposal({ _id: 'prop-1' })]
    const fetchMock = vi.fn((url: string, init?: RequestInit) => {
      if (
        url === '/api/reconciliation/proposals' &&
        (!init || init.method === undefined || init.method === 'GET')
      ) {
        return jsonResponse(proposals)
      }
      if (url === '/api/reconciliation/proposals/prop-1/apply' && init?.method === 'POST') {
        return jsonResponse({ ...createProposal({ _id: 'prop-1' }), status: 'applied' })
      }
      return jsonResponse({})
    })
    vi.stubGlobal('fetch', fetchMock)

    render(<ReconcilePage />)

    await waitFor(() => {
      expect(screen.getByTestId('apply-prop-1')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByTestId('apply-prop-1'))

    await waitFor(() => {
      const applyCalls = fetchMock.mock.calls.filter(([u, init]) => {
        return (
          u === '/api/reconciliation/proposals/prop-1/apply' &&
          (init as RequestInit | undefined)?.method === 'POST'
        )
      })
      expect(applyCalls.length).toBeGreaterThan(0)
    })
  })

  it('POSTs to /api/reconciliation/proposals/:id/reject when Reject is clicked', async () => {
    const proposals = [createProposal({ _id: 'prop-1' })]
    const fetchMock = vi.fn((url: string, init?: RequestInit) => {
      if (
        url === '/api/reconciliation/proposals' &&
        (!init || init.method === undefined || init.method === 'GET')
      ) {
        return jsonResponse(proposals)
      }
      if (url === '/api/reconciliation/proposals/prop-1/reject' && init?.method === 'POST') {
        return jsonResponse({ ...createProposal({ _id: 'prop-1' }), status: 'rejected' })
      }
      return jsonResponse({})
    })
    vi.stubGlobal('fetch', fetchMock)

    render(<ReconcilePage />)

    await waitFor(() => {
      expect(screen.getByTestId('reject-prop-1')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByTestId('reject-prop-1'))

    await waitFor(() => {
      const rejectCalls = fetchMock.mock.calls.filter(([u, init]) => {
        return (
          u === '/api/reconciliation/proposals/prop-1/reject' &&
          (init as RequestInit | undefined)?.method === 'POST'
        )
      })
      expect(rejectCalls.length).toBeGreaterThan(0)
    })
  })

  it('removes the proposal from the list after a successful apply', async () => {
    const proposals = [
      createProposal({ _id: 'prop-1' }),
      createProposal({ _id: 'prop-2', artifactId: 'task-2' }),
    ]
    const fetchMock = vi.fn((url: string, init?: RequestInit) => {
      if (
        url === '/api/reconciliation/proposals' &&
        (!init || init.method === undefined || init.method === 'GET')
      ) {
        return jsonResponse(proposals)
      }
      if (url === '/api/reconciliation/proposals/prop-1/apply' && init?.method === 'POST') {
        return jsonResponse({ ...createProposal({ _id: 'prop-1' }), status: 'applied' })
      }
      return jsonResponse({})
    })
    vi.stubGlobal('fetch', fetchMock)

    render(<ReconcilePage />)

    await waitFor(() => {
      expect(screen.getByTestId('proposal-prop-1')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByTestId('apply-prop-1'))

    await waitFor(() => {
      expect(screen.queryByTestId('proposal-prop-1')).not.toBeInTheDocument()
    })
    // prop-2 must still be visible
    expect(screen.getByTestId('proposal-prop-2')).toBeInTheDocument()
  })

  // ──── Red tests (fail at HEAD) — error UX does not exist in ReconcilePage ────

  it('displays an error message when the initial proposals fetch fails (Red: not surfaced at HEAD)', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn((url: string) => {
        if (url === '/api/reconciliation/proposals') {
          return Promise.reject(new Error('Network down'))
        }
        return jsonResponse({})
      }),
    )

    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})

    render(<ReconcilePage />)

    // At HEAD, ReconcilePage catches the error and silently sets proposals=[]
    // and never displays an error indicator. Phase 4 Green must surface the
    // failure to the user.
    await waitFor(() => {
      expect(
        screen.queryByText(/failed to load reconciliation proposals/i) ??
          screen.queryByText(/error.*reconciliation/i) ??
          screen.queryByRole('alert'),
      ).toBeInTheDocument()
    })

    consoleError.mockRestore()
  })

  it('displays an error message when the apply POST returns non-2xx (Red: not surfaced at HEAD)', async () => {
    const proposals = [createProposal({ _id: 'prop-1' })]
    const fetchMock = vi.fn((url: string, init?: RequestInit) => {
      if (
        url === '/api/reconciliation/proposals' &&
        (!init || init.method === undefined || init.method === 'GET')
      ) {
        return jsonResponse(proposals)
      }
      if (url === '/api/reconciliation/proposals/prop-1/apply' && init?.method === 'POST') {
        return jsonResponse({ error: 'proposal already resolved' }, 409)
      }
      return jsonResponse({})
    })
    vi.stubGlobal('fetch', fetchMock)

    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})

    render(<ReconcilePage />)

    await waitFor(() => {
      expect(screen.getByTestId('apply-prop-1')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByTestId('apply-prop-1'))

    // At HEAD, the page logs to console.error only — no visible error state.
    // Phase 4 Green must surface apply failures to the user.
    await waitFor(() => {
      expect(
        screen.queryByText(/failed to apply proposal/i) ??
          screen.queryByText(/error.*apply/i) ??
          screen.queryByRole('alert'),
      ).toBeInTheDocument()
    })

    // The proposal must still be visible (apply failed, so it stays in the list).
    expect(screen.getByTestId('proposal-prop-1')).toBeInTheDocument()

    consoleError.mockRestore()
  })
})
