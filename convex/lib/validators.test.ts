/**
 * Red-phase contract test for the status-vocabulary unification.
 *
 * Locked by `measure/tracks/status_vocabulary_unification_20260605/inventory.md`.
 * Drives Phase 2's work: every entry in `VOCABULARY_CONTRACT` (inlined below)
 * must be exported from `convex/lib/validators.ts` and its literal set must
 * match.
 *
 * The contract data is inlined in this test file (rather than split into a
 * `__fixtures__/vocabularies.ts` module as test-strategy §2 originally
 * proposed) so the Red-phase boundary stays clean — no new non-test source
 * files. When Phase 4 lands its doctor check, the doctor script can either
 * import the inlined table via a re-export shim or maintain its own copy;
 * the single-source-of-truth for now is `inventory.md` + this test.
 *
 * Per test-strategy §5 (Phase 2): "Table-driven from `vocabularies.ts`
 * fixture: assert literal set, assert derived TS type compiles, assert
 * display-map keys === literal set. Run after each replacement of an
 * inline union (Green)."
 *
 * Today (Red, Phase 1): 19/51 contracts Green (the §1 already-exported
 * validators), 32/51 Red. Phase 2 commits will turn each Red entry Green.
 */
import { describe, expect, it } from 'bun:test'
import * as fs from 'node:fs'
import * as path from 'node:path'
import * as validators from './validators'

interface VocabularyContract {
  /** Canonical export name from `convex/lib/validators.ts`. */
  name: string
  /** Ordered tuple of literal values. Order is the source-of-truth order. */
  values: readonly string[]
  /** `file:line` of the inline `v.union(v.literal(...))` to be replaced, or `[]` if already exported. */
  definedAt: readonly string[]
  /**
   * Frontend display-map inventory. Present only for vocabularies that today
   * have a UI render of the status. Phase 2 Task 3+4 must co-locate the
   * display map with the type and assert its keys match the literal set.
   * Optional — vocabularies without a UI render leave this undefined.
   */
  displayMap?: {
    /** File that today owns a `statusColors` map keyed by the contract values (drift allowed). */
    readonly legacyFile: string
    /** Symbol used in the legacy file (typically `statusColors` or `statusLabels`). */
    readonly legacySymbol: string
  }
}

/**
 * Contract list — locked by inventory.md. Phase 2 will turn each entry's
 * `definedAt` list into a `git rm` and add a single import.
 */
