import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { PipelineTimeline } from './PipelineTimeline'

function makeRun(overrides = {}) {
  return {
    _id: 'run-1',
    taskId: 'task-1',
    stage: 'architect',
    agentId: 'agent-1',
    startTime: 1000,
    endTime: 2000,
    cost: 1.5,
    status: 'completed',
    createdAt: Date.now(),
    ...overrides,
  }
}

function makeAgent(overrides = {}) {
  return {
    _id: 'agent-1',
    name: 'alice',
    role: 'architect',
    skills: ['react'],
    model: 'claude',
    costPerPoint: 2,
    reliability: 0.9,
    status: 'active',
    workload: 1,
    maxWorkload: 3,
    createdAt: Date.now(),
    ...overrides,
  }
}

describe('PipelineTimeline', () => {
  it('renders all 5 stages', () => {
    render(<PipelineTimeline pipelineRuns={[]} agents={[]} />)

    expect(screen.getByTestId('pipeline-timeline')).toBeDefined()
    expect(screen.getByTestId('timeline-stage-dispatch')).toBeDefined()
    expect(screen.getByTestId('timeline-stage-architect')).toBeDefined()
    expect(screen.getByTestId('timeline-stage-executor')).toBeDefined()
    expect(screen.getByTestId('timeline-stage-reviewer')).toBeDefined()
    expect(screen.getByTestId('timeline-stage-merger')).toBeDefined()
  })

  it('shows done status with checkmark for completed run', () => {
    const run = makeRun({
      stage: 'architect',
      status: 'completed',
      startTime: 1000,
      endTime: 94000,
    })
    const agent = makeAgent()

    render(<PipelineTimeline pipelineRuns={[run as any]} agents={[agent as any]} />)

    const status = screen.getByTestId('stage-status-architect')
    expect(status.textContent).toContain('1m 33s')
    expect(status.textContent).toContain('✓')
  })

  it('shows running status for active run', () => {
    const run = makeRun({ stage: 'executor', status: 'running' })
    const agent = makeAgent({ _id: 'agent-2', name: 'bob' })

    render(<PipelineTimeline pipelineRuns={[run as any]} agents={[agent as any]} />)

    expect(screen.getByTestId('stage-status-executor')).toHaveTextContent('Running...')
  })

  it('shows pending for missing run', () => {
    render(<PipelineTimeline pipelineRuns={[]} agents={[]} />)

    expect(screen.getByTestId('stage-status-merger')).toHaveTextContent('Pending')
  })

  it('shows agent name for run with agent', () => {
    const run = makeRun({ stage: 'architect', agentId: 'agent-1' })
    const agent = makeAgent({ _id: 'agent-1', name: 'alice' })

    render(<PipelineTimeline pipelineRuns={[run as any]} agents={[agent as any]} />)

    expect(screen.getByTestId('timeline-stage-architect').textContent).toContain('@alice')
  })

  it('formats short durations in seconds', () => {
    const run = makeRun({ stage: 'dispatch', status: 'completed', startTime: 1000, endTime: 13000 })

    render(<PipelineTimeline pipelineRuns={[run as any]} agents={[]} />)

    expect(screen.getByTestId('stage-status-dispatch').textContent).toContain('12s')
  })
})
