/**
 * Phase 6 verification runbook validation tests.
 *
 * The test strategy for Phase 6 (Verification) calls for a **manual** outage
 * simulation + recovery runbook — see
 * `measure/tracks/provider_health_resilience_20260605/test-strategy.md` §1
 * and §5. The runbook is the test artifact; an operator follows it to verify
 * end-to-end provider health behavior in a live environment.
 *
 * These tests assert that the runbook:
 *   1. Exists at the documented path inside the track directory.
 *   2. Contains the four required sections in order: Pre-Outage Setup,
 *      Outage Simulation, Recovery Verification, Post-Recovery.
 *   3. Includes the critical checklist items an operator needs to actually
 *      execute the verification (block endpoint, observe dashboard, observe
 *      fallback, restore endpoint, observe recovery).
 *
 * The tests are intentionally strict about section ordering and required
 * checklist phrases so that a missing or truncated runbook is caught before
 * the manual run is attempted.
 *
 * Spec: measure/tracks/provider_health_resilience_20260605/spec.md
 * Test strategy: measure/tracks/provider_health_resilience_20260605/test-strategy.md
 */
import { describe, expect, it, beforeAll } from 'bun:test'
import { readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'

const PROJECT_ROOT = join(__dirname, '..', '..', '..')
const RUNBOOK_RELATIVE_PATH = join(
  PROJECT_ROOT,
  'measure',
  'tracks',
  'provider_health_resilience_20260605',
  'runbook.md',
)

const REQUIRED_SECTIONS = [
  '## Pre-Outage Setup',
  '## Outage Simulation',
  '## Recovery Verification',
  '## Post-Recovery',
] as const

const REQUIRED_CHECKLIST_PHRASES = [
  'block',
  'dashboard',
  'fallback',
  'restore',
  'recovery',
  'green',
] as const

describe('Phase 6 verification runbook', () => {
  let runbookContents: string

  beforeAll(() => {
    runbookContents = existsSync(RUNBOOK_RELATIVE_PATH)
      ? readFileSync(RUNBOOK_RELATIVE_PATH, 'utf8')
      : ''
  })

  it('exists at the documented track path', () => {
    expect(existsSync(RUNBOOK_RELATIVE_PATH)).toBe(true)
  })

  it('contains the four required top-level sections', () => {
    for (const section of REQUIRED_SECTIONS) {
      expect(runbookContents).toContain(section)
    }
  })

  it('orders the sections Pre-Outage -> Outage -> Recovery -> Post-Recovery', () => {
    let lastIndex = -1
    for (const section of REQUIRED_SECTIONS) {
      const idx = runbookContents.indexOf(section)
      expect(idx).toBeGreaterThan(-1)
      expect(idx).toBeGreaterThan(lastIndex)
      lastIndex = idx
    }
  })

  it('documents blocking the provider endpoint for the outage simulation', () => {
    expect(runbookContents.toLowerCase()).toContain('/etc/hosts')
  })

  it('documents the dashboard red-status expectation during the outage', () => {
    const lower = runbookContents.toLowerCase()
    expect(lower).toContain('red')
    expect(lower).toContain('unhealthy')
  })

  it('documents the fallback chain firing during the outage', () => {
    const lower = runbookContents.toLowerCase()
    expect(lower).toContain('fallback')
    expect(lower).toContain('next')
  })

  it('documents restoring the provider endpoint and observing green recovery', () => {
    const lower = runbookContents.toLowerCase()
    expect(lower).toContain('restore')
    expect(lower).toContain('green')
    expect(lower).toContain('primary')
  })

  it('uses checklist-style items (markdown checkboxes) for operator actions', () => {
    expect(runbookContents).toMatch(/^- \[[ x]\]/m)
  })

  it('includes every required checklist phrase somewhere in the runbook', () => {
    const lower = runbookContents.toLowerCase()
    for (const phrase of REQUIRED_CHECKLIST_PHRASES) {
      expect(lower).toContain(phrase)
    }
  })
})
