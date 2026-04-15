import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { RecoveryRow } from './RecoveryRow'
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

describe('RecoveryRow', () => {
  it('renders recovery stage with action', () => {
    const contract = createMockContract({
      stages: {
        recovery: {
          action: 'retry',
          reason: 'Attempting again with different parameters',
        },
      },
    })

    render(<RecoveryRow contract={contract} expanded={true} onToggleExpand={vi.fn()} />)

    expect(screen.getByText('Recovery')).toBeInTheDocument()
    expect(screen.getAllByText('retry')).toHaveLength(2)
    expect(screen.getByText('Attempting again with different parameters')).toBeInTheDocument()
  })

  it('renders human_review action', () => {
    const contract = createMockContract({
      stages: {
        recovery: {
          action: 'human_review',
          reason: 'Manual intervention required',
        },
      },
    })

    render(<RecoveryRow contract={contract} expanded={true} onToggleExpand={vi.fn()} />)

    expect(screen.getAllByText('human review')).toHaveLength(2)
  })

  it('renders escalate action', () => {
    const contract = createMockContract({
      stages: {
        recovery: {
          action: 'escalate',
          reason: 'Escalating to senior reviewer',
        },
      },
    })

    render(<RecoveryRow contract={contract} expanded={false} onToggleExpand={vi.fn()} />)

    expect(screen.getByText('escalate')).toBeInTheDocument()
  })
})
