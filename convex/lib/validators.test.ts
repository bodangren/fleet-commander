/**
 * Red-phase contract test for the status-vocabulary unification.
 *
 * Locked by `measure/tracks/status_vocabulary_unification_20260605/inventory.md`
 * and `convex/lib/__fixtures__/vocabularies.ts`. Drives Phase 2's work:
 * every entry in `VOCABULARY_CONTRACT` must be exported from
 * `convex/lib/validators.ts` and its literal set must match.
 *
 * Per test-strategy §5 (Phase 2): "Table-driven from `vocabularies.ts`
 * fixture: assert literal set, assert derived TS type compiles, assert
 * display-map keys === literal set. Run after each replacement of an
 * inline union (Green)."
 *
 * Today (Red, Phase 1): 19/51 contracts Green (the §1 already-exported
 * validators), 32/51 Red. Phase 2 commits will turn each Red entry Green.
 *
 * This file is intentionally long: one `it` per vocabulary. Per
 * test-strategy §1 rule: "every literal added to a validator must add
 * **one** unit-test line, not a new test file." Vocabulary coverage is
 * driven by the fixture; adding a vocabulary = adding one fixture entry
 * + adding one `it` block (or letting the dynamic loop in `coverage` catch it).
 */
import { describe, expect, it } from 'bun:test'
import * as validators from './validators'
import { VOCABULARY_CONTRACT } from './__fixtures__/vocabularies'

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

    it('contract size matches inventory.md §1 + §2 expectation (51 vocabularies)', () => {
      expect(VOCABULARY_CONTRACT.length).toBe(51)
    })
  })
})
