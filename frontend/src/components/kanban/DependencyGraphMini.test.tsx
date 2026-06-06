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

  // ------------------------------------------------------------------
  // Phase 3 Task 5 — Red gates: SVG structure + status colour
  // ------------------------------------------------------------------

  it('renders one node per dependency plus the center task', () => {
    const deps = [
      { taskKey: 'TASK-B', title: 'Build API', status: 'done' },
      { taskKey: 'TASK-C', title: 'Write tests', status: 'in_progress' },
      { taskKey: 'TASK-D', title: 'Deploy', status: 'ready' },
    ]
    const { container } = render(
      <DependencyGraphMini taskKey="TASK-A" dependencies={deps} dependents={[]} />,
    )
    // The component groups nodes inside <g> elements. We expect 1 center +
    // N dependency nodes.
    const groups = container.querySelectorAll('svg g')
    expect(groups.length).toBe(1 + deps.length)
  })

  it('renders a yellow status dot for blocked dependencies', () => {
    const deps = [{ taskKey: 'TASK-B', title: 'Blocked work', status: 'blocked' }]
    const { container } = render(
      <DependencyGraphMini taskKey="TASK-A" dependencies={deps} dependents={[]} />,
    )
    // The status dot is the <circle> with the smallest r inside the SVG
    // (statusDotColors['blocked'] === '#eab308'). Assert at least one
    // <circle fill="#eab308"> exists.
    const yellowDot = container.querySelector('circle[fill="#eab308"]')
    expect(yellowDot).toBeInTheDocument()
  })

  it('declares an arrowhead marker so dependency arrows render with a directional head', () => {
    const deps = [{ taskKey: 'TASK-B', title: 'Build API', status: 'done' }]
    const { container } = render(
      <DependencyGraphMini taskKey="TASK-A" dependencies={deps} dependents={[]} />,
    )
    const marker = container.querySelector('defs marker#arrowhead')
    expect(marker).toBeInTheDocument()
  })

  it('renders one connector line per dependency pointing to the center node', () => {
    const deps = [
      { taskKey: 'TASK-B', title: 'Build API', status: 'done' },
      { taskKey: 'TASK-C', title: 'Write tests', status: 'in_progress' },
    ]
    const { container } = render(
      <DependencyGraphMini taskKey="TASK-A" dependencies={deps} dependents={[]} />,
    )
    // Each dependency produces one <line> with markerEnd pointing to the
    // arrowhead. assert the count matches the dep list.
    const lines = container.querySelectorAll('line[marker-end]')
    expect(lines.length).toBe(deps.length)
  })
})
