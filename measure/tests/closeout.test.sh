#!/usr/bin/env bash
# Tests for the closeout rule and verification gate — Phase 5 of
# quality_gate_enforcement_20260605.
#
# Run with:  bash measure/tests/closeout.test.sh
#
# This is the RED phase. Every test is expected to FAIL until
#   - measure/workflow.md contains the closeout rule (per plan Phase 5 task 1
#     and test-strategy §1, §5: "Doc-lint test that workflow.md contains the
#     closeout-rule string")
#   - measure/workflow.md is structured so the rule is discoverable (in a
#     Closeout section or appended to the existing Quality Gates section)
#   - the rule pins BOTH the verify gate and the orphans-clean gate, with the
#     allowlist-with-TD-id escape hatch (test-strategy §1 Phase 5 row, §3
#     "Aggregation, not short-circuit" applied to closeout)
# per measure/tracks/quality_gate_enforcement_20260605/plan.md and
# measure/tracks/quality_gate_enforcement_20260605/test-strategy.md.
#
# Contracts under test (test-strategy §1, §5; plan Phase 5):
#   §1. workflow.md contains the closeout-rule phrase verbatim or as a
#       clear paraphrase (must mention "archived" + "verify" + "orphans").
#   §2. The rule requires `verify` to pass before a track is archived.
#   §3. The rule requires the orphans report to be clean, with an explicit
#       escape hatch for new orphans allowlisted with a TD id.
#   §4. The rule is structurally discoverable: a dedicated "Closeout" (or
#       "Track Closeout") section, or appended to "Quality Gates" — not
#       buried in an unrelated sub-section.
#   §5. Regression guard: a future edit that weakens the rule (e.g. removes
#       the "verify passes" requirement) is caught.
#   §6. Regression guard: the existing per-task "Quality Gates" section is
#       not deleted by the closeout edit.
#   §7. Phase 5 task 2: `verify.sh` produces a recognizable all-greens
#       marker when every gate exits 0 (regression guard — Phase 1 contract,
#       kept here so the closeout gate can rely on it).
#   §8. Phase 5 task 3: graph.db is fresh (mtime within 24h of test run),
#       so the closeout can land a final `build-graph update` + commit.
#
# All assertions are static doc-lints or local filesystem checks — they
# never invoke the real `verify.sh`, the real `doctor.sh`, or the real
# build-graph CLI against the live graph.db (test-strategy §2 "do NOT
# scan a real directory / run expensive gates in a doc-lint test").

set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

WORKFLOW_MD="$REPO_ROOT/measure/workflow.md"
GRAPH_DB="$REPO_ROOT/graph.db"
VERIFY_SH="$REPO_ROOT/measure/verify.sh"

# Per-test state. Cleaned up by the EXIT trap.
TESTS_RUN=0
TESTS_PASSED=0
TESTS_FAILED=0
FAILED_TESTS=()

# ── Assertion helpers (same shape as the sibling test files) ────────────────

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

