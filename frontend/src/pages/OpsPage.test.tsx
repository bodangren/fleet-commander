import { render, screen, fireEvent } from '@testing-library/react'
import { describe, expect, it, beforeEach, vi } from 'vitest'

import { OpsPage } from './OpsPage'

describe('OpsPage', () => {
  beforeEach(() => {
    vi.stubGlobal('window', window)
  })

  it('renders all four tabs with numbered labels', () => {
    render(<OpsPage />)

    expect(screen.getByTestId('tab-queue')).toHaveTextContent('1. Queue')
    expect(screen.getByTestId('tab-fleet')).toHaveTextContent('2. Fleet')
    expect(screen.getByTestId('tab-timeline')).toHaveTextContent('3. Timeline')
    expect(screen.getByTestId('tab-governance')).toHaveTextContent('4. Governance')
  })

  it('defaults to the Queue tab', () => {
    render(<OpsPage />)

    expect(screen.getByText('Queue Health')).toBeInTheDocument()
    expect(screen.getByText('Ready tasks, blockers, and starvation metrics.')).toBeInTheDocument()
  })

  it('switches tabs on click', () => {
    render(<OpsPage />)

    fireEvent.click(screen.getByTestId('tab-fleet'))
    expect(screen.getByText('Fleet Health')).toBeInTheDocument()

    fireEvent.click(screen.getByTestId('tab-timeline'))
    expect(screen.getByText('Dispatch Timeline')).toBeInTheDocument()

    fireEvent.click(screen.getByTestId('tab-governance'))
    expect(screen.getByText('Governance')).toBeInTheDocument()
  })

  it('switches tabs via keyboard shortcuts 1–4', () => {
    render(<OpsPage />)

    fireEvent.keyDown(window, { key: '2' })
    expect(screen.getByText('Fleet Health')).toBeInTheDocument()

    fireEvent.keyDown(window, { key: '3' })
    expect(screen.getByText('Dispatch Timeline')).toBeInTheDocument()

    fireEvent.keyDown(window, { key: '4' })
    expect(screen.getByText('Governance')).toBeInTheDocument()

    fireEvent.keyDown(window, { key: '1' })
    expect(screen.getByText('Queue Health')).toBeInTheDocument()
  })

  it('does not switch tabs when modifier keys are held', () => {
    render(<OpsPage />)
    fireEvent.click(screen.getByTestId('tab-fleet'))

    fireEvent.keyDown(window, { key: '1', ctrlKey: true })
    expect(screen.getByText('Fleet Health')).toBeInTheDocument()

    fireEvent.keyDown(window, { key: '1', metaKey: true })
    expect(screen.getByText('Fleet Health')).toBeInTheDocument()
  })
})
