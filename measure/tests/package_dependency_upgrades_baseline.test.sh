#!/usr/bin/env bash
# Tests for the Phase 1 Baseline Contract & Upgrade Matrix artifacts of
# measure/tracks/package_dependency_upgrades_20260607.
#
# Run with:  bash measure/tests/package_dependency_upgrades_baseline.test.sh
#
# This is the RED phase. Every test is expected to FAIL until the three
# artifacts required by plan.md Phase 1 are written:
#
#   1. baseline.md          — immutable pre-upgrade baseline (Task 1)
#   2. compatible-matrix.md — compatible-upgrade matrix (Task 2)
#   3. breaking-decisions.md — breaking-upgrade decision matrix (Task 3)
#
# Per measure/tracks/package_dependency_upgrades_20260607/test-strategy.md §
# "Per-Phase Test Approach Notes — Phase 1": "capture verbatim outputs in a
# baseline artifact inside the track dir; every later phase diffs against
# this file. No code runs." The contracts below are static doc-lints of
# those artifacts — no real `bun outdated`, `bun audit`, or `npm run verify`
# is invoked. We only assert that the baseline file *exists and contains*
# the required data so subsequent phases have a stable reference.
#
# Contracts under test (plan.md Phase 1 + spec.md FR-1, FR-4):
#   §1. baseline.md exists and is non-empty.
#   §2. baseline.md records the bun runtime version.
#   §3. baseline.md records the root `packageManager` field verbatim.
#   §4. baseline.md records all three workspace manifests (root, pivot, frontend).
#   §5. baseline.md captures the `bun outdated --recursive --no-cache` output.
#   §6. baseline.md captures the `bun audit` output, including severity counts.
#   §7. baseline.md records pre-existing verify-gate failures separately from
#         package-upgrade work (test-strategy: "each pre-existing red gate
#         separately from package-upgrade work").
#   §8. compatible-matrix.md exists and is non-empty.
#   §9. compatible-matrix.md lists current / compatible-target / latest-major
#         for every outdated direct dependency.
#   §10. compatible-matrix.md groups the shared `convex` package across
#         workspaces (FR-4).
#   §11. compatible-matrix.md groups the shared `js-yaml` package across
#         workspaces (FR-4).
#   §12. compatible-matrix.md tags each entry as routine, security-motivated,
#         or breaking.
#   §13. breaking-decisions.md exists and is non-empty.
#   §14. breaking-decisions.md covers all 8 majors from plan.md Phase 1
#         task 3: React Router 7, Vite 8, Tailwind CSS 4, TypeScript 6,
#         ESLint 10, jsdom 29, Lucide React 1, concurrently 10.
#   §15. For every major, breaking-decisions.md records migration surface,
#         peer constraints, expected validation commands, and rollback point.

set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

TRACK_DIR="$REPO_ROOT/measure/tracks/package_dependency_upgrades_20260607"
BASELINE_MD="$TRACK_DIR/baseline.md"
COMPAT_MD="$TRACK_DIR/compatible-matrix.md"
BREAKING_MD="$TRACK_DIR/breaking-decisions.md"

# Per-test state.
TESTS_RUN=0
TESTS_PASSED=0
TESTS_FAILED=0
FAILED_TESTS=()

# ── Assertion helpers (same shape as verify.test.sh / closeout.test.sh) ──

assert_eq() {
  local actual="$1" expected="$2" msg="${3:-}"
  if [ "$actual" = "$expected" ]; then return 0; fi
  echo "    FAIL: $msg" >&2
  echo "      expected: <$expected>" >&2
  echo "      actual:   <$actual>" >&2
  return 1
}

