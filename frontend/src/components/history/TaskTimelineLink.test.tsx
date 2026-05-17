import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

import { TaskTimelineLink } from './TaskTimelineLink'

function renderWithRouter(ui: React.ReactNode) {
  return render(
    <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      {ui}
    </MemoryRouter>,
  )
}

describe('TaskTimelineLink', () => {
  it('renders a link to the task timeline page', () => {
    renderWithRouter(<TaskTimelineLink taskId="task-123" />)

    const link = screen.getByRole('link')
    expect(link).toHaveAttribute('href', '/tasks/task-123/timeline')
    expect(link).toHaveTextContent(/timeline/i)
  })

  it('renders with correct task id in href', () => {
    renderWithRouter(<TaskTimelineLink taskId="sprint-3-task-5" />)

    const link = screen.getByRole('link')
    expect(link).toHaveAttribute('href', '/tasks/sprint-3-task-5/timeline')
  })
})
