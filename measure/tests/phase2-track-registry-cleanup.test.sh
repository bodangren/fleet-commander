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
              local checkbox
              checkbox=$(awk -v target="$link_line" '
                NR <= target && /^- \[[xX ]\]/ { last = substr($0, 1, 5) }
                NR == target { print last; exit }
              ' "$TRACKS_MD")
              if [ "$checkbox" != '- [x]' ] && [ "$checkbox" != '- [X]' ]; then
                drift+=("$id: tracks.md lists under '${section_name}' with unchecked status but metadata.status is '${status}'")
              fi ;;
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
# §E. No orphan directories under measure/tracks/ for tracks listed as
#     Archived/Completed in tracks.md (Phase 2 Task 1 — broader scope).
# ─────────────────────────────────────────────────────────────────────────
# Contract: per test-strategy.md §3 ("Phase 2 → Phase 3: archiving stale
# tracks moves files; rebuild must happen after archive moves, otherwise
# the new graph.db will re-introduce missing-file audit entries for the
# old paths"), orphan directories under measure/tracks/ for tracks that
# tracks.md already lists under an Archived or Completed section are a
# real drift signal — they would skew the Phase 3 graph rebuild. Unlike
# §A/§B which scope to the four named stale tracks, §E covers every
# Archived/Completed track in tracks.md so future archival regressions
# are caught even when the track id is outside the Phase 2 named set.
#
# Current state (verified 2026-06-18, MID attempt 3):
#   measure/tracks/provider_health_resilience_20260605/  → orphan runbook.md
#   measure/tracks/typed_convex_boundary_20260605/       → orphan inventory.md
# Both IDs are listed under "## Archived/Completed — 2026-06-05 Review
# Output" in tracks.md pointing to ./archive/<id>/, but the orphan
# directories under measure/tracks/ remain — this Red test must fail.

test_no_orphan_tracks_dir_for_archived_tracks() {
  assert_file_exists "$TRACKS_MD" "tracks.md must exist"
  local orphans=()
  # Walk every `Link: [./archive/<id>/]` AND `Link: [./tracks/<id>/]`
  # line in tracks.md; classify the containing section. An ID linked to
  # ./archive/<id>/ is by definition archived — its directory must NOT
  # remain under measure/tracks/ (which is what §E catches).
  local entries
  entries=$(grep -nE '\./(tracks|archive)/[a-z0-9_]+/' "$TRACKS_MD" || true)
  if [ -z "$entries" ]; then
    echo "    ok (no track link lines found in $TRACKS_MD — nothing to verify)" >&2
    return 0
  fi
  while IFS= read -r line; do
    [ -z "$line" ] && continue
    local link_ln track_id section_name path_kind
    link_ln=$(printf '%s\n' "$line" | cut -d: -f1)
    path_kind=$(printf '%s\n' "$line" \
      | grep -oE '\./(tracks|archive)/[a-z0-9_]+' \
      | head -n1 \
      | cut -d/ -f2)
    track_id=$(printf '%s\n' "$line" \
      | grep -oE '\./(tracks|archive)/[a-z0-9_]+' \
      | head -n1 \
      | sed 's|^\./tracks/||; s|^\./archive/||')
    if [ -z "$track_id" ]; then continue; fi
    section_name=$(awk -v target="$link_ln" '
      NR <= target && /^## / { last = $0 }
      NR == target { print last; exit }
    ' "$TRACKS_MD" | sed 's/^## //')
    case "$section_name" in
      Archived*|Completed*|"Archived/Completed"*|"Completed/Archived"*)
        # tracks.md says this track is closed. If the link points to
        # ./archive/<id>/, the directory must not remain under
        # measure/tracks/ as an orphan (regardless of metadata presence —
        # §E catches orphan directories specifically).
        if [ "$path_kind" = "archive" ] && [ -d "$TRACKS_DIR/$track_id" ]; then
          orphans+=("$track_id (under '$section_name' in tracks.md pointing to ./archive/, but $TRACKS_DIR/$track_id/ still exists as orphan)")
        fi
        # If the link points to ./tracks/<id>/ but the section says
        # Archived/Completed, that is itself drift (the link should be
        # ./archive/<id>/, not ./tracks/<id>/). §D already catches this
        # for the four named stale IDs; §E extends to all archived IDs.
        if [ "$path_kind" = "tracks" ]; then
          orphans+=("$track_id (under '$section_name' in tracks.md but link points to ./tracks/, not ./archive/)")
        fi
        ;;
    esac
  done <<EOF
$entries
EOF
  if [ "${#orphans[@]}" -eq 0 ]; then
    echo "    ok (no orphan tracks/ dirs for Archived/Completed tracks)" >&2
    return 0
  fi
  echo "    FAIL: Phase 2 Task 1 — orphan tracks/ dirs exist for Archived/Completed tracks" >&2
  for o in "${orphans[@]}"; do echo "      - $o" >&2; done
  return 1
}

# ─────────────────────────────────────────────────────────────────────────
# §F. Archived stale tracks must use the current registry metadata schema
#     (Phase 2 Task 1 — metadata consistency extension of test-strategy
#     §5 (a) "metadata.json.status matches archive vs active").
# ─────────────────────────────────────────────────────────────────────────
# Contract: per test-strategy.md §5 (a), the metadata.json for archived
# tracks must match the current registry schema — the same schema used
# by all post-2026-06-15 tracks (the three Phase 2 Task 3 remediation
# tracks and the live measure_quality_workflow_integration_20260611 /
# settings_page_refactor_20260610 archived tracks). The legacy schema
# (`id` + `title` + `created` + `updated` + `completion_note`) predates
# the post-rewrite track conventions and is drift: any tooling that
# parses the registry looking for `.track_id`, `.created_at`,
# `.updated_at`, `.description`, or `.type` will silently miss these
# two archived tracks. Phase 2 archival (bc8de63) moved the four named
# stale tracks under measure/archive/ but did not normalize the
# metadata.json schema.
#
# Current state (verified 2026-06-18, MID attempt 4): 2 of 4 stale
# tracks use the OLD schema.
#   - orchestrator_decomposition_20260605: id, title, created, updated,
#     completion_note (legacy)
#   - package_dependency_upgrades_20260607: id, title, created, updated,
#     completion_note (legacy)
#   - settings_page_refactor_20260610: track_id, description, created_at,
#     updated_at, type, status (current — passes)
#   - measure_quality_workflow_integration_20260611: track_id,
#     description, created_at, updated_at, type, status (current —
#     passes; also has `actual_tasks` listed twice in the JSON source,
#     a secondary drift logged for Green normalization)
#
# The §F contract scopes to the four named stale tracks per
# test-strategy.md §5 — the same scope as §A–§E.

test_archived_metadata_schema_current() {
  # The current registry baseline is the union of fields used by every
  # post-2026-06-15 track (the three remediation tracks plus
  # settings_page_refactor_20260610 and
  # measure_quality_workflow_integration_20260611). Required fields are
  # the schema MINIMUM every archived stale track must carry.
  local required_fields=("track_id" "description" "created_at" "updated_at" "type" "status")
  local drift=()
  for id in "${STALE_TRACK_IDS[@]}"; do
    local path="$ARCHIVE_DIR/$id/metadata.json"
    if [ ! -f "$path" ]; then
      drift+=("$id: no metadata.json under $ARCHIVE_DIR")
      continue
    fi
    local missing=()
    for field in "${required_fields[@]}"; do
      if ! jq -e "has(\"$field\")" "$path" >/dev/null 2>&1; then
        missing+=("$field")
      fi
    done
    if [ "${#missing[@]}" -gt 0 ]; then
      drift+=("$id: metadata.json missing required field(s): ${missing[*]} (legacy schema)")
    fi
  done
  if [ "${#drift[@]}" -eq 0 ]; then
    echo "    ok (all 4 stale tracks use the current registry metadata schema)" >&2
    return 0
  fi
  echo "    FAIL: Phase 2 Task 1 — metadata.json schema drift on archived stale tracks" >&2
  for d in "${drift[@]}"; do echo "      - $d" >&2; done
  return 1
}

# ─────────────────────────────────────────────────────────────────────────
# §G. THIS track's metadata.json must also use the current registry schema
#     (Phase 2 Task 1 — scope-tightening of test-strategy.md §5).
# ─────────────────────────────────────────────────────────────────────────
# Contract: per test-strategy.md §5 "for each of the four named stale
# tracks plus `build_graph_context_reconciliation_20260618` itself", the
# metadata.json schema check (§F) must apply to THIS track as well. §F
# scopes to the four named stale archived tracks only; §G extends the
# same schema contract to this track, whether it is still active or has
# since been archived at closeout. Any tooling that parses the registry looking for
# `.track_id`, `.created_at`, `.updated_at`, `.description`, or `.type`
# must find this track too.
#
# Current state (updated 2026-06-22 closeout): all 6 required fields are present
# under `measure/archive/build_graph_context_reconciliation_20260618/metadata.json`.
# §G is GREEN at HEAD — already satisfied. The Red commit lands this
# §G test and the supervisor-marker [~] flip on Phase 2 Task 1; the
# Green role's job is to verify the §G test stays green and flip Task 1
# back to [x].

test_this_track_metadata_schema_current() {
  local id="build_graph_context_reconciliation_20260618"
  local path="$TRACKS_DIR/$id/metadata.json"
  if [ ! -f "$path" ]; then
    path="$ARCHIVE_DIR/$id/metadata.json"
  fi
  if [ ! -f "$path" ]; then
    echo "    FAIL: Phase 2 Task 1 — this track's metadata.json missing at $path" >&2
    return 1
  fi
  local required_fields=("track_id" "description" "created_at" "updated_at" "type" "status")
  local missing=()
  for field in "${required_fields[@]}"; do
    if ! jq -e "has(\"$field\")" "$path" >/dev/null 2>&1; then
      missing+=("$field")
    fi
  done
  if [ "${#missing[@]}" -eq 0 ]; then
    echo "    ok (this track's metadata.json uses the current registry schema)" >&2
    return 0
  fi
  echo "    FAIL: Phase 2 Task 1 — this track's metadata.json missing required field(s): ${missing[*]} (legacy schema)" >&2
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

run_test "no orphan tracks/ dirs for tracks listed under Archived/Completed sections in tracks.md" \
  test_no_orphan_tracks_dir_for_archived_tracks

run_test "archived stale tracks use current registry metadata.json schema (track_id / created_at / updated_at / description / type / status)" \
  test_archived_metadata_schema_current

run_test "this track's metadata.json uses current registry metadata.json schema (test-strategy.md §5 scope-tightening)" \
  test_this_track_metadata_schema_current

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
