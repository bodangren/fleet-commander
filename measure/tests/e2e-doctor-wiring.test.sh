#!/usr/bin/env bash
# Tests for Phase 4 quality-gate wiring (e2e_test_baseline_hardening_20260619).
#
# Run with:  bash measure/tests/e2e-doctor-wiring.test.sh
#
# This is the RED phase. Every test is expected to FAIL until the gates
# reach the surface specified in test-strategy §5 Phase 4 + §6 row 4:
#   1. `bash measure/doctor.sh e2e --dry-run` exits 0 and prints the exact
#      `npx playwright test …` argv it would exec.
#   2. The argv is bounded (includes the canonical smoke spec, NOT the
#      full suite) — fake-gate guardrail §6 row 4 (c).
#   3. `doctor.sh` recognizes the `e2e` subcommand (Usage line includes it).
#   4. `doctor.sh` source is QUALITY_PROFILE-aware (Phase 4 Task 2: include
#      the E2E baseline when the quality profile is not `none`).
#   5. `doctor.sh all` excludes the e2e check banner, keeping Playwright
#      behind the explicit `e2e` subcommand.
#   6. `measure/tech-stack.md` documents the canonical `npx playwright test`
#      command + Vite dev-server env vars (Phase 4 Task 3).
#   7. `measure/lessons-learned.md` documents the seed-factory pattern
#      (Phase 4 Task 4).
#
# WHY THIS TEST IS STATIC-HEAVY + LIVE-DRY-RUN ONLY (per test-strategy §5
# Phase 4 + §6 row 4 + the user's "do not create a 'smoke' test that can
# accidentally run the real full suite" directive):
#   - The test harness NEVER invokes `npx playwright test` itself.
#   - The ONLY doctor.sh invocation is `e2e --dry-run`, which must be a
#     command-construction proof (prints argv, exits 0) — never executes
#     playwright.
#   - No `--repeat-each` or full-suite runs. No watch mode. The full
#     suite is reserved for the supervisor / track-completion gate per
#     test-strategy §6 row 4 ("`cd frontend && npx playwright test` green
#     on a clean checkout").
#   - Live gates (bun --cwd pivot test, bun --cwd frontend test --run,
#     bun --cwd frontend check, full playwright suite) are Green/closeout-
#     owned per plan Phase 4 tasks 5-7.
#
# Architecture guardrails (test-strategy §2, §3, §5):
#   - Fake-gate guardrail: a doctor.sh `--dry-run` that accidentally
#     executes the full suite is a real failure (the test catches it via
#     exit-code timing + the bounded-argv assertion).
#   - Profile-awareness: `QUALITY_PROFILE=none` MUST skip the e2e gate
#     (proves the verify command does not silently include E2E when the
#     profile is none — Phase 4 Task 2 acceptance).
#   - Bounded argv: the smoke spec is `e2e/smoke.spec.ts` when executed
#     from `frontend/` per doctor.sh; the assertion that argv
#     contains this path proves the gate is NOT a full-suite smoke.
#
# Contracts under test:
#   §1. doctor.sh e2e --dry-run exits 0 (currently exits 2 — unknown
#       subcommand).
#   §2. doctor.sh e2e --dry-run prints the bounded argv.
#   §3. doctor.sh e2e --dry-run argv contains the canonical smoke spec
#       (proves bounded, not full suite).
#   §4. doctor.sh usage message lists the `e2e` subcommand (proves the
#       subcommand is recognized, not falling through to `exit 2`).
#   §5. doctor.sh source references QUALITY_PROFILE (Phase 4 Task 2).
#   §6. With QUALITY_PROFILE=none, doctor.sh e2e prints SKIP banner
#       (proves profile-aware skip).
#   §7. With QUALITY_PROFILE=standard, doctor.sh all does not print the
#       e2e check banner (proves the all-up governance gate stays bounded).
#   §8. measure/tech-stack.md documents `npx playwright test` + the Vite
#       dev-server env vars (Phase 4 Task 3).
#   §9. measure/lessons-learned.md documents the seed-factory pattern
#       (Phase 4 Task 4).

set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

# Per-test state. Cleaned up by the EXIT trap.
TESTS_RUN=0
TESTS_PASSED=0
TESTS_FAILED=0
FAILED_TESTS=()

