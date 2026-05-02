import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { TaskTimelinePage } from './TaskTimelinePage'

vi.mock('@/hooks/useRunContract', () => ({
  useRunContract: vi.fn(),
}))

function renderWithRouter(ui: React.ReactElement, route = '/timeline/task-1') {
  return render(<MemoryRouter initialEntries={[route]}>{ui}</MemoryRouter>)
}

describe('TaskTimelinePage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('shows loading state', async () => {
    const { useRunContract } = await import('@/hooks/useRunContract')
    vi.mocked(useRunContract).mockReturnValue({
      runContract: null,
      loading: true,
      error: null,
    })

    renderWithRouter(<TaskTimelinePage />)

    expect(screen.getByText('Loading...')).toBeDefined()
  })

  it('shows error state', async () => {
    const { useRunContract } = await import('@/hooks/useRunContract')
    vi.mocked(useRunContract).mockReturnValue({
      runContract: null,
      loading: false,
      error: 'Failed to fetch contract',
    })

    renderWithRouter(<TaskTimelinePage />)

    expect(screen.getByText('Error')).toBeDefined()
    expect(screen.getByText('Failed to fetch contract')).toBeDefined()
  })

  it('shows empty state when no run contract', async () => {
    const { useRunContract } = await import('@/hooks/useRunContract')
    vi.mocked(useRunContract).mockReturnValue({
      runContract: null,
      loading: false,
      error: null,
    })

    renderWithRouter(<TaskTimelinePage />)

    expect(screen.getByText('No run contract — legacy task')).toBeDefined()
  })

  it('renders timeline when run contract is loaded', async () => {
    const { useRunContract } = await import('@/hooks/useRunContract')
    vi.mocked(useRunContract).mockReturnValue({
      runContract: {
        taskId: 'task-1',
        projectSlug: 'test-project',
        objective: 'Implement feature X',
        createdAt: new Date('2024-04-01'),
        stages: {},
        dispatchRejections: [],
      },
      loading: false,
      error: null,
    })

    renderWithRouter(<TaskTimelinePage />)

    expect(screen.getByText('Run Timeline')).toBeDefined()
    expect(screen.getByText('Implement feature X')).toBeDefined()
    expect(screen.getByText(/test-project/)).toBeDefined()
  })

  it('renders keyboard shortcut hints', async () => {
    const { useRunContract } = await import('@/hooks/useRunContract')
    vi.mocked(useRunContract).mockReturnValue({
      runContract: {
        taskId: 'task-1',
        projectSlug: 'test',
        objective: 'Test',
        createdAt: new Date(),
        stages: {},
        dispatchRejections: [],
      },
      loading: false,
      error: null,
    })

    renderWithRouter(<TaskTimelinePage />)

    expect(screen.getByText('Keyboard shortcuts')).toBeDefined()
    expect(screen.getByText('j/k to navigate stages, Enter to expand/collapse')).toBeDefined()
  })

  it('navigates back to dashboard via link', async () => {
    const { useRunContract } = await import('@/hooks/useRunContract')
    vi.mocked(useRunContract).mockReturnValue({
      runContract: {
        taskId: 'task-1',
        projectSlug: 'test',
        objective: 'Test',
        createdAt: new Date(),
        stages: {},
        dispatchRejections: [],
      },
      loading: false,
      error: null,
    })

    renderWithRouter(<TaskTimelinePage />)

    const backLinks = screen.getAllByText('Back to dashboard')
    expect(backLinks.length).toBeGreaterThan(0)
  })
})
