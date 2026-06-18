#!/usr/bin/env bash
# Tests for Phase 1 — Context Repair (build_graph_context_reconciliation_20260618).
#
# Run with:  bash measure/tests/phase1-context-repair.test.sh
#
# This is the RED phase per test-strategy.md §7 ("Live-Proof Plan"). Each test
# is expected to FAIL at HEAD until the Phase 1 doc repair lands:
#
#   - measure/index.md must link only existing files, OR explicitly annotate
#     generated artifacts (architecture.json / generate.sh) as unavailable.
#     The acceptance criterion in spec.md AC #1 requires that any reference to
#     those generated artifacts be in an "unavailable / retired" annotation.
#   - measure/product.md, workflow.md, tech-stack.md, current_directive.md
#     must describe the current Bun AutoRunner / Convex / React Router 7
#     architecture. Retired scheduler/human-review phrasing outside an
#     explicit "deprecated" or "legacy" annotation fails AC #2.
#   - measure/lessons-learned.md and measure/tech-debt.md must stay at or
#     below the 50-line curated cap (AC #4, doctor.sh enforcement).
#
# No production code touched. No fake harnesses — the existing `grep`, `wc`,
# and shell assertions are real, bounded, and used directly. Tests follow the
# sibling measure/tests/phase5-doc-updates.test.sh style. Per the prompt
# "Artifact or markdown assertions are allowed only when the phase deliverable
# is that artifact, and they must be paired with a live-behavior proof or an
# explicit plan note saying which later role owns the live gate" — Phase 1 is
# a doc/governance phase whose deliverable IS the artifact set, so the
# artifact assertions are the contract; the live-behavior proof that the
# Green commit succeeds against the same grep/wc is recorded in plan.md
# Phase 1 Green confirmation by the JR role.
#
# Per the prompt "If testing a shell runner or fake harness, prove the fake
# mode intercepts the exact command path or test the command string directly"
# — this track introduces no fake harnesses (test-strategy.md §1, §7).
#
# Run targeted, bounded, no watch mode:
#   bash measure/tests/phase1-context-repair.test.sh
# (~1s; exits non-zero while any test is red.)

set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

INDEX_MD="$REPO_ROOT/measure/index.md"
PRODUCT_MD="$REPO_ROOT/measure/product.md"
WORKFLOW_MD="$REPO_ROOT/measure/workflow.md"
TECH_STACK_MD="$REPO_ROOT/measure/tech-stack.md"
CURRENT_DIRECTIVE_MD="$REPO_ROOT/measure/current_directive.md"
PRODUCT_GUIDELINES_MD="$REPO_ROOT/measure/product-guidelines.md"
LESSONS_LEARNED_MD="$REPO_ROOT/measure/lessons-learned.md"
TECH_DEBT_MD="$REPO_ROOT/measure/tech-debt.md"

TESTS_RUN=0
TESTS_PASSED=0
TESTS_FAILED=0
FAILED_TESTS=()

# ── Assertion helpers (sibling of phase5-doc-updates.test.sh) ─────────────

assert_file_exists() {
  local path="$1" msg="${2:-}"
  if [ -f "$path" ]; then return 0; fi
  echo "    FAIL: $msg (file not found: $path)" >&2
  return 1
}

assert_line_count_le() {
  local path="$1" limit="$2" msg="${3:-}"
  assert_file_exists "$path" "$msg" || return 1
  local n
  n=$(wc -l <"$path")
  if [ "$n" -le "$limit" ]; then
    echo "    ok (${n}/${limit} lines)" >&2
    return 0
  fi
  echo "    FAIL: $msg" >&2
  echo "      got: ${n} lines, limit: ${limit}" >&2
  return 1
}

assert_no_grep() {
  local pattern="$1" path="$2" msg="${3:-}"
  assert_file_exists "$path" "$msg" || return 1
  local hit
  hit=$(grep -nE "$pattern" "$path" 2>/dev/null || true)
  if [ -z "$hit" ]; then return 0; fi
  echo "    FAIL: $msg" >&2
  echo "      pattern: /$pattern/" >&2
  echo "      hits:" >&2
  echo "$hit" | sed 's/^/        /' >&2
  return 1
}