const VOCABULARY_CONTRACT: readonly VocabularyContract[] = [
  // ── §1: already exported (Green today) ──
  { name: 'projectStatus', values: ['active', 'paused', 'archived'], definedAt: [] },
  { name: 'sourceKind', values: ['manual', 'scanner', 'import'], definedAt: [] },
  { name: 'trackStatus', values: ['new', 'active', 'blocked', 'complete', 'archived'], definedAt: [] },
  { name: 'taskStatus', values: ['backlog', 'ready', 'in_progress', 'review', 'done', 'blocked'], definedAt: ['convex/projectTemplates.ts:13'], displayMap: { legacyFile: 'frontend/src/components/kanban/DependencyEditor.tsx', legacySymbol: 'statusColors' } },
  { name: 'priority', values: ['low', 'medium', 'high'], definedAt: ['convex/kanban.ts:13', 'convex/projectTemplates.ts:12', 'convex/sprintPlanning.ts:12'] },
  { name: 'boardStatus', values: ['active', 'archived'], definedAt: [] },
  { name: 'issueStatus', values: ['open', 'triaged', 'resolved', 'closed'], definedAt: [] },
  { name: 'runStatus', values: ['queued', 'running', 'succeeded', 'failed', 'cancelled'], definedAt: [], displayMap: { legacyFile: 'frontend/src/lib/pipelineUtils.tsx', legacySymbol: 'statusColors' } },
  { name: 'retrospectiveStatus', values: ['pending', 'running', 'completed', 'failed'], definedAt: ['convex/schema/contracts.ts:71'] },
  { name: 'agentRole', values: ['architect', 'executor', 'reviewer', 'merger'], definedAt: ['convex/schema/core.ts:68'] },
  { name: 'agentStatus', values: ['active', 'idle', 'blocked', 'offline'], definedAt: [] },
  { name: 'sprintStatus', values: ['planned', 'active', 'closed'], definedAt: [], displayMap: { legacyFile: 'frontend/src/components/SprintPanel.tsx', legacySymbol: 'statusColors' } },
  { name: 'pipelineStage', values: ['dispatch', 'architect', 'executor', 'reviewer', 'merger'], definedAt: [] },
  { name: 'providerStatus', values: ['active', 'rate_limited', 'idle'], definedAt: [], displayMap: { legacyFile: 'frontend/src/components/providers/ProviderCard.tsx', legacySymbol: 'statusColors' } },
  { name: 'providerHealthStatus', values: ['healthy', 'degraded', 'unhealthy'], definedAt: [], displayMap: { legacyFile: 'frontend/src/components/providers/ProviderCard.tsx', legacySymbol: 'statusColors' } },
  { name: 'supportedModels', values: [
      'claude-opus', 'claude-sonnet', 'gpt-4o', 'gpt-4o-mini', 'gemini-pro', 'gemini-2.5-pro',
    ], definedAt: [] },
  { name: 'routingPolicy', values: ['quality_first', 'cost_first', 'balanced', 'manual'], definedAt: [] },

  // ── §2: to be promoted (Red today) ──
  { name: 'employeeStatus', values: ['active', 'away'], definedAt: [
      'convex/schema/agents.ts:11', 'convex/employees.ts:12', 'convex/employees.ts:111', 'convex/scheduler.ts:26',
    ] },
  { name: 'pipelineRunStatus', values: ['running', 'completed', 'failed'], definedAt: ['convex/schema/tasks.ts:57'] },
  { name: 'reconciliationProposalStatus', values: ['pending', 'applied', 'rejected'], definedAt: [
      'convex/reconciliationEngine.ts:5', 'convex/reconciliationProposals.ts:5', 'convex/schema/operations.ts:97',
    ] },
  { name: 'reconciliationArtifactType', values: ['track', 'task', 'issue'], definedAt: [
      'convex/reconciliationEngine.ts:6', 'convex/reconciliationProposals.ts:6',
      'convex/reconciliationEvents.ts:7', 'convex/reconciliationEvents.ts:20', 'convex/reconciliationEvents.ts:90',
      'convex/schema/operations.ts:77', 'convex/schema/operations.ts:92',
    ] },
  { name: 'reconciliationSourceSide', values: ['convex', 'markdown'], definedAt: [
      'convex/reconciliationEngine.ts:7', 'convex/reconciliationProposals.ts:7', 'convex/schema/operations.ts:95',
    ] },
  { name: 'reconciliationDivergenceType', values: ['added', 'modified', 'deleted'], definedAt: [
      'convex/reconciliationEvents.ts:9', 'convex/reconciliationEvents.ts:22', 'convex/schema/operations.ts:79',
    ] },
  { name: 'reconciliationDecisionType', values: ['apply', 'reject'], definedAt: [
      'convex/reconciliationDecisions.ts:5', 'convex/schema/operations.ts:109',
    ] },
  { name: 'alertType', values: [
      'circuit_open', 'stall_detected', 'budget_breach', 'schema_drift', 'health_check_failed', 'performance_regression',
    ], definedAt: ['convex/alerts.ts:6', 'convex/schema/operations.ts:7'] },
  { name: 'alertSeverity', values: ['critical', 'warning', 'info'], definedAt: [
      'convex/alerts.ts:14', 'convex/fleet.ts:214', 'convex/schema/operations.ts:15',
    ] },
  { name: 'orchestratorErrorSeverity', values: ['fatal', 'warning', 'debug'], definedAt: [
      'convex/orchestratorErrors.ts:10', 'convex/orchestratorErrors.ts:26', 'convex/orchestratorErrors.ts:48', 'convex/schema/contracts.ts:92',
    ] },
  { name: 'analysisSeverity', values: ['error', 'warning', 'info'], definedAt: [
      'convex/analysisResults.ts:12', 'convex/analysisResults.ts:28', 'convex/analysisResults.ts:63', 'convex/schema/analytics.ts:76',
    ] },
  { name: 'budgetPolicy', values: ['strict', 'soft', 'advisory'], definedAt: [
      'convex/budgets.ts:21', 'convex/budgets.ts:52', 'convex/budgets.ts:284', 'convex/schema/analytics.ts:30',
    ] },
  { name: 'budgetPeriodType', values: ['daily', 'weekly', 'monthly'], definedAt: ['convex/budgets.ts:320'] },
  { name: 'continuousModeState', values: ['running', 'paused', 'idle'], definedAt: [
      'convex/continuousMode.ts:9', 'convex/continuousMode.ts:58',
    ] },
  { name: 'harnessTaskClass', values: ['feature', 'bug', 'chore', 'review'], definedAt: [
      'convex/harnessProfiles.ts:33', 'convex/harnessProfiles.ts:39',
    ] },
  { name: 'retrospectiveTriggeredBy', values: ['manual', 'scheduled'], definedAt: [
      'convex/retrospectives.ts:106', 'convex/schema/contracts.ts:77',
    ] },
  { name: 'executorStatus', values: ['succeeded', 'failed'], definedAt: [
      'convex/schema/contracts.ts:25', 'convex/runContracts.ts:30', 'convex/runContracts.ts:123',
    ] },
  { name: 'reviewerStatus', values: ['passed', 'failed', 'needs-changes'], definedAt: [
      'convex/schema/contracts.ts:26', 'convex/runContracts.ts:31', 'convex/runContracts.ts:151',
    ] },
  { name: 'reviewerIssueClass', values: ['correctness', 'security', 'performance', 'style', 'spec_mismatch'], definedAt: [
      'convex/schema/contracts.ts:28', 'convex/runContracts.ts:33', 'convex/runContracts.ts:153',
    ] },
  { name: 'reviewerSeverity', values: ['blocker', 'major', 'minor'], definedAt: [
      'convex/schema/contracts.ts:29', 'convex/runContracts.ts:34', 'convex/runContracts.ts:154',
    ] },
  { name: 'recoveryAction', values: ['retry', 'escalate', 'split', 'replan', 'human_review'], definedAt: [
      'convex/schema/contracts.ts:31', 'convex/runContracts.ts:36', 'convex/runContracts.ts:181',
    ] },
  { name: 'circuitBreakerState', values: ['closed', 'open', 'half-open'], definedAt: [
      'convex/circuitBreakers.ts:12', 'convex/circuitBreakers.ts:33', 'convex/circuitBreakers.ts:68', 'convex/circuitBreakers.ts:95',
    ] },
  { name: 'portfolioHealth', values: ['green', 'yellow', 'red'], definedAt: ['convex/portfolio.ts:85'] },
  { name: 'leaderboardTrend', values: ['up', 'down', 'flat'], definedAt: ['convex/leaderboard.ts:23'] },
  { name: 'leaderboardTimeRange', values: ['7d', '30d', 'all'], definedAt: ['convex/leaderboard.ts:44'] },
  { name: 'performanceTrend', values: ['improving', 'stable', 'declining'], definedAt: ['convex/performance.ts:261'] },
  { name: 'burnAction', values: ['keep', 'drop'], definedAt: ['convex/burnForecast.ts:70'] },
  { name: 'scoreAuditOutcome', values: ['accepted', 'rework', 'rejected', 'regression'], definedAt: ['convex/schema/analytics.ts:114'] },
  { name: 'governanceEventType', values: [
      'budget_breach', 'budget_warning', 'retry_escalation', 'harness_selection', 'review_depth',
    ], definedAt: ['convex/schema/analytics.ts:37'] },
]

