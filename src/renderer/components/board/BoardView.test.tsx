import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { BoardView } from './BoardView'
import type { BoardTask } from '../../../shared/board'

const sampleTasks: BoardTask[] = [
  {
    id: 'track-1::Phase 1::Task A',
    title: 'Task A',
    trackId: 'track-1',
    trackTitle: 'Track One',
    phase: 'Phase 1',
    status: 'todo',
    statusSource: 'explicit',
    needsSync: false,
    activity: null,
  },
  {
    id: 'track-1::Phase 1::Task B',
    title: 'Task B',
    trackId: 'track-1',
    trackTitle: 'Track One',
    phase: 'Phase 1',
    status: 'in_progress',
    statusSource: 'explicit',
    needsSync: false,
    activity: null,
  },
  {
    id: 'track-2::Phase 2::Task C',
    title: 'Task C',
    trackId: 'track-2',
    trackTitle: 'Track Two',
    phase: 'Phase 2',
    status: 'done',
    statusSource: 'explicit',
    needsSync: false,
    activity: null,
  },
]

describe('BoardView', () => {
  it('renders columns and task cards by status', () => {
    render(<BoardView tasks={sampleTasks} />)

    expect(screen.getByText('To Do')).toBeInTheDocument()
    expect(screen.getByText('In Progress')).toBeInTheDocument()
    expect(screen.getByText('Done')).toBeInTheDocument()

    expect(screen.getByText('Task A')).toBeInTheDocument()
    expect(screen.getByText('Task B')).toBeInTheDocument()
    expect(screen.getByText('Task C')).toBeInTheDocument()
  })

  it('renders an empty state when there are no tasks', () => {
    render(<BoardView tasks={[]} />)

    expect(screen.getByText('No tasks found.')).toBeInTheDocument()
  })

  it('renders a loading state when isLoading is true', () => {
    render(<BoardView tasks={[]} isLoading />)

    expect(screen.getByText('Loading board...')).toBeInTheDocument()
  })

  it('renders an error state when error is provided', () => {
    render(<BoardView tasks={[]} error="Failed to load." />)

    expect(screen.getByText('Failed to load board: Failed to load.')).toBeInTheDocument()
  })
})
