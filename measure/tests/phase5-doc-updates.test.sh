#!/usr/bin/env bash
# Tests for Phase 5 closeout — settings_page_refactor_20260610.
#
# Run with:  bash measure/tests/phase5-doc-updates.test.sh
#
# This is the RED phase. Every test is expected to FAIL until:
#   - measure/tech-debt.md moves TD-216 from "Open Tech Debt" to
#     "Resolved (this review)" — the SettingsPage god-file + SoT race
#     was fixed by Phases 1-4.
#   - measure/lessons-learned.md gains a new entry documenting the
#     optimistic-mutation rollback pattern used in
#     frontend/src/pages/settings/NotificationSettingsSection.tsx.
#
# Both deliverables are doc updates; per the prompt's "Artifact or markdown
# assertions are allowed only when the phase deliverable is that artifact"
# rule they are paired with a live-behavior proof: the Phase 5 Red
# evidence records the current `pivot test`, `pivot typecheck`, and
# `doctor.sh all` runs. The JR Green phase re-runs the same commands
# after the doc edits land, owning the live gate (per plan §"Phase 5
# Green confirmation" pattern from Phases 1-4).
#
# The tests follow the sibling `measure/tests/closeout.test.sh` style:
# bash assertions against the file content. No production code, no
# graph.db writes, no real test-suite smoke.

set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

TECH_DEBT_MD="$REPO_ROOT/measure/tech-debt.md"
LESSONS_LEARNED_MD="$REPO_ROOT/measure/lessons-learned.md"

TESTS_RUN=0
TESTS_PASSED=0
TESTS_FAILED=0
FAILED_TESTS=()

# ── Assertion helpers (sibling of closeout.test.sh / orphans.test.sh) ─────

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

# Extract the slice of $file between the line containing $start_anchor
# (inclusive) and the next line starting with "## " (exclusive). Returns
# empty string if start_anchor is not found. Used to scope assertions to
# a specific section.
slice_section() {
  local file="$1" start_anchor="$2"
  awk -v start="$start_anchor" '
    $0 ~ start { in_section = 1 }
    in_section {
      print
      if ($0 ~ /^## / && $0 !~ start) exit
    }
  ' "$file"
}

# Variant that escapes literal parentheses with bracket expressions so the
# anchor "## Resolved (this review)" matches. awk's default regex flavor
# treats `\(` as a literal `(` only inside `[ ]`, so we swap the literal
# parens for `[(` / `[)]` before passing into awk. Used by the second
# tech-debt.md test below.
slice_section_paren_safe() {
  local file="$1" start_anchor="$2"
  local escaped="${start_anchor//\(/[(}"; escaped="${escaped//\)/[)]}"
  awk -v start="$escaped" '
    $0 ~ start { in_section = 1 }
    in_section {
      print
      if ($0 ~ /^## / && $0 !~ start) exit
    }
  ' "$file"
}

# ─────────────────────────────────────────────────────────────────────────────
# §1. tech-debt.md: TD-216 moved to Resolved
# ─────────────────────────────────────────────────────────────────────────────
# Plan Phase 5 task: "Update tech-debt.md: mark TD-216 as resolved."
# TD-216 is the SettingsPage god-file + notification preference SoT race.
# Phases 1-4 deleted SettingsPage.tsx, replaced it with focused
# sub-components (AppConfigSection, NotificationSettingsSection,
# AgentDefaultsSection, ProfileSettingsSection, SettingsLayout), and
# fixed the race via the typed Convex boundary. The entry should now
# move from Open Tech Debt to Resolved (this review).
#
# Contracts:
#   - TD-216 is NOT in the "## Open Tech Debt" section.
#   - TD-216 IS in the "## Resolved (this review)" section.

test_td_216_not_in_open_tech_debt() {
  assert_file_exists "$TECH_DEBT_MD" "measure/tech-debt.md must exist"
  local open_section
  open_section=$(slice_section "$TECH_DEBT_MD" "## Open Tech Debt")
  if [ -z "$open_section" ]; then
    echo "    FAIL: '## Open Tech Debt' section not found in tech-debt.md" >&2
    return 1
  fi
  assert_not_contains "$open_section" "TD-216" \
    "TD-216 must be removed from '## Open Tech Debt' (moved to Resolved after Phase 4 wired sub-pages)"
}

test_td_216_in_resolved_section() {
  assert_file_exists "$TECH_DEBT_MD" "measure/tech-debt.md must exist"
  local resolved_section
  resolved_section=$(slice_section_paren_safe "$TECH_DEBT_MD" "## Resolved (this review)")
  if [ -z "$resolved_section" ]; then
    echo "    FAIL: '## Resolved (this review)' section not found in tech-debt.md" >&2
    return 1
  fi
  assert_contains "$resolved_section" "TD-216" \
    "TD-216 must appear in '## Resolved (this review)' with a Fixed: resolution note"
}

# ─────────────────────────────────────────────────────────────────────────────
# §2. lessons-learned.md: new optimistic-mutation rollback pattern note
# ─────────────────────────────────────────────────────────────────────────────
# Plan Phase 5 task: "Update lessons-learned.md: add note on
# optimistic-mutation rollback pattern."
# The implementation lives in
# frontend/src/pages/settings/NotificationSettingsSection.tsx
# (characterized by 7 tests in
#  frontend/src/pages/settings/NotificationSettingsSection.test.tsx).
# The plan asks for a new lessons-learned note documenting the pattern
# (a "Pattern That Worked Well" entry, distinct from the existing
# (state_mutation) gotcha that warns against naive optimistic mutation).
#
# Contract:
#   - lessons-learned.md contains a `(optimistic_mutation_rollback)`
#     marker that is not currently present in the file. The marker is
#     new; no existing entry uses it.

test_lessons_learned_has_optimistic_rollback_pattern_note() {
  assert_file_exists "$LESSONS_LEARNED_MD" "measure/lessons-learned.md must exist"
  local content
  content=$(cat "$LESSONS_LEARNED_MD")
  assert_contains "$content" "(optimistic_mutation_rollback)" \
    "lessons-learned.md must contain a new (optimistic_mutation_rollback) entry under Patterns That Worked Well documenting the NotificationSettingsSection rollback approach (local-mirror-of-query, invert on click, restore on mutation rejection)"
}

# ─────────────────────────────────────────────────────────────────────────────
# Main
# ─────────────────────────────────────────────────────────────────────────────

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Phase 5 closeout tests — settings_page_refactor_20260610 (Red)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

run_test "tech-debt.md: TD-216 removed from 'Open Tech Debt' section" \
  test_td_216_not_in_open_tech_debt

run_test "tech-debt.md: TD-216 added to 'Resolved (this review)' section" \
  test_td_216_in_resolved_section

run_test "lessons-learned.md: new (optimistic_mutation_rollback) pattern entry" \
  test_lessons_learned_has_optimistic_rollback_pattern_note

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
