import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ArchitectRow } from './ArchitectRow'
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

describe('ArchitectRow', () => {
  it('renders architect stage with output', () => {
    const contract = createMockContract({
      stages: {
        architect: {
          output: 'Use a modular architecture',
          confidence: 0.85,
          assumptions: ['API will remain stable'],
        },
      },
    })

    render(<ArchitectRow contract={contract} expanded={false} onToggleExpand={vi.fn()} />)

    expect(screen.getByText('Architect')).toBeInTheDocument()
    expect(screen.getByText('Use a modular architecture')).toBeInTheDocument()
    expect(screen.getByText('85%')).toBeInTheDocument()
  })

  it('shows confidence as percentage', () => {
    const contract = createMockContract({
      stages: {
        architect: {
          output: 'Test',
          confidence: 0.75,
          assumptions: [],
        },
      },
    })

    render(<ArchitectRow contract={contract} expanded={false} onToggleExpand={vi.fn()} />)

    expect(screen.getByText('75%')).toBeInTheDocument()
  })

  it('shows assumptions when expanded', async () => {
    const contract = createMockContract({
      stages: {
        architect: {
          output: 'Test output',
          confidence: 0.9,
          assumptions: ['Assumption 1', 'Assumption 2'],
        },
      },
    })

    render(<ArchitectRow contract={contract} expanded={true} onToggleExpand={vi.fn()} />)

    expect(screen.getByText('Assumption 1')).toBeInTheDocument()
    expect(screen.getByText('Assumption 2')).toBeInTheDocument()
  })

  it('shows suggested harness when present', () => {
    const contract = createMockContract({
      stages: {
        architect: {
          output: 'Design',
          confidence: 0.8,
          assumptions: [],
          suggestedHarness: 'test-harness',
        },
      },
    })

    render(<ArchitectRow contract={contract} expanded={true} onToggleExpand={vi.fn()} />)

    expect(screen.getByText('test-harness')).toBeInTheDocument()
  })
})
