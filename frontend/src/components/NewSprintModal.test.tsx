import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'

import { NewSprintModal } from '@/components/NewSprintModal'

describe('NewSprintModal', () => {
  it('renders the dialog with title and goal inputs', () => {
    render(<NewSprintModal saving={false} error={null} onClose={vi.fn()} onSubmit={vi.fn()} />)
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByLabelText(/sprint title/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/sprint goal/i)).toBeInTheDocument()
  })

  it('disables submit until title and goal are filled', () => {
    render(<NewSprintModal saving={false} error={null} onClose={vi.fn()} onSubmit={vi.fn()} />)
    const submit = screen.getByRole('button', { name: /create sprint/i })
    expect(submit).toBeDisabled()

    fireEvent.change(screen.getByLabelText(/sprint title/i), { target: { value: 'My Sprint' } })
    expect(submit).toBeDisabled()

    fireEvent.change(screen.getByLabelText(/sprint goal/i), {
      target: { value: 'Ship the thing.' },
    })
    expect(submit).not.toBeDisabled()
  })

  it('calls onSubmit with trimmed title and goal', () => {
    const onSubmit = vi.fn()
    render(<NewSprintModal saving={false} error={null} onClose={vi.fn()} onSubmit={onSubmit} />)

    fireEvent.change(screen.getByLabelText(/sprint title/i), { target: { value: '  Sprint A  ' } })
    fireEvent.change(screen.getByLabelText(/sprint goal/i), {
      target: { value: '  Make users happy.  ' },
    })
    fireEvent.click(screen.getByRole('button', { name: /create sprint/i }))

    expect(onSubmit).toHaveBeenCalledTimes(1)
    expect(onSubmit).toHaveBeenCalledWith({ title: 'Sprint A', goal: 'Make users happy.' })
  })

  it('calls onClose when Cancel is clicked', () => {
    const onClose = vi.fn()
    render(<NewSprintModal saving={false} error={null} onClose={onClose} onSubmit={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: /cancel/i }))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('shows an error banner when error prop is set', () => {
    render(
      <NewSprintModal
        saving={false}
        error="Track already exists"
        onClose={vi.fn()}
        onSubmit={vi.fn()}
      />,
    )
    expect(screen.getByText(/track already exists/i)).toBeInTheDocument()
  })

  it('shows a saving label while saving=true', () => {
    render(<NewSprintModal saving={true} error={null} onClose={vi.fn()} onSubmit={vi.fn()} />)
    expect(screen.getByRole('button', { name: /creating/i })).toBeDisabled()
  })
})
