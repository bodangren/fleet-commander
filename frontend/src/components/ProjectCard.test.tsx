import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { mockUseActiveSprint, mockUseConvexTasks } = vi.hoisted(() => ({
  mockUseActiveSprint: vi.fn(),
  mockUseConvexTasks: vi.fn(),
}))

vi.mock('@/lib/useFleetApi', () => ({
  useActiveSprint: mockUseActiveSprint,
}))

vi.mock('@/lib/useConvexData', () => ({
  useConvexTasks: mockUseConvexTasks,
}))

import { ProjectCard } from './ProjectCard'

const project = {
  id: 'kanban-conductor',
  name: 'kanban-conductor',
  path: '/home/daniel-bo/Desktop/kanban-conductor',
  tracks: [
    { name: 'Frontend - Project Kanban Board', status: 'todo' },
    { name: 'Frontend - Global Dashboard & Onboarding', status: 'active' },
  ],
  lastUpdated: 1711600000,
}

describe('ProjectCard', () => {
  beforeEach(() => {
    mockUseActiveSprint.mockReturnValue({ data: null, loading: false, error: null })
    mockUseConvexTasks.mockReturnValue(undefined)
  })

  it('links to the project detail view', () => {
    render(
      <MemoryRouter>
        <ProjectCard project={project} />
      </MemoryRouter>,
    )

    expect(screen.getByRole('link', { name: /kanban-conductor/i })).toHaveAttribute(
      'href',
      '/project/kanban-conductor',
    )
    expect(mockUseActiveSprint).toHaveBeenCalledWith(project.id)
    expect(mockUseConvexTasks).toHaveBeenCalledWith(project.id)
  })
})