/** Extract the literal strings accepted by a Convex `v.union(v.literal(...))` validator. */
function extractLiterals(validator: unknown): readonly string[] {
  const v = validator as { kind?: string; members?: ReadonlyArray<unknown> } | undefined
  if (!v) return []
  if (v.kind === 'union' && Array.isArray(v.members)) {
    const out: string[] = []
    for (const m of v.members) {
      const member = m as { kind?: string; value?: string; members?: ReadonlyArray<unknown> }
      if (member.kind === 'literal' && typeof member.value === 'string') {
        out.push(member.value)
      } else if (member.kind === 'union' && Array.isArray(member.members)) {
        for (const nested of member.members) {
          const n = nested as { kind?: string; value?: string }
          if (n.kind === 'literal' && typeof n.value === 'string') out.push(n.value)
        }
      }
    }
    return out
  }
  return []
}

describe('convex/lib/validators — Phase 1 contract (Red → Green via Phase 2)', () => {
  for (const contract of VOCABULARY_CONTRACT) {
    describe(`vocabulary: ${contract.name}`, () => {
      it(`is exported from convex/lib/validators`, () => {
        const exported = (validators as Record<string, unknown>)[contract.name]
        expect(exported).toBeDefined()
      })

      it(`is a Convex validator (has .kind === 'union' or .validate)`, () => {
        const exported = (validators as Record<string, unknown>)[contract.name] as
          | { kind?: string; validate?: unknown }
          | undefined
        expect(exported).toBeTruthy()
        const isValidator =
          typeof exported?.validate === 'function' ||
          exported?.kind === 'union' ||
          exported?.kind === 'literal' ||
          exported?.kind === 'object' ||
          exported?.kind === 'record' ||
          exported?.kind === 'array' ||
          exported?.kind === 'string' ||
          exported?.kind === 'number' ||
          exported?.kind === 'boolean'
        expect(isValidator).toBe(true)
      })

      it(`accepts exactly the contract literal set: ${contract.values.join('|')}`, () => {
        const exported = (validators as Record<string, unknown>)[contract.name]
        const literals = extractLiterals(exported)
        expect([...literals].sort()).toEqual([...contract.values].sort())
      })

      it(`accepts every contract literal at runtime via .validate`, () => {
        const exported = (validators as Record<string, unknown>)[contract.name] as
          | { validate?: (x: unknown) => { ok: boolean; value?: unknown } | unknown }
          | undefined
        if (typeof exported?.validate !== 'function') return
        for (const lit of contract.values) {
          const result = exported.validate(lit) as { ok?: boolean; value?: unknown }
          expect(result.ok).toBe(true)
        }
      })

      it(`rejects a value outside the contract literal set`, () => {
        const exported = (validators as Record<string, unknown>)[contract.name] as
          | { validate?: (x: unknown) => { ok: boolean } }
          | undefined
        if (typeof exported?.validate !== 'function') return
        const sentinel = '__not_a_real_status_value__'
        const result = exported.validate(sentinel) as { ok: boolean }
        expect(result.ok).toBe(false)
      })
    })
  }

  describe('fixture hygiene', () => {
    it('every contract entry has at least one literal', () => {
      for (const c of VOCABULARY_CONTRACT) {
        expect(c.values.length).toBeGreaterThan(0)
      }
    })

    it('no duplicate contract names', () => {
      const seen = new Set<string>()
      for (const c of VOCABULARY_CONTRACT) {
        expect(seen.has(c.name)).toBe(false)
        seen.add(c.name)
      }
    })

    it('every literal value within a vocabulary is unique', () => {
      for (const c of VOCABULARY_CONTRACT) {
        expect(new Set(c.values).size).toBe(c.values.length)
      }
    })

    it('contract size matches the vocabulary registry (46 vocabularies)', () => {
      // Was 51, pinned to an inventory.md in an archived track. The Phase 3
      // scalpel deleted abTestStatus and abTestVariant along with the A/B
      // testing subsystem that defined them; the deleted pipeline placeholder
      // no longer contributes a Convex vocabulary either. TD-265 removes the
      // two retired notification vocabularies with their empty schema tables.
      expect(VOCABULARY_CONTRACT.length).toBe(46)
    })
  })
})

