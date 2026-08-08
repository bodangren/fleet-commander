import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'

vi.mock('react-router-dom', async importOriginal => {
  const actual = await importOriginal<typeof import('react-router-dom')>()
  return {
    ...actual,
    useOutletContext: () => ({ projects: [{ id: 'p1', slug: 'chosen-project' }] }),
  }
})

vi.mock('@/lib/convex-data/core', async importOriginal => {
  const actual = await importOriginal<typeof import('@/lib/convex-data/core')>()
  return { ...actual, useConvexQueryState: vi.fn() }
})

// DiagnosePage explicitly exercises the Convex-enabled read states. Keep the
// browser client mocked by the global unit-test setup, but opt this test back
// into the adapter branch so it can verify enabled/error rendering contracts.
vi.mock('@/lib/dataAdapter', () => ({
  getSliceConfig: () => ({ projects: 'convex' }),
}))

import { useConvexQueryState } from '@/lib/convex-data/core'
import { DiagnosePage } from './DiagnosePage'

const useConvexQueryStateMock = vi.mocked(useConvexQueryState)

describe('DiagnosePage', () => {
  it('scopes proposals to the selected project and settles empty sections', () => {
    useConvexQueryStateMock.mockReturnValue({ data: [], error: null })

    render(
      <MemoryRouter>
        <DiagnosePage />
      </MemoryRouter>,
    )

    expect(useConvexQueryStateMock).toHaveBeenCalledWith(
      'reconciliationProposals:listPendingProposals',
      { projectSlug: 'chosen-project', limit: 50 },
      true,
    )
    expect(useConvexQueryStateMock).toHaveBeenCalledWith(
      'audit:listAuditEventsHandler',
      { type: undefined, agentId: undefined, limit: 100 },
      true,
    )
    expect(screen.getByText('No pending reconciliation proposals')).toBeInTheDocument()
    expect(screen.getByText('No events found')).toBeInTheDocument()
  })

  it('renders query errors rather than leaving sections loading forever', () => {
    useConvexQueryStateMock.mockImplementation(queryName => {
      const message = queryName.startsWith('audit:') ? 'audit offline' : 'proposals offline'
      return { data: undefined, error: new Error(message) }
    })

    render(
      <MemoryRouter>
        <DiagnosePage />
      </MemoryRouter>,
    )

    expect(screen.getByText('Unable to load reconciliation proposals.')).toBeInTheDocument()
    expect(screen.getByText('Unable to load audit events.')).toBeInTheDocument()
    expect(screen.queryByText('Loading audit events...')).not.toBeInTheDocument()
  })
})
