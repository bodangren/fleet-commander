/**
 * Phase S4 Red tests for `frontend/src/pages/operations/QualityOperationsPanel.tsx`.
 *
 * These tests pin the S4 Operations intervention surface contract.
 * They exercise the third acceptance bullet in
 * `spec.md#story-s4-operate-quality-workflows-visibly`:
 *
 *   "Given a quality run is blocked or exhausted, When it appears
 *    in Operations, Then I can identify the exact failed gate and
 *    use an authorized retry, disable, or profile-change action
 *    with an audit record."
 *
 * The S4 strategy (test-strategy.md §1) only allows ONE Playwright
 * E2E for the whole S4 phase, so the per-action coverage lives at
 * the component-test layer using Vitest + RTL + fetch-mocked
 * typed Convex boundaries. The E2E (task 4) covers the happy path
 * only.
 *
 * The component under test does not exist yet. These tests are
 * intentionally Red and are committed under the `*.test.tsx` suffix.
 * The Green sibling lands when `QualityOperationsPanel.tsx` is
 * implemented and these tests pass.
 *
 * Owned by Phase S4 Test task 3.
 */

import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { QualityOperationsPanel } from './QualityOperationsPanel'
import { ToastProvider } from '@/lib/toast'

interface FailedRun {
  runId: string
  projectSlug: string
  taskKey: string
  status: 'failed' | 'blocked' | 'exhausted'
  profileName: string
  profileVersion: number
  failedStageKind: string
  failedReason: string
  attemptCount: number
  createdAt: number
}

const FAILED_RUNS: FailedRun[] = [
  {
    runId: 'run-a',
    projectSlug: 'fleet-commander',
    taskKey: 'task-42',
    status: 'failed',
    profileName: 'strict',
    profileVersion: 1,
    failedStageKind: 'red',
    failedReason: 'red gate rejected: 0 failing tests committed',
    attemptCount: 1,
    createdAt: 1_700_000_000_000,
  },
  {
    runId: 'run-b',
    projectSlug: 'fleet-commander',
    taskKey: 'task-43',
    status: 'blocked',
    profileName: 'standard',
    profileVersion: 1,
    failedStageKind: 'green',
    failedReason: 'parent task blocked by review',
    attemptCount: 3,
    createdAt: 1_700_000_100_000,
  },
]

function mockFetch(
  overrides: {
    listFailedRuns?: () => Promise<Response>
    retryStage?: () => Promise<Response>
    disableProfile?: () => Promise<Response>
    changeProfile?: () => Promise<Response>
  } = {},
) {
  const fetcher = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input.toString()
    const method = init?.method ?? 'GET'

    if (method === 'GET' && url.endsWith('/api/quality/runs?status=failed,blocked,exhausted')) {
      return overrides.listFailedRuns
        ? overrides.listFailedRuns()
        : Promise.resolve({ ok: true, json: async () => FAILED_RUNS } as Response)
    }

    if (method === 'POST' && /\/api\/quality\/runs\/[^/]+\/retry$/.test(url)) {
      return overrides.retryStage
        ? overrides.retryStage()
        : Promise.resolve({
            ok: true,
            json: async () => ({ ok: true, runId: 'run-a' }),
          } as Response)
    }

    if (method === 'POST' && url.endsWith('/api/quality/profiles/disable')) {
      return overrides.disableProfile
        ? overrides.disableProfile()
        : Promise.resolve({
            ok: true,
            json: async () => ({ ok: true, projectSlug: 'fleet-commander', disabled: true }),
          } as Response)
    }

    if (method === 'POST' && url.endsWith('/api/quality/projects/select')) {
      return overrides.changeProfile
        ? overrides.changeProfile()
        : Promise.resolve({
            ok: true,
            json: async () => ({
              ok: true,
              projectSlug: 'fleet-commander',
              profileName: 'standard',
              profileVersion: 1,
            }),
          } as Response)
    }

    return Promise.reject(new Error(`Unexpected fetch: ${method} ${url}`))
  })
  vi.stubGlobal('fetch', fetcher)
  return fetcher
}

function renderPanel() {
  return render(
    <ToastProvider>
      <QualityOperationsPanel />
    </ToastProvider>,
  )
}