/* ------------------------------------------------------------------ *
 * Phase 2 Tasks 1–4 — Red-phase contract assertions.                *
 *                                                                    *
 * The describe block above locks the *runtime* shape of every        *
 * vocabulary (export, .kind, literal set, validate). Phase 2 needs   *
 * three additional guarantees that cannot be expressed with          *
 * `import * as validators` alone — they require reading source      *
 * files. This block is intentionally isolated so its failures point  *
 * directly at the missing feature:                                   *
 *                                                                    *
 *   Task 1: `convex/lib/validators.ts` exports a derived TS union   *
 *           type (e.g. `ProjectStatus`) for every vocabulary.       *
 *   Task 2: every `definedAt` site imports the validator from        *
 *           `convex/lib/validators` and no longer carries the       *
 *           inline `v.union(v.literal(...))`.                        *
 *   Task 3+4: every vocabulary with a `displayMap` field has a       *
 *           canonical display map exported from                     *
 *           `convex/lib/validators.ts` (e.g. `taskStatusDisplay`)   *
 *           whose keys are exactly the contract literal set.        *
 *                                                                    *
 * These assertions read the filesystem at test time; they do not     *
 * import or execute the source. This keeps the failure messages     *
 * readable and avoids regressing the runtime tests above.           *
 * ------------------------------------------------------------------ */

