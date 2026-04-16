import { render, screen, fireEvent } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { ReconcilePanel, type ReconciliationProposalEntry } from './Reconcile'

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
