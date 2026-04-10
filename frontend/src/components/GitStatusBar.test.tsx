import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import type { GitStatus } from '@/lib/fleetTypes'
import { GitStatusBar } from './GitStatusBar'

const cleanStatus: GitStatus = {
  branch: 'main',
  dirty: false,
  ahead: 0,
  behind: 0,
  staged: 0,
  modified: 0,
  untracked: 0,
}

const dirtyStatus: GitStatus = {
  branch: 'fc/task-123-new-feature',
  dirty: true,
  ahead: 2,
  behind: 1,
  staged: 3,
  modified: 5,
  untracked: 2,
}

describe('GitStatusBar', () => {
  it('shows loading state', () => {
    render(<GitStatusBar status={null} loading={true} error={null} />)

    expect(screen.getByText(/Checking git status/i)).toBeInTheDocument()
  })

  it('shows error state with retry button', () => {
    const refreshFn = vi.fn()
    render(<GitStatusBar status={null} loading={false} error="Connection refused" onRefresh={refreshFn} />)

    expect(screen.getByText(/Git error: Connection refused/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Retry/i })).toBeInTheDocument()
  })

  it('shows no project selected when status is null and not loading', () => {
    render(<GitStatusBar status={null} loading={false} error={null} />)

    expect(screen.getByText(/No project selected/i)).toBeInTheDocument()
  })

  it('displays clean status correctly', () => {
    render(<GitStatusBar status={cleanStatus} loading={false} error={null} />)

    expect(screen.getByText('main')).toBeInTheDocument()
    expect(screen.getByText('Clean')).toBeInTheDocument()
  })

  it('displays dirty status with branch name and dirty indicator', () => {
    render(<GitStatusBar status={dirtyStatus} loading={false} error={null} />)

    expect(screen.getByText('fc/task-123-new-feature')).toBeInTheDocument()
    expect(screen.getByText('Dirty')).toBeInTheDocument()
  })

  it('displays ahead/behind commits', () => {
    render(<GitStatusBar status={dirtyStatus} loading={false} error={null} />)

    expect(screen.getByText('↑2')).toBeInTheDocument()
    expect(screen.getByText('↓1')).toBeInTheDocument()
  })

  it('displays file change counts', () => {
    render(<GitStatusBar status={dirtyStatus} loading={false} error={null} />)

    expect(screen.getByText('+3')).toBeInTheDocument()
    expect(screen.getByText('~5')).toBeInTheDocument()
    expect(screen.getByText('?2')).toBeInTheDocument()
  })

  it('calls onRefresh when refresh button is clicked', () => {
    const refreshFn = vi.fn()
    render(<GitStatusBar status={cleanStatus} loading={false} error={null} onRefresh={refreshFn} />)

    screen.getByRole('button', { name: /Refresh/i }).click()
    expect(refreshFn).toHaveBeenCalledTimes(1)
  })
})