describe('QualityOperationsPanel (S4 Operations intervention surface)', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('renders a heading titled "Quality operations" so the panel is discoverable in the operations console', async () => {
    mockFetch()
    renderPanel()
    expect(
      await screen.findByRole('heading', { name: /Quality operations/i, level: 2 }),
    ).toBeInTheDocument()
  })

  it('lists failed and blocked quality runs with the failed-stage kind and reason', async () => {
    mockFetch()
    renderPanel()
    const list = await screen.findByTestId('quality-operations-runs')
    const items = within(list).getAllByRole('listitem')
    expect(items.length).toBe(2)
    expect(
      within(list).getByText(/red gate rejected: 0 failing tests committed/i),
    ).toBeInTheDocument()
    expect(within(list).getByText(/parent task blocked by review/i)).toBeInTheDocument()
  })

  it('exposes a retry action that POSTs to the retry endpoint with the runId and an audit reason', async () => {
    const fetcher = mockFetch()
    renderPanel()
    const firstRun = (await screen.findAllByTestId('quality-operations-run-row'))[0]
    const retryButton = within(firstRun).getByRole('button', { name: /Retry/i })
    await userEvent.click(retryButton)
    // Confirmation dialog
    const confirm = await screen.findByRole('dialog')
    const reason = within(confirm).getByLabelText(/Reason/i)
    await userEvent.type(reason, 'manual override for test plan')
    const submit = within(confirm).getByRole('button', { name: /Confirm/i })
    await userEvent.click(submit)
    await waitFor(() =>
      expect(fetcher).toHaveBeenCalledWith(
        expect.stringMatching(/\/api\/quality\/runs\/run-a\/retry$/),
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('manual override for test plan'),
        }),
      ),
    )
  })

  it('does not retry when the confirmation is cancelled', async () => {
    const fetcher = mockFetch()
    renderPanel()
    const firstRun = (await screen.findAllByTestId('quality-operations-run-row'))[0]
    const retryButton = within(firstRun).getByRole('button', { name: /Retry/i })
    await userEvent.click(retryButton)
    const confirm = await screen.findByRole('dialog')
    const cancel = within(confirm).getByRole('button', { name: /Cancel/i })
    await userEvent.click(cancel)
    const retryCalls = fetcher.mock.calls.filter(c => {
      const url = typeof c[0] === 'string' ? c[0] : c[0].toString()
      return /\/api\/quality\/runs\/[^/]+\/retry$/.test(url)
    })
    expect(retryCalls.length).toBe(0)
  })

  it('exposes a disable action that disables the quality profile for the project with an audit reason', async () => {
    const fetcher = mockFetch()
    renderPanel()
    const disableButton = await screen.findByRole('button', { name: /Disable profile/i })
    await userEvent.click(disableButton)
    const confirm = await screen.findByRole('dialog')
    const reason = within(confirm).getByLabelText(/Reason/i)
    await userEvent.type(reason, 'rolled back: blocking release')
    const submit = within(confirm).getByRole('button', { name: /Confirm/i })
    await userEvent.click(submit)
    await waitFor(() =>
      expect(fetcher).toHaveBeenCalledWith(
        expect.stringMatching(/\/api\/quality\/profiles\/disable$/),
        expect.objectContaining({ method: 'POST' }),
      ),
    )
  })

  it('exposes a profile-change action that re-selects a different profile for the project', async () => {
    const fetcher = mockFetch()
    renderPanel()
    const changeButton = await screen.findByRole('button', { name: /Change profile/i })
    await userEvent.click(changeButton)
    const confirm = await screen.findByRole('dialog')
    const select = within(confirm).getByLabelText(/Profile/i) as HTMLSelectElement
    await userEvent.selectOptions(select, 'none')
    const submit = within(confirm).getByRole('button', { name: /Confirm/i })
    await userEvent.click(submit)
    await waitFor(() =>
      expect(fetcher).toHaveBeenCalledWith(
        expect.stringMatching(/\/api\/quality\/projects\/select$/),
        expect.objectContaining({ method: 'POST' }),
      ),
    )
  })

  it('shows an audit record (toast or row entry) after a successful action', async () => {
    mockFetch()
    renderPanel()
    const firstRun = (await screen.findAllByTestId('quality-operations-run-row'))[0]
    const retryButton = within(firstRun).getByRole('button', { name: /Retry/i })
    await userEvent.click(retryButton)
    const confirm = await screen.findByRole('dialog')
    const reason = within(confirm).getByLabelText(/Reason/i)
    await userEvent.type(reason, 'audit-trail reason')
    const submit = within(confirm).getByRole('button', { name: /Confirm/i })
    await userEvent.click(submit)
    expect(
      await screen.findByText(/audit-trail reason|retry queued|retry recorded/i),
    ).toBeInTheDocument()
  })

  it('shows an error state when the failed-runs query fails', async () => {
    mockFetch({
      listFailedRuns: () =>
        Promise.resolve({
          ok: false,
          status: 500,
          json: async () => ({ error: 'Convex unavailable' }),
        } as Response),
    })
    renderPanel()
    expect(await screen.findByText(/Failed to load quality operations/i)).toBeInTheDocument()
  })
})
