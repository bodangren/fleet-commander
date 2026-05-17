import { describe, expect, it, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'

import { SprintRetrospectiveView } from './SprintRetrospectiveView'

const mockRetrospective = {
  _id: 'retro-1',
  name: 'Sprint 1 Retrospective',
  status: 'completed',
  reportMarkdown: '# Great sprint\n\nWe delivered 24 points.',
  createdAt: Date.now() - 1000 * 60 * 60 * 24 * 14,
  completedAt: Date.now() - 1000 * 60 * 60 * 24 * 13,
}

describe('SprintRetrospectiveView', () => {
  it('renders retrospective report when provided', () => {
    render(<SprintRetrospectiveView retrospective={mockRetrospective} />)

    expect(screen.getByText(mockRetrospective.name)).toBeInTheDocument()
    expect(screen.getByText(/Great sprint/)).toBeInTheDocument()
    expect(screen.getByText(/24 points/)).toBeInTheDocument()
    expect(screen.getByText(/completed/i)).toBeInTheDocument()
  })

  it('shows empty state when no retrospective is selected', () => {
    render(<SprintRetrospectiveView retrospective={null} />)

    expect(screen.getByText('Select a sprint to view its retrospective')).toBeInTheDocument()
  })

  it('calls onBack when back button is clicked', () => {
    const handleBack = vi.fn()
    render(<SprintRetrospectiveView retrospective={mockRetrospective} onBack={handleBack} />)

    const backButton = screen.getByRole('button', { name: /back/i })
    fireEvent.click(backButton)

    expect(handleBack).toHaveBeenCalledTimes(1)
  })
})
