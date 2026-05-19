import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'

import { RecentActivity } from './RecentActivity'

const mockRuns = [
  {
    _id: 'r1',
    taskId: 't1',
    stage: 'dispatch',
    agentId: 'a1',
    startTime: Date.now() - 300000,
    status: 'completed',
    cost: 2,
  },
]

const mockTasks = [{ _id: 't1', title: 'Auth middleware' }]
const mockAgents = [{ _id: 'a1', name: 'alice' }]

describe('RecentActivity', () => {
  it('renders pipeline run activity', () => {
    render(<RecentActivity pipelineRuns={mockRuns} tasks={mockTasks} agents={mockAgents} />)
    expect(screen.getByText(/@alice/)).toBeInTheDocument()
    expect(screen.getByText(/dispatch/)).toBeInTheDocument()
    expect(screen.getByText(/"Auth middleware"/)).toBeInTheDocument()
  })

  it('shows no activity message when empty', () => {
    render(<RecentActivity pipelineRuns={[]} tasks={[]} agents={[]} />)
    expect(screen.getByText('No recent activity')).toBeInTheDocument()
  })
})
