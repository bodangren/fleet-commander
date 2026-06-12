/**
 * Phase S4 Red tests for `frontend/src/components/timeline/QualityStageRow.tsx`.
 *
 * These tests pin the S4 task-timeline surface contract from
 * `test-strategy.md` §1 (S4 timeline extension: "PipelineTimeline.tsx and
 * TaskTimelinePage.tsx are the only timeline render surfaces — S4 extends
 * in place, no new timeline component"). They exercise the timeline-row
 * acceptance bullets in `spec.md#story-s4-operate-quality-workflows-visibly`:
 *
 *   - See passed / running / skipped / failed / blocked stages.
 *   - Role attribution per stage.
 *   - Attempt history (multiple attempts for a single stage).
 *   - Cost / duration per attempt.
 *   - Evidence summary.
 *   - Failure feedback (machine-readable reason).
 *
 * Plus the §1 "Component tests assert `aria-*` state for skipped /
 * blocked / failed" accessibility contract.
 *
 * The component under test does not exist yet. These tests are
 * intentionally Red and are committed under the `*.test.tsx` suffix.
 * The Green sibling lands when `QualityStageRow.tsx` is implemented
 * and these tests pass.
 *
 * Owned by Phase S4 Test task 2.
 */

import { describe, expect, it } from 'vitest'
import { render, screen, within } from '@testing-library/react'

import { QualityStageRow } from './QualityStageRow'
import type {
  QualityStageAttemptView,
  QualityStageRole,
  QualityStageStatus,
} from './QualityStageRow'

function makeAttempt(overrides: Partial<QualityStageAttemptView> = {}): QualityStageAttemptView {
  return {
    _id: 'attempt-1',
    runId: 'run-1',
    stageKind: 'red',
    role: 'executor' as QualityStageRole,
    attempt: 1,
    status: 'passed' as QualityStageStatus,
    startedAt: 1_700_000_000_000,
    finishedAt: 1_700_000_300_000,
    durationMs: 300_000,
    costUSD: 0.42,
    tokens: 9_500,
    model: 'claude-opus-4',
    evidence: {
      failingTestsCommitted: 3,
      nonTestSourceChangesRejected: 0,
    },
    reason: undefined,
    ...overrides,
  }
}

describe('QualityStageRow (S4 task-timeline surface)', () => {
  it('is a top-level exported component (consumed by the TaskTimelinePage extension)', () => {
    expect(typeof QualityStageRow).toBe('function')
  })

  it('renders the stage kind and 1-based stage index', () => {
    const attempt = makeAttempt({ stageKind: 'red' })
    render(<QualityStageRow index={1} attempt={attempt} />)
    expect(screen.getByTestId('quality-stage-row-1')).toBeInTheDocument()
    expect(screen.getByText(/red/i)).toBeInTheDocument()
    expect(screen.getByText(/1\./)).toBeInTheDocument()
  })

  it('attributes the stage to its role label', () => {
    const attempt = makeAttempt({ role: 'reviewer' as QualityStageRole, stageKind: 'adversarial' })
    render(<QualityStageRow index={2} attempt={attempt} />)
    expect(screen.getByText(/reviewer/i)).toBeInTheDocument()
  })

  it('renders attempt number for stages with multiple attempts', () => {
    const attempt = makeAttempt({ attempt: 3 })
    render(<QualityStageRow index={1} attempt={attempt} />)
    expect(screen.getByText(/attempt 3/i)).toBeInTheDocument()
  })

  it('formats duration in a human-readable way (mm:ss or m s)', () => {
    const attempt = makeAttempt({
      startedAt: 1_700_000_000_000,
      finishedAt: 1_700_000_300_000,
      durationMs: 300_000,
    })
    render(<QualityStageRow index={1} attempt={attempt} />)
    expect(screen.getByText(/5m( |inutes? )0s|5:00|300s/i)).toBeInTheDocument()
  })

  it('renders cost in USD formatted with two decimals', () => {
    const attempt = makeAttempt({ costUSD: 1.234 })
    render(<QualityStageRow index={1} attempt={attempt} />)
    expect(screen.getByText(/\$1\.23/)).toBeInTheDocument()
  })

  it('renders evidence summary key/value pairs when evidence is present', () => {
    const attempt = makeAttempt({
      evidence: { failingTestsCommitted: 2, nonTestSourceChangesRejected: 1 },
    })
    render(<QualityStageRow index={1} attempt={attempt} />)
    const evidence = screen.getByTestId('quality-stage-evidence')
    expect(within(evidence).getByText(/failingTestsCommitted/i)).toBeInTheDocument()
    expect(within(evidence).getByText(/2/)).toBeInTheDocument()
    expect(within(evidence).getByText(/nonTestSourceChangesRejected/i)).toBeInTheDocument()
    expect(within(evidence).getByText(/1/)).toBeInTheDocument()
  })

  it('uses aria-status="skipped" and renders the skip reason when status is skipped', () => {
    const attempt = makeAttempt({
      status: 'skipped' as QualityStageStatus,
      reason: 'no frontend changes in this commit',
    })
    render(<QualityStageRow index={1} attempt={attempt} />)
    const row = screen.getByTestId('quality-stage-row-1')
    expect(row).toHaveAttribute('aria-status', 'skipped')
    expect(screen.getByText(/no frontend changes in this commit/i)).toBeInTheDocument()
  })

  it('uses aria-status="failed" and renders the failure feedback when status is failed', () => {
    const attempt = makeAttempt({
      status: 'failed' as QualityStageStatus,
      reason: 'red gate rejected: 0 failing tests committed',
    })
    render(<QualityStageRow index={1} attempt={attempt} />)
    const row = screen.getByTestId('quality-stage-row-1')
    expect(row).toHaveAttribute('aria-status', 'failed')
    expect(screen.getByText(/red gate rejected: 0 failing tests committed/i)).toBeInTheDocument()
  })

  it('uses aria-status="blocked" when status is blocked', () => {
    const attempt = makeAttempt({
      status: 'blocked' as QualityStageStatus,
      reason: 'parent task blocked by review',
    })
    render(<QualityStageRow index={1} attempt={attempt} />)
    const row = screen.getByTestId('quality-stage-row-1')
    expect(row).toHaveAttribute('aria-status', 'blocked')
  })

  it('uses aria-status="passed" when status is passed', () => {
    const attempt = makeAttempt({ status: 'passed' as QualityStageStatus })
    render(<QualityStageRow index={1} attempt={attempt} />)
    const row = screen.getByTestId('quality-stage-row-1')
    expect(row).toHaveAttribute('aria-status', 'passed')
  })

  it('uses aria-status="running" when status is running', () => {
    const attempt = makeAttempt({ status: 'running' as QualityStageStatus })
    render(<QualityStageRow index={1} attempt={attempt} />)
    const row = screen.getByTestId('quality-stage-row-1')
    expect(row).toHaveAttribute('aria-status', 'running')
  })

  it('renders an attempts strip when more than one attempt exists for the same stage', () => {
    const attempts: QualityStageAttemptView[] = [
      makeAttempt({ _id: 'a1', attempt: 1, status: 'failed' as QualityStageStatus }),
      makeAttempt({ _id: 'a2', attempt: 2, status: 'failed' as QualityStageStatus }),
      makeAttempt({ _id: 'a3', attempt: 3, status: 'passed' as QualityStageStatus }),
    ]
    render(<QualityStageRow index={1} stageKind="red" attempts={attempts} />)
    const strip = screen.getByTestId('quality-stage-attempts-strip')
    const cells = within(strip).getAllByRole('listitem')
    expect(cells.length).toBe(3)
  })
})
