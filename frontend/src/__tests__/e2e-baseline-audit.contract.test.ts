/**
 * Phase 1 Red — contract test for the e2e baseline audit artifact.
 *
 * Spec:           measure/tracks/e2e_test_baseline_hardening_20260619/spec.md (AC 1, 5)
 * Plan:           measure/tracks/e2e_test_baseline_hardening_20260619/plan.md (Phase 1, task 2)
 * Test strategy:  measure/tracks/e2e_test_baseline_hardening_20260619/test-strategy.md
 *                 (§5 Phase 1: "Contract test (artifact): ... parses the JSON artifact
 *                  and asserts known-failure IDs, classification field, and TD pointer";
 *                  §6 Phase 1 Red: `bun --cwd frontend test --run e2e/scripts/e2e-baseline-audit.test.ts`
 *                  — Red: artifact missing/malformed)
 *
 * Why this file exists:
 *
 *   Phase 1 ships TWO artifacts (test-strategy §5 + §6):
 *     (a) this contract test in Vitest, validating the on-disk shape of
 *         `measure/tracks/e2e_test_baseline_hardening_20260619/baseline.json`.
 *     (b) the `baseline.json` artifact itself, produced by the live
 *         `npx playwright test --reporter=json` invocation that
 *         Green-owned Phase 1 task 1 captures under the track dir.
 *
 *   The two gates are paired (test-strategy §4 "fake-harness policy" + §6
 *   "live-proof plan"): the contract test alone cannot prove the live
 *   playwright run completed, and the raw JSON alone cannot prove its
 *   shape matches the spec. Both are required; neither replaces the other.
 *
 *   Per test-strategy §6: "Phase 1's audit test ... is an artifact/
 *   documentation contract — it proves shape, not behavior. Phase 1
 *   (Playwright JSON capture) ... provides live behavior proof."
 *
 * Red signal (expected failures at HEAD):
 *
 *   All tests fail because `baseline.json` does not exist on disk at HEAD
 *   (the Phase 1 Implement sub-task is the Green-owned step that creates
 *   it). The `existsSync` check fails on test 1, and every subsequent
 *   `readFileSync` throws `ENOENT`. After Green captures the playwright
 *   JSON output and enriches it with the spec-pinned schema (captured_at,
 *   summary, failures[] with id/file/title/classification/td_pointer), every
 *   test passes.
 *
 * Live-behaviour pairing:
 *
 *   Static side: this file enforces the on-disk shape so downstream
 *   phases (Phase 2 seed factory, Phase 3 spec stabilization, Phase 4
 *   doctor wiring) can read a known schema and route failures to the
 *   correct remediation track.
 *
 *   Live side: Phase 1 task 1 invokes `npx playwright test --reporter=json`
 *   against the running `npm run dev` stack (mock data adapter path per
 *   `frontend/playwright.config.ts:22`). The captured JSON is reshaped into
 *   `baseline.json` with the classification taxonomy below; if the
 *   `failures` array is missing or the `td_pointer` field is absent, this
 *   test fails on the corresponding assertion and the live capture is
 *   rejected.
 *
 * Anchoring (failure sources, frozen for traceability):
 *
 *   - 27 spec files: `frontend/e2e/*.spec.ts` (live `ls frontend/e2e/*.spec.ts | wc -l`).
 *   - 5 classification values: test-strategy §4 (adapter-mock-drift,
 *     selector-drift, race, stale-selector, genuine-regression).
 *   - TD pointer format: test-strategy §4 "TD-250 swap" — classified items
 *     replace TD-250 with TD-250a/b/c/... entries.
 */
import { describe, expect, it } from 'vitest'
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { join, resolve } from 'node:path'

const REPO_ROOT = resolve(__dirname, '../../..')
const BASELINE_JSON_PATH = join(
  REPO_ROOT,
  'measure/tracks/e2e_test_baseline_hardening_20260619/baseline.json',
)
const E2E_DIR = join(REPO_ROOT, 'frontend/e2e')

/**
 * Valid classification values per test-strategy §4. Frozen here so a future
 * GREEN cannot satisfy the contract with arbitrary labels (e.g.
 * `["flaky", "broken", "wip"]`).
 */
