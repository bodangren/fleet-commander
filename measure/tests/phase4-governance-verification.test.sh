#!/usr/bin/env bash
# Tests for Phase 4 — Governance Verification
# (build_graph_context_reconciliation_20260618).
#
# Run with:  bash measure/tests/phase4-governance-verification.test.sh
#
# This is the RED phase per test-strategy.md §7 ("Live-Proof Plan").
# Each Phase 4 Red test is expected to FAIL at the current working-tree
# state because the live `bash measure/doctor.sh all` gate does not
# yet pass. Per spec.md + test-strategy.md §1, §5, §7, Phase 4 must:
#
#   - Task 1: `bash measure/doctor.sh all` exits 0 and prints PASS for
#     all six checks. test-strategy.md §5 enumerates the six: as-any,
#     boundary, stub-mutation, god-file, orphans, status-vocabulary.
#     test-strategy.md §3 ("Phase 4 doctor depends on Phase 3 graph")
#     adds the constraint that `check_boundary` and `check_orphans`
#     must NOT print SKIP — graph.db must exist (Phase 3 Green
#     satisfied this in `97f4c9b`).
#   - Task 2: `wc -l measure/lessons-learned.md measure/tech-debt.md`
#     both ≤ 50. test-strategy.md §1 / §3 keep the bounded-curated-
#     working-memory contract.
#   - Task 3: Update AGENTS/Measure guidance if the graph rebuild
#     workflow changed the required daily process. The temp-then-swap
#     pattern from test-strategy.md §3 ("Phase-3 atomicity: temp-DB
#     write → success-check → swap") is a new required pattern that
#     AGENTS.md must document.
#   - Task 4: `build-graph update ./graph.db` for changed context
#     files if the graph includes Measure docs. The graph has 1
#     file-node under `measure/` for this track's `plan.md`
#     (verified via `build-graph query` 2026-06-18 MID), so the
#     changed `plan.md` requires an incremental update.
#
# Why these tests, not `build-graph audit --json` or a full vitest
# run? test-strategy.md §6 confirms `build-graph audit --json` did
# not return within 60s in strategy probing; the §1 pyramid names
# `bash measure/doctor.sh all` exit 0 as the Phase 4 live smoke. No
# production code touched (test-strategy.md §4). No fake harnesses —
# the existing `wc`, `grep`, and the `bash measure/doctor.sh all`
# runner are real, bounded, and used directly. Tests follow the
# sibling `measure/tests/phase3-graph-rebuild.test.sh` style.
#
# Per the prompt "If testing a shell runner or fake harness, prove
# the fake mode intercepts the exact command path or test the
# command string directly" — this is a real runner (`bash measure/
# doctor.sh all`); the tests capture its exit code and assert on
# its stdout, which IS the real command path. Per "Red tests must
# fail because the current implementation is missing or wrong, not
# merely because a durable record is stale" — every Red test below
# asserts a real defect (a `check_orphans` FAIL on 2 exports and a
# stale allowlist entry; a missing `temp-then-swap` paragraph in
# AGENTS.md), not a stale durable record.
#
# Run targeted, bounded, no watch mode:
#   bash measure/tests/phase4-governance-verification.test.sh
# (~3-5s; exits non-zero while any test is red.)

set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

DOCTOR_SH="$REPO_ROOT/measure/doctor.sh"
GRAPH_DB="$REPO_ROOT/graph.db"
ORPHANS_ALLOWLIST="$REPO_ROOT/measure/orphans-allowlist.txt"
LESSONS_MD="$REPO_ROOT/measure/lessons-learned.md"
TECH_DEBT_MD="$REPO_ROOT/measure/tech-debt.md"
AGENTS_MD="$REPO_ROOT/AGENTS.md"

TESTS_RUN=0
TESTS_PASSED=0
TESTS_FAILED=0
FAILED_TESTS=()

DOCTOR_STDOUT=""
DOCTOR_EXIT=0

# ── Assertion helpers (sibling of phase3-graph-rebuild.test.sh) ─────

