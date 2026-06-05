import { describe, expect, it } from 'vitest'
import { render, screen, within } from '@testing-library/react'

import { FallbackHistoryTable, type FallbackEvent } from './FallbackHistoryTable'

function makeEvent(overrides: Partial<FallbackEvent> = {}): FallbackEvent {
  return {
    _id: 'ev-1',
    taskKey: 'kanban-42',
    fallbackFrom: 'openai/gpt-4o',
    fallbackTo: 'anthropic/claude-sonnet',
    fallbackReason: 'rate_limit',
    attemptNumber: 2,
    createdAt: new Date('2025-06-05T14:30:00Z').getTime(),
    ...overrides,
  }
}

describe('FallbackHistoryTable', () => {
  it('renders a loading card while loading is true', () => {
    render(<FallbackHistoryTable events={[]} loading />)
    expect(screen.getByText('Fallback History')).toBeInTheDocument()
    expect(screen.getByText('Loading...')).toBeInTheDocument()
  })

  it('renders the empty state when there are no events', () => {
    render(<FallbackHistoryTable events={[]} loading={false} />)
    expect(screen.getByText('No fallback events recorded yet.')).toBeInTheDocument()
  })

  it('renders the description text when there are events', () => {
    render(<FallbackHistoryTable events={[makeEvent()]} />)
    expect(screen.getByText('Recent provider failures and model fallbacks.')).toBeInTheDocument()
  })

  it('renders the table column headers in the expected order', () => {
    render(<FallbackHistoryTable events={[makeEvent()]} />)
    const headers = screen.getAllByRole('columnheader').map(h => h.textContent)
    expect(headers).toEqual(['When', 'Task', 'From', 'To', 'Reason'])
  })

  it('renders one table row per event', () => {
    render(
      <FallbackHistoryTable
        events={[
          makeEvent({ _id: 'ev-1', taskKey: 'task-1' }),
          makeEvent({ _id: 'ev-2', taskKey: 'task-2' }),
        ]}
      />,
    )
    expect(screen.getAllByRole('row').length).toBe(3) // 1 header + 2 data rows
  })

  it('renders taskKey, fallbackFrom, fallbackTo, and fallbackReason for each row', () => {
    render(
      <FallbackHistoryTable
        events={[
          makeEvent({
            _id: 'ev-1',
            taskKey: 'kanban-42',
            fallbackFrom: 'openai/gpt-4o',
            fallbackTo: 'anthropic/claude-sonnet',
            fallbackReason: 'rate_limit',
          }),
        ]}
      />,
    )
    expect(screen.getByText('kanban-42')).toBeInTheDocument()
    expect(screen.getByText('openai/gpt-4o')).toBeInTheDocument()
    expect(screen.getByText('anthropic/claude-sonnet')).toBeInTheDocument()
    expect(screen.getByText('rate_limit')).toBeInTheDocument()
  })

  it('formats the createdAt timestamp as a short date+time', () => {
    const ts = new Date('2025-06-05T14:30:00Z').getTime()
    render(<FallbackHistoryTable events={[makeEvent({ createdAt: ts })]} />)
    const cells = screen.getAllByRole('cell')
    const whenCell = cells[0]
    expect(whenCell.textContent).toBeTruthy()
    expect(whenCell.textContent).not.toBe('')
  })

  it('marks the fallbackFrom cell with a red indicator and fallbackTo with green', () => {
    render(
      <FallbackHistoryTable
        events={[
          makeEvent({
            fallbackFrom: 'openai/gpt-4o',
            fallbackTo: 'anthropic/claude-sonnet',
          }),
        ]}
      />,
    )
    const redDot = document.querySelector('span.bg-red-500')
    const greenDot = document.querySelector('span.bg-green-500')
    expect(redDot).not.toBeNull()
    expect(greenDot).not.toBeNull()
    const fromCell = within(redDot!.parentElement!).getByText('openai/gpt-4o')
    const toCell = within(greenDot!.parentElement!).getByText('anthropic/claude-sonnet')
    expect(fromCell).toBeInTheDocument()
    expect(toCell).toBeInTheDocument()
  })
})