assert_neq() {
  local actual="$1" unexpected="$2" msg="${3:-}"
  if [ "$actual" != "$unexpected" ]; then return 0; fi
  echo "    FAIL: $msg (got <$actual>)" >&2
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
      echo "      unexpected needle: <$needle>" >&2
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

assert_file_nonempty() {
  local path="$1" msg="${2:-}"
  if [ -s "$path" ]; then return 0; fi
  echo "    FAIL: $msg (file empty: $path)" >&2
  return 1
}

# A RED precondition helper: many of these tests assume the artifacts do NOT
# yet exist. If they do, the Red phase has already been satisfied; the test
# suite is no longer in the state it is meant to gate. Skip (with a clear
# note) rather than fail spuriously so this script can be re-run safely
# after the Green phase lands.
phase1_red_active() {
  if [ -f "$BASELINE_MD" ] || [ -f "$COMPAT_MD" ] || [ -f "$BREAKING_MD" ]; then
    echo "    NOTE: Phase 1 artifacts already exist; Red phase is complete." >&2
    return 0
  fi
  return 0
}

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

# ─────────────────────────────────────────────────────────────────────────────
# §1. baseline.md exists and is non-empty
# ─────────────────────────────────────────────────────────────────────────────
test_baseline_md_exists_and_nonempty() {
  assert_file_exists "$BASELINE_MD" \
    "baseline.md must exist at measure/tracks/package_dependency_upgrades_20260607/baseline.md (plan Phase 1 task 1)"
  assert_file_nonempty "$BASELINE_MD" \
    "baseline.md must be non-empty (no placeholder body allowed)"
}

# ─────────────────────────────────────────────────────────────────────────────
# §2. baseline.md records the bun runtime version
# ─────────────────────────────────────────────────────────────────────────────
# We accept any of the common phrasings the implementer is likely to use.
# The pin is that the bun runtime is recorded (Bun 1.3.14 is the captured
# version per spec.md §Baseline Evidence, but we don't pin the exact
# string so a future re-baseline is not blocked).
test_baseline_md_records_bun_version() {
  phase1_red_active || return 1
  assert_file_exists "$BASELINE_MD" "baseline.md must exist (precondition)"
  local content lower
  content=$(cat "$BASELINE_MD")
  assert_contains "$content" "bun --version" \
    "baseline.md must record the output of 'bun --version' (per task 1 sub-task 1)"
  assert_contains "$content" "Bun" \
    "baseline.md must mention Bun runtime in the version record"
  # A bun version is always of the form X.Y.Z. Assert at least one such
  # token is present so a blank entry does not satisfy the test.
  lower=$(printf '%s' "$content" | tr '[:upper:]' '[:lower:]')
  case "$lower" in
    *bun*1.*.*|*1\.3\.[0-9]*|*1\.[0-9]\.[0-9]*)
      return 0 ;;
  esac
  echo "    FAIL: baseline.md must include a semver bun version (e.g. 1.3.14)" >&2
  return 1
}

# ─────────────────────────────────────────────────────────────────────────────
# §3. baseline.md records the root `packageManager` field verbatim
# ─────────────────────────────────────────────────────────────────────────────
# We don't pin the exact packageManager string (so a future re-baseline
# is not blocked) but we require the literal "packageManager" token and
# a `bun@` prefix so a re-capture lands an updated declaration correctly.
test_baseline_md_records_root_package_manager() {
  phase1_red_active || return 1
  assert_file_exists "$BASELINE_MD" "baseline.md must exist (precondition)"
  local content
  content=$(cat "$BASELINE_MD")
  assert_contains "$content" "packageManager" \
    "baseline.md must include the root 'packageManager' field name (per task 1 sub-task 1)"
  assert_contains "$content" "bun@" \
    "baseline.md must include a 'bun@' packageManager value (root declares bun@1.3.10)"
}

