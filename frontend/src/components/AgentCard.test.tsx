import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

import { AgentCard } from '@/components/AgentCard'
import type { AgentRecord } from '@/lib/fleetTypes'

describe('AgentCard', () => {
  it('renders agent details and triggers test callback', () => {
    const onTest = vi.fn()
    const agent: AgentRecord = {
      layer: 'bundled',
      definition: {
        name: 'architect',
        description: 'Plans tracks.',
        mode: 'agent',
        model: 'mock/mock-model',
        temperature: 0.2,
        tools: { write: true, edit: true, bash: false },
        body: 'Architect prompt.',
      },
    }

    render(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <AgentCard agent={agent} busy={false} onTest={onTest} />
      </MemoryRouter>,
    )

    expect(screen.getByText('Plans tracks.')).toBeInTheDocument()
    expect(screen.getByText('@architect')).toBeInTheDocument()
    expect(screen.getByText('mock-model')).toBeInTheDocument()

    expect(screen.getByRole('link', { name: 'Edit' })).toHaveAttribute(
      'href',
      '/agents/architect/edit',
    )

    fireEvent.click(screen.getByRole('button', { name: 'Check Readiness' }))
    expect(onTest).toHaveBeenCalledTimes(1)
  })

  it('disables the button when busy', () => {
    const onTest = vi.fn()
    const agent: AgentRecord = {
      layer: 'bundled',
      definition: {
        name: 'architect',
        description: 'Plans tracks.',
        mode: 'agent',
        model: 'mock/mock-model',
        temperature: 0.2,
        tools: { write: true, edit: true, bash: false },
        body: 'Architect prompt.',
      },
    }

    render(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <AgentCard agent={agent} busy={true} onTest={onTest} />
      </MemoryRouter>,
    )
    expect(screen.getByRole('button', { name: 'Checking...' })).toBeDisabled()
  })
})