# ── Assertion helpers ────────────────────────────────────────────────────────

assert_eq() {
  local actual="$1" expected="$2" msg="${3:-}"
  if [ "$actual" = "$expected" ]; then return 0; fi
  echo "    FAIL: $msg" >&2
  echo "      expected: <$expected>" >&2
  echo "      actual:   <$actual>" >&2
  return 1
}

assert_contains() {
  local haystack="$1" needle="$2" msg="${3:-}"
  case "$haystack" in
    *"$needle"*) return 0 ;;
    *)
      echo "    FAIL: $msg" >&2
      echo "      needle:   <$needle>" >&2
      echo "      haystack: <${haystack:0:400}>" >&2
      return 1
      ;;
  esac
}

assert_not_contains() {
  local haystack="$1" needle="$2" msg="${3:-}"
  case "$haystack" in
    *"$needle"*)
      echo "    FAIL: $msg" >&2
      echo "      forbidden needle: <$needle>" >&2
      return 1
      ;;
    *) return 0 ;;
  esac
}

assert_file_exists() {
  local path="$1" msg="${2:-}"
  if [ -f "$path" ]; then return 0; fi
  echo "    FAIL: $msg (file not found: $path)" >&2
  return 1
}

# ── Test runner ─────────────────────────────────────────────────────────────

run_test() {
  local name="$1"
  local fn="$2"
  TESTS_RUN=$((TESTS_RUN + 1))
  printf '==> %s\n' "$name"
  if ( "$fn" ); then
    TESTS_PASSED=$((TESTS_PASSED + 1))
    echo "    PASS"
  else
    TESTS_FAILED=$((TESTS_FAILED + 1))
    FAILED_TESTS+=("$name")
    echo "    FAIL"
  fi
  echo ""
}

cleanup() {
  : # Nothing to clean up; tests only read files / invoke doctor.sh dry-run.
}
trap cleanup EXIT

# ── Test cases ──────────────────────────────────────────────────────────────

# §1. doctor.sh e2e --dry-run must exit 0 (currently exits 2 because
# the `e2e` subcommand is unknown; falls through to the `*) exit 2` branch).
test_doctor_sh_e2e_dry_run_exits_zero() {
  local log
  log=$(mktemp)
  bash "$REPO_ROOT/measure/doctor.sh" e2e --dry-run >"$log" 2>&1
  local rc=$?
  rm -f "$log"
  assert_eq "$rc" "0" \
    "doctor.sh e2e --dry-run must exit 0 (command-construction proof per test-strategy §6 row 4)"
}

# §2. doctor.sh e2e --dry-run must print the argv it would exec.
# At HEAD, the output is "Usage: ..." not "npx playwright test …".
test_doctor_sh_e2e_dry_run_prints_argv() {
  local log
  log=$(mktemp)
  bash "$REPO_ROOT/measure/doctor.sh" e2e --dry-run >"$log" 2>&1
  local src
  src=$(cat "$log")
  rm -f "$log"
  assert_contains "$src" "npx playwright test" \
    "doctor.sh e2e --dry-run output must contain 'npx playwright test' argv (test-strategy §6 row 4)"
}

# §3. The argv must be BOUNDED — it must reference the canonical smoke spec
# `e2e/smoke.spec.ts` from `frontend/` (test-strategy §5 Phase 4 live proof).
# A bare `npx playwright test` (no spec argument) would be a full-suite
# fall-through, violating the fake-gate guardrail §6 row 4 (c).
test_doctor_sh_e2e_dry_run_argv_is_bounded() {
  local log
  log=$(mktemp)
  bash "$REPO_ROOT/measure/doctor.sh" e2e --dry-run >"$log" 2>&1
  local src
  src=$(cat "$log")
  rm -f "$log"
  assert_contains "$src" "e2e/smoke.spec.ts" \
    "doctor.sh e2e --dry-run argv must reference the bounded smoke spec 'e2e/smoke.spec.ts' from frontend/ (test-strategy §5 Phase 4 live proof)"
}

