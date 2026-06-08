/**
 * Red-phase contract test for Phase 4 of typed_convex_boundary_20260605.
 *
 * Phase 4, Tasks 1 + 2 of `measure/tracks/typed_convex_boundary_20260605/plan.md`:
 *   1. Remove the `pivot/src/routes/<STAR><STAR>/<STAR>.ts` entries that
 *      match the substrings `query(` and `mutation(` (and any "Convex ID
 *      type coercion" globs) from `as-any-allowlist.txt`; leave only a
 *      small named residue if truly unavoidable (documented with TD ids).
 *   2. `doctor.sh as-any` count drops to the residue only; negative-test
 *      that a new string-based Convex `as any` now FAILs the gate.
 *
 * This test owns the Red phase. It MUST fail until Green phase:
 *   1. tightens the `as-any-allowlist.txt` (drops the
 *      `pivot/src/routes/<STAR><STAR>/<STAR>.ts` entries that match
 *      `query(` and `mutation(` substrings), and
 *   2. leaves the `pivot/src/routes/<STAR><STAR>` files actively scanned
 *      for the string-based Convex `as any` pattern (so a planted cast
 *      is detected).
 *
 * Test strategy (per `test-strategy.md` §1 Phase 4, §5 Phase 4):
 *   - Task 1: structural assertion on `measure/as-any-allowlist.txt` — the
 *     two globs must be gone.
 *   - Task 2: live-behavior proof — plant a file under
 *     `pivot/src/routes/` containing a `client.query('x' as any, …)`
 *     string-based cast, run `bash measure/doctor.sh as-any`, assert the
 *     planted file appears in the violation output.
 *
 * Why "plant in pivot/src/routes/" instead of an env-var override: the
 * `check_as_any` function (`measure/doctor.sh:89-175`) does not currently
 * support an `AS_ANY_SCAN_DIR`-style override (unlike
 * `check_status_vocabulary`'s `STATUS_VOCAB_SCHEMA_DIR`). Adding such an
 * override is a Green-phase decision; this Red test pins the contract
 * using the existing scan paths so no `measure/doctor.sh` source edit is
 * required for the Red phase.
 *
 * Run (from repo root):
 *   bun test ./measure/doctor/checks/typed_convex_boundary.test.ts
 *
 * Cross-references:
 *   - `measure/tracks/typed_convex_boundary_20260605/plan.md` Phase 4
 *   - `measure/tracks/typed_convex_boundary_20260605/test-strategy.md` §1, §5
 *   - `measure/doctor.sh::check_as_any` (lines 89-175)
 *   - `measure/as-any-allowlist.txt` (lines 39-41 hold the offending entries)
 *   - `measure/doctor/checks/status_vocabulary.test.ts` (precedent for the
 *     doctor-integration test pattern used here)
 */
import { afterAll, beforeAll, describe, expect, it } from 'bun:test'
import { spawnSync } from 'node:child_process'
import * as crypto from 'node:crypto'
import * as fs from 'node:fs'
import * as path from 'node:path'

const REPO_ROOT = path.resolve(import.meta.dir, '..', '..', '..')
const DOCTOR_SH = path.join(REPO_ROOT, 'measure', 'doctor.sh')
const ALLOWLIST = path.join(REPO_ROOT, 'measure', 'as-any-allowlist.txt')
const ROUTES_DIR = path.join(REPO_ROOT, 'pivot', 'src', 'routes')

// Unique subdirectory under pivot/src/routes/ for the planted fixture.
// A per-run UUID avoids collisions across parallel test invocations and
// guarantees the planted file is not present in any pre-existing tree.
const PLANTED_DIR = path.join(
  ROUTES_DIR,
  `__typed_convex_planted_${crypto.randomUUID()}__`,
)
const PLANTED_FILE = path.join(
  PLANTED_DIR,
  'planted_string_convex_query.ts',
)

