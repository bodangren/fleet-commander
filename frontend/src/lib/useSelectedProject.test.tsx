import { renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { MemoryRouter } from 'react-router-dom'

import { useSelectedProject } from './useSelectedProject'

const projects = [
  {
    id: 'imported-project',
    slug: 'imported-project-slug',
    name: 'Imported project',
    path: '/tmp/project',
    tracks: [],
    lastUpdated: 1,
  },
  { id: 'other-project', name: 'Other project', path: '/tmp/other', tracks: [], lastUpdated: 1 },
]

function wrapper(initialEntry: string) {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return <MemoryRouter initialEntries={[initialEntry]}>{children}</MemoryRouter>
  }
}

describe('useSelectedProject', () => {
  it('uses the only imported project when no query selection is present', () => {
    const { result } = renderHook(() => useSelectedProject([projects[0]]), {
      wrapper: wrapper('/ops/quality'),
    })

    expect(result.current?.id).toBe('imported-project')
  })

  it('resolves an explicit project query and does not fall back to a fixture', () => {
    const { result } = renderHook(() => useSelectedProject(projects), {
      wrapper: wrapper('/settings/quality?project=imported-project'),
    })

    expect(result.current?.id).toBe('imported-project')
  })

  it('resolves an explicit project slug when the API id differs', () => {
    const { result } = renderHook(() => useSelectedProject(projects), {
      wrapper: wrapper('/settings/quality?project=imported-project-slug'),
    })

    expect(result.current?.id).toBe('imported-project')
  })

  it('returns no selection when multiple projects are available without a choice', () => {
    const { result } = renderHook(() => useSelectedProject(projects), {
      wrapper: wrapper('/ops/quality'),
    })

    expect(result.current).toBeNull()
  })
})
