import { renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'

const { mockUseConvexQuery } = vi.hoisted(() => ({
  mockUseConvexQuery: vi.fn(),
}))

vi.mock('@/lib/dataAdapter', () => ({
  getSliceConfig: () => ({
    projects: 'bun',
    agents: 'bun',
    harnesses: 'bun',
    tasks: 'bun',
    issues: 'bun',
    logs: 'bun',
    settings: 'bun',
  }),
}))

vi.mock('@/lib/useConvexData', () => ({
  useConvexQuery: mockUseConvexQuery,
}))

import { usePortfolioData } from './usePortfolioData'

type BunProjectListRow = {
  id: string
  name: string
  slug: string
  path: string
  description: string
  createdAt: number
  updatedAt: number
}

const lightweightApiProject = {
  id: 'project-reading-advantage',
  name: 'Reading Advantage LLM Benchmark',
  slug: 'reading-advantage-llm-benchmark',
  path: '/workspace/reading-advantage-llm-benchmark',
  description: 'Imported benchmark workspace',
  createdAt: 1_720_000_000_000,
  updatedAt: 1_720_000_100_000,
} satisfies BunProjectListRow

function RouterWrapper({ children }: { children: ReactNode }) {
  return <MemoryRouter>{children}</MemoryRouter>
}

describe('usePortfolioData Bun adapter', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.clearAllMocks()
  })

  it('maps a lightweight /api/projects row without tracks instead of collapsing to an empty list', async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => [lightweightApiProject],
    }))
    vi.stubGlobal('fetch', fetchMock)

    const { result } = renderHook(() => usePortfolioData(), { wrapper: RouterWrapper })

    await waitFor(() => {
      expect(result.current.projects).toEqual([
        expect.objectContaining({
          _id: lightweightApiProject.id,
          slug: lightweightApiProject.slug,
          totalSprints: 0,
        }),
      ])
    })
    expect(result.current.projects).not.toEqual([])
    expect(fetchMock).toHaveBeenCalledWith('/api/projects', expect.any(Object))
  })
})
