import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { PlanDetailPanel, parsePlanForDetail } from './PlanDetailPanel'
import type { BoardTask } from '../../../shared/board'

const task: BoardTask = {
  id: 'track-1::Phase 1::Task A',
  title: 'Task A',
  trackId: 'track-1',
  trackTitle: 'Track One',
  phase: 'Phase 1',
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
      '- [ ] Task: First task',
      '- [x] Task: Done task',
    ].join('\n')

    render(<PlanDetailPanel task={task} planContents={planContents} onClose={() => {}} />)

    expect(screen.getByDisplayValue('Phase 1: Start')).toBeInTheDocument()
    expect(screen.getByText('[ ]')).toBeInTheDocument()
    expect(screen.getByDisplayValue('First task')).toBeInTheDocument()
    expect(screen.getByText('[x]')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Done task')).toBeInTheDocument()
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
})
