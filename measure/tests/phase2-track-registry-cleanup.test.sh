#!/usr/bin/env bash
# Tests for Phase 2 — Track Registry Cleanup (build_graph_context_reconciliation_20260618).
#
# Run with:  bash measure/tests/phase2-track-registry-cleanup.test.sh
#
# This is the RED phase per test-strategy.md §7 ("Live-Proof Plan"). Each
# Phase 2 Red test is expected to FAIL at the current working-tree state
# (which includes partial Green WIP that still leaves the four stale
# unarchived tracks on disk under measure/tracks/, with six unresolved
# `- [~]` tasks across two of their plan.md files).
#
# Phase 2 contracts (test-strategy.md §1, §5):
#   - Task 1 (reconcile tracks.md against metadata + plan completion state):
#     the three-way diff between filesystem location × tracks.md placement
#     × metadata.status must be empty.
#   - Task 2 (archive or mark complete the four stale unarchived completed
#     tracks): orchestrator_decomposition_20260605,
#     package_dependency_upgrades_20260607, settings_page_refactor_20260610,
#     measure_quality_workflow_integration_20260611. The canonical Green
#     outcome per test-strategy.md §7 is that these four tracks live under
#     measure/archive/, their metadata.status == "completed", and their
#     plan.md has zero `- [~]` tasks before archiving.
#   - Task 3 (remediation tracks under Planned 2026-06-18 review section):
#     already satisfied via dirty WIP — see plan.md Task 3 evidence; not a
#     Red test target per the prompt rule "mark the task as already
#     satisfied with evidence instead of creating a false Red phase".
#
# No production code touched (test-strategy.md §4). No fake harnesses —
# the existing `ls`, `jq`, `grep`, `wc`, and shell assertions are real,
# bounded, and used directly. Tests follow the sibling
# `measure/tests/phase1-context-repair.test.sh` style.
#
# Per the prompt "If testing a shell runner or fake harness, prove the
# fake mode intercepts the exact command path or test the command string
# directly" — this track introduces no fake harnesses (test-strategy.md
# §1, §7). Per "Red tests must fail because the current implementation is
# missing or wrong, not merely because a durable record is stale" — every
# Red test below asserts a *missing* artifact or *inconsistent* state, not
# the staleness of a previously-correct record.
#
# Run targeted, bounded, no watch mode:
#   bash measure/tests/phase2-track-registry-cleanup.test.sh
# (~1s; exits non-zero while any test is red.)

set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

MEASURE_DIR="$REPO_ROOT/measure"
TRACKS_DIR="$MEASURE_DIR/tracks"
ARCHIVE_DIR="$MEASURE_DIR/archive"
TRACKS_MD="$MEASURE_DIR/tracks.md"

# The four stale unarchived completed tracks named in Phase 2 Task 2
# (test-strategy.md §5, §7).
STALE_TRACK_IDS=(
  "orchestrator_decomposition_20260605"
  "package_dependency_upgrades_20260607"
  "settings_page_refactor_20260610"
  "measure_quality_workflow_integration_20260611"
)

# The three remediation tracks Phase 2 Task 3 must place under
# "Planned — 2026-06-18 Post-Rewrite Wiring Review".
REMEDIATION_TRACK_IDS=(
  "quality_workflow_hot_path_wiring_20260618"
  "operations_api_contract_closure_20260618"
  "build_graph_context_reconciliation_20260618"
)

TESTS_RUN=0
TESTS_PASSED=0
TESTS_FAILED=0
FAILED_TESTS=()

# ── Assertion helpers (sibling of phase1-context-repair.test.sh) ─────────────

assert_dir_exists() {
  local path="$1" msg="${2:-}"
  if [ -d "$path" ]; then return 0; fi
  echo "    FAIL: $msg (directory not found: $path)" >&2
  return 1
}

assert_dir_absent() {
  local path="$1" msg="${2:-}"
  if [ ! -e "$path" ]; then
    echo "    ok (absent: $path)" >&2
    return 0
  fi
  echo "    FAIL: $msg (still present: $path)" >&2
  return 1
}

assert_file_exists() {
  local path="$1" msg="${2:-}"
  if [ -f "$path" ]; then return 0; fi
  echo "    FAIL: $msg (file not found: $path)" >&2
  return 1
}

