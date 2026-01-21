import { describe, it, expect, vi } from 'vitest'
import { render, screen, within, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { PlanDetailPanel, parsePlanForDetail } from './PlanDetailPanel'
import type { BoardTask } from '../../../shared/board'

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

describe('PlanDetailPanel', () => {
  it('renders phase headings and task rows with markers', () => {
    const planContents = [
      '# Plan',
      '## Phase 1: Start',
      '- [ ] Task: Task A',
      '- [x] Task: Done task',
    ].join('\n')

    render(<PlanDetailPanel task={task} planContents={planContents} onClose={() => {}} />)

    expect(screen.getByDisplayValue('Phase 1: Start')).toBeInTheDocument()
    expect(screen.getByText('[ ]')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Task A')).toBeInTheDocument()
    expect(screen.queryByDisplayValue('Done task')).not.toBeInTheDocument()
  })

  it('parses indented checklist lines as sub-tasks under Task entries', () => {
    const planContents = [
      '# Plan',
      '## Phase 1: Start',
      '  - [ ] Orphan sub-task',
      '- [ ] Task: Parent task',
      '  - [ ] Sub-task one',
      '- [ ] Not a task line',
      '- [ ] Task: Next task',
      '\t- [x] Sub-task two',
    ].join('\n')

    const phases = parsePlanForDetail(planContents)

    expect(phases).toHaveLength(1)
    expect(phases[0].tasks).toHaveLength(2)
    expect(phases[0].tasks[0].title).toBe('Parent task')
    expect(phases[0].tasks[0].subTasks).toHaveLength(1)
    expect(phases[0].tasks[0].subTasks[0]).toEqual(
      expect.objectContaining({
        title: 'Sub-task one',
        marker: '[ ]',
      }),
    )
    expect(phases[0].tasks[1].title).toBe('Next task')
    expect(phases[0].tasks[1].subTasks).toHaveLength(1)
    expect(phases[0].tasks[1].subTasks[0]).toEqual(
      expect.objectContaining({
        title: 'Sub-task two',
        marker: '[x]',
      }),
    )
  })

  it('renders sub-tasks nested under their parent tasks', () => {
    const planContents = [
      '# Plan',
      '## Phase 1: Start',
      '- [ ] Task: Task A',
      '  - [ ] Sub-task one',
      '  - [x] Sub-task two',
      '- [ ] Task: Next task',
    ].join('\n')

    render(<PlanDetailPanel task={task} planContents={planContents} onClose={() => {}} />)

    const parentGroup = screen.getByTestId('plan-task-group-0-0')
    expect(within(parentGroup).getByDisplayValue('Task A')).toBeInTheDocument()

    const subGroup = within(parentGroup).getByTestId('plan-subtask-group-0-0')
    expect(within(subGroup).getByDisplayValue('Sub-task one')).toBeInTheDocument()
    expect(within(subGroup).getByDisplayValue('Sub-task two')).toBeInTheDocument()
  })

  it('wires sub-task toggle and edit callbacks', async () => {
    const planContents = [
      '# Plan',
      '## Phase 1: Start',
      '- [ ] Task: Task A',
      '  - [ ] Sub-task one',
    ].join('\n')

    const handleToggleSubTask = vi.fn()
    const handleEditSubTaskTitle = vi.fn()
    const user = userEvent.setup()

    render(
      <PlanDetailPanel
        task={task}
        planContents={planContents}
        onClose={() => {}}
        onToggleSubTask={handleToggleSubTask}
        onEditSubTaskTitle={handleEditSubTaskTitle}
      />,
    )

    const subGroup = screen.getByTestId('plan-subtask-group-0-0')
    await user.click(
      within(subGroup).getByRole('button', { name: 'Toggle sub-task Sub-task one' }),
    )

    expect(handleToggleSubTask).toHaveBeenCalledWith({
      phaseTitle: 'Phase 1: Start',
      phaseIndex: 0,
      taskTitle: 'Task A',
      taskIndex: 0,
      subTaskTitle: 'Sub-task one',
      subTaskIndex: 0,
      currentStatus: 'todo',
    })

    const input = within(subGroup).getByLabelText('Edit sub-task Sub-task one')
    fireEvent.change(input, { target: { value: 'Updated sub-task' } })

    expect(handleEditSubTaskTitle).toHaveBeenCalledWith({
      phaseIndex: 0,
      taskIndex: 0,
      subTaskIndex: 0,
      nextTitle: 'Updated sub-task',
    })
  })
})
