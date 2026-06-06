#!/usr/bin/env bash
# Tests for the Phase 4 Dead-Code Sweep contracts —
# quality_gate_enforcement_20260605.
#
# Run with:  bash measure/tests/dead_code_sweep.test.sh
#
# This is the RED phase. Each test pins a contract that the wire-or-delete
# resolution in Phase 4 must satisfy. Until the resolution lands, the
# relevant tests fail:
#
#   - TD-213 (WorktreeManager / DispatchPacer): already deleted from
#     pivot/src/policy/allocator.ts in the graph_node_audit_remediation
#     archive; the regression-guard tests in §1 should pass on the current
#     state. They are committed so a future refactor that re-introduces
#     these classes fails CI.
#
#   - TD-209 (recovery / continuous-mode orchestrator exports):
#     `ContinuousOrchestrator` and `StalledTaskDetector` are exported from
#     pivot/src/orchestrator/ but only referenced from their sibling
#     *.test.ts files. The resolution is wire-or-delete. The tests in §2
#     pass if EITHER path is taken; they currently fail because neither
#     is done.
#
#   - TD-238 (SaveAsTemplateModal): the component is now imported by
#     `frontend/src/pages/ProjectViewPage.tsx` (per
#     `ProjectViewPage.saveAsTemplate.test.tsx`, which passes), but the
#     build-graph does not record the JSX import edge (test-strategy §6:
#     "build-graph tracks `imports`/`calls` but not JSX element usage"),
#     so `doctor.sh orphans` still flags it. The test in §3 passes if the
#     orphans report is clean for this symbol — either because the
#     detector is fixed to track JSX edges, OR because an allowlist entry
#     documents the data-quality gap.
#
#   - Task 4 (remaining orphans / allowlist hygiene): the `orphans` gate
#     must exit 0 against the live `graph.db` after stale entries are
#     removed. Currently exits 1 with 660 entries (per TD-240; the True
#     Orphans in tasks 1-3 are the actionable subset — the rest are
#     JSX/Convex/route edges the detector does not yet track). The test
#     in §4 is therefore a regression guard for the GREEN supervisor who
#     will land the false-positive fix and the wire-or-delete decisions.
#
# Contracts under test (test-strategy §1, §3, §5; plan Phase 4):
#   §1. TD-213: WorktreeManager / DispatchPacer do not appear in any
#       production source under pivot/src/; allocator.test.ts does not
#       import them.
#   §2. TD-209: For each of `ContinuousOrchestrator` and
#       `StalledTaskDetector`, EITHER a non-test file under pivot/src/
#       imports it OR the source file and its sibling test file are
#       absent from the working tree.
#   §3. TD-238: `doctor.sh orphans` does not flag
#       `frontend/src/components/SaveAsTemplateModal.tsx:SaveAsTemplateModal`.
#   §4. doctor.sh orphans exits 0 against the live graph.db (or, if
#       non-zero, every reported entry is allowlisted with a TD id).
#
# This test file does NOT scan a real directory for the orphans work
# (test-strategy §2 "do NOT scan a real directory (non-deterministic)")
# but it DOES use the live `graph.db` for §3 and §4 because those
# contracts are about the production state, not a fixture.

set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

DOCTOR_SH="$REPO_ROOT/measure/doctor.sh"
ALLOWLIST="$REPO_ROOT/measure/orphans-allowlist.txt"
ALL_FILE="$REPO_ROOT/pivot/src/policy/allocator.ts"
ALL_TEST_FILE="$REPO_ROOT/pivot/src/policy/allocator.test.ts"

CONT_FILE="$REPO_ROOT/pivot/src/orchestrator/continuousOrchestrator.ts"
CONT_TEST_FILE="$REPO_ROOT/pivot/src/orchestrator/continuousOrchestrator.test.ts"
STALL_FILE="$REPO_ROOT/pivot/src/orchestrator/stalledDetector.ts"
STALL_TEST_FILE="$REPO_ROOT/pivot/src/orchestrator/stalledDetector.test.ts"

# Test state.
TESTS_RUN=0
TESTS_PASSED=0
TESTS_FAILED=0
FAILED_TESTS=()

# ── Assertion helpers (same shape as verify.test.sh / orphans.test.sh) ───

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
      echo "      haystack:          <${haystack:0:400}>" >&2
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

precondition_build_graph() {
  if ! command -v build-graph >/dev/null 2>&1; then
    echo "    RED: build-graph not on PATH" >&2
    return 1
  fi
  return 0
}