assert_grep_only_annotated() {
  # Per test-strategy.md §5: "Any hit that is not explicitly an
  # 'unavailable / retired' annotation fails the phase." Enforce by requiring
  # every matching line in $path to contain one of $markers (whitespace
  # separated). Returns 0 if there are no matches OR every match carries a
  # marker; 1 otherwise.
  local pattern="$1" path="$2" markers="$3" msg="${4:-}"
  assert_file_exists "$path" "$msg" || return 1
  local hit annotated=0 unannotated=()
  hit=$(grep -nE "$pattern" "$path" 2>/dev/null || true)
  if [ -z "$hit" ]; then return 0; fi
  while IFS= read -r line; do
    local ok=0
    for marker in $markers; do
      case "$line" in
        *"$marker"*) ok=1; break ;;
      esac
    done
    if [ "$ok" -eq 1 ]; then
      annotated=$((annotated + 1))
    else
      unannotated+=("$line")
    fi
  done <<<"$hit"
  if [ "${#unannotated[@]}" -eq 0 ]; then
    echo "    ok (${annotated} annotated, 0 unannotated)" >&2
    return 0
  fi
  echo "    FAIL: $msg" >&2
  echo "      pattern: /$pattern/" >&2
  echo "      unannotated hits:" >&2
  for u in "${unannotated[@]}"; do echo "        $u" >&2; done
  return 1
}