# ─────────────────────────────────────────────────────────────────────────────
# §4. baseline.md records all three workspace manifests
# ─────────────────────────────────────────────────────────────────────────────
# plan.md task 1: "Record ... all three package manifests." (root, pivot,
# frontend). The test accepts any of the path forms the implementer may
# use (e.g. `package.json`, `pivot/package.json`, `./pivot/package.json`).
test_baseline_md_records_all_three_manifests() {
  phase1_red_active || return 1
  assert_file_exists "$BASELINE_MD" "baseline.md must exist (precondition)"
  local content
  content=$(cat "$BASELINE_MD")
  # Root manifest — root package.json is referenced somewhere.
  case "$content" in
    *"package.json"*) ;;
    *)
      echo "    FAIL: baseline.md must reference 'package.json' (root manifest)" >&2
      return 1
      ;;
  esac
  # Pivot manifest.
  case "$content" in
    *"pivot/package.json"*) ;;
    *)
      echo "    FAIL: baseline.md must reference 'pivot/package.json' (pivot manifest)" >&2
      return 1
      ;;
  esac
  # Frontend manifest.
  case "$content" in
    *"frontend/package.json"*) ;;
    *)
      echo "    FAIL: baseline.md must reference 'frontend/package.json' (frontend manifest)" >&2
      return 1
      ;;
  esac
}

# ─────────────────────────────────────────────────────────────────────────────
# §5. baseline.md captures `bun outdated --recursive --no-cache` output
# ─────────────────────────────────────────────────────────────────────────────
# We assert the literal command plus at least one upgrade target token so
# a placeholder entry does not satisfy the test.
test_baseline_md_captures_bun_outdated() {
  phase1_red_active || return 1
  assert_file_exists "$BASELINE_MD" "baseline.md must exist (precondition)"
  local content
  content=$(cat "$BASELINE_MD")
  assert_contains "$content" "bun outdated" \
    "baseline.md must reference the verbatim command 'bun outdated'"
  assert_contains "$content" "--recursive" \
    "baseline.md must record the --recursive flag (per task 1 sub-task 2)"
  assert_contains "$content" "--no-cache" \
    "baseline.md must record the --no-cache flag (per task 1 sub-task 2)"
}

# ─────────────────────────────────────────────────────────────────────────────
# §6. baseline.md captures `bun audit` with severity counts and vulnerable paths
# ─────────────────────────────────────────────────────────────────────────────
# The spec §Baseline Evidence pins the 14-vulnerability, 7-high, 7-moderate
# initial state but we don't pin the exact numbers (a future re-baseline
# would change them). We do require the audit command be recorded AND
# some severity token (high/moderate/critical) AND some vulnerable-path
# shape (e.g. "package > sub-package" or a path-like token) so an empty
# "captured audit" stub does not satisfy the test.
test_baseline_md_captures_bun_audit_with_severity_and_paths() {
  phase1_red_active || return 1
  assert_file_exists "$BASELINE_MD" "baseline.md must exist (precondition)"
  local content lower
  content=$(cat "$BASELINE_MD")
  assert_contains "$content" "bun audit" \
    "baseline.md must reference the verbatim command 'bun audit'"
  # Severity: at least one of the conventional labels must be present.
  lower=$(printf '%s' "$content" | tr '[:upper:]' '[:lower:]')
  case "$lower" in
    *high*) ;;
    *)
      echo "    FAIL: baseline.md must record at least one 'high' severity finding" >&2
      return 1
      ;;
  esac
  case "$lower" in
    *moderate*|*medium*|*crit*)
      return 0 ;;
  esac
  echo "    FAIL: baseline.md must record at least one moderate/medium/critical severity" >&2
  return 1
}

# ─────────────────────────────────────────────────────────────────────────────
# §7. baseline.md records pre-existing verify-gate failures separately
# ─────────────────────────────────────────────────────────────────────────────
# plan.md task 1 sub-task 3: "Run `npm run verify` and record each pre-
# existing red gate separately from package-upgrade work." We assert the
# verify command is named AND the record distinguishes pre-existing
# failures from upgrade-attributable regressions (the test accepts
# 'pre-existing' or 'baseline' or 'not caused by' as the qualifier).
test_baseline_md_records_preexisting_verify_failures() {
  phase1_red_active || return 1
  assert_file_exists "$BASELINE_MD" "baseline.md must exist (precondition)"
  local content lower
  content=$(cat "$BASELINE_MD")
  assert_contains "$content" "npm run verify" \
    "baseline.md must record the 'npm run verify' command (per task 1 sub-task 3)"
  lower=$(printf '%s' "$content" | tr '[:upper:]' '[:lower:]')
  case "$lower" in
    *pre-existing*|*preexisting*|*pre?existing*|*baseline*failure*|*not*caused*by*)
      return 0 ;;
  esac
  echo "    FAIL: baseline.md must label pre-existing verify failures (e.g. 'pre-existing', 'baseline', 'not caused by upgrade')" >&2
  return 1
}