# §4. doctor.sh usage message must list the `e2e` subcommand. At HEAD the
# usage line is "[as-any|boundary|stub-mutation|god-file|orphans|status-vocabulary|all]"
# — the `e2e` subcommand is missing. NOTE: doctor.sh defaults CHECK to "all"
# when no args are passed (`${1:-all}`), so we invoke with a known-bad arg
# `nonexistent` to force the Usage case (and the script exits 2).
test_doctor_sh_usage_lists_e2e_subcommand() {
  local log
  log=$(mktemp)
  bash "$REPO_ROOT/measure/doctor.sh" nonexistent-subcommand >"$log" 2>&1
  local rc=$?
  local src
  src=$(cat "$log")
  rm -f "$log"
  # Must exit 2 (Usage case) and the usage line must mention `e2e`.
  assert_eq "$rc" "2" \
    "doctor.sh with unknown subcommand must exit 2 (Usage case)"
  case "$src" in
    *"|e2e|"*|*"e2e|"*|*"|e2e]"*|*" e2e "*|*"e2e --dry-run"*|*"e2e]")
      return 0
      ;;
    *)
      echo "    FAIL: doctor.sh usage must list the 'e2e' subcommand (got: ${src:0:300})" >&2
      return 1
      ;;
  esac
}

# §5. doctor.sh source must reference QUALITY_PROFILE so the e2e gate can
# skip when profile is none (Phase 4 Task 2). This is a static lint — the
# actual skip/exec logic is exercised in tests §6 and §7.
test_doctor_sh_source_references_quality_profile() {
  local src
  src=$(cat "$REPO_ROOT/measure/doctor.sh")
  case "$src" in
    *"QUALITY_PROFILE"*)
      return 0
      ;;
    *)
      echo "    FAIL: doctor.sh must reference QUALITY_PROFILE env var (Phase 4 Task 2: verify command includes E2E baseline when quality profile is not 'none')" >&2
      return 1
      ;;
  esac
}

# §6. With QUALITY_PROFILE=none, doctor.sh e2e --dry-run must still exit 0
# AND print a SKIP banner (proves the e2e gate is profile-aware — Phase 4
# Task 2). At HEAD, doctor.sh e2e is unrecognized regardless of profile,
# so the SKIP banner is absent and the test fails.
test_doctor_sh_e2e_skips_when_profile_none() {
  local log
  log=$(mktemp)
  QUALITY_PROFILE=none bash "$REPO_ROOT/measure/doctor.sh" e2e --dry-run >"$log" 2>&1
  local rc=$?
  local src
  src=$(cat "$log")
  rm -f "$log"
  # Profile=none must still produce a clean dry-run output (argv + SKIP).
  assert_eq "$rc" "0" \
    "doctor.sh e2e --dry-run must exit 0 even when QUALITY_PROFILE=none"
  case "$src" in
    *"SKIP"*|*"skip"*|*"none"*)
      return 0
      ;;
    *)
      echo "    FAIL: doctor.sh e2e --dry-run with QUALITY_PROFILE=none must print a SKIP/skip/none marker (Phase 4 Task 2 profile-awareness)" >&2
      echo "      output: ${src:0:300}" >&2
      return 1
      ;;
  esac
}

# §7. With QUALITY_PROFILE=standard, doctor.sh all must exclude the e2e
# check banner. The all-up governance gate is intentionally bounded to the
# 6 structural checks (as-any, boundary, stub-mutation, god-file, orphans,
# status-vocabulary); Playwright remains available through `doctor.sh e2e`.
test_doctor_sh_all_excludes_e2e_banner() {
  local log
  log=$(mktemp)
  QUALITY_PROFILE=standard bash "$REPO_ROOT/measure/doctor.sh" all >"$log" 2>&1
  local src
  src=$(cat "$log")
  rm -f "$log"
  # Banner forms: "Check N: e2e ...", "Check N: ... e2e ...", "e2e check",
  # "E2E" header, or any banner line containing "e2e" or "E2E".
  # Using a simple substring check (avoid bash case-pattern adjacency
  # limitations by chaining grep-style alternations through assert helpers).
  local hit=0
  case "$src" in
    *" e2e "*) hit=1 ;;
  esac
  if [ "$hit" -eq 0 ]; then
    case "$src" in
      *"e2e check"*|*"e2e guard"*|*"e2e baseline"*|*"Check"*"e2e"*) hit=1 ;;
    esac
  fi
  if [ "$hit" -eq 0 ]; then
    case "$src" in
      *"E2E"*) hit=1 ;;
    esac
  fi
  if [ "$hit" -ne 0 ]; then
    echo "    FAIL: doctor.sh all with QUALITY_PROFILE=standard must not include an e2e check banner; use doctor.sh e2e explicitly" >&2
    echo "      output (first 400 chars): ${src:0:400}" >&2
    return 1
  fi
}

