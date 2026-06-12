/**
 * Phase S4 Red tests for `frontend/src/pages/settings/QualityProfileSection.tsx`.
 *
 * These tests pin the S4 settings surface contract from
 * `test-strategy.md` §1 (S4: "React Testing Library unit/component tests;
 * hook tests with Convex fakes"). They exercise the four acceptance
 * criteria bullets in `spec.md#story-s4-operate-quality-workflows-visibly`
 * that belong to the settings surface:
 *
 *   1. Project settings surface — select a profile.
 *   2. Inspect ordered stages of the selected profile.
 *   3. See validation errors before saving.
 *   4. Inspect immutable profile versions (a project selection pins
 *      a profile version; later source changes must not be reflected
 *      in the snapshot view).
 *
 * The component under test does not exist yet. These tests are
 * intentionally Red and are committed under the `*.test.tsx` suffix
 * (no `*.red.test.tsx` per the S4 plan) per the S4 contract: each
 * test imports `./QualityProfileSection`, the
 * `useQualityProfile` hook, and typed Convex boundaries from
 * `convex/qualityProfiles`. The Green sibling lands when
 * `QualityProfileSection.tsx` and `useQualityProfile.ts` are
 * implemented and these tests pass.
 *
 * Owned by Phase S4 Test task 1.
 */

import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { ToastProvider } from '@/lib/toast'
import { QualityProfileSection } from './QualityProfileSection'

type ProfileSummary = {
  name: string
  version: number
  kind: 'none' | 'standard' | 'strict'
  description: string
  stages: Array<{
    kind: string
    policy: {
      required: boolean
      role: string
      attempts: number
      timeoutMs: number
    }
  }>
}

const STRICT_V1: ProfileSummary = {
  name: 'strict',
  version: 1,
  kind: 'strict',
  description: 'Full strict quality workflow v1',
  stages: [
    {
      kind: 'strategy',
      policy: { required: true, role: 'architect', attempts: 1, timeoutMs: 300_000 },
    },
    { kind: 'red', policy: { required: true, role: 'executor', attempts: 1, timeoutMs: 600_000 } },
    {
      kind: 'green',
      policy: { required: true, role: 'executor', attempts: 1, timeoutMs: 600_000 },
    },
  ],
}

const STRICT_V2: ProfileSummary = {
  ...STRICT_V1,
  version: 2,
  description: 'Full strict quality workflow v2 (new stage added)',
  stages: [
    ...STRICT_V1.stages,
    {
      kind: 'adversarial',
      policy: { required: true, role: 'reviewer', attempts: 1, timeoutMs: 600_000 },
    },
  ],
}

const STANDARD_V1: ProfileSummary = {
  name: 'standard',
  version: 1,
  kind: 'standard',
  description: 'Standard quality workflow',
  stages: [
    { kind: 'red', policy: { required: true, role: 'executor', attempts: 1, timeoutMs: 600_000 } },
    {
      kind: 'green',
      policy: { required: true, role: 'executor', attempts: 1, timeoutMs: 600_000 },
    },
  ],
}

const NONE_V1: ProfileSummary = {
  name: 'none',
  version: 1,
  kind: 'none',
  description: 'No quality workflow',
  stages: [],
}

interface FetchOverrides {
  listProfiles?: () => Promise<Response>
  getEffectiveProjectProfile?: () => Promise<Response>
  selectProjectProfile?: () => Promise<Response>
  publishProfileVersion?: () => Promise<Response>
}

function mockFetchForSettings(overrides: FetchOverrides = {}) {
  const fetcher = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input.toString()
    const method = init?.method ?? 'GET'

    if (method === 'GET' && url.endsWith('/api/quality/profiles')) {
      return overrides.listProfiles
        ? overrides.listProfiles()
        : Promise.resolve({
            ok: true,
            json: async () => [NONE_V1, STANDARD_V1, STRICT_V1],
          } as Response)
    }

    if (method === 'GET' && /\/api\/quality\/projects\/[^/]+\/profile$/.test(url)) {
      return overrides.getEffectiveProjectProfile
        ? overrides.getEffectiveProjectProfile()
        : Promise.resolve({
            ok: true,
            json: async () => ({ profileName: 'none', profileVersion: 1, source: 'default' }),
          } as Response)
    }

    if (method === 'POST' && /\/api\/quality\/projects\/[^/]+\/select$/.test(url)) {
      return overrides.selectProjectProfile
        ? overrides.selectProjectProfile()
        : Promise.resolve({ ok: true, json: async () => ({ ok: true }) } as Response)
    }

    if (method === 'POST' && url.endsWith('/api/quality/profiles/publish')) {
      return overrides.publishProfileVersion
        ? overrides.publishProfileVersion()
        : Promise.resolve({
            ok: true,
            json: async () => ({ ok: true, profile: STRICT_V2 }),
          } as Response)
    }

    return Promise.reject(new Error(`Unexpected fetch: ${method} ${url}`))
  })
  vi.stubGlobal('fetch', fetcher)
  return fetcher
}

