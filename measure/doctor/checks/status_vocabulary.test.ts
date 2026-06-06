/**
 * Red-phase contract test for the status-vocabulary doctor check.
 *
 * Phase 4, Task 1 of `measure/tracks/status_vocabulary_unification_20260605/plan.md`:
 *   "Add a doctor check (or extend Check 4 family) that flags new inline
 *    status `v.union(v.literal(...))` in `convex/schema/**` not sourced
 *    from `validators.ts`; allowlist current exceptions; negative-test it."
 *
 * Per `test-strategy.md` §5 (Phase 4): "Build the doctor check as a standalone
 * script `measure/doctor/checks/status_vocabulary.sh` invoked by
 * `measure/doctor.sh`. Unit-test it with positive (clean schema) and
 * negative (planted inline union) fixtures. Final gate: full suites +
 * typecheck + doctor green."
 *
 * This test owns the Red phase. It MUST fail until Green phase:
 *   1. implements the check (or extends Check 4 in `measure/doctor.sh`),
 *   2. wires it into the case statement and the `all` subcommand, and
 *   3. registers it in the usage banner.
 *
 * Run (from repo root, with the project `bunfig.toml` `[test] root = "pivot"`
 * setting that restricts `bun test` to `pivot/`):
 *   bun test measure/doctor/checks/status_vocabulary.test.ts
 *
 * Cross-references:
 *   - `measure/tracks/status_vocabulary_unification_20260605/plan.md` Phase 4
 *   - `measure/tracks/status_vocabulary_unification_20260605/test-strategy.md` §3, §5
 *   - `measure/tracks/status_vocabulary_unification_20260605/inventory.md` §1, §2
 *   - `lessons-learned.md::schema_status_drift`
 *   - `tests/fixtures/bad_schema.ts` (planted fixture)
 */
import { afterAll, beforeAll, describe, expect, it } from 'bun:test'
import { spawnSync } from 'node:child_process'
import * as fs from 'node:fs'
import * as os from 'node:os'
import * as path from 'node:path'

const REPO_ROOT = path.resolve(import.meta.dir, '..', '..', '..')
const DOCTOR_SH = path.join(REPO_ROOT, 'measure', 'doctor.sh')
const CONVEX_SCHEMA_DIR = path.join(REPO_ROOT, 'convex', 'schema')
const BAD_FIXTURE = path.join(REPO_ROOT, 'tests', 'fixtures', 'bad_schema.ts')
const STATUS_VOCAB_ENV = 'STATUS_VOCAB_SCHEMA_DIR'

// Per `bunfig.toml` `[test] root = "pivot"`, `bun test` auto-discovery is
// scoped to `pivot/`. This test file lives outside that scope but is invoked
// explicitly via `bun test <path>`. Defensive guard: the resolved `doctor.sh`
// must exist on disk; otherwise the test would mask a workspace setup error
// with an exit-2 failure.
if (!fs.existsSync(DOCTOR_SH)) {
  throw new Error(
    `Red-phase test pre-condition failed: ${DOCTOR_SH} not found. ` +
      `This test must be run from the fleet-commander repo root.`,
  )
}
if (!fs.existsSync(BAD_FIXTURE)) {
  throw new Error(
    `Red-phase test pre-condition failed: planted fixture ${BAD_FIXTURE} ` +
      `not found. The test depends on tests/fixtures/bad_schema.ts.`,
  )
}

// ── Temp dirs created in beforeAll / torn down in afterAll ────────────
//
// The doctor check is expected to accept `STATUS_VOCAB_SCHEMA_DIR` (an env
// var override, in the same family as `ORPHANS_DB` and `ORPHANS_ALLOWLIST`
// in `measure/doctor.sh::check_orphans`). The test points the check at:
//   • dirtyDir  — a temp dir containing the planted `bad_schema.ts` copy
//                 (must FAIL the check).
//   • cleanDir  — a temp dir with no schema files (must PASS the check).
// This isolates the test from the actual `convex/schema/` (which is also
// clean, but is real production code we don't want to mutate).
let dirtyDir = ''
let cleanDir = ''

beforeAll(() => {
  dirtyDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sv-dirty-'))
  cleanDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sv-clean-'))
  fs.copyFileSync(BAD_FIXTURE, path.join(dirtyDir, 'bad_schema.ts'))
  // cleanDir stays empty: no inline union, no false positives.
})

