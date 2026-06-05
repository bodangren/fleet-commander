import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'

import { DependencyGraphMini } from './DependencyGraphMini'

describe('DependencyGraphMini', () => {
  it('renders empty state when no dependencies', () => {
    render(<DependencyGraphMini taskKey="TASK-A" dependencies={[]} dependents={[]} />)
    expect(screen.getByText('No dependency relationships')).toBeInTheDocument()
  })

  it('renders with dependencies', () => {
    const deps = [
      { taskKey: 'TASK-B', title: 'Build API', status: 'done' },
      { taskKey: 'TASK-C', title: 'Write tests', status: 'in_progress' },
    ]
    const { container } = render(
      <DependencyGraphMini taskKey="TASK-A" dependencies={deps} dependents={[]} />,
    )
    expect(container.querySelector('svg')).toBeInTheDocument()
  })

  it('renders with dependents', () => {
    const dependents = [{ taskKey: 'TASK-D', title: 'Deploy', status: 'ready' }]
    const { container } = render(
      <DependencyGraphMini taskKey="TASK-A" dependencies={[]} dependents={dependents} />,
    )
    expect(container.querySelector('svg')).toBeInTheDocument()
  })

  it('renders with both dependencies and dependents', () => {
    const deps = [{ taskKey: 'TASK-B', title: 'Build API', status: 'done' }]
    const dependents = [{ taskKey: 'TASK-D', title: 'Deploy', status: 'ready' }]
    const { container } = render(
      <DependencyGraphMini taskKey="TASK-A" dependencies={deps} dependents={dependents} />,
    )
    expect(container.querySelector('svg')).toBeInTheDocument()
  })
})
