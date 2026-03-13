import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { PlanDetailPanel } from './PlanDetailPanel'
import type { BoardTask } from '../../../shared/board'
import type { AgentTemplate } from '../../../shared/agent-templates'

const task: BoardTask = {
  id: 'track-1::Phase 1::Task A',
  title: 'Task A',
  trackId: 'track-1',
  trackTitle: 'Track One',
  phase: 'Phase 1: Start',
  status: 'todo',
  statusSource: 'explicit',
  needsSync: false,
  activity: null,
}

describe('PlanDetailPanel Schedule Status Display', () => {
  beforeEach(() => {
    window.settingsApi = {
      getAgentTemplates: vi.fn().mockResolvedValue({
        ok: true,
        templates: [{ name: 'Gemini', command: 'gemini' }] as AgentTemplate[],
      }),
      setAgentTemplates: vi.fn(),
    } as any
    window.scheduleApi = {
      start: vi.fn().mockResolvedValue({ ok: true, scheduleId: 'schedule-1' }),
      pause: vi.fn().mockResolvedValue({ ok: true, status: 'paused' }),
      resume: vi.fn().mockResolvedValue({ ok: true, status: 'running' }),
      cancel: vi.fn().mockResolvedValue({ ok: true, status: 'cancelled' }),
      getAll: vi.fn().mockResolvedValue({ ok: true, schedules: [] }),
    } as any
  })

  it('displays schedule status badge when schedule is active', async () => {
    const planContents = [
      '# Plan',
      '## Phase 1: Start',
      '- [ ] Task: Task A #schedule:interval,5m',
    ].join('\n')

    const taskWithSchedule = { ...task, title: 'Task A #schedule:interval,5m' }

    window.scheduleApi!.getAll = vi.fn().mockResolvedValue({
      ok: true,
      schedules: [
        {
          id: 'schedule-1',
          taskId: 'track-1::Phase 1::Task A',
          status: 'running',
          config: { mode: 'interval', interval: { value: 5, unit: 'minutes' } },
          nextExecutionTime: Date.now() + 5 * 60 * 1000,
        },
      ],
    })

    render(
      <PlanDetailPanel task={taskWithSchedule} planContents={planContents} onClose={() => {}} />,
    )

    await waitFor(() => expect(window.scheduleApi!.getAll).toHaveBeenCalled())

    const statusBadge = screen.getByTestId('schedule-status-badge')
    expect(statusBadge).toBeInTheDocument()
    expect(statusBadge).toHaveTextContent('running')
  })

  it('displays next execution countdown', async () => {
    const planContents = [
      '# Plan',
      '## Phase 1: Start',
      '- [ ] Task: Task A #schedule:interval,5m',
    ].join('\n')

    const taskWithSchedule = { ...task, title: 'Task A #schedule:interval,5m' }
    const nextTime = Date.now() + 3 * 60 * 1000

    window.scheduleApi!.getAll = vi.fn().mockResolvedValue({
      ok: true,
      schedules: [
        {
          id: 'schedule-1',
          taskId: 'track-1::Phase 1::Task A',
          status: 'running',
          config: { mode: 'interval', interval: { value: 5, unit: 'minutes' } },
          nextExecutionTime: nextTime,
        },
      ],
    })

    render(
      <PlanDetailPanel task={taskWithSchedule} planContents={planContents} onClose={() => {}} />,
    )

    await waitFor(() => expect(window.scheduleApi!.getAll).toHaveBeenCalled())

    const countdown = screen.getByTestId('schedule-countdown')
    expect(countdown).toBeInTheDocument()
    expect(countdown.textContent).toMatch(/\d+m/)
  })

  it('displays paused status when schedule is paused', async () => {
    const planContents = [
      '# Plan',
      '## Phase 1: Start',
      '- [ ] Task: Task A #schedule:loop,delay:1h',
    ].join('\n')

    const taskWithSchedule = { ...task, title: 'Task A #schedule:loop,delay:1h' }

    window.scheduleApi!.getAll = vi.fn().mockResolvedValue({
      ok: true,
      schedules: [
        {
          id: 'schedule-1',
          taskId: 'track-1::Phase 1::Task A',
          status: 'paused',
          config: { mode: 'loop', delay: { value: 1, unit: 'hours' } },
        },
      ],
    })

    render(
      <PlanDetailPanel task={taskWithSchedule} planContents={planContents} onClose={() => {}} />,
    )

    await waitFor(() => expect(window.scheduleApi!.getAll).toHaveBeenCalled())

    const statusBadge = screen.getByTestId('schedule-status-badge')
    expect(statusBadge).toHaveTextContent('paused')
  })

  it('does not display status when no active schedule', async () => {
    const planContents = ['# Plan', '## Phase 1: Start', '- [ ] Task: Task A'].join('\n')

    render(<PlanDetailPanel task={task} planContents={planContents} onClose={() => {}} />)

    await waitFor(() => expect(window.settingsApi.getAgentTemplates).toHaveBeenCalled())

    expect(screen.queryByTestId('schedule-status-badge')).not.toBeInTheDocument()
  })
})