# Slice the lines from $file starting at $start_anchor up to (but not
# including) the next line starting with "## " (or end of file). Returns ""
# if anchor not found. awk one-liner mirrored from
# phase5-doc-updates.test.sh::slice_section.
slice_section() {
  local file="$1" start_anchor="$2"
  awk -v start="$start_anchor" '
    $0 ~ start { in_section = 1 }
    in_section { print; if ($0 ~ /^## / && $0 !~ start) exit }
  ' "$file"
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
# §1. measure/index.md — no unannotated generated-artifact references.
# ─────────────────────────────────────────────────────────────────────────
# Contract (Phase 1 Task 1, spec.md AC #1): index.md must link only existing
# context files, or mark generated artifacts (architecture.json /
# generate.sh) as explicitly unavailable. test-strategy.md §5: "Any hit
# that is not explicitly an 'unavailable / retired' annotation fails the
# phase."

test_index_md_artifact_links_are_annotated() {
  assert_grep_only_annotated \
    'architecture\.json|generate\.sh' \
    "$INDEX_MD" \
    "unavailable not present rebuild" \
    "index.md must not contain unannotated references to architecture.json or generate.sh (Phase 1 Task 1, spec.md AC #1)"
}

# Adversarial auditor addition (Phase 1 audit, 2026-06-18): spec.md AC #1
# states "links only existing context files or explicitly marks generated
# artifacts as unavailable." The first test above covers the
# architecture.json / generate.sh pattern, but does NOT prove that every
# other markdown link in index.md resolves. A previous audit (commit
# 96ef501, May 2026) deleted measure/getdesign.md as an obsolete design
# preview, but the link `[Design Catalog](./getdesign.md)` remained in
# index.md — an unrepaired AC #1 violation that pre-dates this track.
# This test extracts every `(./...)`, `(../...)`, or external link from
# index.md and asserts each relative path resolves to an existing file
# or directory. Lines that already annotate the target as
# "unavailable"/"not present" are skipped (the explicit-unavailable
# allowance in AC #1).

test_index_md_relative_links_resolve() {
  assert_file_exists "$INDEX_MD" "index.md must exist for link-resolution check"
  local index_dir links missing=() checked=0
  index_dir="$(cd "$REPO_ROOT/measure" && pwd)"
  # Extract every markdown relative link target of the form (./path)
  # or (../path). External http(s) links and in-page anchors (#...) are
  # out of scope for AC #1.
  mapfile -t links < <(grep -oE '\]\((\.\.?/[^)]+)\)' "$INDEX_MD" \
    | sed -E 's#^\]\(([^)]+)\)$#\1#' \
    | sort -u)
  if [ "${#links[@]}" -eq 0 ]; then
    echo "    ok (no relative links found to verify)" >&2
    return 0
  fi
  for link in "${links[@]}"; do
    # Strip trailing slash for fs checks but keep the original for
    # "directory exists" reporting.
    local target_fs
    target_fs="$index_dir/${link%/}"
    # Treat trailing-slash links (e.g. ./tracks/) as directory
    # existence; otherwise file existence.
    if [ -e "$target_fs" ]; then
      checked=$((checked + 1))
      continue
    fi
    # Re-check directory form for trailing-slash links.
    if [ "${link: -1}" = "/" ] && [ -d "$target_fs" ]; then
      checked=$((checked + 1))
      continue
    fi
    missing+=("$link")
  done
  if [ "${#missing[@]}" -eq 0 ]; then
    echo "    ok (${checked} relative link(s) resolve)" >&2
    return 0
  fi
  echo "    FAIL: index.md contains ${#missing[@]} broken relative link(s) (spec.md AC #1 — 'links only existing context files')" >&2
  for m in "${missing[@]}"; do echo "      - $m" >&2; done
  return 1
}

# ─────────────────────────────────────────────────────────────────────────
# §2. product.md — Kanban + Runtime Architecture use AutoRunner, not
#    retired "scheduler".
# ─────────────────────────────────────────────────────────────────────────
# Contract (Phase 1 Task 2, spec.md AC #2): product.md describes the current
# Bun AutoRunner / Convex architecture. Stale "cron scheduler" and
# Kanban-table "scheduler" wording fails AC #2 because the canonical
# production claimant is pivot/src/orchestrator/autoRunner.ts.

test_product_md_kanban_no_scheduler() {
  assert_no_grep 'waiting for scheduler|Scheduler \(auto\)' "$PRODUCT_MD" \
    "product.md Kanban column table must not describe Ready/In Progress as a 'scheduler' move — orchestrator/AutoRunner is the production claimant"
}

test_product_md_runtime_no_cron_scheduler() {
  assert_no_grep 'cron scheduler' "$PRODUCT_MD" \
    "product.md Runtime Architecture must not describe Bun as a 'cron scheduler' — pivot/src/orchestrator/autoRunner.ts owns dispatch, not cron"
}

# ─────────────────────────────────────────────────────────────────────────
# §3. Context docs — no retired human-review phrasing.
# ─────────────────────────────────────────────────────────────────────────
# Contract (Phase 1 Task 2, test-strategy.md §5): the four context docs
# (index, product, workflow, tech-stack) must not retain retired
# human-review approval flow language. Any hit that is not annotated
# "deprecated" / "legacy" / "reference" fails AC #2.

test_context_docs_no_human_review() {
  assert_no_grep 'human-review|human review' "$PRODUCT_MD" \
    "product.md must not describe a retired human-review flow"
  assert_no_grep 'human-review|human review' "$WORKFLOW_MD" \
    "workflow.md must not describe a retired human-review flow"
  assert_no_grep 'human-review|human review' "$TECH_STACK_MD" \
    "tech-stack.md must not describe a retired human-review flow"
  assert_no_grep 'human-review|human review' "$INDEX_MD" \
    "index.md must not describe a retired human-review flow"
  # spec.md AC #2 also lists current_directive.md; assert the same
  # retired-phrasing contract there so future regressions in the
  # directive document are caught by this test.
  assert_no_grep 'human-review|human review' "$CURRENT_DIRECTIVE_MD" \
    "current_directive.md must not describe a retired human-review flow (spec.md AC #2)"
}

# ─────────────────────────────────────────────────────────────────────────
# §4. context docs — describe current Bun / Convex / React Router 7 stack.
# ─────────────────────────────────────────────────────────────────────────
# Contract (Phase 1 Task 2, spec.md AC #2): the four canonical docs must
# pin the actual production surfaces so future agents don't regress to
# retired stack descriptions. Each assertion below targets a specific
# AC #2 deliverable that the Phase 1 doc repair must add; current HEAD
# does not include them, so these tests fail until the docs land.

test_workflow_md_names_bun_orchestrator() {
  assert_file_exists "$WORKFLOW_MD" "workflow.md must exist"
  local content
  content=$(cat "$WORKFLOW_MD")
  case "$content" in
    *autoRunner.ts*|*AutoRunner*)
      echo "    ok (AutoRunner referenced)" >&2
      return 0 ;;
    *)
      echo "    FAIL: workflow.md must reference pivot/src/orchestrator/autoRunner.ts or AutoRunner as the canonical production scheduler (spec.md AC #2)" >&2
      return 1 ;;
  esac
}

test_tech_stack_md_names_react_router_7() {
  assert_file_exists "$TECH_STACK_MD" "tech-stack.md must exist"
  local content
  content=$(cat "$TECH_STACK_MD")
  case "$content" in
    *React\ Router\ 7*|*react-router-7*|*data-router*)
      echo "    ok (React Router 7 referenced)" >&2
      return 0 ;;
    *)
      echo "    FAIL: tech-stack.md must reference React Router 7 (data-router) as the frontend router (spec.md AC #2)" >&2
      return 1 ;;
  esac
}