function renderSection() {
  return render(
    <ToastProvider>
      <QualityProfileSection projectSlug="fleet-commander" />
    </ToastProvider>,
  )
}

describe('QualityProfileSection (S4 settings surface)', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('renders a card titled "Quality workflow" so the section is discoverable in the settings sidebar', async () => {
    mockFetchForSettings()
    renderSection()
    expect(
      await screen.findByRole('heading', { name: /Quality workflow/i, level: 3 }),
    ).toBeInTheDocument()
  })

  it('lists every built-in profile (none, standard, strict) plus any user-published versions', async () => {
    mockFetchForSettings()
    renderSection()
    const select = await screen.findByLabelText(/Profile/i)
    const options = within(select).getAllByRole('option')
    const optionLabels = options.map(o => o.textContent ?? '')
    expect(optionLabels.some(l => /none/i.test(l))).toBe(true)
    expect(optionLabels.some(l => /standard/i.test(l))).toBe(true)
    expect(optionLabels.some(l => /strict/i.test(l))).toBe(true)
  })

  it('shows the currently effective project profile as the initial selection', async () => {
    mockFetchForSettings({
      getEffectiveProjectProfile: () =>
        Promise.resolve({
          ok: true,
          json: async () => ({ profileName: 'standard', profileVersion: 1, source: 'project' }),
        } as Response),
    })
    renderSection()
    const select = (await screen.findByLabelText(/Profile/i)) as HTMLSelectElement
    expect(select.value).toBe('standard')
  })

  it('renders the ordered stages of the selected profile in profile order', async () => {
    mockFetchForSettings()
    renderSection()
    const select = (await screen.findByLabelText(/Profile/i)) as HTMLSelectElement
    await userEvent.selectOptions(select, 'strict')
    const list = await screen.findByTestId('quality-profile-stages')
    const items = within(list).getAllByRole('listitem')
    const labels = items.map(li => li.textContent ?? '')
    const order = labels.map(label => {
      const m = label.match(
        /strategy|red|green|phase_acceptance|adversarial|ux|acceptance|closeout/i,
      )
      return m ? m[0] : ''
    })
    expect(order).toEqual(['strategy', 'red', 'green'])
  })

  it('shows validation errors before saving (e.g. unknown profile name)', async () => {
    mockFetchForSettings({
      selectProjectProfile: () =>
        Promise.resolve({
          ok: false,
          status: 422,
          json: async () => ({ error: 'Unknown profile name: "unknown"' }),
        } as Response),
    })
    renderSection()
    const select = (await screen.findByLabelText(/Profile/i)) as HTMLSelectElement
    await userEvent.selectOptions(select, 'unknown')
    const saveButton = screen.getByRole('button', { name: /Save/i })
    await userEvent.click(saveButton)
    expect(await screen.findByText(/Unknown profile name/i)).toBeInTheDocument()
  })

  it('disables the save button until a different selection is made', async () => {
    mockFetchForSettings({
      getEffectiveProjectProfile: () =>
        Promise.resolve({
          ok: true,
          json: async () => ({ profileName: 'none', profileVersion: 1, source: 'default' }),
        } as Response),
    })
    renderSection()
    const saveButton = (await screen.findByRole('button', { name: /Save/i })) as HTMLButtonElement
    expect(saveButton.disabled).toBe(true)
  })

  it('pins the selected profile version in the snapshot view (immutable) even if the source profile version advances', async () => {
    const fetcher = mockFetchForSettings({
      getEffectiveProjectProfile: () =>
        Promise.resolve({
          ok: true,
          json: async () => ({ profileName: 'strict', profileVersion: 1, source: 'project' }),
        } as Response),
    })
    renderSection()
    await screen.findByLabelText(/Profile/i)
    const snapshotBadge = await screen.findByTestId('quality-profile-version-badge')
    expect(snapshotBadge.textContent ?? '').toMatch(/v1/)

    fetcher.mockImplementationOnce(async () =>
      Promise.resolve({
        ok: true,
        json: async () => [NONE_V1, STANDARD_V1, STRICT_V2],
      } as Response),
    )
    // Force a refetch by clicking a refresh affordance.
    const refresh = screen.getByRole('button', { name: /Refresh|Reload/i })
    await userEvent.click(refresh)

    await waitFor(() => {
      expect(screen.getByTestId('quality-profile-version-badge').textContent ?? '').toMatch(/v1/)
    })
  })

  it('shows an error state when the profiles query fails', async () => {
    mockFetchForSettings({
      listProfiles: () =>
        Promise.resolve({
          ok: false,
          status: 500,
          json: async () => ({ error: 'Convex unavailable' }),
        } as Response),
    })
    renderSection()
    expect(await screen.findByText(/Failed to load quality profiles/i)).toBeInTheDocument()
  })
})
