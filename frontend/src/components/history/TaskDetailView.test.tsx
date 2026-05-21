import { describe, expect, it, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'

import { TaskDetailView } from './TaskDetailView'
import { mockTaskHistory } from '@/__fixtures__/historyFixtures'

describe('TaskDetailView', () => {
  it('renders task details when a task is provided', () => {
    const task = mockTaskHistory[0]
    render(<TaskDetailView task={task} />)

    expect(screen.getByText(task.title)).toBeInTheDocument()
    expect(screen.getByText(/cost/i)).toBeInTheDocument()
    expect(screen.getByText(/12\.50/)).toBeInTheDocument()
    expect(screen.getByText(/status/i)).toBeInTheDocument()
    expect(screen.getAllByText(task.status).length).toBeGreaterThan(0)
    expect(screen.getByText(/agent/i)).toBeInTheDocument()
    expect(screen.getByText(task.agent)).toBeInTheDocument()
    expect(screen.getByText(/project/i)).toBeInTheDocument()
    expect(screen.getByText(task.projectSlug)).toBeInTheDocument()
    expect(screen.getByText(/story points/i)).toBeInTheDocument()
    expect(screen.getByText(String(task.storyPoints))).toBeInTheDocument()
  })

  it('shows empty state when no task is selected', () => {
    render(<TaskDetailView task={null} />)

    expect(screen.getByText('Select a task to view details')).toBeInTheDocument()
  })

  it('calls onBack when back button is clicked', () => {
    const handleBack = vi.fn()
    const task = mockTaskHistory[0]
    render(<TaskDetailView task={task} onBack={handleBack} />)

    const backButton = screen.getByRole('button', { name: /back/i })
    fireEvent.click(backButton)

    expect(handleBack).toHaveBeenCalledTimes(1)
  })
})
