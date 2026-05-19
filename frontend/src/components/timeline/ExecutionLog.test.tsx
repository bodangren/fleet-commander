import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ExecutionLog } from './ExecutionLog'

function makeRun(overrides = {}) {
  return {
    _id: 'run-1',
    taskId: 'task-1',
    stage: 'architect',
    agentId: 'agent-1',
    startTime: 1713528721000,
    endTime: 1713528722000,
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

describe('ExecutionLog', () => {
  it('renders execution log panel', () => {
    render(<ExecutionLog pipelineRuns={[]} agents={[]} />)

    expect(screen.getByTestId('execution-log')).toBeDefined()
    expect(screen.getByText('Execution Log')).toBeDefined()
  })

  it('shows pending entries for missing stages', () => {
    render(<ExecutionLog pipelineRuns={[]} agents={[]} />)

    const entries = screen.getAllByTestId(/log-entry-/)
    expect(entries.length).toBe(5)
    expect(entries[0].textContent).toContain('Dispatch pending')
  })

  it('shows completed stage entries with success styling', () => {
    const run = makeRun({
      stage: 'architect',
      status: 'completed',
      startTime: 1713528721000,
      endTime: 1713528722000,
    })
    const agent = makeAgent()

    render(<ExecutionLog pipelineRuns={[run as any]} agents={[agent as any]} />)

    const entries = screen.getAllByTestId(/log-entry-/)
    const architectEntries = entries.filter(e => e.textContent?.includes('Architect'))
    expect(architectEntries.length).toBeGreaterThan(0)
    expect(architectEntries[0].textContent).toContain('@alice')
  })

  it('shows running stage entry without end entry', () => {
    const run = makeRun({
      stage: 'executor',
      status: 'running',
      startTime: 1713528721000,
    })
    const agent = makeAgent({ _id: 'agent-2', name: 'bob' })

    render(<ExecutionLog pipelineRuns={[run as any]} agents={[agent as any]} />)

    const entries = screen.getAllByTestId(/log-entry-/)
    const executorEntries = entries.filter(e => e.textContent?.includes('Executor'))
    expect(executorEntries.length).toBe(1)
    expect(executorEntries[0].textContent).toContain('Executor stage started')
  })

  it('formats timestamps correctly', () => {
    const run = makeRun({
      stage: 'dispatch',
      status: 'completed',
      startTime: new Date('2024-04-19T14:32:01').getTime(),
      endTime: new Date('2024-04-19T14:32:03').getTime(),
    })

    render(<ExecutionLog pipelineRuns={[run as any]} agents={[]} />)

    const entries = screen.getAllByTestId(/log-entry-/)
    expect(entries[0].textContent).toContain('[14:32:01]')
  })
})
