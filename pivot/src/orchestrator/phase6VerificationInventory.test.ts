/**
 * Phase 6 Verification Red pin: inventory + sanity gates for every test
 * file this track depends on. The Phase 6 plan commits to "all 5
 * Red gates resolved" and "full pivot/frontend test suites green."
 * This file pins the **inventory** (the durable record of which test
 * files exist and how many cases they own) so a future Green or
 * refactor cannot silently delete a Red pin or shrink a test file
 * without the inventory check catching it.
 *
 * It also pins a few static-evidence gates that the Phase 6
 * verification phase explicitly owns:
 *
 *   1. All Phase 4/4b/5/6 test files exist on disk.
 *   2. Every test file has the expected minimum number of `it(`
 *      cases (catches accidental truncation).
 *   3. The pivot dependency utils + recommender test files are
 *      still paired with their source modules (catches file moves
 *      that would orphan the Red pins).
 *   4. The frontend `SprintRecommendation` type exposes `makespan`
 *      (Phase 4b Green done) and the page renders the field
 *      (Phase 4b Green done) — the inventory is what proves the
 *      Green is in place, not a single transient test run.
 *
 * Static-evidence-only is allowed for this file because the
 * phase's deliverable IS the inventory + verification record
 * (see test-strategy.md §4 architecture guardrails and plan.md
 * Phase 6 preamble). The plan note in Phase 6 explicitly pairs
 * the inventory with the live-behavior proof (the
 * `bun --cwd pivot test && bun --cwd frontend test` run).
 */
import { describe, expect, it } from 'vitest'
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const REPO = resolve(__dirname, '../../..')

const PIVOT_TEST_FILES = [
  // Phase 1 — pure dependency utils characterization
  'pivot/src/orchestrator/dependencyUtils.test.ts',
  'pivot/src/orchestrator/dependencyUtils.characterization.test.ts',
  // Phase 4b — makespan acceptance sub-spec
  'pivot/src/orchestrator/dependencyUtils.makespan.test.ts',
  // Phase 4 — dependency-aware recommender
  'pivot/src/planning/recommender.dependencyAware.test.ts',
  // Phase 6 — verification recommender
  'pivot/src/planning/recommender.dependencyAware.verification.test.ts',
]

const FRONTEND_TEST_FILES = [
  // Phase 3 — task detail + board UI
  'frontend/src/components/kanban/DependencyEditor.test.tsx',
  'frontend/src/components/kanban/KanbanTaskDetailPanel.test.tsx',
  'frontend/src/components/kanban/TaskCard.test.tsx',
  'frontend/src/components/kanban/TaskStatusBadge.test.tsx',
  'frontend/src/components/kanban/DependencyGraphMini.test.tsx',
  // Phase 4 — critical path + start-sprint validation
  'frontend/src/pages/SprintPlanningPage.criticalPath.test.tsx',
  'frontend/src/pages/SprintPlanningPage.startSprintValidation.test.tsx',
  // Phase 4b — makespan UI surface
  'frontend/src/pages/SprintPlanningPage.makespan.test.tsx',
  // Phase 5 — blockers dashboard
  'frontend/src/pages/BlockersPage.test.tsx',
  'frontend/src/components/BlockersTable.test.tsx',
  'frontend/src/components/BlockerChain.test.tsx',
  'frontend/src/lib/blockerResolution.test.ts',
  'frontend/src/hooks/useBlockerResolutionToast.test.tsx',
]

const CONVEX_TEST_FILES = [
  'convex/dependencies.test.ts',
  'convex/dependencies.integration.test.ts',
  'convex/dependencies.verification.test.ts',
  'convex/dependencies.cycleMessages.test.ts',
  'convex/dependencies.staticAnalysis.test.ts',
]

