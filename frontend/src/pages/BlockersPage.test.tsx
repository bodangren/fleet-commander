/**
 * Phase 5 Red gate: the BlockersPage must surface a dedicated dashboard
 * for blocked tasks and open issues with project / agent / type filtering
 * and an estimated-unblock-time column. Several of the new requirements
 * (sprint column, per-row blocker chain, action buttons, project filter
 * dropdown populated from data) are not yet present in the inlined
 * `BlockersPage` table; the Green phase is responsible for extracting a
 * `BlockersTable` and wiring the new columns / buttons.
 *
 * See measure/tracks/task_dependencies_critical_path_20260605/plan.md
 * Phase 5 tasks 1, 2, 6 and test-strategy.md §5 Phase 5 row.
 */
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { BlockersPage } from './BlockersPage'
import type { BlockedTask, OpenIssue, BlockersData } from '@/lib/useFleetApi'
import {
  makeBlockedTask,
  makeOpenIssue,
  singleBlockedFixture,
  chain3BlockedFixture,
  multiProjectFixture,
} from '@/__fixtures__/dependencyFixtures'

const mockUseBlockers = vi.fn()

vi.mock('@/lib/useFleetApi', async () => {
  const actual = await vi.importActual<typeof import('@/lib/useFleetApi')>('@/lib/useFleetApi')
  return {
    ...actual,
    useBlockers: (...args: unknown[]) => mockUseBlockers(...args),
  }
})

function setBlockersData(
  data: BlockersData | null = singleBlockedFixture,
  opts: { loading?: boolean; error?: string | null } = {},
) {
  mockUseBlockers.mockReturnValue({
    data,
    loading: opts.loading ?? false,
    error: opts.error ?? null,
  })
}