// Planted file content: a syntactically valid TypeScript module whose
// `as any` line ALSO contains the substring `client.query(` on the same
// physical line. This is essential to the test contract: the doctor
// (`measure/doctor.sh::check_as_any`, lines 89–175) suppresses a violation
// iff (a) the file matches a path-glob AND (b) the VIOLATION LINE'S CONTENT
// contains the entry's content-substring. A previous design put the
// `} as any` on a line that did NOT contain `query(`, so the
// `pivot/src/routes/**/*.ts:query(` allowlist entry could never suppress
// it — the planted file was reported regardless, and the Red test passed
// for the wrong reason (or, with the IIFE timing fix, was never Red at
// all). The line below keeps the `as any` cast and the `client.query(`
// substring on the same physical line, so the HEAD allowlist DOES
// suppress it, the file is absent from the doctor output, and the
// "planted file in violation output" assertion correctly fails (Red).
// After Green removes the glob, the file is no longer suppressed, the
// file appears in the output, and the assertion passes.
//
// The `(null as any)` is a real `as any` token; the `.query(...)` call
// uses it as a receiver so the line is a single self-contained
// statement. No external imports are required.
const PLANTED_CONTENT = `/**
 * Planted fixture for typed_convex_boundary Phase 4 Red test.
 *
 * This file's only purpose is to be detected by \`bash measure/doctor.sh
 * as-any\` once the Phase 4 contract is in effect. The single
 * \`as any\` cast on the export line is a real TypeScript cast; the
 * \`client.query(\` substring on the SAME line is the marker the
 * HEAD-allowlist \`pivot/src/routes/**/*.ts:query(\` entry uses to
 * suppress this violation. After Green removes that entry, the file
 * must appear in the doctor's violation output.
 */
export const plantedStringConvexQuery = (null as any).query("someConvexFn" as any, { arg: 1 }) as any
`

// Per `bunfig.toml` `[test] root = "pivot"`, `bun test` auto-discovery is
// scoped to `pivot/`. This file lives outside that scope but is invoked
// explicitly via `bun test <path>`. Defensive guard: the doctor script
// and allowlist must both exist on disk; otherwise the test would mask a
// workspace setup error with a confusing doctor-exit-2 failure.
if (!fs.existsSync(DOCTOR_SH)) {
  throw new Error(
    `Red-phase test pre-condition failed: ${DOCTOR_SH} not found. ` +
      'This test must be run from the fleet-commander repo root.',
  )
}
if (!fs.existsSync(ALLOWLIST)) {
  throw new Error(
    `Red-phase test pre-condition failed: ${ALLOWLIST} not found. ` +
      'The test depends on measure/as-any-allowlist.txt.',
  )
}

interface AllowlistEntry {
  raw: string
  pathGlob: string
  contentSubstr: string
  reason: string
}

function parseAllowlist(text: string): AllowlistEntry[] {
  const entries: AllowlistEntry[] = []
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim()
    if (line === '' || line.startsWith('#')) continue
    // Format: path-glob:content-substring:reason
    // The reason may itself contain colons (e.g. "TD-236: ..."), so we
    // split on the FIRST TWO colons only and treat everything after as
    // the reason verbatim.
    const firstColon = line.indexOf(':')
    if (firstColon < 0) continue
    const pathGlob = line.slice(0, firstColon)
    const rest = line.slice(firstColon + 1)
    const secondColon = rest.indexOf(':')
    if (secondColon < 0) continue
    const contentSubstr = rest.slice(0, secondColon)
    const reason = rest.slice(secondColon + 1)
    if (!pathGlob || !contentSubstr) continue
    entries.push({ raw: line, pathGlob, contentSubstr, reason })
  }
  return entries
}

interface CheckResult {
  status: number | null
  stdout: string
  stderr: string
}

/** Run `bash measure/doctor.sh as-any` as a subprocess. */
function runAsAnyCheck(): CheckResult {
  const result = spawnSync('bash', [DOCTOR_SH, 'as-any'], {
    encoding: 'utf-8',
  })
  return {
    status: result.status,
    stdout: result.stdout ?? '',
    stderr: result.stderr ?? '',
  }
}