const VALID_CLASSIFICATIONS = [
  'adapter-mock-drift',
  'selector-drift',
  'race',
  'stale-selector',
  'genuine-regression',
] as const

type Classification = (typeof VALID_CLASSIFICATIONS)[number]

/**
 * Predicate guarding the minimum shape of a baseline failure entry.
 * Runtime guard because TypeScript types are erased before Vitest runs.
 */
interface BaselineFailure {
  id: string
  file: string
  title: string
  classification: Classification
  td_pointer: string
}

interface BaselineSummary {
  total: number
  passed: number
  failed: number
  byClassification: Record<Classification, number>
}

interface Baseline {
  captured_at: string
  summary: BaselineSummary
  failures: BaselineFailure[]
}

function readBaseline(): Baseline {
  const raw = readFileSync(BASELINE_JSON_PATH, 'utf8')
  return JSON.parse(raw) as Baseline
}

/**
 * Live `ls frontend/e2e/*.spec.ts` for the known-spec contract. Mirrors the
 * inventory captured in test-strategy §1 (28 specs noted; 27 `.spec.ts` files
 * after `ls` correction). Anchors the `failures[i].file` field to the
 * real e2e directory — if a future change adds a 28th spec, this test fails
 * and forces a deliberate spec inventory update.
 */
function liveSpecFilenames(): Set<string> {
  return new Set(
    readdirSync(E2E_DIR)
      .filter(name => name.endsWith('.spec.ts'))
      .sort(),
  )
}

