#!/usr/bin/env bash
# Tests for Phase 3 — Safe Graph Rebuild (build_graph_context_reconciliation_20260618).
#
# Run with:  bash measure/tests/phase3-graph-rebuild.test.sh
#
# This is the RED phase per test-strategy.md §7 ("Live-Proof Plan"). Each
# Phase 3 Red test is expected to FAIL at the current working-tree state
# because the canonical graph.db still contains stale file-nodes that the
# Phase 3 rebuild must eliminate. Per spec.md AC #5–#7 + test-strategy.md
# §3 + §5, Phase 3 must:
#
#   - Task 1: Preserve a backup of the current `graph.db` at
#     `graph.db.backup-20260618`.
#   - Task 2: Run `build-graph scan ./ /tmp/fleet-commander.graph.db` against
#     a temp DB. Phase-3 atomicity (§3) says the canonical `graph.db` MUST
#     remain untouched until the temp scan succeeds.
#   - Task 3: If the temp scan fails, document the failure and keep the
#     existing graph.
#   - Task 4: If the temp scan succeeds, replace `graph.db` and run
#     `build-graph stats`.
#   - Task 5: Run `build-graph audit ./graph.db --json` with an explicit long
#     timeout and store summarized evidence in this plan.md.
#
# Phase 3 contracts (test-strategy.md §1, §5, §7):
#   - The canonical graph.db must NOT contain file-nodes for missing files
#     matching `frontend/src/AppRoutes.tsx`, `*.red.test.ts`, or
#     `measure/tracks/...` (the latter because Phase 2 archived those
#     tracks; if Phase 3 does not rebuild after the archive moves, the
#     graph.db will re-introduce them as missing-file audit entries).
#   - A backup file must exist (`graph.db.backup-20260618` per
#     test-strategy.md §2).
#   - Audit summary evidence must be present in plan.md Phase 3 section.
#
# No production code touched (test-strategy.md §4). No fake harnesses —
# the existing `test -f`, `grep`, `build-graph query`, `build-graph stats`,
# and shell assertions are real, bounded, and used directly. Tests follow
# the sibling `measure/tests/phase2-track-registry-cleanup.test.sh` style.
#
# Why not use `build-graph audit --json` directly? Per test-strategy.md §6,
# that command did not finish within 60s in strategy probing on the current
# 5642-node DB. The Red tests instead replicate the audit's missing-file
# detection with `build-graph query` (a sub-second SQL read against the
# same DB), which is the same logic the audit runs internally. This
# satisfies the live-behavior proof requirement (real graph.db, real
# queries) without the unbounded hang.
#
# Per the prompt "If testing a shell runner or fake harness, prove the
# fake mode intercepts the exact command path or test the command string
# directly" — this track introduces no fake harnesses (test-strategy.md
# §1, §7). Per "Red tests must fail because the current implementation is
# missing or wrong, not merely because a durable record is stale" —
# every Red test below asserts a *missing* artifact (backup file,
# audit summary in plan.md) or a *wrong* state in the canonical graph.db
# (stale file-nodes for files that do not exist on disk). The current
# graph.db is the live state of the project, and its stale entries are
# real defects that Phase 3 fixes.
#
# Run targeted, bounded, no watch mode:
#   bash measure/tests/phase3-graph-rebuild.test.sh
# (~2s; exits non-zero while any test is red.)

set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

GRAPH_DB="$REPO_ROOT/graph.db"
GRAPH_DB_BACKUP="$REPO_ROOT/graph.db.backup-20260618"
TEMP_SCAN_DB="/tmp/fleet-commander.graph.db"
PLAN_MD="$REPO_ROOT/measure/tracks/build_graph_context_reconciliation_20260618/plan.md"

TESTS_RUN=0
TESTS_PASSED=0
TESTS_FAILED=0
FAILED_TESTS=()

# ── Assertion helpers (sibling of phase2-track-registry-cleanup.test.sh) ─────

assert_file_exists() {
  local path="$1" msg="${2:-}"
  if [ -f "$path" ]; then return 0; fi
  echo "    FAIL: $msg (file not found: $path)" >&2
  return 1
}