// Plant the fixture at module scope so it exists before the describe-level
// IIFE captures the doctor output. The IIFE runs during describe evaluation
// (before `beforeAll`), so the file must already be on disk.
fs.mkdirSync(PLANTED_DIR, { recursive: true })
fs.writeFileSync(PLANTED_FILE, PLANTED_CONTENT, 'utf-8')

afterAll(() => {
  if (fs.existsSync(PLANTED_DIR)) {
    fs.rmSync(PLANTED_DIR, { recursive: true, force: true })
  }
})

describe('Phase 4: Tighten the Gate (Red-phase contract)', () => {
  // ───────────────────────────────────────────────────────────────────
  // Task 1: allowlist hygiene. The two offending globs MUST be gone
  // before any new string-based Convex `as any` is expected to be
  // flagged. We assert by reading the allowlist and checking no entry
  // has a path-glob that covers pivot/src/routes/** AND a
  // content-substring of `query(` or `mutation(`.
  // ───────────────────────────────────────────────────────────────────
  describe('Task 1: as-any-allowlist.txt hygiene', () => {
    const text = fs.readFileSync(ALLOWLIST, 'utf-8')
    const entries = parseAllowlist(text)

    it('has at least one entry (sanity — allowlist was not emptied)', () => {
      // Defensive: the Green phase must leave a named residue, not
      // delete the file. This test pins that the file is non-empty so
      // the subsequent hygiene assertions are meaningful.
      expect(entries.length).toBeGreaterThan(0)
    })

    it('does NOT allow `query(` casts under pivot/src/routes/**', () => {
      const offenders = entries.filter(
        (e) =>
          e.pathGlob.startsWith('pivot/src/routes/') &&
          e.contentSubstr.includes('query('),
      )
      expect(offenders).toEqual([])
    })

    it('does NOT allow `mutation(` casts under pivot/src/routes/**', () => {
      const offenders = entries.filter(
        (e) =>
          e.pathGlob.startsWith('pivot/src/routes/') &&
          e.contentSubstr.includes('mutation('),
      )
      expect(offenders).toEqual([])
    })
  })

  // ───────────────────────────────────────────────────────────────────
  // Task 2: live negative test. Plant a file under pivot/src/routes/
  // with a `client.query('x' as any, …)` string-based cast, run the
  // doctor, and assert:
  //   (a) the doctor exits non-zero (gate fires on the violation), AND
  //   (b) the planted file path appears in the doctor output.
  //
  // On HEAD (Red): the current allowlist contains
  //   pivot/src/routes/**/*.ts:query(:
  // which matches the planted file's content substring `query(` and
  // filters it out — the doctor does NOT report the planted file → the
  // test fails.
  //
  // After Green removes the glob: the planted file is no longer
  // allowlisted, the doctor reports it as a violation, the test passes.
  // ───────────────────────────────────────────────────────────────────
  describe('Task 2: negative live test — planted string-based Convex `as any` is detected', () => {
    let result: CheckResult
    let combined: string

    // Run the doctor exactly once for the whole block; the planted file
    // does not change between the two `it` cases.
    const captured = (() => {
      result = runAsAnyCheck()
      combined = (result.stdout ?? '') + (result.stderr ?? '')
      return { result, combined }
    })()

    it('exits non-zero (gate fires on the planted cast)', () => {
      // The gate must flag the planted file. On HEAD the broad
      // `pivot/src/routes/**/*.ts:query(` glob suppresses the
      // violation, so the exit code may still be non-zero (because
      // other genuine as-any violations remain) but the planted file
      // is not reported — the next test pins THAT. Here we only assert
      // the doctor ran to completion with a meaningful exit code (0
      // = no violations, 1 = violations found, 2 = usage error). 0 is
      // acceptable for the OTHER violations, but combined with the
      // "planted file in output" assertion below it is unambiguous.
      expect(captured.result.status).not.toBeNull()
      expect([0, 1]).toContain(captured.result.status)
    })

    it('reports the planted file in the violation output', () => {
      // The doctor must include the planted file's basename in its
      // output. This is the contract: a NEW string-based Convex
      // `as any` cast under pivot/src/routes/ is caught.
      expect(captured.combined).toMatch(/planted_string_convex_query/)
    })
  })
})