describe('Phase 1 e2e-baseline.json contract — Audit Baseline Failures', () => {
  it('baseline.json exists on disk at the track directory', () => {
    // Red signal at HEAD: baseline.json does not exist yet (Phase 1
    // task 1 is Green-owned). After GREEN captures the playwright JSON
    // output and writes it to the track dir, this assertion passes.
    expect(existsSync(BASELINE_JSON_PATH)).toBe(true)
  })

  it('baseline.json parses as JSON with `captured_at`, `summary`, and `failures` keys', () => {
    const baseline = readBaseline()
    expect(typeof baseline.captured_at).toBe('string')
    expect(baseline.captured_at.length).toBeGreaterThan(0)
    expect(typeof baseline.summary).toBe('object')
    expect(baseline.summary).not.toBeNull()
    expect(Array.isArray(baseline.failures)).toBe(true)
  })

  it('captured_at is a parseable ISO 8601 timestamp', () => {
    const baseline = readBaseline()
    const epoch = Date.parse(baseline.captured_at)
    // Date.parse returns NaN for invalid strings; Number.isNaN guards
    // against silent parse failures on malformed input.
    expect(Number.isNaN(epoch)).toBe(false)
  })

  it('summary contains total, passed, failed, and byClassification fields', () => {
    const baseline = readBaseline()
    expect(Number.isInteger(baseline.summary.total)).toBe(true)
    expect(Number.isInteger(baseline.summary.passed)).toBe(true)
    expect(Number.isInteger(baseline.summary.failed)).toBe(true)
    expect(typeof baseline.summary.byClassification).toBe('object')
    expect(baseline.summary.byClassification).not.toBeNull()
  })

  it('summary counts are non-negative', () => {
    const baseline = readBaseline()
    expect(baseline.summary.total).toBeGreaterThanOrEqual(0)
    expect(baseline.summary.passed).toBeGreaterThanOrEqual(0)
    expect(baseline.summary.failed).toBeGreaterThanOrEqual(0)
  })

  it(`byClassification contains all ${VALID_CLASSIFICATIONS.length} classification keys with non-negative integer counts`, () => {
    // Closes the "partial classification" cheat path: a GREEN that emits
    // only `byClassification: { "race": 3 }` would satisfy the
    // "is an object" contract but skip the taxonomy the test-strategy
    // §4 prescribes. Anchoring to the literal key set forces the audit
    // to classify every failure into one of the five buckets.
    const baseline = readBaseline()
    const cls = baseline.summary.byClassification
    for (const key of VALID_CLASSIFICATIONS) {
      expect(cls[key]).toBeDefined()
      expect(Number.isInteger(cls[key])).toBe(true)
      expect(cls[key]).toBeGreaterThanOrEqual(0)
    }
  })

  it('summary.failed equals the sum of byClassification counts', () => {
    // Cross-field invariant: if byClassification totals 7 but failed
    // claims 8, the audit under-classified one failure. This test
    // catches miscounts before Phase 2/3 route failures to the wrong
    // remediation track.
    const baseline = readBaseline()
    const sum = VALID_CLASSIFICATIONS.reduce(
      (acc, key) => acc + (baseline.summary.byClassification[key] ?? 0),
      0,
    )
    expect(baseline.summary.failed).toBe(sum)
  })

  it('summary.passed + summary.failed equals summary.total', () => {
    const baseline = readBaseline()
    expect(baseline.summary.passed + baseline.summary.failed).toBe(baseline.summary.total)
  })

  it('failures array length equals summary.failed', () => {
    // Structural invariant: every failed test must appear in the
    // failures array (so per-failure fields like td_pointer can be
    // consumed by downstream phases). Catches under-reporting where
    // the summary counts failures but the array is shorter.
    const baseline = readBaseline()
    expect(baseline.failures.length).toBe(baseline.summary.failed)
  })

  it('every failure has a non-empty `id` (known-failure ID contract)', () => {
    // "known-failure IDs" per test-strategy §5: each failure must
    // carry a stable, non-empty identifier. Format is free (spec
    // file + test title, UUID, etc.) but the field must exist and
    // be non-empty so downstream phases can reference failures
    // without parsing the title string.
    const baseline = readBaseline()
    const offenders = baseline.failures
      .map((failure, index) => ({ index, id: failure.id }))
      .filter(({ id }) => typeof id !== 'string' || id.length === 0)
    expect(offenders).toEqual([])
  })

  it('every failure id is unique within the failures array', () => {
    const baseline = readBaseline()
    const ids = baseline.failures.map(f => f.id)
    const uniqueIds = new Set(ids)
    expect(uniqueIds.size).toBe(ids.length)
  })

  it('every failure has a non-empty `file` string matching a known spec filename', () => {
    // Anchors the audit to the real e2e directory: a GREEN that emits
    // `file: "unknown.spec.ts"` would pass the "is a string" check
    // but skip the live spec inventory. Cross-references
    // `frontend/e2e/*.spec.ts` via `liveSpecFilenames()`.
    const baseline = readBaseline()
    const known = liveSpecFilenames()
    const offenders = baseline.failures
      .map((failure, index) => ({ index, file: failure.file }))
      .filter(({ file }) => typeof file !== 'string' || !known.has(file))
    expect(offenders).toEqual([])
  })

  it('every failure has a non-empty `title` string', () => {
    const baseline = readBaseline()
    const offenders = baseline.failures
      .map((failure, index) => ({ index, title: failure.title }))
      .filter(({ title }) => typeof title !== 'string' || title.length === 0)
    expect(offenders).toEqual([])
  })

  it(`every failure classification is one of the ${VALID_CLASSIFICATIONS.length} valid values`, () => {
    // Closes the "free-text classification" cheat path: a GREEN that
    // emits `classification: "flaky"` or `classification: "unknown"`
    // would defeat the test-strategy §4 routing logic (Phase 2 only
    // addresses adapter-mock-drift; the others are routed to Phase 3).
    const baseline = readBaseline()
    const valid = new Set<string>(VALID_CLASSIFICATIONS)
    const offenders = baseline.failures
      .map((failure, index) => ({ index, classification: failure.classification }))
      .filter(({ classification }) => !valid.has(classification))
    expect(offenders).toEqual([])
  })

  it('every failure has a non-empty `td_pointer` matching the TD-XXX[a-z] format', () => {
    // Spec AC 3 + test-strategy §4 "TD-250 swap": every classified
    // failure must link to a tech-debt entry. The pointer format
    // anchors to the `TD-\d+[a-z]*` pattern so Phase 2/3 can
    // cross-reference tech-debt.md by ID.
    const baseline = readBaseline()
    const tdPattern = /^TD-\d+[a-z]*$/
    const offenders = baseline.failures
      .map((failure, index) => ({ index, td_pointer: failure.td_pointer }))
      .filter(({ td_pointer }) => typeof td_pointer !== 'string' || !tdPattern.test(td_pointer))
    expect(offenders).toEqual([])
  })
})
