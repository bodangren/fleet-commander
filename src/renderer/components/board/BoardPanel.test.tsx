import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BoardPanel } from './BoardPanel'
import type { BoardTask } from '../../../shared/board'

const tasks: BoardTask[] = [
  {
    id: 'track-1::Phase 1::Setup IPC',
    title: 'Setup IPC',
    trackId: 'track-1',
    trackTitle: 'Track One',
    phase: 'Phase 1',
    status: 'todo',
    statusSource: 'explicit',
    needsSync: false,
    activity: null,
  },
  {
    id: 'track-1::Phase 2::Build UI',
    title: 'Build UI',
    trackId: 'track-1',
    trackTitle: 'Track One',
    phase: 'Phase 2',
    status: 'todo',
    statusSource: 'explicit',
    needsSync: false,
    activity: null,
  },
  {
    id: 'track-2::Phase 1::Fix tests',
    title: 'Fix tests',
    trackId: 'track-2',
    trackTitle: 'Track Two',
    phase: 'Phase 1',
    status: 'todo',
    statusSource: 'explicit',
    needsSync: false,
    activity: null,
  },
]

describe('BoardPanel', () => {
  it('filters tasks by search query', async () => {
    const user = userEvent.setup()
    render(<BoardPanel tasks={tasks} onRefresh={vi.fn()} />)

    const search = screen.getByLabelText('Search')
    await user.type(search, 'Build')

    expect(screen.getByText('Build UI')).toBeInTheDocument()
    expect(screen.queryByText('Setup IPC')).not.toBeInTheDocument()
    expect(screen.queryByText('Fix tests')).not.toBeInTheDocument()
  })

  it('filters tasks by track selection', async () => {
    const user = userEvent.setup()
    render(<BoardPanel tasks={tasks} onRefresh={vi.fn()} />)

    const trackSelect = screen.getByLabelText('Track')
    await user.selectOptions(trackSelect, 'track-1')

    expect(screen.getByText('Setup IPC')).toBeInTheDocument()
    expect(screen.getByText('Build UI')).toBeInTheDocument()
    expect(screen.queryByText('Fix tests')).not.toBeInTheDocument()
  })

  it('filters tasks by phase selection', async () => {
    const user = userEvent.setup()
    render(<BoardPanel tasks={tasks} onRefresh={vi.fn()} />)

    const trackSelect = screen.getByLabelText('Track')
    await user.selectOptions(trackSelect, 'track-1')

    const phaseSelect = screen.getByLabelText('Phase')
    await user.selectOptions(phaseSelect, 'Phase 2')

    expect(screen.getByText('Build UI')).toBeInTheDocument()
    expect(screen.queryByText('Setup IPC')).not.toBeInTheDocument()
    expect(screen.queryByText('Fix tests')).not.toBeInTheDocument()
  })

  it('invokes refresh when the refresh button is clicked', async () => {
    const user = userEvent.setup()
    const onRefresh = vi.fn()
    render(<BoardPanel tasks={tasks} onRefresh={onRefresh} />)

    const refreshButton = screen.getByRole('button', { name: 'Refresh Board' })
    await user.click(refreshButton)

    expect(onRefresh).toHaveBeenCalledTimes(1)
  })
})
