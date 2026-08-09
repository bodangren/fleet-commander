import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import userEvent from '@testing-library/user-event'
import { RetrospectivePage } from './RetrospectivePage'

function renderWithRouter(ui: React.ReactNode) {
  return render(<MemoryRouter>{ui}</MemoryRouter>)
}

describe('RetrospectivePage', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('renders the retrospectives page with title', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve({ ok: true, json: async () => [] })),
    )

    renderWithRouter(<RetrospectivePage />)

    expect(screen.getByText('Retrospectives')).toBeDefined()
    expect(
      screen.getByText(
        'AI-generated sprint retrospectives with patterns, blockers, and improvement suggestions.',
      ),
    ).toBeDefined()
    expect(await screen.findByText('No retrospectives yet.')).toBeInTheDocument()
  })

  it('shows empty state when no retrospectives exist', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve({ ok: true, json: async () => [] })),
    )

    renderWithRouter(<RetrospectivePage />)

    expect(await screen.findByText('No retrospectives yet.')).toBeInTheDocument()
  })

  it('lists retrospectives after loading', async () => {
    const retros = [
      {
        _id: 'r1',
        name: 'Retro: Sprint 1',
        status: 'completed',
        triggeredBy: 'manual',
        createdAt: Date.now(),
        completedAt: Date.now(),
      },
    ]

    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve({ ok: true, json: async () => retros })),
    )

    renderWithRouter(<RetrospectivePage />)

    expect(await screen.findByText('Retro: Sprint 1')).toBeInTheDocument()
  })

  it('opens generate form when generate button is clicked', async () => {
    const user = userEvent.setup()
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve({ ok: true, json: async () => [] })),
    )

    renderWithRouter(<RetrospectivePage />)

    await user.click(screen.getByRole('button', { name: 'Generate' }))

    expect(await screen.findByPlaceholderText('Enter Sprint ID')).toBeInTheDocument()
  })

  it('submits generation request with sprint id', async () => {
    const user = userEvent.setup()
    const fetchMock = vi.fn((url: string) => {
      if (url.includes('/api/retrospectives/generate')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            _id: 'new-retro',
            name: 'Retrospective: Sprint 42',
            status: 'completed',
          }),
        })
      }
      if (url.includes('/api/retrospectives/new-retro')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            _id: 'new-retro',
            name: 'Retrospective: Sprint 42',
            status: 'completed',
            triggeredBy: 'manual',
            createdAt: Date.now(),
          }),
        })
      }
      return Promise.resolve({ ok: true, json: async () => [] })
    })

    vi.stubGlobal('fetch', fetchMock)

    renderWithRouter(<RetrospectivePage />)

    await user.click(screen.getByRole('button', { name: 'Generate' }))

    const input = await screen.findByPlaceholderText('Enter Sprint ID')
    await user.type(input, 'sprint-42')

    await user.click(screen.getByRole('button', { name: 'Generate' }))

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/retrospectives/generate',
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('sprint-42'),
        }),
      )
    })
    expect(
      await screen.findByRole('heading', { name: 'Retrospective: Sprint 42' }),
    ).toBeInTheDocument()
  })

  it('shows error when generation fails', async () => {
    const user = userEvent.setup()
    const fetchMock = vi.fn((url: string) => {
      if (url.includes('/api/retrospectives/generate')) {
        return Promise.resolve({
          ok: false,
          json: async () => ({ error: 'Sprint not found' }),
        })
      }
      return Promise.resolve({ ok: true, json: async () => [] })
    })

    vi.stubGlobal('fetch', fetchMock)

    renderWithRouter(<RetrospectivePage />)

    await user.click(screen.getByRole('button', { name: 'Generate' }))

    const input = await screen.findByPlaceholderText('Enter Sprint ID')
    await user.type(input, 'bad-id')

    await user.click(screen.getByRole('button', { name: 'Generate' }))

    expect(await screen.findByText('Sprint not found')).toBeInTheDocument()
  })

  it('opens retrospective viewer when a retrospective is selected', async () => {
    const user = userEvent.setup()
    const fetchMock = vi.fn((url: string) => {
      if (url.includes('/api/retrospectives/r1')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            _id: 'r1',
            name: 'Retro: Sprint 1',
            status: 'completed',
            triggeredBy: 'manual',
            reportMarkdown: '# Sprint Summary\nGreat sprint.',
            createdAt: Date.now(),
            completedAt: Date.now(),
          }),
        })
      }
      return Promise.resolve({
        ok: true,
        json: async () => [
          {
            _id: 'r1',
            name: 'Retro: Sprint 1',
            status: 'completed',
            triggeredBy: 'manual',
            createdAt: Date.now(),
            completedAt: Date.now(),
          },
        ],
      })
    })

    vi.stubGlobal('fetch', fetchMock)

    renderWithRouter(<RetrospectivePage />)

    const retrospective = await screen.findByText('Retro: Sprint 1')

    await user.click(retrospective)

    expect(await screen.findByText('Report')).toBeInTheDocument()
    expect(screen.getByText('Great sprint.')).toBeInTheDocument()
  })
})