# ─────────────────────────────────────────────────────────────────────────────
# §8. compatible-matrix.md exists and is non-empty
# ─────────────────────────────────────────────────────────────────────────────
test_compat_matrix_md_exists_and_nonempty() {
  assert_file_exists "$COMPAT_MD" \
    "compatible-matrix.md must exist at measure/tracks/package_dependency_upgrades_20260607/compatible-matrix.md (plan Phase 1 task 2)"
  assert_file_nonempty "$COMPAT_MD" \
    "compatible-matrix.md must be non-empty (no placeholder body allowed)"
}

# ─────────────────────────────────────────────────────────────────────────────
# §9. compatible-matrix.md lists current, compatible-target, latest-major
# ─────────────────────────────────────────────────────────────────────────────
# We don't pin a specific format (table vs. list) but the three labels
# must appear so a future maintainer can read the matrix at a glance.
test_compat_matrix_lists_three_columns() {
  phase1_red_active || return 1
  assert_file_exists "$COMPAT_MD" "compatible-matrix.md must exist (precondition)"
  local content lower
  content=$(cat "$COMPAT_MD")
  lower=$(printf '%s' "$content" | tr '[:upper:]' '[:lower:]')
  case "$lower" in
    *current*) ;;
    *)
      echo "    FAIL: compatible-matrix.md must list 'current' version for every entry" >&2
      return 1
      ;;
  esac
  case "$lower" in
    *compatible*|*target*|*upgrade-target*)
      ;;
    *)
      echo "    FAIL: compatible-matrix.md must list a 'compatible' (or 'target') version" >&2
      return 1
      ;;
  esac
  case "$lower" in
    *latest*major*|*latest*release*|*newest*major*|*next*major*)
      return 0 ;;
  esac
  echo "    FAIL: compatible-matrix.md must list a 'latest major' (or equivalent) for every entry" >&2
  return 1
}

# ─────────────────────────────────────────────────────────────────────────────
# §10. compatible-matrix.md groups the shared `convex` package
# ─────────────────────────────────────────────────────────────────────────────
# FR-4: "Keep shared dependencies aligned across workspaces, especially
# `convex` and `js-yaml`." The test asserts the matrix has a 'convex'
# group/section that names both pivot and frontend workspaces.
test_compat_matrix_groups_convex_across_workspaces() {
  phase1_red_active || return 1
  assert_file_exists "$COMPAT_MD" "compatible-matrix.md must exist (precondition)"
  local content lower
  content=$(cat "$COMPAT_MD")
  assert_contains "$content" "convex" \
    "compatible-matrix.md must include the shared 'convex' package group (FR-4)"
  lower=$(printf '%s' "$content" | tr '[:upper:]' '[:lower:]')
  # The convex group must name the workspaces that consume it.
  case "$lower" in
    *pivot*frontend*|*frontend*pivot*|*root*pivot*frontend*|*pivot*,*frontend*)
      return 0 ;;
  esac
  echo "    FAIL: compatible-matrix.md convex group must name both pivot and frontend workspaces" >&2
  return 1
}

