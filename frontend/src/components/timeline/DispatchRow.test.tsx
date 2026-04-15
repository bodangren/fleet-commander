import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { DispatchRow } from './DispatchRow'
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

describe('DispatchRow', () => {
  it('renders dispatch stage with candidate count', () => {
    const contract = createMockContract({
      dispatchRejections: [
        { taskKey: 'task-1', filter: 'blocked', reason: 'Task blocked' },
        { taskKey: 'task-2', filter: 'priority', reason: 'Lower priority' },
      ],
    })

    render(<DispatchRow contract={contract} expanded={false} onToggleExpand={vi.fn()} />)

    expect(screen.getByText('Dispatch')).toBeInTheDocument()
    expect(screen.getByText('2 rejections')).toBeInTheDocument()
  })

  it('shows rejection reasons when expanded', async () => {
    const user = userEvent.setup()
    const contract = createMockContract({
      dispatchRejections: [
        { taskKey: 'task-1', filter: 'blocked', reason: 'Task blocked by dependency' },
        { taskKey: 'task-2', filter: 'priority', reason: 'Lower priority score' },
      ],
    })

    const { rerender } = render(
      <DispatchRow contract={contract} expanded={false} onToggleExpand={vi.fn()} />,
    )

    const expandButton = screen.getByRole('button', { name: /Dispatch/i })
    await user.click(expandButton)

    rerender(<DispatchRow contract={contract} expanded={true} onToggleExpand={vi.fn()} />)

    expect(screen.getByText('Task blocked by dependency')).toBeInTheDocument()
    expect(screen.getByText('Lower priority score')).toBeInTheDocument()
  })

  it('calls onToggleExpand when expand button is clicked', async () => {
    const user = userEvent.setup()
    const onToggleExpand = vi.fn()
    const contract = createMockContract({
      dispatchRejections: [{ taskKey: 'task-1', filter: 'blocked', reason: 'Blocked' }],
    })

    render(<DispatchRow contract={contract} expanded={false} onToggleExpand={onToggleExpand} />)

    await user.click(screen.getByRole('button', { name: /Dispatch/i }))

    expect(onToggleExpand).toHaveBeenCalledTimes(1)
  })

  it('shows raw JSON when expanded', async () => {
    const contract = createMockContract({
      dispatchRejections: [{ taskKey: 'task-1', filter: 'blocked', reason: 'Blocked' }],
    })

    render(<DispatchRow contract={contract} expanded={true} onToggleExpand={vi.fn()} />)

    expect(screen.getByText(/"taskKey": "task-1"/)).toBeInTheDocument()
  })

  it('renders with correct stage color', () => {
    const contract = createMockContract()
    const { container } = render(
      <DispatchRow contract={contract} expanded={false} onToggleExpand={vi.fn()} />,
    )

    const row = container.querySelector('[data-stage="dispatch"]')
    expect(row).toBeInTheDocument()
  })
})
