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

describe('PlanDetailPanel Schedule Mode Selection', () => {
  beforeEach(() => {
    window.settingsApi = {
      getAgentTemplates: vi.fn().mockResolvedValue({
        ok: true,
        templates: [{ name: 'Gemini', command: 'gemini' }] as AgentTemplate[],
      }),
      setAgentTemplates: vi.fn(),
    } as any
  })

  it('renders schedule mode dropdown for tasks', async () => {
    const planContents = ['# Plan', '## Phase 1: Start', '- [ ] Task: Task A'].join('\n')

    render(<PlanDetailPanel task={task} planContents={planContents} onClose={() => {}} />)

    await waitFor(() => expect(window.settingsApi.getAgentTemplates).toHaveBeenCalled())

    const select = screen.getByLabelText('Select schedule mode for Task A')
    expect(select).toBeInTheDocument()
    expect(select.tagName).toBe('SELECT')
  })

  it('calls onEditTaskTitle with schedule tag when mode is selected', async () => {
    const planContents = ['# Plan', '## Phase 1: Start', '- [ ] Task: Task A'].join('\n')

    const onEditTaskTitle = vi.fn()

    render(
      <PlanDetailPanel
        task={task}
        planContents={planContents}
        onClose={() => {}}
        onEditTaskTitle={onEditTaskTitle}
      />,
    )

    await waitFor(() => expect(window.settingsApi.getAgentTemplates).toHaveBeenCalled())

    const select = screen.getByLabelText('Select schedule mode for Task A')

    fireEvent.change(select, { target: { value: 'one-time' } })

    expect(onEditTaskTitle).toHaveBeenCalledWith({
      phaseIndex: 0,
      taskIndex: 0,
      nextTitle: 'Task A #schedule:one-time',
    })
  })

  it('replaces existing schedule tag when a new mode is selected', async () => {
    const planContents = [
      '# Plan',
      '## Phase 1: Start',
      '- [ ] Task: Task A #schedule:interval,5m',
    ].join('\n')

    const taskWithSchedule = { ...task, title: 'Task A #schedule:interval,5m' }
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

    const select = screen.getByLabelText(/Select schedule mode for/)

    fireEvent.change(select, { target: { value: 'loop' } })

    expect(onEditTaskTitle).toHaveBeenCalledWith({
      phaseIndex: 0,
      taskIndex: 0,
      nextTitle: 'Task A #schedule:loop',
    })
  })

  it('removes schedule tag when empty option is selected', async () => {
    const planContents = [
      '# Plan',
      '## Phase 1: Start',
      '- [ ] Task: Task A #schedule:one-time',
    ].join('\n')

    const taskWithSchedule = { ...task, title: 'Task A #schedule:one-time' }
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

    const select = screen.getByLabelText(/Select schedule mode for/)

    fireEvent.change(select, { target: { value: '' } })

    expect(onEditTaskTitle).toHaveBeenCalledWith({
      phaseIndex: 0,
      taskIndex: 0,
      nextTitle: 'Task A',
    })
  })

  it('displays current schedule mode from task title', async () => {
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

    const select = screen.getByLabelText(/Select schedule mode for/) as HTMLSelectElement
    expect(select.value).toBe('interval')
  })
})