# Returns 0 if $path has zero `- [~]` task lines; 1 otherwise.
assert_no_in_progress_tasks() {
  local path="$1" msg="${2:-}"
  assert_file_exists "$path" "$msg" || return 1
  local hits
  hits=$(grep -cE '^- \[~\]' "$path" 2>/dev/null || true)
  hits=${hits:-0}
  if [ "$hits" -eq 0 ]; then
    echo "    ok (0 in-progress tasks)" >&2
    return 0
  fi
  echo "    FAIL: $msg" >&2
  printf '      %s in-progress (- [~]) task(s) found in %s:\n' "$hits" "$path" >&2
  grep -nE '^- \[~\]' "$path" | sed 's/^/        /' >&2
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
# §A. Per-track archive existence (Phase 2 Task 2).
# ─────────────────────────────────────────────────────────────────────────
# Contract (test-strategy.md §7 Green gate): the four named stale tracks
# live under measure/archive/. Current state: they live under
# measure/tracks/ and have not been moved yet, so these tests fail.

test_orchestrator_decomposition_archived() {
  assert_dir_exists \
    "$ARCHIVE_DIR/orchestrator_decomposition_20260605" \
    "Phase 2 Task 2: measure/archive/orchestrator_decomposition_20260605/ must exist after archival"
}

test_package_dependency_upgrades_archived() {
  assert_dir_exists \
    "$ARCHIVE_DIR/package_dependency_upgrades_20260607" \
    "Phase 2 Task 2: measure/archive/package_dependency_upgrades_20260607/ must exist after archival"
}

test_settings_page_refactor_archived() {
  assert_dir_exists \
    "$ARCHIVE_DIR/settings_page_refactor_20260610" \
    "Phase 2 Task 2: measure/archive/settings_page_refactor_20260610/ must exist after archival"
}

test_measure_quality_workflow_integration_archived() {
  assert_dir_exists \
    "$ARCHIVE_DIR/measure_quality_workflow_integration_20260611" \
    "Phase 2 Task 2: measure/archive/measure_quality_workflow_integration_20260611/ must exist after archival"
}

# ─────────────────────────────────────────────────────────────────────────
# §B. Archived tracks must be absent from the active tracks/ directory
#     (Phase 2 Task 2 filesystem placement).
# ─────────────────────────────────────────────────────────────────────────
# Contract: once archived, the four stale tracks must not remain in
# measure/tracks/ — leaving stale directories there defeats build-graph
# audit and skews the §7 Red command count.

test_stale_tracks_not_under_active_dir() {
  local present=()
  for track_id in "${STALE_TRACK_IDS[@]}"; do
    if [ -d "$TRACKS_DIR/$track_id" ]; then
      present+=("$track_id")
    fi
  done
  if [ "${#present[@]}" -eq 0 ]; then
    echo "    ok (no stale tracks remain in $TRACKS_DIR)" >&2
    return 0
  fi
  echo "    FAIL: Phase 2 Task 2 — stale tracks must be moved out of $TRACKS_DIR" >&2
  for t in "${present[@]}"; do echo "      - $t" >&2; done
  return 1
}

# ─────────────────────────────────────────────────────────────────────────
# §C. Archived tracks' plan.md must have zero `- [~]` tasks
#     (test-strategy.md §5 Phase 2 contract).
# ─────────────────────────────────────────────────────────────────────────
# Contract: per test-strategy.md §5, "plan.md has zero [~] tasks before
# archiving." The current dirty state still has 1 [~] in
# settings_page_refactor_20260610 and 5 [~] in
# measure_quality_workflow_integration_20260611 (confirmed via
# `grep -c '^- \[~]'`). Archiving these plans as-is would violate the
# Phase 2 §5 contract.

test_settings_page_refactor_plan_no_in_progress() {
  assert_no_in_progress_tasks \
    "$ARCHIVE_DIR/settings_page_refactor_20260610/plan.md" \
    'Phase 2 Task 2 — test-strategy.md §5: settings_page_refactor_20260610/plan.md must close its `- [~]` task before archival'
}

test_measure_quality_workflow_integration_plan_no_in_progress() {
  assert_no_in_progress_tasks \
    "$ARCHIVE_DIR/measure_quality_workflow_integration_20260611/plan.md" \
    'Phase 2 Task 2 — test-strategy.md §5: measure_quality_workflow_integration_20260611/plan.md must close its `- [~]` tasks before archival'
}

# ─────────────────────────────────────────────────────────────────────────
# §D. Three-way diff: filesystem × tracks.md × metadata.status must agree
#     (Phase 2 Task 1).
# ─────────────────────────────────────────────────────────────────────────
# Contract: every unarchived track directory under measure/tracks/ must
# (a) appear under a non-Completed/non-Archived section in tracks.md, AND
# (b) carry metadata.status ≠ "completed" / "complete". Conversely, every
# track listed in a Completed/Archived section in tracks.md must NOT have
# an active directory under measure/tracks/. The current dirty state has
# the four stale tracks under measure/tracks/ AND listed as Completed in
# tracks.md — a mismatch that this diff catches.

test_three_way_diff_empty() {
  assert_file_exists "$TRACKS_MD" "tracks.md must exist"
  local drift=()
  # Scope the diff to the four stale tracks named in Task 2 plus the
  # three remediation tracks named in Task 3. Pre-existing registry drift
  # for other tracks is out of scope for this track (see tech-debt).
  local ids
  ids=$(printf '%s\n' "${STALE_TRACK_IDS[@]}" "${REMEDIATION_TRACK_IDS[@]}" | sort -u)
  for id in $ids; do
    local in_tracks=0
    local in_archive=0
    [ -d "$TRACKS_DIR/$id" ] && in_tracks=1
    [ -d "$ARCHIVE_DIR/$id" ] && in_archive=1
    # Determine tracks.md placement section by finding the nearest preceding
    # "## " header above the bullet that names this id.
    local link_line
    link_line=$(grep -nE "\./(tracks|archive)/${id}/" "$TRACKS_MD" \
      | head -n1 | cut -d: -f1)
    if [ -z "$link_line" ]; then
      drift+=("$id: not listed in $TRACKS_MD")
      continue
    fi
    local section_name
    section_name=$(awk -v target="$link_line" '
      NR <= target && /^## / { last = $0 }
      NR == target { print last; exit }
    ' "$TRACKS_MD" | sed 's/^## //')
    case "$section_name" in
      Completed*|Archived*|"Archived/Completed"*|"Completed/Archived"*)
        # tracks.md says this track is closed; filesystem must back that up
        # by having the directory under measure/archive/ (or, for legacy
        # tracks already archived before Phase 2, simply NOT under
        # measure/tracks/).
        if [ "$in_tracks" -eq 1 ] && [ "$in_archive" -eq 0 ]; then
          drift+=("$id: tracks.md lists under '${section_name}' but filesystem still has it under $TRACKS_DIR (not $ARCHIVE_DIR)")
        fi
        if [ "$in_tracks" -eq 0 ] && [ "$in_archive" -eq 0 ]; then
          drift+=("$id: tracks.md lists under '${section_name}' but the directory is missing from both $TRACKS_DIR and $ARCHIVE_DIR")
        fi
        ;;
      Planned*|Active*|Upcoming*|Pending*)
        # tracks.md says the track is open; metadata must NOT already say
        # completed, and there must not be an archive/ directory for it.
        if [ -f "$TRACKS_DIR/$id/metadata.json" ]; then
          local status
          status=$(jq -r '.status // empty' "$TRACKS_DIR/$id/metadata.json" 2>/dev/null || true)
          case "$status" in
            completed|complete)
              drift+=("$id: tracks.md lists under '${section_name}' but metadata.status is '${status}'") ;;
          esac
        fi
        if [ -f "$ARCHIVE_DIR/$id/metadata.json" ]; then
          drift+=("$id: tracks.md lists under '${section_name}' but a directory exists under $ARCHIVE_DIR")
        fi
        ;;
    esac
  done
  if [ "${#drift[@]}" -eq 0 ]; then
    echo "    ok (no drift between filesystem × tracks.md × metadata for the 4 stale + 3 remediation tracks)" >&2
    return 0
  fi
  echo "    FAIL: Phase 2 Task 1 — three-way diff is non-empty for the four stale + three remediation tracks" >&2
  for d in "${drift[@]}"; do echo "      - $d" >&2; done
  return 1
}