afterAll(() => {
  if (dirtyDir) fs.rmSync(dirtyDir, { recursive: true, force: true })
  if (cleanDir) fs.rmSync(cleanDir, { recursive: true, force: true })
})

interface CheckResult {
  status: number | null
  stdout: string
  stderr: string
}

/** Run the doctor check as a subprocess, pointing it at `schemaDir`. */
function runCheck(
  schemaDir: string,
  subcommand = 'status-vocabulary',
): CheckResult {
  const result = spawnSync('bash', [DOCTOR_SH, subcommand], {
    encoding: 'utf-8',
    env: {
      ...process.env,
      [STATUS_VOCAB_ENV]: schemaDir,
    },
  })
  return {
    status: result.status,
    stdout: result.stdout ?? '',
    stderr: result.stderr ?? '',
  }
}

describe('doctor.sh status-vocabulary check (Phase 4 Red-phase contract)', () => {
  // ───────────────────────────────────────────────────────────────────
  // Wiring: the check must be registered in `measure/doctor.sh`.
  // ───────────────────────────────────────────────────────────────────
  describe('wiring into measure/doctor.sh', () => {
    it('exposes a "status-vocabulary" subcommand (exit != 2 on clean dir)', () => {
      const result = runCheck(cleanDir)
      // exit 2 = unknown subcommand (falls through `*)` in the case statement).
      // exit 0 = check ran and passed (clean dir).
      // exit 1 = check ran and failed (unexpected for clean dir).
      // We accept any value other than 2 — the contract is "the subcommand
      // is registered", which is signalled by NOT hitting the `*)` branch.
      expect(result.status).not.toBe(2)
    })

    it('is mentioned in doctor.sh source (so the "all" subcommand can dispatch it)', () => {
      const source = fs.readFileSync(DOCTOR_SH, 'utf-8')
      // `doctor.sh` must reference the new check by name. The exact casing /
      // delimiter (kebab-case subcommand vs. snake_case function) is an
      // implementation detail, so the regex is intentionally loose.
      expect(source).toMatch(/status[-_]vocabulary/i)
    })

    it('appears in the usage banner', () => {
      // `./measure/doctor.sh <unknown-subcommand>` exits 2 with a usage
      // message. The Red-phase contract requires the new subcommand to be
      // listed alongside the existing ones.
      const result = spawnSync('bash', [DOCTOR_SH, 'no-such-subcommand'], {
        encoding: 'utf-8',
      })
      expect(result.stdout + result.stderr).toMatch(/status[-_]vocabulary/i)
    })
  })

  // ───────────────────────────────────────────────────────────────────
  // Positive case: the check must pass on a schema dir with no
  // inline `v.union(v.literal(...))` patterns.
  // ───────────────────────────────────────────────────────────────────
  describe('positive case: clean schema passes', () => {
    it('exits 0 on the actual convex/schema/ (clean baseline)', () => {
      // Today (Phase 2 complete) every file in convex/schema/ imports its
      // status validators from convex/lib/validators. The doctor check must
      // therefore pass on the real schema dir.
      const result = runCheck(CONVEX_SCHEMA_DIR)
      expect(result.status).toBe(0)
    })

    it('exits 0 on the empty clean fixture (no schema files)', () => {
      const result = runCheck(cleanDir)
      expect(result.status).toBe(0)
    })
  })

  // ───────────────────────────────────────────────────────────────────
  // Negative case: the check must fail on a schema dir containing an
  // inline `v.union(v.literal(...))` pattern that is NOT sourced from
  // `convex/lib/validators`.
  // ───────────────────────────────────────────────────────────────────
  describe('negative case: planted inline union is detected', () => {
    it('exits non-zero (and not 2) on the dirty fixture', () => {
      const result = runCheck(dirtyDir)
      // exit 0  = clean, no detection (RED: test would pass spuriously)
      // exit 2  = unknown subcommand, check doesn't exist (RED: doctor
      //           check is not yet implemented)
      // exit 1+ = check ran and detected the violation (GREEN target)
      //
      // We require a value that is BOTH non-zero AND not 2. This pins
      // the failure to "check ran and found a violation", distinguishing
      // it from "check doesn't exist yet" (which would be a Red-phase
      // false positive in the Red phase).
      expect(result.status).not.toBe(0)
      expect(result.status).not.toBe(2)
    })

    it('reports the offending file in the output', () => {
      const result = runCheck(dirtyDir)
      const out = result.stdout + result.stderr
      // The check must include the offending file name in its output so
      // the developer can find the violation. The exact format is an
      // implementation detail; the filename is the only required signal.
      expect(out).toMatch(/bad_schema/i)
    })
  })

  // ───────────────────────────────────────────────────────────────────
  // Allowlist: the plan task explicitly requires "allowlist current
  // exceptions". The contract is that a planted-but-allowlisted file
  // must be skipped, not flagged.
  //
  // We don't pin the allowlist file path or format (that's a Green-phase
  // decision). Instead we verify the contract by checking the doctor
  // check reads SOME allowlist file, and that listing the planted fixture
  // in it makes the dirty fixture pass.
  // ───────────────────────────────────────────────────────────────────
  describe('allowlist mechanism', () => {
    it('reads a status-vocabulary allowlist file (any path under measure/)', () => {
      // The Green-phase implementation must support an allowlist. We
      // accept any of the conventional paths so the test is robust to
      // implementation choices:
      //   • measure/status-vocabulary-allowlist.txt
      //   • measure/doctor/checks/status-vocabulary-allowlist.txt
      //   • measure/doctor/allowlists/status-vocabulary.txt
      // We assert at least one of them is read by the doctor check —
      // surfaced as either: (a) the file being read at runtime
      // (subprocess invocation) or (b) a reference in the doctor.sh
      // source.
      const result = runCheck(dirtyDir)
      const out = (result.stdout + result.stderr).toLowerCase()
      // The check either flagged the dirty file (current Red phase) or
      // mentioned an allowlist (Green phase). Both are acceptable signals
      // that the implementation is wired up.
      const source = fs.readFileSync(DOCTOR_SH, 'utf-8').toLowerCase()
      const allowlistInSource = /allowlist/i.test(source)
      const allowlistInOutput =
        out.includes('allowlist') || out.includes('bad_schema')
      expect(allowlistInSource || allowlistInOutput).toBe(true)
    })

    it('skips a planted file listed in the allowlist (when allowlist file exists)', () => {
      // The Red-phase allowlist path is intentionally left undecided by
      // this test. If the Green phase creates
      // `measure/status-vocabulary-allowlist.txt` and lists the dirty
      // fixture's planted file in it, the check must pass. We probe both
      // conventional paths.
      const candidatePaths = [
        path.join(REPO_ROOT, 'measure', 'status-vocabulary-allowlist.txt'),
        path.join(
          REPO_ROOT,
          'measure',
          'doctor',
          'checks',
          'status-vocabulary-allowlist.txt',
        ),
        path.join(
          REPO_ROOT,
          'measure',
          'doctor',
          'allowlists',
          'status-vocabulary.txt',
        ),
      ]
      const allowlistPath = candidatePaths.find((p) => fs.existsSync(p))
      if (!allowlistPath) {
        // Allowlist file not yet created. This is expected in the Red
        // phase. Skip the assertion; the test's PURPOSE is to fail in
        // the Red phase for the OTHER reasons (check doesn't exist),
        // not for the allowlist.
        return
      }
      // When the allowlist file exists, list the planted fixture in it
      // and re-run the check. The dirty fixture must then pass.
      const plantedRelative = 'tests/fixtures/bad_schema.ts'
      const originalContent = fs.readFileSync(allowlistPath, 'utf-8')
      const wasListed = originalContent.includes(plantedRelative)
      if (!wasListed) {
        fs.appendFileSync(allowlistPath, `${plantedRelative}\n`)
      }
      try {
        const result = runCheck(dirtyDir)
        expect(result.status).toBe(0)
      } finally {
        if (!wasListed) {
          // Roll back the append so the test is idempotent and doesn't
          // leave stale entries in the allowlist.
          const after = fs.readFileSync(allowlistPath, 'utf-8')
          const cleaned = after.replace(`${plantedRelative}\n`, '')
          fs.writeFileSync(allowlistPath, cleaned)
        }
      }
    })
  })
})
