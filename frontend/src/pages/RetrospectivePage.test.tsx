import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
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

  it('renders the retrospectives page with title', () => {
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
  })

  it('shows empty state when no retrospectives exist', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve({ ok: true, json: async () => [] })),
    )

    renderWithRouter(<RetrospectivePage />)

    await waitFor(() => {
      expect(screen.getByText('No retrospectives yet.')).toBeDefined()
    })
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

    await waitFor(() => {
      expect(screen.getByText('Retro: Sprint 1')).toBeDefined()
    })
  })

  it('opens generate form when generate button is clicked', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve({ ok: true, json: async () => [] })),
    )

    renderWithRouter(<RetrospectivePage />)

    const generateBtn = screen.getByText('Generate')
    fireEvent.click(generateBtn)

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Enter Sprint ID')).toBeDefined()
    })
  })

  it('submits generation request with sprint id', async () => {
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
      return Promise.resolve({ ok: true, json: async () => [] })
    })

    vi.stubGlobal('fetch', fetchMock)

    renderWithRouter(<RetrospectivePage />)

    const generateBtn = screen.getByText('Generate')
    fireEvent.click(generateBtn)

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Enter Sprint ID')).toBeDefined()
    })

    const input = screen.getByPlaceholderText('Enter Sprint ID')
    fireEvent.change(input, { target: { value: 'sprint-42' } })

    const submitBtn = screen.getByText('Generate', { selector: 'button' })
    fireEvent.click(submitBtn)

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/retrospectives/generate',
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('sprint-42'),
        }),
      )
    })
  })

  it('shows error when generation fails', async () => {
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

    const generateBtn = screen.getByText('Generate')
    fireEvent.click(generateBtn)

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Enter Sprint ID')).toBeDefined()
    })

    const input = screen.getByPlaceholderText('Enter Sprint ID')
    fireEvent.change(input, { target: { value: 'bad-id' } })

    const submitBtn = screen.getByText('Generate', { selector: 'button' })
    fireEvent.click(submitBtn)

    await waitFor(() => {
      expect(screen.getByText('Sprint not found')).toBeDefined()
    })
  })
})
