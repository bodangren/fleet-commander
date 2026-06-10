/**
 * Phase 1: Inventory & Scaffold — react-router-dom v7 dependency contract.
 *
 * Spec:  measure/tracks/react_router_7_migration_20260611/spec.md (AC #1, #2, #6)
 * Plan:  measure/tracks/react_router_7_migration_20260611/plan.md (Task 1.4)
 * Strategy: measure/tracks/react_router_7_migration_20260611/test-strategy.md §3, §5, §7
 *
 * Task 1.4 deliverable: bump `react-router-dom` from `^6.x` to `^7.x` in
 * `frontend/package.json` and resolve peer-dependency warnings. The
 * strategy §3 cross-phase edge case requires that "Phase 1 Task 1.4 must
 * report `bun pm ls` clean" — that is a manual Green-gate command, not
 * this test. This test is the **unit-level** contract: read the manifest
 * directly and assert the declared range is v7.
 *
 * The "live dep proof" (`bun pm ls react-router-dom` returning `7.x`) is
 * the Green-gate companion command and is recorded as such in plan.md; it
 * is not duplicated here because `bun pm ls` is a runtime invariant and
 * not portable to a vitest assertion. Reading the manifest catches the
 * declared version range, which is the author-action that the test owns.
 *
 * Red signal: HEAD's `frontend/package.json` declares
 * `"react-router-dom": "^6.30.4"`. The v7 regex fails, producing a live
 * "current implementation is wrong" failure for Task 1.4.
 */
import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const PKG_PATH = resolve(__dirname, '../../package.json')

interface PackageManifest {
  dependencies?: Record<string, string>
  devDependencies?: Record<string, string>
  peerDependencies?: Record<string, string>
}

const pkg = JSON.parse(readFileSync(PKG_PATH, 'utf8')) as PackageManifest
const dep =
  pkg.dependencies?.['react-router-dom'] ??
  pkg.devDependencies?.['react-router-dom'] ??
  pkg.peerDependencies?.['react-router-dom']

describe('react-router-dom dep range — Phase 1 Task 1.4', () => {
  it('package.json declares react-router-dom', () => {
    expect(dep).toBeDefined()
  })

  it('react-router-dom declared range is a v7 caret (^7.x.x)', () => {
    // Accept `^7.0.0`, `~7.1.2`, `7.x`, or `>=7.0.0` — any range whose
    // resolved top version starts with `7.`. Strict equality with
    // `^7.` is the v6 → v7 migration gate.
    expect(dep).toMatch(/^[~^]?7\./)
  })

  it('does not declare a v6 range (forbidden after Task 1.4 lands)', () => {
    expect(dep).not.toMatch(/^[~^]?6\./)
  })
})