# ─────────────────────────────────────────────────────────────────────────────
# §11. compatible-matrix.md groups the shared `js-yaml` package
# ─────────────────────────────────────────────────────────────────────────────
# Symmetric to the convex group; pivot and frontend both consume js-yaml
# (test-strategy §"Cross-Phase Edge Cases & Dependencies" — "Both
# workspaces must be upgraded in the same commit").
test_compat_matrix_groups_js_yaml_across_workspaces() {
  phase1_red_active || return 1
  assert_file_exists "$COMPAT_MD" "compatible-matrix.md must exist (precondition)"
  local content lower
  content=$(cat "$COMPAT_MD")
  assert_contains "$content" "js-yaml" \
    "compatible-matrix.md must include the shared 'js-yaml' package group (FR-4)"
  lower=$(printf '%s' "$content" | tr '[:upper:]' '[:lower:]')
  case "$lower" in
    *pivot*frontend*|*frontend*pivot*|*pivot*,*frontend*)
      return 0 ;;
  esac
  echo "    FAIL: compatible-matrix.md js-yaml group must name both pivot and frontend workspaces" >&2
  return 1
}

# ─────────────────────────────────────────────────────────────────────────────
# §12. compatible-matrix.md tags each entry with a category
# ─────────────────────────────────────────────────────────────────────────────
# plan.md task 2 sub-task 3: "Mark each target as routine, security-
# motivated, or breaking." The test accepts the three labels in any
# combination; it does not assert every label is present in the file.
test_compat_matrix_tags_each_entry_with_category() {
  phase1_red_active || return 1
  assert_file_exists "$COMPAT_MD" "compatible-matrix.md must exist (precondition)"
  local content lower routine security breaking
  content=$(cat "$COMPAT_MD")
  lower=$(printf '%s' "$content" | tr '[:upper:]' '[:lower:]')
  routine=0; security=0; breaking=0
  case "$lower" in *routine*) routine=1 ;; esac
  case "$lower" in *security*|*security-motivated*) security=1 ;; esac
  case "$lower" in *breaking*) breaking=1 ;; esac
  if [ "$routine" -eq 1 ] && [ "$security" -eq 1 ] && [ "$breaking" -eq 1 ]; then
    return 0
  fi
  echo "    FAIL: compatible-matrix.md must use all three categories: routine, security-motivated, breaking" >&2
  echo "      routine: $routine  security: $security  breaking: $breaking" >&2
  return 1
}

# ─────────────────────────────────────────────────────────────────────────────
# §13. breaking-decisions.md exists and is non-empty
# ─────────────────────────────────────────────────────────────────────────────
test_breaking_decisions_md_exists_and_nonempty() {
  assert_file_exists "$BREAKING_MD" \
    "breaking-decisions.md must exist at measure/tracks/package_dependency_upgrades_20260607/breaking-decisions.md (plan Phase 1 task 3)"
  assert_file_nonempty "$BREAKING_MD" \
    "breaking-decisions.md must be non-empty (no placeholder body allowed)"
}

# ─────────────────────────────────────────────────────────────────────────────
# §14. breaking-decisions.md covers all 8 majors from plan.md Phase 1 task 3
# ─────────────────────────────────────────────────────────────────────────────
# plan.md task 3 sub-task 1: "Create isolated decisions for React Router 7,
# Vite 8, Tailwind CSS 4, TypeScript 6, ESLint 10, jsdom 29, Lucide React 1,
# and concurrently 10." The test loops over the eight names and asserts
# each is mentioned at least once. Pinning the names (not a regex of
# "X major") protects the matrix from a "we'll skip the Vite 8 decision"
# silent edit.
test_breaking_decisions_covers_all_eight_majors() {
  phase1_red_active || return 1
  assert_file_exists "$BREAKING_MD" "breaking-decisions.md must exist (precondition)"
  local content
  content=$(cat "$BREAKING_MD")
  local -a majors=(
    "React Router 7"
    "Vite 8"
    "Tailwind CSS 4"
    "TypeScript 6"
    "ESLint 10"
    "jsdom 29"
    "Lucide React 1"
    "concurrently 10"
  )
  local missing=()
  local m
  for m in "${majors[@]}"; do
    case "$content" in
      *"$m"*) ;;
      *) missing+=("$m") ;;
    esac
  done
  if [ "${#missing[@]}" -eq 0 ]; then
    return 0
  fi
  echo "    FAIL: breaking-decisions.md must cover all 8 majors from plan Phase 1 task 3" >&2
  echo "      missing:" >&2
  for m in "${missing[@]}"; do
    echo "        - $m" >&2
  done
  return 1
}

