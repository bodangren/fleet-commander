import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
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

describe('PlanDetailPanel Agent Selection', () => {
  beforeEach(() => {
    // Mock settingsApi
    window.settingsApi = {
      getAgentTemplates: vi.fn().mockResolvedValue({
        ok: true,
        templates: [
          { name: 'Gemini', command: 'gemini' },
          { name: 'Claude', command: 'claude' }
        ] as AgentTemplate[],
      }),
      setAgentTemplates: vi.fn(),
    } as any
  })

  it('renders agent dropdown for tasks', async () => {
    const planContents = [
      '# Plan',
      '## Phase 1: Start',
      '- [ ] Task: Task A',
    ].join('\n')

    render(<PlanDetailPanel task={task} planContents={planContents} onClose={() => {}} />)

    await waitFor(() => expect(window.settingsApi.getAgentTemplates).toHaveBeenCalled())

    // We expect a select element
    const select = screen.getByLabelText('Select agent for Task A')
    expect(select).toBeInTheDocument()
    expect(select.tagName).toBe('SELECT')
  })

  it('calls onEditTaskTitle with updated agent tag when agent is selected', async () => {
    const planContents = [
      '# Plan',
      '## Phase 1: Start',
      '- [ ] Task: Task A',
    ].join('\n')

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

    const select = screen.getByLabelText('Select agent for Task A')
    
    // Select Gemini
    fireEvent.change(select, { target: { value: 'Gemini' } })

    expect(onEditTaskTitle).toHaveBeenCalledWith({
      phaseIndex: 0,
      taskIndex: 0,
      nextTitle: 'Task A @Gemini',
    })
  })

  it('replaces existing agent tag when a new one is selected', async () => {
    const planContents = [
      '# Plan',
      '## Phase 1: Start',
      '- [ ] Task: Task A @OldAgent',
    ].join('\n')

    const taskWithAgent = { ...task, title: 'Task A @OldAgent' }
    const onEditTaskTitle = vi.fn()

    render(
      <PlanDetailPanel
        task={taskWithAgent}
        planContents={planContents}
        onClose={() => {}}
        onEditTaskTitle={onEditTaskTitle}
      />,
    )

    await waitFor(() => expect(window.settingsApi.getAgentTemplates).toHaveBeenCalled())

    const select = screen.getByLabelText('Select agent for Task A @OldAgent')
    
    // Select Claude
    fireEvent.change(select, { target: { value: 'Claude' } })

    expect(onEditTaskTitle).toHaveBeenCalledWith({
      phaseIndex: 0,
      taskIndex: 0,
      nextTitle: 'Task A @Claude',
    })
  })

  it('removes agent tag when empty option is selected', async () => {
    const planContents = [
      '# Plan',
      '## Phase 1: Start',
      '- [ ] Task: Task A @Gemini',
    ].join('\n')

    const taskWithAgent = { ...task, title: 'Task A @Gemini' }
    const onEditTaskTitle = vi.fn()

    render(
      <PlanDetailPanel
        task={taskWithAgent}
        planContents={planContents}
        onClose={() => {}}
        onEditTaskTitle={onEditTaskTitle}
      />,
    )

    await waitFor(() => expect(window.settingsApi.getAgentTemplates).toHaveBeenCalled())

    const select = screen.getByLabelText('Select agent for Task A @Gemini')
    
    // Select empty
    fireEvent.change(select, { target: { value: '' } })

    expect(onEditTaskTitle).toHaveBeenCalledWith({
      phaseIndex: 0,
      taskIndex: 0,
      nextTitle: 'Task A',
    })
  })

  it('renders Run button when an agent is selected', async () => {
    const planContents = [
      '# Plan',
      '## Phase 1: Start',
      '- [ ] Task: Task A @Gemini',
    ].join('\n')

    const taskWithAgent = { ...task, title: 'Task A @Gemini' }

    render(<PlanDetailPanel task={taskWithAgent} planContents={planContents} onClose={() => {}} />)

    await waitFor(() => expect(window.settingsApi.getAgentTemplates).toHaveBeenCalled())

    expect(screen.getByLabelText('Run agent for Task A @Gemini')).toBeInTheDocument()
  })

  it('calls onRunAgent when Run button is clicked', async () => {
    const planContents = [
      '# Plan',
      '## Phase 1: Start',
      '- [ ] Task: Task A @Gemini',
    ].join('\n')

    const taskWithAgent = { ...task, title: 'Task A @Gemini' }
    const onRunAgent = vi.fn()
    const user = userEvent.setup()

    render(
      <PlanDetailPanel
        task={taskWithAgent}
        planContents={planContents}
        onClose={() => {}}
        onRunAgent={onRunAgent}
      />,
    )

    await waitFor(() => expect(window.settingsApi.getAgentTemplates).toHaveBeenCalled())

    const runButton = screen.getByLabelText('Run agent for Task A @Gemini')
    await user.click(runButton)

    expect(onRunAgent).toHaveBeenCalledWith({
      phaseTitle: 'Phase 1: Start',
      taskTitle: 'Task A @Gemini',
      agentName: 'Gemini',
    })
  })
})
