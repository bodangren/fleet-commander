import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { LeaderboardPage } from './LeaderboardPage'

const {
  mockUseAgentLeaderboard,
  mockUseAgentPerformanceHistory,
  mockUseConvexProjectsTransformed,
} = vi.hoisted(() => ({
  mockUseAgentLeaderboard: vi.fn(),
  mockUseAgentPerformanceHistory: vi.fn(),
  mockUseConvexProjectsTransformed: vi.fn(),
}))

vi.mock('@/lib/convex-realtime/leaderboard', () => ({
  useAgentLeaderboard: mockUseAgentLeaderboard,
  useAgentPerformanceHistory: mockUseAgentPerformanceHistory,
}))

vi.mock('@/lib/convex-data', () => ({
  useConvexProjectsTransformed: mockUseConvexProjectsTransformed,
}))

vi.mock('@/hooks/useLoadingTimeout', () => ({
  useLoadingTimeout: () => false,
}))

describe('LeaderboardPage project filter', () => {
  it('passes each project slug to the leaderboard filter and falls back to its id', () => {
    mockUseAgentLeaderboard.mockReturnValue([])
    mockUseAgentPerformanceHistory.mockReturnValue(undefined)
    mockUseConvexProjectsTransformed.mockReturnValue([
      { id: 'internal-project-id', slug: 'canonical-project-slug', name: 'Canonical Project' },
      { id: 'id-only-project', name: 'ID Only Project' },
    ])

    render(<LeaderboardPage />)

    expect(screen.getByRole('option', { name: 'Canonical Project' })).toHaveValue(
      'canonical-project-slug',
    )
    expect(screen.getByRole('option', { name: 'ID Only Project' })).toHaveValue('id-only-project')
  })
})
