import { afterEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'

import { WorkspaceScanner } from './WorkspaceScanner'

function mockJsonResponse(payload: unknown, ok = true) {
  return {
    ok,
    json: async () => payload,
  } as Response
}

describe('WorkspaceScanner', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('scans a workspace and imports selected projects', async () => {
    const onImported = vi.fn()
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === 'string' ? input : input.toString()
      if (url.endsWith('/api/projects/scan')) {
        return mockJsonResponse({ paths: ['/tmp/project-a', '/tmp/project-b'] })
      }
      if (url.endsWith('/api/projects/scan-and-import') && init?.method === 'POST') {
        return mockJsonResponse({ imported: 2 })
      }
      return mockJsonResponse({ error: 'not found' }, false)
    })

    vi.stubGlobal('fetch', fetchMock)

    render(<WorkspaceScanner onImported={onImported} />)

    fireEvent.change(screen.getByLabelText('Workspace Root'), {
      target: { value: '/workspace' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Scan workspace' }))

    expect(await screen.findByText('/tmp/project-a')).toBeInTheDocument()
    expect(screen.getByText('/tmp/project-b')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Import selected (2)' }))

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/projects/scan-and-import',
        expect.objectContaining({
          method: 'POST',
        }),
      )
      expect(onImported).toHaveBeenCalled()
    })
  })

  it('shows an ingest summary with track and task counts', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === 'string' ? input : input.toString()
      if (url.endsWith('/api/projects/scan')) {
        return mockJsonResponse({ paths: ['/tmp/project-a'] })
      }
      if (url.endsWith('/api/projects/scan-and-import') && init?.method === 'POST') {
        return mockJsonResponse({
          projects: [{ name: 'project-a', tracks: 3, tasks: 12 }],
        })
      }
      return mockJsonResponse({ error: 'not found' }, false)
    })

    vi.stubGlobal('fetch', fetchMock)

    render(<WorkspaceScanner />)

    fireEvent.change(screen.getByLabelText('Workspace Root'), {
      target: { value: '/workspace' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Scan workspace' }))
    await screen.findByText('/tmp/project-a')
    fireEvent.click(screen.getByRole('button', { name: 'Import selected (1)' }))

    expect(await screen.findByText(/3 tracks/)).toBeInTheDocument()
    expect(screen.getByText(/12 tasks/)).toBeInTheDocument()
  })
})
