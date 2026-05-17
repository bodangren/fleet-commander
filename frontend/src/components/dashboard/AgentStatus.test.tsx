import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

import { AgentStatus } from './AgentStatus'
import { mockAgents } from '@/__fixtures__/dashboardFixtures'

describe('AgentStatus', () => {
  it('renders empty state when no agents are provided', () => {
    render(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <AgentStatus agents={[]} />
      </MemoryRouter>,
    )

    expect(screen.getByText(/no agents/i)).toBeInTheDocument()
  })

  it('renders a single agent with display name, status badge, and current task', () => {
    const singleAgent = [mockAgents[0]]
    render(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <AgentStatus agents={singleAgent} />
      </MemoryRouter>,
    )

    expect(screen.getByText('Architect')).toBeInTheDocument()
    expect(screen.getByText('Active')).toBeInTheDocument()
    expect(screen.getByText('Plan dashboard')).toBeInTheDocument()
  })

  it('renders multiple agents', () => {
    render(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <AgentStatus agents={mockAgents} />
      </MemoryRouter>,
    )

    expect(screen.getByText('Architect')).toBeInTheDocument()
    expect(screen.getByText('Executor')).toBeInTheDocument()
    expect(screen.getByText('Reviewer')).toBeInTheDocument()
  })

  it('shows Active status badge', () => {
    render(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <AgentStatus agents={mockAgents} />
      </MemoryRouter>,
    )

    expect(screen.getByText('Active')).toBeInTheDocument()
  })

  it('shows Idle status badge', () => {
    render(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <AgentStatus agents={mockAgents} />
      </MemoryRouter>,
    )

    expect(screen.getByText('Idle')).toBeInTheDocument()
  })

  it('shows Blocked status badge', () => {
    render(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <AgentStatus agents={mockAgents} />
      </MemoryRouter>,
    )

    expect(screen.getByText('Blocked')).toBeInTheDocument()
  })

  it('links to full agent view for each agent', () => {
    render(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <AgentStatus agents={mockAgents} />
      </MemoryRouter>,
    )

    const links = screen.getAllByRole('link')
    const hrefs = links.map(link => link.getAttribute('href'))
    expect(hrefs).toContain('/agents/architect/edit')
    expect(hrefs).toContain('/agents/executor/edit')
    expect(hrefs).toContain('/agents/reviewer/edit')
  })
})
