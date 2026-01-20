import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { PlanDetailPanel } from './PlanDetailPanel'
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
})
