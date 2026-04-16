import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'

import { QueueHealth, QueueHealthData } from './QueueHealth'

describe('QueueHealth', () => {
  const mockData: QueueHealthData = {
    readyCount: 12,
    inProgressCount: 3,
    blockedCount: 2,
    doneCount: 45,
    starvationTasks: [
      { taskKey: 'T-101', title: 'Stale ready task', status: 'ready', daysIdle: 14 },
      { taskKey: 'T-102', title: 'Old todo', status: 'todo', daysIdle: 9 },
    ],
    retryHotspots: [
      { taskKey: 'T-201', title: 'Flaky test fix', retryCount: 5 },
      { taskKey: 'T-202', title: 'Coverage drop', retryCount: 3 },
    ],
    openBlockers: [
      { issueId: 'ISS-1', title: 'Build failure on main', daysOpen: 7 },
      { issueId: 'ISS-2', title: 'Type regression', daysOpen: 2 },
    ],
  }

  it('renders summary counts', () => {
    render(<QueueHealth data={mockData} />)

    expect(screen.getByText('12')).toBeInTheDocument()
    expect(screen.getByText('3')).toBeInTheDocument()
    expect(screen.getByText('2')).toBeInTheDocument()
    expect(screen.getByText('45')).toBeInTheDocument()
  })

  it('renders starvation tasks with days idle', () => {
    render(<QueueHealth data={mockData} />)

    expect(screen.getByText('Stale ready task')).toBeInTheDocument()
    expect(screen.getByText('14 days idle')).toBeInTheDocument()
    expect(screen.getByText('Old todo')).toBeInTheDocument()
    expect(screen.getByText('9 days idle')).toBeInTheDocument()
  })

  it('renders retry hotspots with retry count', () => {
    render(<QueueHealth data={mockData} />)

    expect(screen.getByText('Flaky test fix')).toBeInTheDocument()
    expect(screen.getByText('5 retries')).toBeInTheDocument()
    expect(screen.getByText('Coverage drop')).toBeInTheDocument()
    expect(screen.getByText('3 retries')).toBeInTheDocument()
  })

  it('renders open blockers with days open', () => {
    render(<QueueHealth data={mockData} />)

    expect(screen.getByText('Build failure on main')).toBeInTheDocument()
    expect(screen.getByText('7 days open')).toBeInTheDocument()
    expect(screen.getByText('Type regression')).toBeInTheDocument()
    expect(screen.getByText('2 days open')).toBeInTheDocument()
  })

  it('renders empty states when lists are empty', () => {
    render(
      <QueueHealth
        data={{
          readyCount: 0,
          inProgressCount: 0,
          blockedCount: 0,
          doneCount: 0,
          starvationTasks: [],
          retryHotspots: [],
          openBlockers: [],
        }}
      />,
    )

    expect(screen.getByText('No starving tasks')).toBeInTheDocument()
    expect(screen.getByText('No retry hotspots')).toBeInTheDocument()
    expect(screen.getByText('No open blockers')).toBeInTheDocument()
  })

  it('renders loading state', () => {
    render(<QueueHealth data={undefined} loading />)

    expect(screen.getByText('Loading queue health...')).toBeInTheDocument()
  })
})