assert_file_exists() {
  local path="$1" msg="${2:-}"
  if [ -f "$path" ]; then return 0; fi
  echo "    FAIL: $msg (file not found: $path)" >&2
  return 1
}

run_test() {
  local name="$1"; local fn="$2"
  TESTS_RUN=$((TESTS_RUN + 1))
  printf '==> %s\n' "$name"
  if ( "$fn" ); then
    TESTS_PASSED=$((TESTS_PASSED + 1)); echo "    PASS"
  else
    TESTS_FAILED=$((TESTS_FAILED + 1)); FAILED_TESTS+=("$name"); echo "    FAIL"
  fi
  echo ""
}

# ─────────────────────────────────────────────────────────────────────────
# §A. `bash measure/doctor.sh all` exits 0
#     (Phase 4 Task 1; test-strategy.md §5 / §7 row 4).
# ─────────────────────────────────────────────────────────────────────────
# Contract: test-strategy.md §7 row 4 Red column says "exits non-zero
# **or** any check prints `SKIP` for boundary/orphans". The Red
# baseline is: doctor.sh exits 1 with check 5 (Orphan detection)
# FAILing on 2 orphan exports and a WARNING for a stale allowlist
# entry (`frontend/src/AppRoutes.tsx:AppRoutes` — the file was
# archived by Phase 2 work but the allowlist still references it).
# Phase 4 Green flips this to exit 0.

test_doctor_all_exit_zero() {
  assert_file_exists "$DOCTOR_SH" "Phase 4 Task 1: measure/doctor.sh must exist"
  DOCTOR_STDOUT=$(bash "$DOCTOR_SH" all 2>&1) || DOCTOR_EXIT=$?
  DOCTOR_EXIT=${DOCTOR_EXIT:-0}
  if [ "$DOCTOR_EXIT" -eq 0 ]; then
    echo "    ok (doctor.sh all exit code: 0)" >&2
    return 0
  fi
  echo "    FAIL: Phase 4 Task 1 — bash measure/doctor.sh all exited $DOCTOR_EXIT (expected 0 per test-strategy.md §7 row 4 Green gate)" >&2
  return 1
}

# ─────────────────────────────────────────────────────────────────────────
# §B. All six doctor.sh checks print PASS (no FAIL, no SKIP for
#     boundary/orphans). (Phase 4 Task 1; test-strategy.md §5, §3, §7.)
# ─────────────────────────────────────────────────────────────────────────
# Contract: doctor.sh stdout must contain a "PASS" line for each of
# the six checks (as-any, boundary, stub-mutation, god-file, orphans,
# status-vocabulary) and must NOT print SKIP for the boundary or
# orphans checks (graph.db exists post-Phase-3, so both run).
# test-strategy.md §3: "Phase 4 doctor depends on Phase 3 graph:
# check_boundary and check_orphans SKIP if graph.db is missing — gate
# must assert exit 0 *and* absence of SKIP for those two checks."
# The Red baseline: check 5 prints "FAIL — 2 orphaned export(s)".
#
# The doctor.sh output format is:
#   ━━━ Check N: <label> ━━━
#   <blank line>
#   <verdict line: PASS/FAIL/SKIP/WARNING — ...>
# For each check header, the verdict is the first non-blank line
# after the header. We extract it by walking forward from the
# header line.

