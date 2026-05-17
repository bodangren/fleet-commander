import { describe, expect, it, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { HistorySearchBar } from './HistorySearchBar'

describe('HistorySearchBar', () => {
  it('renders search input with placeholder', () => {
    render(<HistorySearchBar value="" onChange={vi.fn()} />)
    expect(screen.getByPlaceholderText(/search/i)).toBeInTheDocument()
  })

  it('displays current value', () => {
    render(<HistorySearchBar value="auth" onChange={vi.fn()} />)
    expect(screen.getByDisplayValue('auth')).toBeInTheDocument()
  })

  it('calls onChange with sanitized value', () => {
    const onChange = vi.fn()
    render(<HistorySearchBar value="" onChange={onChange} />)
    const input = screen.getByPlaceholderText(/search/i)
    fireEvent.change(input, { target: { value: '<script>alert(1)</script>' } })
    expect(onChange).toHaveBeenCalledWith('alert1')
  })

  it('trims whitespace from input', () => {
    const onChange = vi.fn()
    render(<HistorySearchBar value="" onChange={onChange} />)
    const input = screen.getByPlaceholderText(/search/i)
    fireEvent.change(input, { target: { value: '  bug  ' } })
    expect(onChange).toHaveBeenCalledWith('bug')
  })

  it('has accessible label', () => {
    render(<HistorySearchBar value="" onChange={vi.fn()} aria-label="Search tasks" />)
    expect(screen.getByLabelText('Search tasks')).toBeInTheDocument()
  })
})