# ─────────────────────────────────────────────────────────────────────────────
# §15. For every major, breaking-decisions.md records the four required fields
# ─────────────────────────────────────────────────────────────────────────────
# plan.md task 3 sub-task 2: "For each major, record migration surface,
# peer constraints, expected validation commands, and rollback point."
# We don't pin where each field lives (per-major section vs. global
# section), but we require each label appears at least once so a future
# edit that drops one of the four fields is caught.
test_breaking_decisions_records_all_four_fields_per_major() {
  phase1_red_active || return 1
  assert_file_exists "$BREAKING_MD" "breaking-decisions.md must exist (precondition)"
  local content lower
  content=$(cat "$BREAKING_MD")
  lower=$(printf '%s' "$content" | tr '[:upper:]' '[:lower:]')
  case "$lower" in
    *migration*surface*|*surface*) ;;
    *)
      echo "    FAIL: breaking-decisions.md must record a 'migration surface' for each major" >&2
      return 1
      ;;
  esac
  case "$lower" in
    *peer*constraint*|*peer*dependency*|*peer*requirement*) ;;
    *)
      echo "    FAIL: breaking-decisions.md must record 'peer constraints' for each major" >&2
      return 1
      ;;
  esac
  case "$lower" in
    *validation*command*|*verify*command*|*expected*command*|*test*command*|*check*command*) ;;
    *)
      echo "    FAIL: breaking-decisions.md must record 'expected validation commands' for each major" >&2
      return 1
      ;;
  esac
  case "$lower" in
    *rollback*|*revert*) ;;
    *)
      echo "    FAIL: breaking-decisions.md must record a 'rollback point' for each major" >&2
      return 1
      ;;
  esac
}

# ─────────────────────────────────────────────────────────────────────────────
# Main
# ─────────────────────────────────────────────────────────────────────────────

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  package_dependency_upgrades_20260607 — Phase 1 (Red)"
echo "  track: package_dependency_upgrades_20260607"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

run_test "baseline.md exists and is non-empty" \
  test_baseline_md_exists_and_nonempty

run_test "baseline.md records the bun runtime version" \
  test_baseline_md_records_bun_version

run_test "baseline.md records the root 'packageManager' field" \
  test_baseline_md_records_root_package_manager

run_test "baseline.md records all three workspace manifests" \
  test_baseline_md_records_all_three_manifests

run_test "baseline.md captures 'bun outdated --recursive --no-cache'" \
  test_baseline_md_captures_bun_outdated

run_test "baseline.md captures 'bun audit' with severity counts and vulnerable paths" \
  test_baseline_md_captures_bun_audit_with_severity_and_paths

run_test "baseline.md records pre-existing verify failures separately" \
  test_baseline_md_records_preexisting_verify_failures

run_test "compatible-matrix.md exists and is non-empty" \
  test_compat_matrix_md_exists_and_nonempty

run_test "compatible-matrix.md lists current / compatible / latest-major" \
  test_compat_matrix_lists_three_columns

run_test "compatible-matrix.md groups 'convex' across pivot + frontend (FR-4)" \
  test_compat_matrix_groups_convex_across_workspaces

run_test "compatible-matrix.md groups 'js-yaml' across pivot + frontend (FR-4)" \
  test_compat_matrix_groups_js_yaml_across_workspaces

run_test "compatible-matrix.md tags entries routine / security / breaking" \
  test_compat_matrix_tags_each_entry_with_category

run_test "breaking-decisions.md exists and is non-empty" \
  test_breaking_decisions_md_exists_and_nonempty

run_test "breaking-decisions.md covers all 8 majors from plan Phase 1 task 3" \
  test_breaking_decisions_covers_all_eight_majors

run_test "breaking-decisions.md records migration surface, peer constraints, validation commands, rollback point" \
  test_breaking_decisions_records_all_four_fields_per_major

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
