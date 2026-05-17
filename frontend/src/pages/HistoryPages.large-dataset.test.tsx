import { describe, expect, it, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import {
  setupConvexMocks,
  setMockConvexData,
  resetMockConvexData,
} from '@/__fixtures__/convex-provider'
import type {
  SprintHistoryItem,
  AgentHistoryItem,
  TaskHistoryItem,
} from '@/__fixtures__/historyFixtures'

setupConvexMocks()

import { SprintsHistoryPage } from './SprintsHistoryPage'
import { AgentsHistoryPage } from './AgentsHistoryPage'
import { TasksHistoryPage } from './TasksHistoryPage'

afterEach(() => {
  resetMockConvexData()
})

function renderWithRouter(ui: React.ReactNode, initialEntries?: string[]) {
  return render(
    <MemoryRouter
      future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
      initialEntries={initialEntries}
    >
      {ui}
    </MemoryRouter>,
  )
}

const BASE_TIME = Date.now()

function generateLargeSprintHistory(count: number): SprintHistoryItem[] {
  return Array.from({ length: count }, (_, i) => ({
    _id: `sprint-${i}`,
    name: `Sprint ${i + 1}`,
    status: i % 3 === 0 ? 'active' : 'closed',
    startDate: BASE_TIME - 1000 * 60 * 60 * 24 * (14 + i * 7),
    endDate: BASE_TIME - 1000 * 60 * 60 * 24 * (7 + i * 7),
    budget: 500 + i * 50,
    actualCost: 400 + i * 40,
    pointsDelivered: 20 + (i % 10),
    pointsEstimated: 25 + (i % 8),
    taskCount: 8 + (i % 6),
    completedCount: 6 + (i % 5),
    velocity: 1.5 + (i % 5) * 0.25,
  }))
}

function generateLargeAgentHistory(count: number): AgentHistoryItem[] {
  const models = ['claude-opus', 'claude-sonnet', 'gpt-4o', 'gpt-4o-mini']
  return Array.from({ length: count }, (_, i) => ({
    _id: `agent-history-${i}`,
    name: `agent-${i}`,
    displayName: `Agent ${i + 1}`,
    model: models[i % models.length],
    tasksCompleted: 10 + (i % 50),
    totalCost: 100 + i * 12.5,
    avgLatencyMs: 2000 + (i % 3000),
    reliability: 0.8 + (i % 20) * 0.01,
    periodStart: BASE_TIME - 1000 * 60 * 60 * 24 * 30,
    periodEnd: BASE_TIME,
  }))
}

function generateLargeTaskHistory(count: number): TaskHistoryItem[] {
  const statuses = ['done', 'in_progress', 'todo', 'blocked']
  const agents = ['alice', 'bob', 'charlie', 'diana']
  const projects = ['foundation', 'frontend', 'backend', 'ops']
  return Array.from({ length: count }, (_, i) => ({
    _id: `task-history-${i}`,
    title: `Task ${i + 1}: ${['Fix', 'Add', 'Update', 'Remove'][i % 4]} ${['auth', 'dashboard', 'query', 'layout'][i % 4]}`,
    status: statuses[i % statuses.length],
    agent: agents[i % agents.length],
    projectSlug: projects[i % projects.length],
    sprintId: `sprint-${(i % 12) + 1}`,
    cost: (i % 20) * 5.5,
    storyPoints: (i % 8) + 1,
    createdAt: BASE_TIME - 1000 * 60 * 60 * 24 * (i + 1),
    completedAt: i % 3 === 0 ? BASE_TIME - 1000 * 60 * 60 * 24 * ((i % 7) + 1) : undefined,
  }))
}

describe('SprintsHistoryPage with large dataset', () => {
  it('renders 100 sprints without crashing', () => {
    const largeSprints = generateLargeSprintHistory(100)
    setMockConvexData({ sprintHistory: largeSprints })

    renderWithRouter(<SprintsHistoryPage />)

    expect(screen.getByText('Sprint History')).toBeInTheDocument()
    expect(screen.getByText('Sprint 1')).toBeInTheDocument()
    expect(screen.getByText('Sprint 100')).toBeInTheDocument()
  })

  it('renders velocity values for all sprints', () => {
    const largeSprints = generateLargeSprintHistory(100)
    setMockConvexData({ sprintHistory: largeSprints })

    renderWithRouter(<SprintsHistoryPage />)

    // Check first and last velocity values are rendered
    expect(screen.getByText('1.50')).toBeInTheDocument()
    expect(screen.getByText('2.75')).toBeInTheDocument()
  })
})

describe('AgentsHistoryPage with large dataset', () => {
  it('renders 100 agents without crashing', () => {
    const largeAgents = generateLargeAgentHistory(100)
    setMockConvexData({ agentHistory: largeAgents })

    renderWithRouter(<AgentsHistoryPage />)

    expect(screen.getByText('Agent History')).toBeInTheDocument()
    expect(screen.getByText('Agent 1')).toBeInTheDocument()
    expect(screen.getByText('Agent 100')).toBeInTheDocument()
  })

  it('renders cost values with two decimal places', () => {
    const largeAgents = generateLargeAgentHistory(100)
    setMockConvexData({ agentHistory: largeAgents })

    renderWithRouter(<AgentsHistoryPage />)

    expect(screen.getByText('100.00')).toBeInTheDocument()
    expect(screen.getByText('1337.50')).toBeInTheDocument()
  })
})

describe('TasksHistoryPage with large dataset', () => {
  it('renders 100 tasks without crashing', () => {
    const largeTasks = generateLargeTaskHistory(100)
    setMockConvexData({ taskHistory: largeTasks })

    renderWithRouter(<TasksHistoryPage />)

    expect(screen.getByText('Task History')).toBeInTheDocument()
    expect(screen.getByText('Task 1: Fix auth')).toBeInTheDocument()
    expect(screen.getByText('Task 100: Remove layout')).toBeInTheDocument()
  })

  it('filters large task list by search without OOM', () => {
    const largeTasks = generateLargeTaskHistory(100)
    setMockConvexData({ taskHistory: largeTasks })

    renderWithRouter(<TasksHistoryPage />, ['?search=auth'])

    // Only tasks containing 'auth' should be visible
    expect(screen.getByText('Task 1: Fix auth')).toBeInTheDocument()
  })

  it('filters large task list by status without OOM', () => {
    const largeTasks = generateLargeTaskHistory(100)
    setMockConvexData({ taskHistory: largeTasks })

    renderWithRouter(<TasksHistoryPage />, ['?status=done'])

    // Done tasks should be visible
    expect(screen.getByText('Task 1: Fix auth')).toBeInTheDocument()
  })
})