# Extracts the third (data) line of a `build-graph query` output that
# returns a single COUNT(*). The query output format is:
#   c
#   -
#   <value>
# Returns "" if the query fails or no value line is present.
query_count() {
  local sql="$1"
  build-graph query "$GRAPH_DB" "$sql" 2>/dev/null | awk 'NR==3'
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
# §A. Backup file exists (Phase 3 Task 1).
# ─────────────────────────────────────────────────────────────────────────
# Contract (test-strategy.md §2 + Phase 3 Task 1): `graph.db.backup-20260618`
# must exist after the backup is taken. Currently the file does NOT exist —
# this Red test must fail. After Phase 3 Task 1 lands, this test passes.

test_graph_db_backup_exists() {
  assert_file_exists "$GRAPH_DB_BACKUP" \
    "Phase 3 Task 1: graph.db.backup-20260618 must exist after the backup is taken (test-strategy.md §2)"
}

# ─────────────────────────────────────────────────────────────────────────
# §B. Canonical graph.db has no file-node for the deleted AppRoutes.tsx
#     (Phase 3 Task 2+4; spec.md §Evidence #1).
# ─────────────────────────────────────────────────────────────────────────
# Contract (spec.md AC #5/#7 + test-strategy.md §5/#7): the canonical
# graph.db must not contain file-nodes for files that do not exist on
# disk. `frontend/src/AppRoutes.tsx` was deleted (verified 2026-06-18
# MID: `ls frontend/src/AppRoutes.tsx` → No such file) but the current
# graph.db still has 1 file-node for it. Phase 3 Task 4's swap of the
# rebuilt DB will eliminate this entry.

test_no_app_routes_file_node() {
  local count
  count=$(query_count "SELECT COUNT(*) AS c FROM nodes WHERE type='file' AND file_path LIKE '%/frontend/src/AppRoutes.tsx'")
  if [ "$count" = "0" ]; then
    echo "    ok (0 AppRoutes.tsx file-nodes in canonical graph.db)" >&2
    return 0
  fi
  echo "    FAIL: Phase 3 Task 4 — graph.db has $count file-node(s) for AppRoutes.tsx (should be 0 after rebuild; spec.md §Evidence #1)" >&2
  return 1
}

# ─────────────────────────────────────────────────────────────────────────
# §C. Canonical graph.db has no file-node for *.red.test.ts files
#     (Phase 3 Task 2+4; spec.md §Evidence #1).
# ─────────────────────────────────────────────────────────────────────────
# Contract: same as §B but for the deleted `.red.test.ts` files cited in
# spec.md §Evidence #1. Verified 2026-06-18 MID: 1 file-node in graph.db
# for `pivot/src/orchestrator/qualityWorkflowRunner.red.test.ts`; file does
# NOT exist on disk. Phase 3 rebuild will eliminate this entry.

test_no_red_test_file_node() {
  local count
  count=$(query_count "SELECT COUNT(*) AS c FROM nodes WHERE type='file' AND file_path LIKE '%.red.test.ts'")
  if [ "$count" = "0" ]; then
    echo "    ok (0 .red.test.ts file-nodes in canonical graph.db)" >&2
    return 0
  fi
  echo "    FAIL: Phase 3 Task 4 — graph.db has $count file-node(s) for *.red.test.ts (should be 0 after rebuild; spec.md §Evidence #1)" >&2
  return 1
}

# ─────────────────────────────────────────────────────────────────────────
# §D. Canonical graph.db has no file-nodes under measure/tracks/ for
#     archived tracks (Phase 3 Task 2+4; test-strategy.md §3, §5).
# ─────────────────────────────────────────────────────────────────────────
# Contract (test-strategy.md §3 "Phase 2 → Phase 3: archiving stale tracks
# moves files; rebuild must happen *after* archive moves, otherwise the
# new graph.db will re-introduce missing-file audit entries for the old
# paths"): the canonical graph.db must not contain file-nodes under the
# old measure/tracks/ locations for tracks that Phase 2 archived. Active
# tracks are allowed to remain under measure/tracks/ when explicitly marked
# complete in metadata and registry (spec.md AC #3).

test_no_measure_tracks_file_node() {
  local count
  count=$(query_count "SELECT COUNT(*) AS c FROM nodes WHERE type='file' AND (file_path LIKE '%/measure/tracks/orchestrator_decomposition_20260605/%' OR file_path LIKE '%/measure/tracks/package_dependency_upgrades_20260607/%' OR file_path LIKE '%/measure/tracks/settings_page_refactor_20260610/%' OR file_path LIKE '%/measure/tracks/measure_quality_workflow_integration_20260611/%' OR file_path LIKE '%/measure/tracks/provider_health_resilience_20260605/%' OR file_path LIKE '%/measure/tracks/typed_convex_boundary_20260605/%')")
  if [ "$count" = "0" ]; then
    echo "    ok (0 measure/tracks/ file-nodes in canonical graph.db)" >&2
    return 0
  fi
  echo "    FAIL: Phase 3 Task 4 — graph.db has $count file-node(s) under measure/tracks/ (should be 0 after rebuild; test-strategy.md §3 + Phase 2 archive moves)" >&2
  return 1
}

# ─────────────────────────────────────────────────────────────────────────
# §E. Plan.md contains a Phase 3 audit summary / evidence section
#     (Phase 3 Task 5).
# ─────────────────────────────────────────────────────────────────────────
# Contract (Phase 3 Task 5 + test-strategy.md §7 Green gate row 3): the
# Green role must run `build-graph audit ./graph.db --json` with an
# explicit long timeout and "store summarized evidence in this plan."
# Currently plan.md has only the Phase 3 task checklist and the Phase 3
# Red evidence section added by this Red phase — no Phase 3 audit JSON
# output (e.g., a `missing_files` count from the audit run, or a
# `Phase 3 audit evidence` heading) is present. After Phase 3 Task 5
# lands, plan.md must contain a Phase 3 section that documents the
# audit run's missing-files count (per test-strategy.md §5: "Audit JSON
# `missing_files` count must be **0** for paths matching…"). This test
# requires BOTH a Phase 3 audit header AND a missing_files marker.

test_plan_has_phase3_audit_evidence() {
  assert_file_exists "$PLAN_MD" "plan.md must exist for the audit-evidence check"
  # Require a Phase 3-specific audit section. The Red evidence section
  # in this file mentions "audit" many times but never in a Phase 3
  # "audit evidence" / "audit JSON" / "missing_files" header that the
  # Green role will write. The Green role's section must record the
  # actual audit JSON output (missing_files count, stale symbol count,
  # etc.), so we grep for those markers in a Phase 3 context.
  local has_header has_evidence
  has_header=$(grep -cE '^### Phase 3 [Aa]udit|Phase 3 [Aa]udit [Ee]vidence|Phase 3 [Gg]reen.*[Aa]udit' "$PLAN_MD" || true)
  has_evidence=$(grep -cE 'missing_files|missing.files|stale.symbols|orphan.edges' "$PLAN_MD" || true)
  if [ "$has_header" -ge 1 ] && [ "$has_evidence" -ge 1 ]; then
    echo "    ok (Phase 3 audit evidence section + missing_files marker found in plan.md)" >&2
    return 0
  fi
  echo "    FAIL: Phase 3 Task 5 — plan.md must contain a Phase 3 audit-evidence section with missing_files / stale_symbols / orphan_edges markers (header count: $has_header, evidence count: $has_evidence)" >&2
  return 1
}

# ─────────────────────────────────────────────────────────────────────────
# Main
# ─────────────────────────────────────────────────────────────────────────

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Phase 3 Red tests — build_graph_context_reconciliation_20260618"
echo "  Safe Graph Rebuild (no production code touched; graph.db contract assertions)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

run_test "Phase 3 Task 1: graph.db.backup-20260618 backup file exists" \
  test_graph_db_backup_exists

run_test "Phase 3 Task 4: graph.db has 0 file-nodes for the deleted frontend/src/AppRoutes.tsx" \
  test_no_app_routes_file_node

run_test "Phase 3 Task 4: graph.db has 0 file-nodes for *.red.test.ts" \
  test_no_red_test_file_node

run_test "Phase 3 Task 4: graph.db has 0 file-nodes under measure/tracks/ (archived tracks)" \
  test_no_measure_tracks_file_node

run_test "Phase 3 Task 5: plan.md contains a Phase 3 audit-evidence / summary section" \
  test_plan_has_phase3_audit_evidence

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
