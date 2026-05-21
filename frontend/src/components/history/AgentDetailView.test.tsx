import { describe, expect, it, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'

import { AgentDetailView } from './AgentDetailView'
import { mockAgentHistory } from '@/__fixtures__/historyFixtures'

describe('AgentDetailView', () => {
  it('renders agent details when an agent is provided', () => {
    const agent = mockAgentHistory[0]
    render(<AgentDetailView agent={agent} />)

    expect(screen.getByText(agent.displayName)).toBeInTheDocument()
    expect(screen.getByText(agent.model)).toBeInTheDocument()
    expect(screen.getByText(String(agent.tasksCompleted))).toBeInTheDocument()
    expect(screen.getByText(new RegExp(agent.totalCost.toFixed(2)))).toBeInTheDocument()
    expect(screen.getByText(String(agent.avgLatencyMs))).toBeInTheDocument()
    expect(screen.getByText(agent.reliability.toFixed(2))).toBeInTheDocument()
  })

  it('shows empty state when no agent is selected', () => {
    render(<AgentDetailView agent={null} />)

    expect(screen.getByText('Select an agent to view details')).toBeInTheDocument()
  })

  it('calls onBack when back button is clicked', () => {
    const handleBack = vi.fn()
    const agent = mockAgentHistory[0]
    render(<AgentDetailView agent={agent} onBack={handleBack} />)

    const backButton = screen.getByRole('button', { name: /back/i })
    fireEvent.click(backButton)

    expect(handleBack).toHaveBeenCalledTimes(1)
  })
})