test_product_md_quality_workflow_remediation_tracked() {
  assert_file_exists "$PRODUCT_MD" "product.md must exist"
  local content
  content=$(cat "$PRODUCT_MD")
  case "$content" in
    *quality_workflow_hot_path_wiring_20260618*)
      echo "    ok (remediation track referenced)" >&2
      return 0 ;;
    *)
      echo "    FAIL: product.md must point future readers at quality_workflow_hot_path_wiring_20260618 for the QualityWorkflowRunner hot-path gap (spec.md AC #2 + current_directive note)" >&2
      return 1 ;;
  esac
}

# ─────────────────────────────────────────────────────────────────────────
# §5. Curated working-memory files stay under the 50-line cap.
# ─────────────────────────────────────────────────────────────────────────
# Contract (Phase 1 Task 3, spec.md AC #4): doctor.sh enforces ≤ 50 lines
# on both lessons-learned.md and tech-debt.md. The tests below are a
# pre-flight before the live gate in Phase 4 §4 (doctor.sh all).

test_lessons_learned_under_50_lines() {
  assert_line_count_le "$LESSONS_LEARNED_MD" 50 \
    "lessons-learned.md must stay at or below the 50-line curated cap (spec.md AC #4, doctor.sh god-file check)"
}

test_tech_debt_under_50_lines() {
  assert_line_count_le "$TECH_DEBT_MD" 50 \
    "tech-debt.md must stay at or below the 50-line curated cap (spec.md AC #4, doctor.sh god-file check)"
}

# ─────────────────────────────────────────────────────────────────────────
# Main
# ─────────────────────────────────────────────────────────────────────────

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Phase 1 Red tests — build_graph_context_reconciliation_20260618"
echo "  Context Repair (no production code touched; doc/contract assertions)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

run_test "index.md: no unannotated architecture.json / generate.sh references" \
  test_index_md_artifact_links_are_annotated

run_test "index.md: every relative link resolves to an existing file/dir (spec AC #1)" \
  test_index_md_relative_links_resolve

run_test "product.md: Kanban table has no stale 'scheduler' column moves" \
  test_product_md_kanban_no_scheduler

run_test "product.md: Runtime Architecture has no 'cron scheduler' phrasing" \
  test_product_md_runtime_no_cron_scheduler

run_test "context docs: no retired human-review phrasing (product/workflow/tech-stack/index)" \
  test_context_docs_no_human_review

run_test "workflow.md: names pivot/src/orchestrator/autoRunner.ts as canonical scheduler" \
  test_workflow_md_names_bun_orchestrator

run_test "tech-stack.md: names React Router 7 (data-router) frontend router" \
  test_tech_stack_md_names_react_router_7

run_test "product.md: Quality Workflow notes the quality_workflow_hot_path_wiring_20260618 remediation" \
  test_product_md_quality_workflow_remediation_tracked

run_test "lessons-learned.md ≤ 50 lines" \
  test_lessons_learned_under_50_lines

run_test "tech-debt.md ≤ 50 lines" \
  test_tech_debt_under_50_lines

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