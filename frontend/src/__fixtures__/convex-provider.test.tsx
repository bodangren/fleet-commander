import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  setupConvexMocks,
  setMockConvexData,
  resetMockConvexData,
} from './convex-provider'

setupConvexMocks()

import { ProjectCard } from '../components/ProjectCard'

afterEach(() => {
  resetMockConvexData()
})

const project = {
  id: 'test-project',
  name: 'Test Project',
  path: '/test/project',
  tracks: [],
  lastUpdated: Date.now(),
}

describe('convex-provider fixture', () => {
  it('renders ProjectCard with undefined Convex data', () => {
    render(
      <MemoryRouter>
        <ProjectCard project={project} />
      </MemoryRouter>,
    )

    expect(screen.getByText(/Test Project/i)).toBeTruthy()
  })

  it('renders ProjectCard with mocked task counts', () => {
    setMockConvexData({
      tasks: [
        { _id: 't1', title: 'Task 1', status: 'in_progress' },
        { _id: 't2', title: 'Task 2', status: 'in_progress' },
        { _id: 't3', title: 'Task 3', status: 'blocked' },
      ],
    })

    render(
      <MemoryRouter>
        <ProjectCard project={project} />
      </MemoryRouter>,
    )

    expect(screen.getByText('2')).toBeTruthy()
    expect(screen.getByText('1')).toBeTruthy()
    expect(screen.getByText('BLOCKED')).toBeTruthy()
  })
})