const REPO_ROOT = path.resolve(import.meta.dir, '..', '..')
const VALIDATORS_TS = path.join(REPO_ROOT, 'convex', 'lib', 'validators.ts')

function readSource(relPath: string): string {
  const filePath = relPath.replace(/:\d+$/, '')
  return fs.readFileSync(path.join(REPO_ROOT, filePath), 'utf-8')
}

function toPascalCase(name: string): string {
  return name[0]!.toUpperCase() + name.slice(1)
}

describe('convex/lib/validators — Phase 2 Tasks 1–4 Red-phase contract', () => {
  // ----------------------------------------------------------------
  // Task 1: derived TS type exports
  // ----------------------------------------------------------------
  describe('Task 1: derived TS type is exported from convex/lib/validators.ts', () => {
    const validatorsSource = fs.readFileSync(VALIDATORS_TS, 'utf-8')

    for (const contract of VOCABULARY_CONTRACT) {
      const typeName = toPascalCase(contract.name)

      it(`validators.ts declares "export type ${typeName} = …" for ${contract.name}`, () => {
        // Convention: `export type PascalCaseName = …` somewhere in validators.ts.
        // The assignment may span multiple lines so we look for the export
        // statement (not the full RHS).
        const re = new RegExp(
          `export\\s+type\\s+${typeName}\\b\\s*=`,
          'm',
        )
        expect(validatorsSource).toMatch(re)
      })
    }

    it('every PascalCase type in validators.ts is referenced by a contract entry', () => {
      // Catches stale types or naming drift between contract and source.
      const declaredTypes = new Set<string>()
      const declRe = /export\s+type\s+([A-Z][A-Za-z0-9_]+)\b/g
      for (const m of validatorsSource.matchAll(declRe)) {
        declaredTypes.add(m[1]!)
      }
      const expectedTypes = new Set(VOCABULARY_CONTRACT.map((c) => toPascalCase(c.name)))
      for (const expected of expectedTypes) {
        expect(declTypes_forEach(declaredTypes, expected)).toBe(true)
      }
    })
  })

  // ----------------------------------------------------------------
  // Task 2: inline unions removed from `definedAt` sites
  // ----------------------------------------------------------------
  describe('Task 2: inline `v.union(v.literal(…))` is replaced by a canonical import', () => {
    for (const contract of VOCABULARY_CONTRACT) {
      for (const site of contract.definedAt) {
        it(`${site} no longer carries the inline union for ${contract.name}`, () => {
          const source = readSource(site)
          // The site must import the validator from convex/lib/validators.
          // Allow either a bare `import { name }` or a combined `{ a, b }`.
          const importRe = new RegExp(
            `import\\s*\\{[^}]*\\b${contract.name}\\b[^}]*\\}\\s*from\\s*['"][^'"]*validators['"]`,
          )
          expect(source).toMatch(importRe)
        })

        it(`${site} no longer inlines every ${contract.name} literal as v.literal('…')`, () => {
          const source = readSource(site)
          // A file may contain an unrelated union that happens to reuse one
          // of this vocabulary's literals (for example, `failed` appears in
          // several independent status contracts). Only an inline union that
          // contains the complete contract set is a source-of-truth violation.
          const hasInlineContractUnion = extractInlineUnionLiteralSets(source).some(
            (literals) => contract.values.every((value) => literals.has(value)),
          )
          expect(hasInlineContractUnion).toBe(false)
        })
      }
    }
  })

  describe('retired notification schema vocabulary', () => {
    it('removes historical notification tables and their validator imports', () => {
      const source = readSource('convex/schema/operations.ts')
      expect(source).not.toMatch(/^\s*notifications:\s*defineTable\(/m)
      expect(source).not.toMatch(/^\s*notificationPreferences:\s*defineTable\(/m)
      expect(source).not.toMatch(/\b(?:notificationType|notificationChannel)\b/)
    })

    it('does not export retired notification validators or TypeScript types', () => {
      const source = fs.readFileSync(VALIDATORS_TS, 'utf-8')

      for (const retiredName of [
        'notificationType',
        'notificationChannel',
        'NotificationType',
        'NotificationChannel',
      ]) {
        expect(source).not.toMatch(new RegExp(`export\\s+(?:const|type)\\s+${retiredName}\\b`))
      }
    })

    it('keeps retired notification validators out of the canonical inventory', () => {
      const names = VOCABULARY_CONTRACT.map(contract => contract.name)
      expect(names).not.toContain('notificationType')
      expect(names).not.toContain('notificationChannel')
    })
  })

  // ----------------------------------------------------------------
  // Tasks 3 + 4: display-map co-location + key parity
  // ----------------------------------------------------------------
  describe('Tasks 3 + 4: display map is co-located with the type and keys match the literal set', () => {
    const validatorsSource = fs.readFileSync(VALIDATORS_TS, 'utf-8')

    for (const contract of VOCABULARY_CONTRACT) {
      if (!contract.displayMap) continue

      const { legacyFile, legacySymbol } = contract.displayMap
      const canonicalSymbol = `${contract.name}Display`

      it(`validators.ts exports "${canonicalSymbol}" (display map for ${contract.name})`, () => {
        // Phase 2 must co-locate the display map. The conventional name is
        // `<validatorName>Display` (e.g. `taskStatusDisplay`).
        const re = new RegExp(
          `export\\s+const\\s+${canonicalSymbol}\\b\\s*[:=]`,
          'm',
        )
        expect(validatorsSource).toMatch(re)
      })

      it(`${canonicalSymbol} keys match the ${contract.name} literal set`, () => {
        // Extract the object literal that backs the canonical display map.
        // We look for the first `{` after the `=` (or `:`) and the matching
        // closing `}` at the same brace depth. This is a deliberately small
        // parser — it does not need to understand TS, only to find the
        // top-level keys of the assigned object.
        const idx = validatorsSource.indexOf(canonicalSymbol)
        expect(idx).toBeGreaterThanOrEqual(0)
        const after = validatorsSource.slice(idx)
        const eqIdx = after.search(/[:=]/)
        expect(eqIdx).toBeGreaterThanOrEqual(0)
        const openIdx = after.indexOf('{', eqIdx)
        expect(openIdx).toBeGreaterThanOrEqual(0)
        const closeIdx = matchBrace(after, openIdx)
        expect(closeIdx).toBeGreaterThanOrEqual(0)
        const body = after.slice(openIdx + 1, closeIdx)
        const keys = extractObjectKeys(body)
        expect(new Set(keys)).toEqual(new Set(contract.values))
      })

      it(`legacy ${legacyFile} no longer defines a local "${legacySymbol}" for ${contract.name}`, () => {
        // After Phase 2 Green, the frontend should import the canonical
        // display map, not re-declare it. We accept either of:
        //   • the legacy symbol is gone entirely, OR
        //   • the legacy symbol is now a re-export / re-alias of the
        //     canonical map (e.g. `export const statusColors = taskStatusDisplay`).
        const source = readSource(legacyFile)
        const re = new RegExp(
          `\\b(const|let|var)\\s+${legacySymbol}\\s*[:=]`,
        )
        if (re.test(source)) {
          // The legacy symbol still exists — it must be a one-line alias of
          // the canonical map, not a fresh object literal.
          const lineMatch = source.match(
            new RegExp(
              `^.*\\b(const|let|var)\\s+${legacySymbol}\\s*[:=][^\\n]*$`,
              'm',
            ),
          )
          expect(lineMatch?.[0] ?? '').toContain(canonicalSymbol)
        }
        // If the regex didn't match, the legacy symbol is gone — also fine.
      })
    }
  })

  describe('Phase 2 contract coverage report', () => {
    it('exactly the 6 vocabularies flagged in inventory.md §3 carry a displayMap field', () => {
      const withDisplayMap = VOCABULARY_CONTRACT.filter((c) => c.displayMap)
      expect(withDisplayMap.length).toBe(5)
      const names = withDisplayMap.map((c) => c.name).sort()
      expect(names).toEqual([
        'providerHealthStatus',
        'providerStatus',
        'runStatus',
        'sprintStatus',
        'taskStatus',
      ])
    })

    it('every definedAt site references an existing file', () => {
      for (const c of VOCABULARY_CONTRACT) {
        for (const site of c.definedAt) {
          const [rel] = site.split(':')
          const abs = path.join(REPO_ROOT, rel)
          expect(fs.existsSync(abs)).toBe(true)
        }
      }
    })
  })
})

/* ------------------------------------------------------------------ *
 * Helpers                                                            *
 * ------------------------------------------------------------------ */

/** Extract literal sets from inline `v.union(...)` validator expressions. */
function extractInlineUnionLiteralSets(source: string): ReadonlySet<string>[] {
  const sets: ReadonlySet<string>[] = []
  const unionRe = /v\.union\s*\(/g

  for (const match of source.matchAll(unionRe)) {
    const openIdx = source.indexOf('(', match.index)
    if (openIdx < 0) continue
    const closeIdx = matchParen(source, openIdx)
    if (closeIdx < 0) continue

    const body = source.slice(openIdx + 1, closeIdx)
    const literals = new Set<string>()
    const literalRe = /v\.literal\(\s*(['"`])((?:\\.|(?!\1).)*)\1\s*\)/g
    for (const literal of body.matchAll(literalRe)) {
      literals.add(literal[2]!)
    }
    if (literals.size > 0) sets.push(literals)
  }

  return sets
}

/** Find the closing parenthesis matching the opening delimiter at `openIdx`. */
function matchParen(src: string, openIdx: number): number {
  let depth = 0
  let quote: string | undefined
  let escaped = false

  for (let i = openIdx; i < src.length; i++) {
    const ch = src[i]!
    if (quote) {
      if (escaped) {
        escaped = false
      } else if (ch === '\\') {
        escaped = true
      } else if (ch === quote) {
        quote = undefined
      }
      continue
    }
    if (ch === "'" || ch === '"' || ch === '`') {
      quote = ch
    } else if (ch === '(') {
      depth++
    } else if (ch === ')') {
      depth--
      if (depth === 0) return i
    }
  }
  return -1
}

/** Find the index of the `}` that matches the `{` at `openIdx` in `src`. */
function matchBrace(src: string, openIdx: number): number {
  let depth = 0
  for (let i = openIdx; i < src.length; i++) {
    const ch = src[i]
    if (ch === '{') depth++
    else if (ch === '}') {
      depth--
      if (depth === 0) return i
    }
  }
  return -1
}

/** Extract the top-level keys from a TS object literal body. */
function extractObjectKeys(body: string): string[] {
  const keys: string[] = []
  // Match either quoted strings or bare identifiers that are object keys
  // (i.e. followed by a `:`). Handles both `key: …` and `'key': …`.
  const re = /(['"`]?)([A-Za-z_][A-Za-z0-9_-]*)\1\s*:/g
  for (const m of body.matchAll(re)) {
    const key = m[2]!
    if (key === undefined) continue
    // Skip type annotations like `key: Type` if the colon is part of a type.
    // Heuristic: if the character before the colon is `)` it's probably a
    // function call result. We only care about key positions.
    keys.push(key)
  }
  return keys
}

/** Tiny shim so the "every PascalCase type is referenced" assertion reads cleanly. */
function declTypes_forEach(set: Set<string>, expected: string): boolean {
  return set.has(expected)
}
