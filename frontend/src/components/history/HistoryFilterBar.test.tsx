import { describe, expect, it, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { HistoryFilterBar } from './HistoryFilterBar'

describe('HistoryFilterBar', () => {
  it('renders status filter dropdown', () => {
    render(<HistoryFilterBar filters={{}} onChange={vi.fn()} />)
    expect(screen.getByLabelText(/status/i)).toBeInTheDocument()
  })

  it('renders project filter dropdown', () => {
    render(<HistoryFilterBar filters={{}} onChange={vi.fn()} />)
    expect(screen.getByLabelText(/project/i)).toBeInTheDocument()
  })

  it('renders agent filter dropdown', () => {
    render(<HistoryFilterBar filters={{}} onChange={vi.fn()} />)
    expect(screen.getByLabelText(/agent/i)).toBeInTheDocument()
  })

  it('calls onChange when status changes', () => {
    const onChange = vi.fn()
    render(<HistoryFilterBar filters={{}} onChange={onChange} />)
    const select = screen.getByLabelText(/status/i)
    fireEvent.change(select, { target: { value: 'done' } })
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ status: 'done' }))
  })

  it('calls onChange when project changes', () => {
    const onChange = vi.fn()
    render(<HistoryFilterBar filters={{}} onChange={onChange} />)
    const select = screen.getByLabelText(/project/i)
    fireEvent.change(select, { target: { value: 'foundation' } })
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ project: 'foundation' }))
  })

  it('calls onChange when agent changes', () => {
    const onChange = vi.fn()
    render(<HistoryFilterBar filters={{}} onChange={onChange} />)
    const select = screen.getByLabelText(/agent/i)
    fireEvent.change(select, { target: { value: 'alice' } })
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ agent: 'alice' }))
  })

  it('displays current filter values', () => {
    render(
      <HistoryFilterBar filters={{ status: 'done', project: 'foundation' }} onChange={vi.fn()} />,
    )
    expect(screen.getByDisplayValue('done')).toBeInTheDocument()
  })
})