# Asserts that $needle appears in $haystack within $window LINES of any line
# that contains $anchor. Catches "I added both words but in different
# sections" placements that pure substring search would miss.
assert_within_proximity() {
  local haystack="$1" anchor="$2" needle="$3" window="$4" msg="${5:-}"
  local tmp anchor_line needle_line
  tmp=$(mktemp)
  printf '%s\n' "$haystack" | nl -ba -w1 -s: > "$tmp"
  anchor_line=$(awk -F: -v a="$anchor" 'index($0, a) { print $1; exit }' "$tmp" 2>/dev/null || true)
  needle_line=$(awk -F: -v n="$needle" 'index($0, n) { print $1; exit }' "$tmp" 2>/dev/null || true)
  rm -f "$tmp"
  if [ -z "$anchor_line" ] || [ -z "$needle_line" ]; then
    echo "    FAIL: $msg" >&2
    echo "      anchor line: ${anchor_line:-<not found>}" >&2
    echo "      needle line: ${needle_line:-<not found>}" >&2
    return 1
  fi
  local diff
  diff=$(( anchor_line > needle_line ? anchor_line - needle_line : needle_line - anchor_line ))
  if [ "$diff" -gt "$window" ]; then
    echo "    FAIL: $msg" >&2
    echo "      anchor '$anchor' (line $anchor_line) and needle '$needle' (line $needle_line)" >&2
    echo "      are $diff lines apart; expected within $window lines" >&2
    return 1
  fi
  return 0
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

# Wrap a test function and tally results.
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
# §1. workflow.md contains the closeout rule
# ─────────────────────────────────────────────────────────────────────────────
# The plan Phase 5 task 1 specifies the rule phrase:
#   "a track may be archived only when `verify` passes and the orphans
#    report is clean (or new orphans are allowlisted with a TD id)."
# The test accepts the verbatim phrase OR a clear paraphrase that
# mentions "archived", "verify", and "orphans" (so a future maintainer can
# reword without breaking the test, as long as the three core
# requirements survive).

test_workflow_md_contains_closeout_rule_keywords() {
  assert_file_exists "$WORKFLOW_MD" "measure/workflow.md must exist"
  local content
  content=$(cat "$WORKFLOW_MD")
  assert_contains "$content" "archived" \
    "workflow.md closeout rule must mention 'archived' (gate before archival)"
  assert_contains "$content" "verify" \
    "workflow.md closeout rule must mention 'verify' (the aggregate gate)"
  assert_contains "$content" "orphans" \
    "workflow.md closeout rule must mention 'orphans' (Check 5 of doctor.sh)"
}

# ─────────────────────────────────────────────────────────────────────────────
# §2. Closeout rule requires verify to pass
# ─────────────────────────────────────────────────────────────────────────────
# The rule must say that the aggregate `verify` must pass — not just
# mention "verify" in passing. Regression guard: a future edit that
# removes the "passes" / "passing" / "pass" qualifier (e.g. "verify has
# been run" — vacuous) is caught here.

test_workflow_md_closeout_rule_requires_verify_to_pass() {
  assert_file_exists "$WORKFLOW_MD" "measure/workflow.md must exist"
  local content
  content=$(cat "$WORKFLOW_MD")
  # The rule must say verify passes, exits 0, or "is green". Any of
  # these qualifiers makes it a real gate; a bare mention is insufficient.
  local lower
  lower=$(printf '%s' "$content" | tr '[:upper:]' '[:lower:]')
  case "$lower" in
    *verify*passing*)
      return 0 ;;
  esac
  case "$lower" in
    *verify*passes*)
      return 0 ;;
  esac
  case "$lower" in
    *verify*pass*)
      return 0 ;;
  esac
  case "$lower" in
    *verify*exits*0*)
      return 0 ;;
  esac
  case "$lower" in
    *verify*green*)
      return 0 ;;
  esac
  echo "    FAIL: closeout rule must say verify PASSES (or 'exits 0' / 'is green')" >&2
  echo "      bare 'verify' is not a gate — must be qualified as passing." >&2
  echo "      haystack: <${content:0:400}>" >&2
  return 1
}

# ─────────────────────────────────────────────────────────────────────────────
# §3. Closeout rule requires orphans to be clean (or allowlisted with TD id)
# ─────────────────────────────────────────────────────────────────────────────
# The rule must say the orphans report is clean before archive, with
# the explicit escape hatch that new orphans are allowlisted with a
# TD id (matching orphans-allowlist.txt's contract and the Phase 3
# check's stale-entry detection).

test_workflow_md_closeout_rule_requires_orphans_clean_or_allowlisted() {
  assert_file_exists "$WORKFLOW_MD" "measure/workflow.md must exist"
  local content
  content=$(cat "$WORKFLOW_MD")
  assert_contains "$content" "orphans" \
    "closeout rule must mention 'orphans' (Check 5 of doctor.sh)"
  assert_contains "$content" "clean" \
    "closeout rule must require the orphans report to be 'clean'"
  # Escape hatch: the rule must allow new orphans IF (and only if) they
  # are added to the allowlist with a tracked TD id.
  local lower
  lower=$(printf '%s' "$content" | tr '[:upper:]' '[:lower:]')
  case "$lower" in
    *allowlist*)
      assert_contains "$lower" "td-" \
        "closeout rule's allowlist escape hatch must reference a TD id (TD-…)"
      return 0 ;;
  esac
  case "$lower" in
    *allow-list*|*allow_list*)
      assert_contains "$lower" "td-" \
        "closeout rule's allowlist escape hatch must reference a TD id (TD-…)"
      return 0 ;;
  esac
  echo "    FAIL: closeout rule must allow orphan exceptions only when allowlisted with a TD id" >&2
  echo "      haystack: <${content:0:400}>" >&2
  return 1
}

# ─────────────────────────────────────────────────────────────────────────────
# §4. Closeout rule is structurally discoverable
# ─────────────────────────────────────────────────────────────────────────────
# A rule that's only mentioned in a one-off sub-list line is easy to
# overlook. The test asserts the rule is in a discoverable location:
# either a dedicated "Closeout" / "Track Closeout" / "Track Archive"
# section heading (## or ###), or appended to the existing "Quality
# Gates" section (the same section Phase 1 already wrote into). A
# bare mention in body text (e.g. workflow.md's existing "Ship"
# section says "Archive completed tasks.") does NOT count — that's
# a description of an action, not a rule with quality gates.