# ─────────────────────────────────────────────────────────────────────────
# Main
# ─────────────────────────────────────────────────────────────────────────

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Phase 2 Red tests — build_graph_context_reconciliation_20260618"
echo "  Track Registry Cleanup (no production code touched; registry/contract assertions)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

run_test "stale track: orchestrator_decomposition_20260605 lives under measure/archive/" \
  test_orchestrator_decomposition_archived

run_test "stale track: package_dependency_upgrades_20260607 lives under measure/archive/" \
  test_package_dependency_upgrades_archived

run_test "stale track: settings_page_refactor_20260610 lives under measure/archive/" \
  test_settings_page_refactor_archived

run_test "stale track: measure_quality_workflow_integration_20260611 lives under measure/archive/" \
  test_measure_quality_workflow_integration_archived

run_test "stale tracks: not present under measure/tracks/" \
  test_stale_tracks_not_under_active_dir

run_test 'settings_page_refactor_20260610/plan.md has zero in-progress (- [~]) tasks' \
  test_settings_page_refactor_plan_no_in_progress

run_test 'measure_quality_workflow_integration_20260611/plan.md has zero in-progress (- [~]) tasks' \
  test_measure_quality_workflow_integration_plan_no_in_progress

run_test "three-way diff (filesystem × tracks.md × metadata.status) is empty" \
  test_three_way_diff_empty

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