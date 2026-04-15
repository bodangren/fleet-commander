import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ReviewerRow } from './ReviewerRow'
import type { RunContractDisplay } from '@/hooks/useRunContract'

const createMockContract = (overrides: Partial<RunContractDisplay> = {}): RunContractDisplay => ({
  taskId: 'task-123',
  projectSlug: 'test-project',
  objective: 'Implement feature X',
  scope: [],
  acceptanceCriteria: [],
  createdAt: new Date(),
  stages: {},
  dispatchRejections: [],
  ...overrides,
})

describe('ReviewerRow', () => {
  it('renders reviewer stage with passed status', () => {
    const contract = createMockContract({
      stages: {
        reviewer: {
          status: 'passed',
          summary: 'LGTM',
        },
      },
    })

    render(<ReviewerRow contract={contract} expanded={false} onToggleExpand={vi.fn()} />)

    expect(screen.getByText('Reviewer')).toBeInTheDocument()
    expect(screen.getByText('passed')).toBeInTheDocument()
  })

  it('renders reviewer stage with failed status', () => {
    const contract = createMockContract({
      stages: {
        reviewer: {
          status: 'failed',
          summary: 'Found issues',
          issueClass: 'correctness',
          severity: 'blocker',
        },
      },
    })

    render(<ReviewerRow contract={contract} expanded={false} onToggleExpand={vi.fn()} />)

    expect(screen.getByText('failed')).toBeInTheDocument()
    expect(screen.getByText('correctness')).toBeInTheDocument()
    expect(screen.getByText('blocker')).toBeInTheDocument()
  })

  it('shows issue class badge when present', () => {
    const contract = createMockContract({
      stages: {
        reviewer: {
          status: 'failed',
          summary: 'Issues found',
          issueClass: 'security',
          severity: 'major',
        },
      },
    })

    render(<ReviewerRow contract={contract} expanded={false} onToggleExpand={vi.fn()} />)

    expect(screen.getByText('security')).toBeInTheDocument()
    expect(screen.getByText('major')).toBeInTheDocument()
  })

  it('shows needs-changes status', () => {
    const contract = createMockContract({
      stages: {
        reviewer: {
          status: 'needs-changes',
          summary: 'Refactoring needed',
        },
      },
    })

    render(<ReviewerRow contract={contract} expanded={false} onToggleExpand={vi.fn()} />)

    expect(screen.getByText('needs-changes')).toBeInTheDocument()
  })
})