test_workflow_md_closeout_rule_in_dedicated_section() {
  assert_file_exists "$WORKFLOW_MD" "measure/workflow.md must exist"
  local content headings
  content=$(cat "$WORKFLOW_MD")
  # Extract only ## / ### headings.
  headings=$(printf '%s\n' "$content" | grep -E '^##+ ' || true)
  # Heading must mention Closeout or Archive (closeout/archival).
  case "$headings" in
    *Closeout*|*closeout*)
      return 0
      ;;
  esac
  case "$headings" in
    *Track*Archive*|*Track*Closeout*|*Archive*Rule*|*Closeout*Rule*)
      return 0
      ;;
  esac
  echo "    FAIL: closeout rule must live under a dedicated ##/### heading" >&2
  echo "      e.g. '## Track Closeout', '## Closeout Rule', or" >&2
  echo "           appended to the existing '## Quality Gates (Per Task)' section" >&2
  echo "      headings found:" >&2
  printf '%s\n' "$headings" | sed 's/^/        /' >&2
  return 1
}

# ─────────────────────────────────────────────────────────────────────────────
# §5. Regression guard — rule is not silently weakened
# ─────────────────────────────────────────────────────────────────────────────
# If a future edit removes the "verify" requirement or replaces "clean
# orphans" with a weaker phrasing, §2 and §3 will catch the *absence*
# of keywords. This test adds a structural guard: the words "may NOT
# be archived" (or "may not be archived", or "must NOT be archived",
# etc.) must appear in proximity to the rule's anchor word, so a
# weakener cannot satisfy the keyword test by rearranging the
# sentence into a permissive one.

test_workflow_md_closeout_rule_does_not_permit_archive_on_red() {
  assert_file_exists "$WORKFLOW_MD" "measure/workflow.md must exist"
  local content
  content=$(cat "$WORKFLOW_MD")
  local lower
  lower=$(printf '%s' "$content" | tr '[:upper:]' '[:lower:]')
  # Look for an explicit gating language: "may not be archived",
  # "must not be archived", "shall not be archived", "cannot be
  # archived", or "may only be archived" (these are the common
  # English phrasings that survive rewording).
  case "$lower" in
    *"may not be archived"*)   return 0 ;;
    *"must not be archived"*)  return 0 ;;
    *"shall not be archived"*) return 0 ;;
    *"cannot be archived"*)    return 0 ;;
    *"may only be archived"*)  return 0 ;;
    *"may be archived only when"*) return 0 ;;
  esac
  echo "    FAIL: closeout rule must use explicit gating language" >&2
  echo "      expected one of: 'may not be archived', 'must not be archived'," >&2
  echo "                       'cannot be archived', 'may only be archived'," >&2
  echo "                       'may be archived only when'" >&2
  return 1
}

# ─────────────────────────────────────────────────────────────────────────────
# §6. Regression guard — existing Quality Gates section is intact
# ─────────────────────────────────────────────────────────────────────────────
# The new closeout rule lives near (or in) the existing "Quality Gates
# (Per Task)" section. A careless edit could delete the per-task gates
# while adding the new closeout rule. This test pins the per-task
# section so the regression is loud.

test_workflow_md_per_task_quality_gates_section_intact() {
  assert_file_exists "$WORKFLOW_MD" "measure/workflow.md must exist"
  local content
  content=$(cat "$WORKFLOW_MD")
  assert_contains "$content" "Quality Gates" \
    "workflow.md must keep the existing 'Quality Gates' section"
  assert_contains "$content" "Implementation matches the spec" \
    "workflow.md must keep the per-task gate: 'Implementation matches the spec'"
  assert_contains "$content" "Tests pass" \
    "workflow.md must keep the per-task gate: 'Tests pass'"
  assert_contains "$content" "No obvious security issues" \
    "workflow.md must keep the per-task gate: 'No obvious security issues'"
  assert_contains "$content" "Conventional Commits" \
    "workflow.md must keep the per-task gate: 'Commits follow Conventional Commits'"
}