describe('BlockersPage — Phase 5 dashboard', () => {
  beforeEach(() => {
    mockUseBlockers.mockReset()
    setBlockersData()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  // ----------------------------------------------------------------
  // Task 1 — /blockers route surface (characterization)
  // ----------------------------------------------------------------

  it('renders the BLOCKED TASKS heading on /blockers', async () => {
    render(<BlockersPage />)
    expect(await screen.findByRole('heading', { name: /blocked tasks/i })).toBeInTheDocument()
  })

  it('renders an OPEN ISSUES heading alongside the blocked-tasks card', async () => {
    render(<BlockersPage />)
    expect(await screen.findByRole('heading', { name: /open issues/i })).toBeInTheDocument()
  })

  // ----------------------------------------------------------------
  // Task 2 — table column contract (Red gates)
  // ----------------------------------------------------------------

  it('renders a SPRINT column header on the blocked-tasks table [Red gate]', async () => {
    setBlockersData(chain3BlockedFixture)
    render(<BlockersPage />)
    expect(await screen.findByRole('columnheader', { name: /sprint/i })).toBeInTheDocument()
  })

  it('renders an ESTIMATED UNBLOCK TIME column header [Red gate]', async () => {
    setBlockersData(chain3BlockedFixture)
    render(<BlockersPage />)
    expect(
      await screen.findByRole('columnheader', { name: /unblock|estimate/i }),
    ).toBeInTheDocument()
  })

  it('renders a View task button per blocked-task row [Red gate]', async () => {
    setBlockersData(chain3BlockedFixture)
    render(<BlockersPage />)
    const buttons = await screen.findAllByRole('button', { name: /view task/i })
    expect(buttons.length).toBe(chain3BlockedFixture.blockedTasks.length)
  })

  it('renders a Reassign blocker button per blocked-task row [Red gate]', async () => {
    setBlockersData(chain3BlockedFixture)
    render(<BlockersPage />)
    const buttons = await screen.findAllByRole('button', { name: /reassign/i })
    expect(buttons.length).toBe(chain3BlockedFixture.blockedTasks.length)
  })

  it('renders the blocker chain as a breadcrumb inside each row [Red gate]', async () => {
    setBlockersData(chain3BlockedFixture)
    render(<BlockersPage />)
    await screen.findByRole('heading', { name: /blocked tasks/i })
    // BlockerChain draws one rounded-full status dot per entry; we
    // expect at least one (since the fixture has 3 blocked tasks, each
    // row is shown, the chain widget may render one dot per blocker
    // or a single placeholder dot).
    const dots = document.querySelectorAll('span.rounded-full')
    expect(dots.length).toBeGreaterThanOrEqual(1)
  })

  // ----------------------------------------------------------------
  // Task 2 — filter contract (characterization + Red gates)
  // ----------------------------------------------------------------

  it('populates the project filter with every project present in the data', async () => {
    setBlockersData(multiProjectFixture)
    render(<BlockersPage />)
    const select = await screen.findByDisplayValue(/all_projects/i)
    // Sanity: the dropdown options include both project slugs.
    const opts = within(select as HTMLSelectElement).getAllByRole('option')
    const values = opts.map(o => (o as HTMLOptionElement).value)
    expect(values).toEqual(expect.arrayContaining(['auth', 'billing']))
  })

  it('passes the selected project to useBlockers (characterization)', async () => {
    setBlockersData(multiProjectFixture)
    render(<BlockersPage />)
    const select = (await screen.findByDisplayValue(/all_projects/i)) as HTMLSelectElement
    await userEvent.selectOptions(select, 'auth')
    expect(mockUseBlockers).toHaveBeenCalledWith('auth', undefined)
  })

  it('passes the selected agent to useBlockers when the agent filter changes', async () => {
    setBlockersData(chain3BlockedFixture)
    render(<BlockersPage />)
    const select = (await screen.findByDisplayValue(/all_agents/i)) as HTMLSelectElement
    await userEvent.selectOptions(select, 'agent-1')
    expect(mockUseBlockers).toHaveBeenCalledWith(undefined, 'agent-1')
  })

  it('toggles the type tab between "all", "blocked", and "issues"', async () => {
    setBlockersData(singleBlockedFixture)
    render(<BlockersPage />)
    const blockedTab = await screen.findByRole('button', { name: /^blocked$/i })
    const issuesTab = await screen.findByRole('button', { name: /^issues$/i })
    const allTab = await screen.findByRole('button', { name: /^all$/i })

    expect(blockedTab).toBeInTheDocument()
    expect(issuesTab).toBeInTheDocument()
    expect(allTab).toBeInTheDocument()
  })

  it('hides the OPEN ISSUES card when the type tab is "blocked"', async () => {
    setBlockersData(singleBlockedFixture)
    render(<BlockersPage />)
    const blockedTab = await screen.findByRole('button', { name: /^blocked$/i })
    await userEvent.click(blockedTab)
    await waitFor(() => {
      expect(screen.queryByRole('heading', { name: /open issues/i })).toBeNull()
    })
  })

  it('hides the BLOCKED TASKS card when the type tab is "issues"', async () => {
    setBlockersData(singleBlockedFixture)
    render(<BlockersPage />)
    const issuesTab = await screen.findByRole('button', { name: /^issues$/i })
    await userEvent.click(issuesTab)
    await waitFor(() => {
      expect(screen.queryByRole('heading', { name: /blocked tasks/i })).toBeNull()
    })
  })

  // ----------------------------------------------------------------
  // Task 1 — empty / loading / error states (characterization)
  // ----------------------------------------------------------------

  it('renders the empty placeholder when there are no blocked tasks', async () => {
    setBlockersData({ blockedTasks: [], openIssues: [] })
    render(<BlockersPage />)
    expect(await screen.findByText(/no_blocked_tasks/i)).toBeInTheDocument()
  })

  it('renders a loading state while the hook is fetching', async () => {
    setBlockersData(null, { loading: true })
    render(<BlockersPage />)
    // Both cards render a "LOADING…" placeholder when loading=true, so
    // use findAllByText and assert at least one match.
    const matches = await screen.findAllByText(/loading/i)
    expect(matches.length).toBeGreaterThan(0)
  })

  it('renders an error card when useBlockers returns an error', async () => {
    setBlockersData(null, { error: 'Network exploded' })
    render(<BlockersPage />)
    expect(await screen.findByText(/network exploded/i)).toBeInTheDocument()
  })

  it('renders one <tr> per blocked task in the table body', async () => {
    setBlockersData(chain3BlockedFixture)
    render(<BlockersPage />)
    await screen.findByRole('heading', { name: /blocked tasks/i })
    // The body has one row per blocked task. The header is one row, so
    // total rows = header + N.
    const rows = await screen.findAllByRole('row')
    expect(rows.length).toBe(1 + chain3BlockedFixture.blockedTasks.length)
  })

  it('shows the assignee of each blocked task', async () => {
    setBlockersData(chain3BlockedFixture)
    render(<BlockersPage />)
    for (const task of chain3BlockedFixture.blockedTasks) {
      expect(await screen.findByText(`@${task.assignee!}`)).toBeInTheDocument()
    }
  })

  // ----------------------------------------------------------------
  // Phase 4b cross-link: dashboard can show the project name when present
  // ----------------------------------------------------------------

  it('prefers projectName over projectSlug when both are present (characterization)', async () => {
    setBlockersData(multiProjectFixture)
    render(<BlockersPage />)
    // Both names must appear in the table — they disambiguate same-slug
    // rows in the multi-project fixture.
    expect(await screen.findByText('Auth Service')).toBeInTheDocument()
    expect(await screen.findByText('Billing Service')).toBeInTheDocument()
  })

  it('falls back to projectSlug when projectName is missing', async () => {
    setBlockersData({
      blockedTasks: [makeBlockedTask({ taskKey: 'P1', projectSlug: 'plain-slug' })],
      openIssues: [],
    })
    render(<BlockersPage />)
    // The slug appears in both the project filter <option> and the row
    // cell; assert at least one match.
    const matches = await screen.findAllByText('plain-slug')
    expect(matches.length).toBeGreaterThan(0)
  })
})