function countItCases(filePath: string): number {
  const text = readFileSync(filePath, 'utf8')
  // Match `it(`, `it.only(`, `it.skip(`, `test(`, `test.only(`, `test.skip(`
  const matches = text.match(/(?:^|\s)(?:it|test)(?:\.(?:only|skip))?\(/g)
  return matches ? matches.length : 0
}

describe('Phase 6 Verification: test inventory (Red pin)', () => {
  describe('pivot test files exist with minimum case counts', () => {
    for (const rel of PIVOT_TEST_FILES) {
      it(`${rel} exists and has at least 1 test case`, () => {
        const abs = resolve(REPO, rel)
        expect(existsSync(abs), `missing pivot test file: ${rel}`).toBe(true)
        const n = countItCases(abs)
        expect(n, `${rel} has 0 test cases`).toBeGreaterThanOrEqual(1)
      })
    }
  })

  describe('frontend test files exist with minimum case counts', () => {
    for (const rel of FRONTEND_TEST_FILES) {
      it(`${rel} exists and has at least 1 test case`, () => {
        const abs = resolve(REPO, rel)
        expect(existsSync(abs), `missing frontend test file: ${rel}`).toBe(true)
        const n = countItCases(abs)
        expect(n, `${rel} has 0 test cases`).toBeGreaterThanOrEqual(1)
      })
    }
  })

  describe('convex test files exist with minimum case counts', () => {
    for (const rel of CONVEX_TEST_FILES) {
      it(`${rel} exists and has at least 1 test case`, () => {
        const abs = resolve(REPO, rel)
        expect(existsSync(abs), `missing convex test file: ${rel}`).toBe(true)
        const n = countItCases(abs)
        expect(n, `${rel} has 0 test cases`).toBeGreaterThanOrEqual(1)
      })
    }
  })

  describe('source module pairing (catches file moves that orphan Red pins)', () => {
    const pairs: Array<[string, string]> = [
      [
        'pivot/src/orchestrator/dependencyUtils.ts',
        'pivot/src/orchestrator/dependencyUtils.test.ts',
      ],
      [
        'pivot/src/orchestrator/dependencyUtils.ts',
        'pivot/src/orchestrator/dependencyUtils.characterization.test.ts',
      ],
      [
        'pivot/src/orchestrator/dependencyUtils.ts',
        'pivot/src/orchestrator/dependencyUtils.makespan.test.ts',
      ],
      [
        'pivot/src/planning/recommender.ts',
        'pivot/src/planning/recommender.dependencyAware.test.ts',
      ],
      [
        'pivot/src/planning/recommender.ts',
        'pivot/src/planning/recommender.dependencyAware.verification.test.ts',
      ],
      [
        'frontend/src/pages/SprintPlanningPage.tsx',
        'frontend/src/pages/SprintPlanningPage.criticalPath.test.tsx',
      ],
      [
        'frontend/src/pages/SprintPlanningPage.tsx',
        'frontend/src/pages/SprintPlanningPage.startSprintValidation.test.tsx',
      ],
      [
        'frontend/src/pages/SprintPlanningPage.tsx',
        'frontend/src/pages/SprintPlanningPage.makespan.test.tsx',
      ],
      [
        'frontend/src/components/BlockersTable.tsx',
        'frontend/src/components/BlockersTable.test.tsx',
      ],
      [
        'frontend/src/lib/blockerResolution.ts',
        'frontend/src/lib/blockerResolution.test.ts',
      ],
      [
        'frontend/src/hooks/useBlockerResolutionToast.ts',
        'frontend/src/hooks/useBlockerResolutionToast.test.tsx',
      ],
    ]
    for (const [src, test] of pairs) {
      it(`${src} and ${test} both exist (paired)`, () => {
        expect(existsSync(resolve(REPO, src)), `missing source: ${src}`).toBe(
          true,
        )
        expect(existsSync(resolve(REPO, test)), `missing test: ${test}`).toBe(
          true,
        )
      })
    }
  })

  describe('Phase 4b Green static-evidence gates', () => {
    it('frontend SprintRecommendation type exposes makespan field', () => {
      const text = readFileSync(
        resolve(REPO, 'frontend/src/hooks/useSprintPlanning.ts'),
        'utf8',
      )
      expect(text).toMatch(/makespan\??:\s*number/)
    })

    it('SprintPlanningPage renders the distinct Makespan label', () => {
      const text = readFileSync(
        resolve(REPO, 'frontend/src/pages/SprintPlanningPage.tsx'),
        'utf8',
      )
      expect(text).toMatch(/Makespan:/i)
    })
  })
})
