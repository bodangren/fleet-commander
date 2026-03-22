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
]

describe('BoardPanel - Track Plan View', () => {
  it('shows "Show Full Track Plan" button when a specific track is selected', async () => {
    const user = userEvent.setup()
    const onShowFullTrackPlan = vi.fn()
    render(
      <BoardPanel tasks={tasks} onRefresh={vi.fn()} onShowFullTrackPlan={onShowFullTrackPlan} />,
    )

    const trackSelect = screen.getByLabelText('Track')
    await user.selectOptions(trackSelect, 'track-1')

    const showPlanButton = screen.queryByRole('button', { name: 'Show Full Track Plan' })
    expect(showPlanButton).toBeInTheDocument()
  })

  it('does not show "Show Full Track Plan" button when all tracks are selected', () => {
    const onShowFullTrackPlan = vi.fn()
    render(
      <BoardPanel tasks={tasks} onRefresh={vi.fn()} onShowFullTrackPlan={onShowFullTrackPlan} />,
    )

    const showPlanButton = screen.queryByRole('button', { name: 'Show Full Track Plan' })
    expect(showPlanButton).not.toBeInTheDocument()
  })

  it('invokes onShowFullTrackPlan when "Show Full Track Plan" button is clicked', async () => {
    const user = userEvent.setup()
    const onShowFullTrackPlan = vi.fn()
    render(
      <BoardPanel tasks={tasks} onRefresh={vi.fn()} onShowFullTrackPlan={onShowFullTrackPlan} />,
    )

    const trackSelect = screen.getByLabelText('Track')
    await user.selectOptions(trackSelect, 'track-1')

    const showPlanButton = screen.getByRole('button', { name: 'Show Full Track Plan' })
    await userEvent.click(showPlanButton)

    expect(onShowFullTrackPlan).toHaveBeenCalledWith('track-1', 'Track One')
  })
})