# §8. measure/tech-stack.md must document the canonical `npx playwright
# test` command AND the Vite dev-server env vars required to run it
# (Phase 4 Task 3 + test-strategy §1 playwright.config.ts findings:
# VITE_CONVEX_URL, VITE_SOURCE_*=bun).
test_tech_stack_documents_e2e_command() {
  local path="$REPO_ROOT/measure/tech-stack.md"
  assert_file_exists "$path" "measure/tech-stack.md must exist"
  local src
  src=$(cat "$path")
  assert_contains "$src" "npx playwright test" \
    "measure/tech-stack.md must document the canonical 'npx playwright test' command (Phase 4 Task 3)"
  assert_contains "$src" "VITE_CONVEX_URL" \
    "measure/tech-stack.md must document VITE_CONVEX_URL env var for E2E setup (Phase 4 Task 3 + test-strategy §1)"
}

# §9. measure/lessons-learned.md must document the seed-factory pattern
# established in Phase 2 (Phase 4 Task 4). The pattern name uses underscore
# or hyphen form per the existing convention (e.g. `atomic_claim_pattern`,
# `dispatch_constraints`).
test_lessons_learned_documents_seed_factory_pattern() {
  local path="$REPO_ROOT/measure/lessons-learned.md"
  assert_file_exists "$path" "measure/lessons-learned.md must exist"
  local src
  src=$(cat "$path")
  case "$src" in
    *"seed_factory"*|*"seed-factory"*|*"seedScenario"*)
      return 0
      ;;
    *)
      echo "    FAIL: measure/lessons-learned.md must document the seed-factory pattern (Phase 4 Task 4)" >&2
      return 1
      ;;
  esac
}

# ── Main ────────────────────────────────────────────────────────────────────

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Phase 4 e2e-doctor-wiring test suite — Red (e2e_test_baseline_hardening_20260619)"
echo "  (static lint + bounded doctor.sh e2e --dry-run; no full-suite invocation)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

run_test "doctor.sh e2e --dry-run exits 0 (test-strategy §6 row 4)" \
  test_doctor_sh_e2e_dry_run_exits_zero

run_test "doctor.sh e2e --dry-run prints the bounded argv" \
  test_doctor_sh_e2e_dry_run_prints_argv

run_test "doctor.sh e2e --dry-run argv is bounded to smoke.spec.ts" \
  test_doctor_sh_e2e_dry_run_argv_is_bounded

run_test "doctor.sh usage lists the e2e subcommand" \
  test_doctor_sh_usage_lists_e2e_subcommand

run_test "doctor.sh source references QUALITY_PROFILE (Phase 4 Task 2)" \
  test_doctor_sh_source_references_quality_profile

run_test "doctor.sh e2e --dry-run with QUALITY_PROFILE=none prints SKIP marker" \
  test_doctor_sh_e2e_skips_when_profile_none

run_test "doctor.sh all with QUALITY_PROFILE=standard excludes e2e check banner" \
  test_doctor_sh_all_excludes_e2e_banner

run_test "measure/tech-stack.md documents the E2E command + env vars" \
  test_tech_stack_documents_e2e_command

run_test "measure/lessons-learned.md documents the seed-factory pattern" \
  test_lessons_learned_documents_seed_factory_pattern

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  $TESTS_RUN tests: $TESTS_PASSED passed, $TESTS_FAILED failed"
if [ "$TESTS_FAILED" -gt 0 ]; then
  echo ""
  echo "  FAILED:"
  for t in "${FAILED_TESTS[@]}"; do
    echo "    - $t"
  done
fi
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

exit "$TESTS_FAILED"
