import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'

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
  })
})
