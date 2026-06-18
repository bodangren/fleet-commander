/**
 * Phase 3 Red — critical-path spec stability contract.
 *
 * Spec:           measure/tracks/e2e_test_baseline_hardening_20260619/spec.md
 * Plan:           measure/tracks/e2e_test_baseline_hardening_20260619/plan.md
 *                 (Phase 3, tasks 1-5)
 * Test strategy:  measure/tracks/e2e_test_baseline_hardening_20260619/test-strategy.md
 *                 §3 ("Determinism levers: ... bounded `await` waits on
 *                  Convex-style subscription readiness selectors
 *                  ([data-realtime-ready="true"]) instead of waitForTimeout");
 *                 §5 Phase 3: "per spec, write a Red Playwright test
 *                  reproducing the flake (worker-isolated) before applying
 *                  the fix. Use role-based selectors and subscription-ready
 *                  data attributes; ban waitForTimeout";
 *                 §7: "If Phase 3 introduces any [quarantined specs]: place
 *                  under frontend/e2e/quarantine/**"
 *
 * Why this file exists:
 *
 *   Phase 3 stabilizes the four critical-path specs (smoke, dashboard,
 *   kanban, project) that the Phase 1 baseline showed as failing. The
 *   test-strategy mandates specific stability patterns:
 *     - All four specs must use the seed factory (Phase 2 carryover).
 *     - No `waitForTimeout` (banned by §5 Phase 3).
 *     - No CSS ID selectors (use `getByRole`, `getByLabel`, `getByText`,
 *       `getByPlaceholder` instead).
 *     - dashboard.spec.ts must wait for subscription readiness markers
 *       (`[data-realtime-ready="true"]`) before checking render state
 *       (Phase 3 task 2).
 *     - kanban.spec.ts must use deterministic card data (`data-task-id`,
 *       `data-column-id`) and role-aware selectors (Phase 3 task 3).
 *     - project.spec.ts must seed a known project state via
 *       `seedScenario(page, 'demo' | 'empty' | 'kanban-cards')`
 *       (Phase 3 task 4).
 *     - No spec may carry an `@quarantine` marker outside
 *       `frontend/e2e/quarantine/**` (Phase 3 task 5 + test-strategy §7).
 *     - No spec may import `setupMockApp` directly — only the seed
 *       factory is allowed to compose it (Phase 2 carryover).
 *
 *   This contract test enforces the patterns by static analysis of the
 *   four critical-path spec files. It is a SHAPE contract (per
 *   test-strategy §6 distinction: "artifact/documentation contracts —
 *   they prove shape, not behavior"). The live behavior proof is the
 *   cold-server full suite run (Green closeout gate per test-strategy
 *   §6 row 3: `pkill -f vite || true && cd frontend && npx playwright
 *   test`).
 *
 * Red signal (expected failures at HEAD):
 *
 *   At HEAD, dashboard.spec.ts does NOT wait for subscription readiness
 *   markers before checking render state. The assertion
 *   "dashboard.spec.ts waits for subscription readiness markers
 *   (Phase 3 task 2)" fails. All other assertions pass (the spec
 *   already uses `seedScenario`, no `waitForTimeout`, no CSS ID
 *   selectors, deterministic card data, role-aware selectors, known
 *   project state, no `@quarantine`, no direct `setupMockApp` import).
 *
 *   Tasks 1, 3, 4, 5 are already satisfied with evidence (the contract
 *   test passes for these assertions at HEAD). Task 2 is the genuine
 *   Red gap. Task 6 is Green-owned (cold-server full suite closeout
 *   gate per test-strategy §6 row 3).
 *
 * Live-behaviour pairing:
 *
 *   Static side: this file enforces the stability patterns mandated by
 *   the test-strategy. It catches regressions where someone modifies a
 *   critical-path spec and reintroduces a banned pattern.
 *
 *   Live side: the cold-server full suite run
 *   (`pkill -f vite || true && cd frontend && npx playwright test`)
 *   is the Green closeout gate per test-strategy §6 row 3. It proves
 *   the specs are stable in practice, not just in shape. Phase 3
 *   task 6 owns the live gate.
 */

import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const E2E_ROOT = join(__dirname, '..', '..', 'e2e')

const CRITICAL_PATH_SPECS = [
  'smoke.spec.ts',
  'dashboard.spec.ts',
  'kanban.spec.ts',
  'project.spec.ts',
] as const

function readSpec(name: string): string {
  return readFileSync(join(E2E_ROOT, name), 'utf8')
}

function hasNamedImport(
  source: string,
  symbol: string,
  moduleSpecifier: string,
): boolean {
  const escapedSymbol = symbol.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const escapedSpecifier = moduleSpecifier.replace(
    /[.*+?^${}()|[\]\\]/g,
    '\\$&',
  )
  const namedImport = new RegExp(
    `import\\s*\\{[^}]*\\b${escapedSymbol}\\b[^}]*\\}\\s*from\\s+['"]${escapedSpecifier}['"]`,
  )
  return namedImport.test(source)
}

