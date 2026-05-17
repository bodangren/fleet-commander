import { describe, expect, it, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'

import { AgentPerformanceTable } from './AgentPerformanceTable'
import { mockAgentHistory } from '@/__fixtures__/historyFixtures'

describe('AgentPerformanceTable', () => {
  it('renders agent names and models in rows', () => {
    render(<AgentPerformanceTable agents={mockAgentHistory} />)

    expect(screen.getByText('Alice')).toBeInTheDocument()
    expect(screen.getByText('Bob')).toBeInTheDocument()
    expect(screen.getByText('claude-opus')).toBeInTheDocument()
    expect(screen.getByText('claude-sonnet')).toBeInTheDocument()
  })

  it('shows empty state when no agents are provided', () => {
    render(<AgentPerformanceTable agents={[]} />)

    expect(screen.getByText('No agents found')).toBeInTheDocument()
  })

  it('sorts by name when header is clicked', () => {
    render(<AgentPerformanceTable agents={mockAgentHistory} />)

    const nameHeader = screen.getByRole('columnheader', { name: /name/i })
    fireEvent.click(nameHeader)

    const rows = screen.getAllByRole('row')
    // Initial sort is asc (Alice, Bob). Clicking toggles to desc (Bob, Alice)
    expect(rows[1]).toHaveTextContent('Bob')
  })

  it('calls onSelectAgent when a row is clicked', () => {
    const handleSelect = vi.fn()
    render(<AgentPerformanceTable agents={mockAgentHistory} onSelectAgent={handleSelect} />)

    const row = screen.getByText('Bob').closest('tr') ?? screen.getByText('Bob')
    fireEvent.click(row)

    expect(handleSelect).toHaveBeenCalledTimes(1)
    expect(handleSelect).toHaveBeenCalledWith(
      expect.objectContaining({ _id: 'agent-history-2', name: 'bob' }),
    )
  })

  it('renders cost values with two decimal places', () => {
    render(<AgentPerformanceTable agents={mockAgentHistory} />)

    expect(screen.getByText('1250.50')).toBeInTheDocument()
    expect(screen.getByText('890.25')).toBeInTheDocument()
  })

  it('renders reliability for each agent', () => {
    render(<AgentPerformanceTable agents={mockAgentHistory} />)

    expect(screen.getByText('0.95')).toBeInTheDocument()
    expect(screen.getByText('0.92')).toBeInTheDocument()
  })

  it('renders "Unknown Agent" fallback when agent display name is missing', () => {
    const agentsWithUnknown = [{ ...mockAgentHistory[0], displayName: '' }]
    render(<AgentPerformanceTable agents={agentsWithUnknown} />)

    expect(screen.getByText('Unknown Agent')).toBeInTheDocument()
  })
})
