import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'

import { AgentModelHistory } from './AgentModelHistory'
import { mockAgentModelChanges } from '@/__fixtures__/agentModelFixtures'

describe('AgentModelHistory', () => {
  it('shows empty state when no model changes are provided', () => {
    render(<AgentModelHistory changes={[]} />)

    expect(screen.getByText('No model changes')).toBeInTheDocument()
  })

  it('renders model change entries', () => {
    render(<AgentModelHistory changes={mockAgentModelChanges} />)

    expect(screen.getByText('Alice')).toBeInTheDocument()
    expect(screen.getByText('Bob')).toBeInTheDocument()
  })

  it('shows previous and new models for each change', () => {
    render(<AgentModelHistory changes={mockAgentModelChanges} />)

    expect(screen.getByText('claude-sonnet')).toBeInTheDocument()
    expect(screen.getByText('claude-opus')).toBeInTheDocument()
    expect(screen.getByText('gpt-4o')).toBeInTheDocument()
  })

  it('renders change date for each entry', () => {
    render(<AgentModelHistory changes={mockAgentModelChanges} />)

    // Each change should render its timestamp in some form
    expect(screen.getByText(mockAgentModelChanges[0].agentDisplayName)).toBeInTheDocument()
    expect(screen.getByText(mockAgentModelChanges[1].agentDisplayName)).toBeInTheDocument()
  })
})
