import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
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

describe('PlanDetailPanel Schedule Delay/Interval Inputs', () => {
  beforeEach(() => {
    window.settingsApi = {
      getAgentTemplates: vi.fn().mockResolvedValue({
        ok: true,
        templates: [{ name: 'Gemini', command: 'gemini' }] as AgentTemplate[],
      }),
      setAgentTemplates: vi.fn(),
    } as any
  })

  it('shows delay input when one-time mode is selected with delay', async () => {
    const planContents = [
      '# Plan',
      '## Phase 1: Start',
      '- [ ] Task: Task A #schedule:one-time,delay:5m',
    ].join('\n')

    const taskWithSchedule = { ...task, title: 'Task A #schedule:one-time,delay:5m' }

    render(
      <PlanDetailPanel task={taskWithSchedule} planContents={planContents} onClose={() => {}} />,
    )

    await waitFor(() => expect(window.settingsApi.getAgentTemplates).toHaveBeenCalled())

    const delayInput = screen.getByLabelText(/Delay value for/)
    expect(delayInput).toBeInTheDocument()
    expect((delayInput as HTMLInputElement).value).toBe('5')
  })

  it('shows interval input when interval mode is selected', async () => {
    const planContents = [
      '# Plan',
      '## Phase 1: Start',
      '- [ ] Task: Task A #schedule:interval,30s',
    ].join('\n')

    const taskWithSchedule = { ...task, title: 'Task A #schedule:interval,30s' }

    render(
      <PlanDetailPanel task={taskWithSchedule} planContents={planContents} onClose={() => {}} />,
    )

    await waitFor(() => expect(window.settingsApi.getAgentTemplates).toHaveBeenCalled())

    const intervalInput = screen.getByLabelText(/Interval value for/)
    expect(intervalInput).toBeInTheDocument()
    expect((intervalInput as HTMLInputElement).value).toBe('30')
  })

  it('shows delay input when loop mode is selected', async () => {
    const planContents = [
      '# Plan',
      '## Phase 1: Start',
      '- [ ] Task: Task A #schedule:loop,delay:1h',
    ].join('\n')

    const taskWithSchedule = { ...task, title: 'Task A #schedule:loop,delay:1h' }

    render(
      <PlanDetailPanel task={taskWithSchedule} planContents={planContents} onClose={() => {}} />,
    )

    await waitFor(() => expect(window.settingsApi.getAgentTemplates).toHaveBeenCalled())

    const delayInput = screen.getByLabelText(/Delay value for/)
    expect(delayInput).toBeInTheDocument()
    expect((delayInput as HTMLInputElement).value).toBe('1')
  })

  it('updates schedule tag when delay value is changed', async () => {
    const planContents = [
      '# Plan',
      '## Phase 1: Start',
      '- [ ] Task: Task A #schedule:one-time,delay:5m',
    ].join('\n')

    const taskWithSchedule = { ...task, title: 'Task A #schedule:one-time,delay:5m' }
    const onEditTaskTitle = vi.fn()

    render(
      <PlanDetailPanel
        task={taskWithSchedule}
        planContents={planContents}
        onClose={() => {}}
        onEditTaskTitle={onEditTaskTitle}
      />,
    )

    await waitFor(() => expect(window.settingsApi.getAgentTemplates).toHaveBeenCalled())

    const delayInput = screen.getByLabelText(/Delay value for/)
    fireEvent.change(delayInput, { target: { value: '10' } })

    expect(onEditTaskTitle).toHaveBeenCalledWith({
      phaseIndex: 0,
      taskIndex: 0,
      nextTitle: 'Task A #schedule:one-time,delay:10m',
    })
  })

  it('updates schedule tag when unit is changed', async () => {
    const planContents = [
      '# Plan',
      '## Phase 1: Start',
      '- [ ] Task: Task A #schedule:interval,30s',
    ].join('\n')

    const taskWithSchedule = { ...task, title: 'Task A #schedule:interval,30s' }
    const onEditTaskTitle = vi.fn()

    render(
      <PlanDetailPanel
        task={taskWithSchedule}
        planContents={planContents}
        onClose={() => {}}
        onEditTaskTitle={onEditTaskTitle}
      />,
    )

    await waitFor(() => expect(window.settingsApi.getAgentTemplates).toHaveBeenCalled())

    const unitSelect = screen.getByLabelText(/Interval unit for/)
    fireEvent.change(unitSelect, { target: { value: 'm' } })

    expect(onEditTaskTitle).toHaveBeenCalledWith({
      phaseIndex: 0,
      taskIndex: 0,
      nextTitle: 'Task A #schedule:interval,30m',
    })
  })

  it('does not show delay/interval inputs when no schedule mode is selected', async () => {
    const planContents = ['# Plan', '## Phase 1: Start', '- [ ] Task: Task A'].join('\n')

    render(<PlanDetailPanel task={task} planContents={planContents} onClose={() => {}} />)

    await waitFor(() => expect(window.settingsApi.getAgentTemplates).toHaveBeenCalled())

    expect(screen.queryByLabelText(/Delay value for/)).not.toBeInTheDocument()
    expect(screen.queryByLabelText(/Interval value for/)).not.toBeInTheDocument()
  })
})
