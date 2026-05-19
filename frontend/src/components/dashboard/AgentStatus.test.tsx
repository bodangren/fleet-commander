import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'

import { AgentStatus } from './AgentStatus'

const mockAgents = [
  { _id: 'a1', name: 'alice', role: 'architect', status: 'active' },
  { _id: 'a2', name: 'bob', role: 'executor', status: 'idle' },
]

const mockTasks = [
  { _id: 't1', title: 'Auth middleware', assigneeId: 'a1' },
]

describe('AgentStatus', () => {
  it('renders agent names and statuses', () => {
    render(<AgentStatus agents={mockAgents} tasks={mockTasks} />)
    expect(screen.getByText('@alice')).toBeInTheDocument()
    expect(screen.getByText('@bob')).toBeInTheDocument()
    expect(screen.getByText('active')).toBeInTheDocument()
    expect(screen.getByText('idle')).toBeInTheDocument()
  })

  it('shows assigned task', () => {
    render(<AgentStatus agents={mockAgents} tasks={mockTasks} />)
    expect(screen.getByText(/Auth middleware/)).toBeInTheDocument()
  })

  it('shows agent count summary', () => {
    render(<AgentStatus agents={mockAgents} tasks={[]} />)
    expect(screen.getByText(/1 active · 1 idle · 0 blocked/)).toBeInTheDocument()
  })
})
