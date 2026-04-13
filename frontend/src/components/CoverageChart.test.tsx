import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CoverageChart } from './CoverageChart'

describe('CoverageChart', () => {
  const mockHistory = [
    {
      projectSlug: 'test',
      projectId: 'p1',
      percentage: 80,
      tool: 'vitest',
      executionId: 'e1',
      date: new Date('2024-01-01'),
    },
    {
      projectSlug: 'test',
      projectId: 'p1',
      percentage: 82,
      tool: 'vitest',
      executionId: 'e2',
      date: new Date('2024-01-02'),
    },
    {
      projectSlug: 'test',
      projectId: 'p1',
      percentage: 85,
      tool: 'vitest',
      executionId: 'e3',
      date: new Date('2024-01-03'),
    },
  ]

  it('renders "No coverage data" when history is empty', () => {
    render(<CoverageChart history={[]} projectSlug="test" />)
    expect(screen.getByText('No coverage data')).toBeInTheDocument()
  })

  it('renders "No coverage data" when history is undefined', () => {
    render(<CoverageChart history={undefined} projectSlug="test" />)
    expect(screen.getByText('No coverage data')).toBeInTheDocument()
  })

  it('renders loading state correctly', () => {
    render(<CoverageChart history={[]} projectSlug="test" loading={true} />)
    expect(screen.getAllByText('Loading coverage...')).toHaveLength(2)
  })

  it('displays coverage percentage in header', () => {
    render(<CoverageChart history={mockHistory} projectSlug="test" />)
    expect(screen.getByText(/85\.0%/)).toBeInTheDocument()
  })

  it('displays tool name', () => {
    render(<CoverageChart history={mockHistory} projectSlug="test" />)
    expect(screen.getByText('vitest')).toBeInTheDocument()
  })

  it('shows latest coverage when history exists', () => {
    render(<CoverageChart history={mockHistory} projectSlug="test" />)
    expect(screen.getByText(/85\.0%/)).toBeInTheDocument()
    expect(screen.getByText('vitest')).toBeInTheDocument()
  })

  it('calls onRefresh when refresh button is clicked', async () => {
    const user = userEvent.setup()
    const handleRefresh = vi.fn()
    render(<CoverageChart history={mockHistory} projectSlug="test" onRefresh={handleRefresh} />)

    const refreshBtn = screen.getByRole('button', { name: /refresh/i })
    await user.click(refreshBtn)

    expect(handleRefresh).toHaveBeenCalledTimes(1)
  })

  it('displays date range', () => {
    render(<CoverageChart history={mockHistory} projectSlug="test" />)
    expect(screen.getByText(/Jan 1, 2024/)).toBeInTheDocument()
    expect(screen.getByText(/Jan 3, 2024/)).toBeInTheDocument()
  })
})