describe(
  'critical-path spec stability contract (Phase 3, e2e_test_baseline_hardening_20260619)',
  () => {
    it('all four critical-path specs exist on disk', () => {
      // Belt-and-braces: if discovery returns zero, every per-spec test
      // below would be vacuously true. Catch that here.
      for (const name of CRITICAL_PATH_SPECS) {
        expect(existsSync(join(E2E_ROOT, name)), `${name} should exist`).toBe(true)
      }
    })

    describe('per-spec stability patterns', () => {
      it.each(CRITICAL_PATH_SPECS)(
        '$name uses seedScenario (Phase 2 carryover)',
        name => {
          const source = readSpec(name)
          expect(
            hasNamedImport(source, 'seedScenario', './helpers/seed'),
            `${name} must import seedScenario from './helpers/seed'`,
          ).toBe(true)
        },
      )

      it.each(CRITICAL_PATH_SPECS)(
        '$name does NOT use waitForTimeout (banned by test-strategy §5 Phase 3)',
        name => {
          const source = readSpec(name)
          expect(
            /waitForTimeout/.test(source),
            `${name} must not use waitForTimeout; use subscription readiness markers instead (per test-strategy §3, §5 Phase 3)`,
          ).toBe(false)
        },
      )

      it.each(CRITICAL_PATH_SPECS)(
        '$name does NOT use CSS ID selectors (use role-based instead)',
        name => {
          const source = readSpec(name)
          expect(
            /locator\s*\(\s*['"]#/.test(source),
            `${name} must not use CSS ID selectors; use getByRole, getByLabel, getByText, getByPlaceholder (per test-strategy §5 Phase 3)`,
          ).toBe(false)
        },
      )

      it('dashboard.spec.ts waits for subscription readiness markers (Phase 3 task 2)', () => {
        // Per test-strategy §3 determinism levers, specs must wait on
        // Convex-style subscription readiness selectors
        // ([data-realtime-ready="true"]) instead of waitForTimeout.
        // dashboard.spec.ts currently asserts on render state (e.g.,
        // "Sprint Alpha", "Delivery Rate", "No recent activity") without
        // first waiting for the realtime subscription to be ready. This
        // is the genuine Red gap for Phase 3 task 2.
        const source = readSpec('dashboard.spec.ts')
        expect(
          /data-realtime-ready|realtime-ready/.test(source),
          `dashboard.spec.ts must wait for subscription readiness markers (e.g., page.locator('[data-realtime-ready="true"]').waitFor()) before checking render state; per test-strategy §3 determinism levers`,
        ).toBe(true)
      })

      it('kanban.spec.ts uses deterministic card data (Phase 3 task 3)', () => {
        // Per Phase 3 task 3, kanban.spec.ts must use deterministic
        // card data (data-task-id, data-column-id, data-status-column)
        // rather than text-based or position-based selectors.
        const source = readSpec('kanban.spec.ts')
        expect(
          /data-task-id|data-column-id|data-status-column/.test(source),
          `kanban.spec.ts must use deterministic card data (e.g., data-task-id, data-column-id, data-status-column) per Phase 3 task 3`,
        ).toBe(true)
      })

      it('kanban.spec.ts uses role-aware selectors (Phase 3 task 3)', () => {
        // Per test-strategy §5 Phase 3, use role-based selectors
        // (getByRole, getByText, getByLabel, getByPlaceholder).
        const source = readSpec('kanban.spec.ts')
        expect(
          /getByRole|getByText|getByLabel|getByPlaceholder/.test(source),
          `kanban.spec.ts must use role-aware selectors (getByRole, getByText, getByLabel, getByPlaceholder) per test-strategy §5 Phase 3`,
        ).toBe(true)
      })

      it('project.spec.ts seeds a known project state via seedScenario (Phase 3 task 4)', () => {
        // Per Phase 3 task 4, project.spec.ts must seed a known
        // project state before each test (e.g., demo project with
        // task-todo-1, task-blocked-1, task-done-1 per mockApp.ts).
        const source = readSpec('project.spec.ts')
        expect(
          /seedScenario\s*\(\s*page\s*,\s*['"](?:demo|empty|kanban-cards)['"]\s*\)/.test(
            source,
          ),
          `project.spec.ts must seed a known project state via seedScenario(page, 'demo' | 'empty' | 'kanban-cards') per Phase 3 task 4`,
        ).toBe(true)
      })

      it('no spec has @quarantine outside frontend/e2e/quarantine/** (Phase 3 task 5)', () => {
        // Per test-strategy §7, quarantined specs MUST be placed under
        // frontend/e2e/quarantine/** and excluded by playwright.config.ts
        // testIgnore. At HEAD, no specs are quarantined (all 4 critical-
        // path specs are deterministic). This assertion is a regression
        // guard: if Phase 3 ever needs to quarantine a spec, it must
        // move to the quarantine dir, not stay in place with an
        // @quarantine marker.
        for (const name of CRITICAL_PATH_SPECS) {
          const source = readSpec(name)
          expect(
            /@quarantine/.test(source),
            `${name} must not have @quarantine marker in-place; move to frontend/e2e/quarantine/** per test-strategy §7`,
          ).toBe(false)
        }
      })

      it('no spec imports setupMockApp directly (Phase 2 carryover)', () => {
        // Per seed-factory-usage.contract.test.ts (Phase 2 Red
        // commit 4b8f2b7), only the seed factory may import
        // setupMockApp from ./helpers/mockApp. All specs must route
        // through seedScenario. This assertion is a regression guard
        // for the Phase 2 migration.
        for (const name of CRITICAL_PATH_SPECS) {
          const source = readSpec(name)
          expect(
            hasNamedImport(source, 'setupMockApp', './helpers/mockApp'),
            `${name} must not import setupMockApp directly; route through seedScenario per Phase 2 migration`,
          ).toBe(false)
        }
      })
    })
  },
)