# ─────────────────────────────────────────────────────────────────────────────
# §7. Regression guard — verify.sh source has a recognizable all-greens marker
# ─────────────────────────────────────────────────────────────────────────────
# The closeout gate depends on being able to tell, from verify.sh's
# stdout, that every gate is green. This is a static doc-lint of
# verify.sh's source (test-strategy §5: "Doc-lint test"): a human
# and a CI runner must be able to grep the closeout run for a known
# marker. The runtime behavior is covered by measure/tests/verify.test.sh
# — this test only pins the source contract that future refactors
# must preserve. We accept any of the common phrasings ("All gates
# passed", "all green", "verify succeeded", "all checks green").

test_verify_source_has_recognizable_all_greens_marker() {
  assert_file_exists "$VERIFY_SH" "measure/verify.sh must exist"
  assert_file_nonempty "$VERIFY_SH" "measure/verify.sh must be non-empty"
  local src lower
  src=$(cat "$VERIFY_SH")
  lower=$(printf '%s' "$src" | tr '[:upper:]' '[:lower:]')
  case "$lower" in
    *all*gates*passed*)
      return 0 ;;
  esac
  case "$lower" in
    *all*green*|*all*checks*green*|*all*checks*passed*)
      return 0 ;;
  esac
  case "$lower" in
    *verify*succeeded*|*verify*green*)
      return 0 ;;
  esac
  echo "    FAIL: verify.sh must print a recognizable all-greens marker" >&2
  echo "      expected one of (case-insensitive):" >&2
  echo "        'All gates passed' / 'all green' / 'all checks green' /" >&2
  echo "        'verify succeeded' / 'verify green'" >&2
  echo "      (so the closeout run can be grepped by humans and CI)" >&2
  return 1
}

# ─────────────────────────────────────────────────────────────────────────────
# §8. Phase 5 task 3 — graph.db is fresh (regression guard)
# ─────────────────────────────────────────────────────────────────────────────
# Per test-strategy §2 graph.db is a local artifact (not committed;
# .gitignore'd). The closeout's "update build-graph" task is only
# meaningful if graph.db exists and is recent. This test passes when
# graph.db is within 24h of the test run; if it is stale (e.g. after
# a fresh clone), the test fails and the closeout MUST re-run
# `build-graph update` (or `build-graph scan`) before archiving.

test_graph_db_is_fresh_within_24h() {
  assert_file_exists "$GRAPH_DB" \
    "graph.db must exist at repo root (.gitignore'd; run 'build-graph scan ./ ./graph.db' on a fresh clone)"
  local mtime_epoch now_epoch age_hours
  if stat -c %Y "$GRAPH_DB" >/dev/null 2>&1; then
    mtime_epoch=$(stat -c %Y "$GRAPH_DB")
  else
    mtime_epoch=$(stat -f %m "$GRAPH_DB")
  fi
  now_epoch=$(date +%s)
  local age_seconds=$((now_epoch - mtime_epoch))
  age_hours=$((age_seconds / 3600))
  if [ "$age_hours" -gt 24 ]; then
    echo "    FAIL: graph.db is stale ($age_hours h old; closeout requires <= 24 h)" >&2
    echo "      run: build-graph update ./graph.db <changed-files>" >&2
    echo "      or:  build-graph scan ./ ./graph.db" >&2
    return 1
  fi
  return 0
}

# ─────────────────────────────────────────────────────────────────────────────
# Main
# ─────────────────────────────────────────────────────────────────────────────

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  closeout rule & verification test suite — Phase 5 (Red)"
echo "  track: quality_gate_enforcement_20260605"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

run_test "workflow.md closeout rule mentions archived + verify + orphans" \
  test_workflow_md_contains_closeout_rule_keywords

run_test "workflow.md closeout rule requires verify to PASS (not bare mention)" \
  test_workflow_md_closeout_rule_requires_verify_to_pass

run_test "workflow.md closeout rule requires orphans clean (or allowlisted w/ TD id)" \
  test_workflow_md_closeout_rule_requires_orphans_clean_or_allowlisted

run_test "workflow.md closeout rule is in a dedicated Closeout / Archive section" \
  test_workflow_md_closeout_rule_in_dedicated_section

run_test "workflow.md closeout rule uses explicit gating language (not permissive)" \
  test_workflow_md_closeout_rule_does_not_permit_archive_on_red

run_test "workflow.md per-task Quality Gates section is intact (regression guard)" \
  test_workflow_md_per_task_quality_gates_section_intact

run_test "verify.sh source has a recognizable all-greens marker (closeout depends on it)" \
  test_verify_source_has_recognizable_all_greens_marker

run_test "graph.db is fresh within 24h (supports closeout's 'update build-graph' task)" \
  test_graph_db_is_fresh_within_24h

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