test_doctor_all_six_checks_pass() {
  if [ -z "$DOCTOR_STDOUT" ]; then
    DOCTOR_STDOUT=$(bash "$DOCTOR_SH" all 2>&1) || true
  fi
  local pass_count=0
  local required=("as any guard" "Boundary dependency" "Stub-mutation" "God-file" "Orphan" "Status-vocabulary")
  local missing=()
  local label
  for label in "${required[@]}"; do
    # For each required label, extract the verdict: first non-blank
    # line after the matching "Check N: <label>" header.
    local verdict
    verdict=$(printf '%s\n' "$DOCTOR_STDOUT" | awk -v lbl="$label" '
      $0 ~ "Check.*" lbl { found=1; next }
      found && /^[[:space:]]*$/ { next }
      found && /━━━/ { found=0; next }
      found && /[A-Z]+/ { print; exit }
    ')
    if [ -z "$verdict" ]; then
      missing+=("$label (no verdict line found)")
      continue
    fi
    if echo "$verdict" | grep -qE '(^|[[:space:]])PASS([[:space:]]|$)'; then
      pass_count=$((pass_count + 1))
    else
      missing+=("$label (verdict: $verdict)")
    fi
  done
  if [ "$pass_count" -eq 6 ]; then
    echo "    ok (6/6 checks printed PASS)" >&2
    return 0
  fi
  echo "    FAIL: Phase 4 Task 1 — $pass_count/6 checks printed PASS; missing:" >&2
  for m in "${missing[@]}"; do echo "      - $m" >&2; done
  return 1
}

# ─────────────────────────────────────────────────────────────────────────
# §C. boundary/orphans checks did not print SKIP
#     (Phase 4 Task 1; test-strategy.md §3).
# ─────────────────────────────────────────────────────────────────────────
# Contract: per test-strategy.md §3, "check_boundary and check_orphans
# SKIP if graph.db is missing — gate must assert exit 0 AND absence of
# SKIP for those two checks." This is a sub-contract of §B that
# stands alone: even if both checks print PASS, the gate fails if
# they ever printed SKIP (which would mean graph.db was not present
# at doctor.sh runtime). The Red baseline: both checks are running
# (not SKIP) — this is a regression guard, not a Red failure; mark
# as already-satisfied evidence (Task 1 is the primary owner).

test_doctor_boundary_orphans_not_skip() {
  if [ -z "$DOCTOR_STDOUT" ]; then
    DOCTOR_STDOUT=$(bash "$DOCTOR_SH" all 2>&1) || true
  fi
  local skip_hits=()
  local label
  for label in "Boundary dependency" "Orphan"; do
    # For each label, extract the verdict: first non-blank line after
    # the matching "Check N: <label>" header.
    local verdict
    verdict=$(printf '%s\n' "$DOCTOR_STDOUT" | awk -v lbl="$label" '
      $0 ~ "Check.*" lbl { found=1; next }
      found && /^[[:space:]]*$/ { next }
      found && /━━━/ { found=0; next }
      found && /[A-Z]+/ { print; exit }
    ')
    if [ -n "$verdict" ] && echo "$verdict" | grep -qE '(^|[[:space:]])SKIP([[:space:]]|$)'; then
      skip_hits+=("$label: $verdict")
    fi
  done
  if [ "${#skip_hits[@]}" -eq 0 ]; then
    echo "    ok (neither boundary nor orphans check printed SKIP)" >&2
    return 0
  fi
  echo "    FAIL: Phase 4 Task 1 — boundary/orphans printed SKIP; test-strategy.md §3 requires both checks to run (graph.db must exist at doctor.sh runtime):" >&2
  for s in "${skip_hits[@]}"; do echo "      - $s" >&2; done
  return 1
}

# ─────────────────────────────────────────────────────────────────────────
# §D. lessons-learned.md ≤ 50 lines
#     (Phase 4 Task 2; test-strategy.md §1, §7 row 4 Green).
# ─────────────────────────────────────────────────────────────────────────
# Contract: "Curated working memory, not an append-only log. Keep at
# or below **50 lines**" (lessons-learned.md header). Red baseline:
# 35 lines, contract satisfied at HEAD (no Red on this contract
# alone). Marked as already-satisfied evidence so a future regression
# in Phase 4 Green is caught.

test_lessons_learned_line_count() {
  assert_file_exists "$LESSONS_MD" "lessons-learned.md must exist"
  local lines
  lines=$(wc -l < "$LESSONS_MD" | tr -d ' ')
  if [ "$lines" -le 50 ]; then
    echo "    ok (lessons-learned.md: $lines/50 lines)" >&2
    return 0
  fi
  echo "    FAIL: Phase 4 Task 2 — lessons-learned.md is $lines lines (max 50 per test-strategy.md §1)" >&2
  return 1
}

# ─────────────────────────────────────────────────────────────────────────
# §E. tech-debt.md ≤ 50 lines
#     (Phase 4 Task 2; test-strategy.md §1, §7 row 4 Green).
# ─────────────────────────────────────────────────────────────────────────
# Contract: "Curated working memory. Keep at or below **50 lines**.
# Remove resolved items once they no longer influence near-term
# planning" (tech-debt.md header). Red baseline: 39 lines, contract
# satisfied at HEAD (no Red on this contract alone). Marked as
# already-satisfied evidence so a future regression in Phase 4 Green
# is caught.

test_tech_debt_line_count() {
  assert_file_exists "$TECH_DEBT_MD" "tech-debt.md must exist"
  local lines
  lines=$(wc -l < "$TECH_DEBT_MD" | tr -d ' ')
  if [ "$lines" -le 50 ]; then
    echo "    ok (tech-debt.md: $lines/50 lines)" >&2
    return 0
  fi
  echo "    FAIL: Phase 4 Task 2 — tech-debt.md is $lines lines (max 50 per test-strategy.md §1)" >&2
  return 1
}

# ─────────────────────────────────────────────────────────────────────────
# §F. orphans-allowlist.txt has no stale entries
#     (Phase 4 Task 1; test-strategy.md §5 — allowlist drift).
# ─────────────────────────────────────────────────────────────────────────
# Contract: doctor.sh `check_orphans` issues a WARNING (not FAIL) for
# each allowlist entry whose symbol no longer exists in graph.db.
# test-strategy.md §5 requires the Phase 4 gate to verify "doctor
# allowlist drift" — i.e., the doctor.sh run emits no stale-allowlist
# WARNING. The Red baseline: doctor.sh prints "STALE allowlist entry:
# frontend/src/AppRoutes.tsx:AppRoutes (symbol not found in graph.db)"
# (the file was archived by Phase 2 work at `bc8de63` but the
# allowlist entry was not removed). Phase 4 Green must remove the
# stale entry (the underlying file is gone; the entry serves no
# purpose).

test_no_stale_orphans_allowlist_warning() {
  if [ -z "$DOCTOR_STDOUT" ]; then
    DOCTOR_STDOUT=$(bash "$DOCTOR_SH" all 2>&1) || true
  fi
  local stale_hits
  stale_hits=$(printf '%s\n' "$DOCTOR_STDOUT" | grep -cE "STALE allowlist entry" || true)
  if [ "$stale_hits" -eq 0 ]; then
    echo "    ok (no STALE allowlist warnings in doctor.sh stdout)" >&2
    return 0
  fi
  echo "    FAIL: Phase 4 Task 1 — doctor.sh emitted $stale_hits STALE allowlist warning(s) (test-strategy.md §5 allowlist drift must be 0):" >&2
  printf '%s\n' "$DOCTOR_STDOUT" | grep -E "STALE allowlist entry" | sed 's/^/      - /' >&2
  return 1
}

# ─────────────────────────────────────────────────────────────────────────
# §G. AGENTS.md documents the temp-then-swap pattern for graph.db
#     rebuilds (Phase 4 Task 3; test-strategy.md §3 "Phase-3
#     atomicity: temp-DB write → success-check → swap").
# ─────────────────────────────────────────────────────────────────────────
# Contract: Phase 4 Task 3 — "Update AGENTS/Measure guidance only if
# the graph rebuild workflow changes the required daily process."
# test-strategy.md §3 establishes the temp-then-swap pattern as the
# new required daily process for graph.db rebuilds (replacing the
# old "scan directly into canonical graph.db" pattern that the
# `UNIQUE constraint failed: nodes.id` regression in `index.md`
# showed is unsafe). AGENTS.md is the first file agents read on
# every session (it says "Load the `measure` skill and read
# `measure/index.md` before starting work" — AGENTS.md is the
# meta-process doc). The pattern is currently only documented in
# measure/lessons-learned.md (line 34) and in this track's
# test-strategy.md §3, but NOT in AGENTS.md. Red baseline: AGENTS.md
# has no mention of the temp-then-swap dance.

test_agents_md_documents_temp_then_swap() {
  assert_file_exists "$AGENTS_MD" "AGENTS.md must exist at repo root"
  # The temp-then-swap pattern requires three signals in AGENTS.md:
  # (a) a directive to never scan directly into canonical graph.db,
  # (b) a directive to scan to a temp DB first (e.g. /tmp/...graph.db
  # or similar), and (c) a directive to swap only on success. The
  # contract text uses the language "Never full-scan into canonical"
  # and "scan to a temp DB and replace only on success" from
  # lessons-learned.md — the test allows AGENTS.md to phrase the
  # same idea in its own words.
  local has_no_direct_scan has_temp_scan has_swap_on_success
  # (a) "Never full-scan into canonical graph.db" or equivalent —
  # look for a negation adjacent to "scan" + "canonical" or
  # "graph.db" (NOT followed by a step saying "do scan").
  has_no_direct_scan=$(grep -ciE "never.*scan.*(canonical|graph\.db)|do not scan.*(canonical|graph\.db)|avoid.*scan.*(canonical|graph\.db)" "$AGENTS_MD" || true)
  # (b) scan to a temp DB first.
  has_temp_scan=$(grep -ciE "temp[- _]?db|temp.*graph\.db|/tmp/.*graph\.db|scan.*temp" "$AGENTS_MD" || true)
  # (c) swap / replace only on success.
  has_swap_on_success=$(grep -ciE "replace.*only.*on.*success|swap.*only.*on.*success|on success.*replace|on success.*swap" "$AGENTS_MD" || true)
  if [ "$has_no_direct_scan" -ge 1 ] && [ "$has_temp_scan" -ge 1 ] && [ "$has_swap_on_success" -ge 1 ]; then
    echo "    ok (AGENTS.md documents temp-then-swap: a=$has_no_direct_scan b=$has_temp_scan c=$has_swap_on_success)" >&2
    return 0
  fi
  echo "    FAIL: Phase 4 Task 3 — AGENTS.md does not document the temp-then-swap pattern (test-strategy.md §3); agents reading AGENTS.md will not learn the new required daily process:" >&2
  echo "      (a) never-scan-canonical-directive found: $has_no_direct_scan (need >=1)" >&2
  echo "      (b) temp-DB directive found:                $has_temp_scan (need >=1)" >&2
  echo "      (c) swap-only-on-success directive found:   $has_swap_on_success (need >=1)" >&2
  return 1
}

# ─────────────────────────────────────────────────────────────────────────
# Main
# ─────────────────────────────────────────────────────────────────────────

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Phase 4 Red tests — build_graph_context_reconciliation_20260618"
echo "  Governance Verification (live doctor.sh / wc -l / allowlist / AGENTS.md)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

run_test "Phase 4 Task 1: bash measure/doctor.sh all exits 0" \
  test_doctor_all_exit_zero

run_test "Phase 4 Task 1: all 6 doctor checks (as-any, boundary, stub-mutation, god-file, orphans, status-vocabulary) print PASS" \
  test_doctor_all_six_checks_pass

run_test "Phase 4 Task 1: boundary + orphans checks did not print SKIP (graph.db present post-Phase-3)" \
  test_doctor_boundary_orphans_not_skip

run_test "Phase 4 Task 2: measure/lessons-learned.md <= 50 lines" \
  test_lessons_learned_line_count

run_test "Phase 4 Task 2: measure/tech-debt.md <= 50 lines" \
  test_tech_debt_line_count

run_test "Phase 4 Task 1: doctor.sh emitted no STALE allowlist warnings (allowlist drift = 0)" \
  test_no_stale_orphans_allowlist_warning

run_test "Phase 4 Task 3: AGENTS.md documents temp-then-swap pattern for graph.db rebuilds" \
  test_agents_md_documents_temp_then_swap

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
