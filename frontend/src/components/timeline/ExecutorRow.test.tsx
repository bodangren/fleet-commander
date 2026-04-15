import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ExecutorRow } from './ExecutorRow'
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

describe('ExecutorRow', () => {
  it('renders executor stage with status', () => {
    const contract = createMockContract({
      stages: {
        executor: {
          changedFiles: ['file1.ts', 'file2.ts'],
          testsRun: ['test1.ts'],
          unresolvedAssumptions: [],
          confidence: 0.9,
          branch: 'feature-x',
          commit: 'abc123',
          status: 'succeeded',
        },
      },
    })

    render(<ExecutorRow contract={contract} expanded={false} onToggleExpand={vi.fn()} />)

    expect(screen.getByText('Executor')).toBeInTheDocument()
    expect(screen.getByText('succeeded')).toBeInTheDocument()
  })

  it('shows failed status with appropriate styling', () => {
    const contract = createMockContract({
      stages: {
        executor: {
          changedFiles: ['file1.ts'],
          testsRun: [],
          unresolvedAssumptions: ['Assumption not met'],
          confidence: 0.4,
          branch: 'feature-x',
          commit: 'abc123',
          status: 'failed',
        },
      },
    })

    render(<ExecutorRow contract={contract} expanded={false} onToggleExpand={vi.fn()} />)

    expect(screen.getByText('failed')).toBeInTheDocument()
  })

  it('shows changed files count', () => {
    const contract = createMockContract({
      stages: {
        executor: {
          changedFiles: ['a.ts', 'b.ts', 'c.ts'],
          testsRun: [],
          unresolvedAssumptions: [],
          confidence: 0.9,
          branch: 'feature',
          commit: 'xyz',
          status: 'succeeded',
        },
      },
    })

    render(<ExecutorRow contract={contract} expanded={false} onToggleExpand={vi.fn()} />)

    expect(screen.getByText('3 files')).toBeInTheDocument()
  })

  it('shows tests run count', () => {
    const contract = createMockContract({
      stages: {
        executor: {
          changedFiles: ['file.ts'],
          testsRun: ['test1.ts', 'test2.ts'],
          unresolvedAssumptions: [],
          confidence: 0.9,
          branch: 'feature',
          commit: 'xyz',
          status: 'succeeded',
        },
      },
    })

    render(<ExecutorRow contract={contract} expanded={false} onToggleExpand={vi.fn()} />)

    expect(screen.getByText('2 tests')).toBeInTheDocument()
  })

  it('shows unresolved assumptions when expanded', async () => {
    const contract = createMockContract({
      stages: {
        executor: {
          changedFiles: ['file.ts'],
          testsRun: ['test.ts'],
          unresolvedAssumptions: ['API may change'],
          confidence: 0.7,
          branch: 'feature',
          commit: 'xyz',
          status: 'succeeded',
        },
      },
    })

    render(<ExecutorRow contract={contract} expanded={true} onToggleExpand={vi.fn()} />)

    expect(screen.getByText('API may change')).toBeInTheDocument()
  })
})
