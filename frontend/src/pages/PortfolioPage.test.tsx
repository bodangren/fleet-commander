import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import userEvent from '@testing-library/user-event'

import { PortfolioPage } from './PortfolioPage'
import type { PortfolioProject } from '@/hooks/usePortfolioData'

const mockUsePortfolioData = vi.fn()

vi.mock('@/hooks/usePortfolioData', async () => {
  const actual = await vi.importActual<typeof import('@/hooks/usePortfolioData')>(
    '@/hooks/usePortfolioData',
  )
  return {
    ...actual,
    usePortfolioData: () => mockUsePortfolioData(),
  }
})

function renderPage() {
  return render(
    <MemoryRouter>
      <PortfolioPage />
    </MemoryRouter>,
  )
}

const sampleProject: PortfolioProject = {
  _id: 'p1',
  name: 'Demo',
  slug: 'demo',
  description: 'A demo project',
  totalSprints: 1,
  lastSprint: null,
  totalSpend: 0,
  health: 'green',
  healthReason: 'ok',
}

describe('PortfolioPage import affordances', () => {
  beforeEach(() => {
    mockUsePortfolioData.mockReset()
  })

  it('renders the import workspace UI in the empty state', () => {
    mockUsePortfolioData.mockReturnValue([])
    renderPage()
    expect(screen.getByRole('button', { name: 'Scan workspace' })).toBeInTheDocument()
  })

  it('exposes a persistent Import project button when projects exist', async () => {
    mockUsePortfolioData.mockReturnValue([sampleProject])
    renderPage()

    const importButton = screen.getByRole('button', { name: /import project/i })
    expect(importButton).toBeInTheDocument()
    // Scanner hidden until requested
    expect(screen.queryByRole('button', { name: 'Scan workspace' })).not.toBeInTheDocument()

    await userEvent.click(importButton)
    expect(screen.getByRole('button', { name: 'Scan workspace' })).toBeInTheDocument()
  })
})