# Strip ANSI escape codes (color codes) from stdin. Used to parse the
# doctor.sh output cleanly.
strip_ansi() {
  sed -e $'s/\033\[[0-9;]*[a-zA-Z]//g'
}

# Run the orphans subcommand against the live graph.db. Sets
# ORPHANS_OUTPUT / ORPHANS_EXIT (both stripped of ANSI).
run_orphans_live() {
  set +e
  ORPHANS_RAW=$("$DOCTOR_SH" orphans 2>&1)
  ORPHANS_EXIT=$?
  set -e
  ORPHANS_OUTPUT=$(printf '%s\n' "$ORPHANS_RAW" | strip_ansi)
}

# Parse the orphan entries out of $ORPHANS_OUTPUT. Each entry is one
# `  path:symbol` line in the "orphaned export(s)" section, excluding
# the `  file_path:name` header and any phantom `:symbol` row that has
# no path. Echoes one entry per line on stdout.
parse_orphan_entries() {
  printf '%s\n' "$ORPHANS_OUTPUT" \
    | sed -n '/orphaned export/,/^Options:/p' \
    | grep -v '^  file_path:name$' \
    | grep -v '^  :$' \
    | sed -n 's/^  \([^ ].*:\)\(.*\)$/\1\2/p' \
    | sed 's/[[:space:]]*$//' \
    | grep -v '^[[:space:]]*$'
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
# §1. TD-213 — WorktreeManager / DispatchPacer regression guards
# ─────────────────────────────────────────────────────────────────────────────
#
# These classes were deleted in the graph_node_audit_remediation_20260602
# archive. Phase 4's job is to confirm the deletion stuck and the stale
# tests in allocator.test.ts are gone. Both should already hold; the tests
# are regression guards.

test_td213_Allocator_source_has_no_WorktreeManager() {
  assert_file_exists "$ALL_FILE" "pivot/src/policy/allocator.ts must exist"
  local src
  src=$(cat "$ALL_FILE")
  assert_not_contains "$src" "WorktreeManager" \
    "allocator.ts must not reference WorktreeManager (TD-213 delete path)"
}

test_td213_Allocator_source_has_no_DispatchPacer() {
  assert_file_exists "$ALL_FILE" "pivot/src/policy/allocator.ts must exist"
  local src
  src=$(cat "$ALL_FILE")
  assert_not_contains "$src" "DispatchPacer" \
    "allocator.ts must not reference DispatchPacer (TD-213 delete path)"
}

test_td213_Allocator_test_has_no_WorktreeManager() {
  assert_file_exists "$ALL_TEST_FILE" \
    "pivot/src/policy/allocator.test.ts must exist"
  local src
  src=$(cat "$ALL_TEST_FILE")
  assert_not_contains "$src" "WorktreeManager" \
    "allocator.test.ts must not import or test WorktreeManager (stale test removed)"
}

test_td213_Allocator_test_has_no_DispatchPacer() {
  assert_file_exists "$ALL_TEST_FILE" \
    "pivot/src/policy/allocator.test.ts must exist"
  local src
  src=$(cat "$ALL_TEST_FILE")
  assert_not_contains "$src" "DispatchPacer" \
    "allocator.test.ts must not import or test DispatchPacer (stale test removed)"
}

test_td213_Allocator_source_keeps_Production_exports() {
  # The graph_node_audit remediation ledger said the delete path also
  # retains canAdmit, AllocationPolicy, and TaskDescriptor for production
  # use (see measure/archive/graph_node_audit_remediation_20260602/
  # remediation-ledger.md row 14). Regression guard: the production
  # exports must survive the dead-code sweep.
  assert_file_exists "$ALL_FILE" "pivot/src/policy/allocator.ts must exist"
  local src
  src=$(cat "$ALL_FILE")
  assert_contains "$src" "export function canAdmit" \
    "canAdmit must remain exported (production caller)"
  assert_contains "$src" "AllocationPolicy" \
    "AllocationPolicy type must remain exported (production caller)"
  assert_contains "$src" "TaskDescriptor" \
    "TaskDescriptor type must remain exported (production caller)"
}

# ─────────────────────────────────────────────────────────────────────────────
# §2. TD-209 — ContinuousOrchestrator / StalledTaskDetector wire-or-delete
# ─────────────────────────────────────────────────────────────────────────────
#
# These classes are exported from pivot/src/orchestrator/ and only have
# test-inbound edges (per build-graph and a manual grep). The resolution
# is wire-or-delete. The tests pass if EITHER path is taken.

# Returns 0 (true) if the named class has at least one non-test,
# non-self caller in pivot/src/. Returns 1 otherwise.
#
# Uses build-graph to count production callers — the test file imports
# are filtered out so we only see production wiring.
td209_has_prod_caller() {
  local symbol="$1"
  precondition_build_graph || return 1
  local target_id
  target_id=$(build-graph query "$REPO_ROOT/graph.db" "
    SELECT id FROM nodes
    WHERE name = '$symbol'
      AND type = 'class'
      AND file_path LIKE '%/pivot/src/%'
    LIMIT 1
  " 2>&1 | grep -E '^class:' | head -1 | tr -d '[:space:]')
  if [ -z "$target_id" ]; then
    return 1
  fi
  # Find the source file (for self-exclusion).
  local self_path
  self_path=$(build-graph query "$REPO_ROOT/graph.db" "
    SELECT file_path FROM nodes WHERE id = '$target_id'
  " 2>&1 | tail -1 | tr -d '[:space:]')
  # Count non-test, non-self inbound imports/calls/param_flow edges.
  local callers
  callers=$(build-graph query "$REPO_ROOT/graph.db" "
    SELECT COUNT(DISTINCT s.id) FROM edges e
    JOIN nodes s ON e.source = s.id
    WHERE e.target = '$target_id'
      AND e.type IN ('imports', 'calls', 'param_flow')
      AND s.file_path NOT LIKE '%.test.%'
      AND s.file_path NOT LIKE '%__fixtures__%'
      AND s.file_path != '$self_path'
  " 2>&1 | tr -d '[:space:]')
  [ "${callers:-0}" -gt 0 ] 2>/dev/null
}

test_td209_ContinuousOrchestrator_is_resolved() {
  # Pass if EITHER: (a) a production caller exists in pivot/src/, OR
  # (b) the source file and its sibling test file are both gone.
  if td209_has_prod_caller "ContinuousOrchestrator"; then
    return 0
  fi
  if [ ! -f "$CONT_FILE" ] && [ ! -f "$CONT_TEST_FILE" ]; then
    return 0
  fi
  echo "    FAIL: ContinuousOrchestrator is dead in production" >&2
  echo "      source present:    $([ -f "$CONT_FILE" ] && echo yes || echo no)" >&2
  echo "      sibling test present: $([ -f "$CONT_TEST_FILE" ] && echo yes || echo no)" >&2
  echo "      expected: either a non-test pivot/src/* caller exists, OR" >&2
  echo "                both files are deleted (delete path)" >&2
  return 1
}

test_td209_StalledTaskDetector_is_resolved() {
  if td209_has_prod_caller "StalledTaskDetector"; then
    return 0
  fi
  if [ ! -f "$STALL_FILE" ] && [ ! -f "$STALL_TEST_FILE" ]; then
    return 0
  fi
  echo "    FAIL: StalledTaskDetector is dead in production" >&2
  echo "      source present:    $([ -f "$STALL_FILE" ] && echo yes || echo no)" >&2
  echo "      sibling test present: $([ -f "$STALL_TEST_FILE" ] && echo yes || echo no)" >&2
  echo "      expected: either a non-test pivot/src/* caller exists, OR" >&2
  echo "                both files are deleted (delete path)" >&2
  return 1
}

# When the delete path is taken, the stale *.test.ts files must also be
# removed (test-strategy §5: "if deleting, also delete the stale test —
# do not leave .skip, that hides regressions"). This test pins that: if
# the source file is gone, the sibling test must also be gone.

test_td209_ContinuousOrchestrator_no_orphan_test_when_deleted() {
  # If the source is deleted, the test must be deleted too.
  if [ ! -f "$CONT_FILE" ] && [ -f "$CONT_TEST_FILE" ]; then
    echo "    FAIL: ContinuousOrchestrator test orphaned by delete" >&2
    echo "      source deleted but sibling test still present at:" >&2
    echo "      $CONT_TEST_FILE" >&2
    return 1
  fi
  return 0
}

test_td209_StalledTaskDetector_no_orphan_test_when_deleted() {
  if [ ! -f "$STALL_FILE" ] && [ -f "$STALL_TEST_FILE" ]; then
    echo "    FAIL: StalledTaskDetector test orphaned by delete" >&2
    echo "      source deleted but sibling test still present at:" >&2
    echo "      $STALL_TEST_FILE" >&2
    return 1
  fi
  return 0
}

# ─────────────────────────────────────────────────────────────────────────────
# §3. TD-238 — SaveAsTemplateModal orphans report cross-check
# ─────────────────────────────────────────────────────────────────────────────
#
# ProjectViewPage.saveAsTemplate.test.tsx already passes, so the
# component is wired. But build-graph does not record the JSX import
# edge, so `doctor.sh orphans` flags the modal. The test asserts the
# orphans report is clean for the modal — either by detector fix, OR by
# an allowlist entry with a documented reason.

test_td238_SaveAsTemplateModal_not_in_orphans_report() {
  # The orphans report must not include SaveAsTemplateModal. The
  # resolution is either:
  #   (a) doctor.sh orphans no longer flags it (e.g., JSX edges are
  #       tracked, or a tag/path rule excludes the modal), OR
  #   (b) the allowlist file contains an entry for it, with a tech-debt
  #       or owning-track id in the comment.
  precondition_build_graph || return 1
  run_orphans_live

  if assert_not_contains "$ORPHANS_OUTPUT" "SaveAsTemplateModal.tsx:SaveAsTemplateModal" \
      "orphans report must not flag the modal"; then
    return 0
  fi

  # The output flagged the modal — fall back to allowlist check.
  if [ -f "$ALLOWLIST" ]; then
    local entry="frontend/src/components/SaveAsTemplateModal.tsx:SaveAsTemplateModal"
    if grep -qxF "$entry" "$ALLOWLIST"; then
      return 0
    fi
    # Allow list has a row for the modal file (any symbol) with a TD
    # reference in the surrounding comment block.
    if grep -q "SaveAsTemplateModal\.tsx" "$ALLOWLIST" 2>/dev/null; then
      if grep -qE "TD-(238|213|209)" "$ALLOWLIST" 2>/dev/null; then
        return 0
      fi
    fi
  fi

  echo "    FAIL: SaveAsTemplateModal is flagged by orphans report" >&2
  echo "      and not present in orphans-allowlist.txt" >&2
  echo "      (a) fix the detector (track JSX edges) or" >&2
  echo "      (b) add 'frontend/src/components/SaveAsTemplateModal.tsx:SaveAsTemplateModal'" >&2
  echo "          to measure/orphans-allowlist.txt with a TD-238 reference" >&2
  return 1
}

# ─────────────────────────────────────────────────────────────────────────────
# §4. Doctor orphans exit code + allowlist hygiene
# ─────────────────────────────────────────────────────────────────────────────
#
# The orphans gate must exit 0 against the live graph.db. If it exits 1,
# the test asserts every reported entry is allowlisted (no drift). This
# is the closeout gate; it captures the false-positive fix from TD-240
# AND the wire-or-delete decisions from tasks 1-3.

test_orphans_gate_exits_zero_or_all_allowlisted() {
  precondition_build_graph || return 1
  run_orphans_live

  if [ "$ORPHANS_EXIT" -eq 0 ]; then
    return 0
  fi

  # Gate failed. The only acceptable reason is that every reported entry
  # is allowlisted (i.e., the orphan list is fully suppressed). Parse
  # the failure list (lines like "  path:symbol" after the FAIL header,
  # excluding the "  file_path:name" header).
  local reported
  reported=$(parse_orphan_entries)
  if [ -z "$reported" ]; then
    # Could not parse — fail loudly so the harness knows something
    # changed in the report format.
    echo "    FAIL: orphans gate exited $ORPHANS_EXIT but no entries parsed" >&2
    echo "      output: ${ORPHANS_OUTPUT:0:400}" >&2
    return 1
  fi

  if [ ! -f "$ALLOWLIST" ]; then
    echo "    FAIL: orphans gate exited $ORPHANS_EXIT and allowlist missing" >&2
    echo "      expected: measure/orphans-allowlist.txt with a path:symbol row per entry" >&2
    return 1
  fi

  local first_unlisted=""
  while IFS= read -r entry; do
    [ -z "$entry" ] && continue
    if ! grep -qxF "$entry" "$ALLOWLIST"; then
      first_unlisted="$entry"
      break
    fi
  done <<< "$reported"

  if [ -n "$first_unlisted" ]; then
    echo "    FAIL: orphans gate has un-allowlisted entry: $first_unlisted" >&2
    echo "      either wire/delete the symbol, or add the path:symbol" >&2
    echo "      entry to measure/orphans-allowlist.txt with a TD id" >&2
    return 1
  fi

  return 0
}

test_orphans_allowlist_has_no_stale_entries() {
  # test-strategy §3: "removing an orphan from source but leaving it in
  # the allowlist produces a warning." Phase 4's sweep must not leave
  # junk behind. We assert against the live graph.db that every entry
  # in the allowlist resolves to a real function/class node in the
  # graph. (Skip if allowlist is empty / header-only.)
  precondition_build_graph || return 1
  if [ ! -f "$ALLOWLIST" ]; then return 0; fi

  local entries
  entries=$(sed 's/#.*//' "$ALLOWLIST" | sed 's/[[:space:]]*$//' | grep -v '^[[:space:]]*$' || true)
  if [ -z "$entries" ]; then return 0; fi

  # Batch the stale-check into chunks of 80 UNION ALL clauses to avoid
  # "Argument list too long" and per-entry query overhead.
  local batch_size=80
  local union_clauses=""
  local clause_count=0
  local stale=""

  flush_stale_batch() {
    [ -z "$union_clauses" ] && return
    local result
    result=$(build-graph query "$REPO_ROOT/graph.db" "$union_clauses" 2>&1) || true
    if [ -n "$result" ] && [[ "$result" != *"(no results)"* ]]; then
      while IFS='|' read -r ep es; do
        ep=$(echo "$ep" | xargs)
        es=$(echo "$es" | xargs)
        [ -z "$ep" ] && continue
        [[ "$ep" == *"(no results)"* ]] && continue
        stale="${stale}${ep}:${es}"$'\n'
      done <<< "$result"
    fi
    union_clauses=""
    clause_count=0
  }

  while IFS= read -r entry; do
    [ -z "$entry" ] && continue
    local entry_path="${entry%%:*}"
    local entry_sym="${entry#*:}"
    entry_sym="${entry_sym//\'/\'\'}"
    entry_path="${entry_path//\'/\'\'}"
    if [ -n "$union_clauses" ]; then
      union_clauses="${union_clauses} UNION ALL "
    fi
    union_clauses="${union_clauses}SELECT '${entry_path}' AS ep, '${entry_sym}' AS es WHERE NOT EXISTS (SELECT 1 FROM nodes WHERE name = '${entry_sym}' AND file_path LIKE '%${entry_path}%' AND type IN ('function','class'))"
    clause_count=$((clause_count + 1))
    if [ "$clause_count" -ge "$batch_size" ]; then
      flush_stale_batch
    fi
  done <<< "$entries"
  flush_stale_batch

  if [ -n "$stale" ]; then
    echo "    FAIL: orphans-allowlist.txt has stale entries (no graph match):" >&2
    printf '%s' "$stale" | sed 's/^/      /' >&2
    return 1
  fi
  return 0
}

# ─────────────────────────────────────────────────────────────────────────────
# Main
# ─────────────────────────────────────────────────────────────────────────────

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  dead-code sweep test suite — Phase 4 (Red)"
echo "  track: quality_gate_enforcement_20260605"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# §1. TD-213 regression guards (should pass — already resolved).
run_test "TD-213: allocator.ts has no WorktreeManager" \
  test_td213_Allocator_source_has_no_WorktreeManager
run_test "TD-213: allocator.ts has no DispatchPacer" \
  test_td213_Allocator_source_has_no_DispatchPacer
run_test "TD-213: allocator.test.ts has no WorktreeManager" \
  test_td213_Allocator_test_has_no_WorktreeManager
run_test "TD-213: allocator.test.ts has no DispatchPacer" \
  test_td213_Allocator_test_has_no_DispatchPacer
run_test "TD-213: production exports (canAdmit, AllocationPolicy, TaskDescriptor) survive" \
  test_td213_Allocator_source_keeps_Production_exports

# §2. TD-209 wire-or-delete.
run_test "TD-209: ContinuousOrchestrator is wired or deleted" \
  test_td209_ContinuousOrchestrator_is_resolved
run_test "TD-209: StalledTaskDetector is wired or deleted" \
  test_td209_StalledTaskDetector_is_resolved
run_test "TD-209: ContinuousOrchestrator test removed when source deleted" \
  test_td209_ContinuousOrchestrator_no_orphan_test_when_deleted
run_test "TD-209: StalledTaskDetector test removed when source deleted" \
  test_td209_StalledTaskDetector_no_orphan_test_when_deleted

# §3. TD-238 SaveAsTemplateModal cross-check.
run_test "TD-238: SaveAsTemplateModal is not flagged by the orphans report" \
  test_td238_SaveAsTemplateModal_not_in_orphans_report

# §4. Doctor orphans exit code + allowlist hygiene.
run_test "orphans gate exits 0 or all entries are allowlisted" \
  test_orphans_gate_exits_zero_or_all_allowlisted
run_test "orphans-allowlist.txt has no stale entries" \
  test_orphans_allowlist_has_no_stale_entries

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
