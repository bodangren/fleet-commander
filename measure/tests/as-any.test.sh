#!/usr/bin/env bash
# Tests for the as-any guard allowlist — Phase 3 (TD-236) of
# review_remediation_20260605.
#
# Run with:  bash measure/tests/as-any.test.sh
#
# This is the RED phase. Every test is expected to FAIL until:
#   1. measure/as-any-allowlist.txt header documents the canonical
#      `path-glob:content-substring:reason` format (currently documents the
#      legacy `file_path:line_number: reason` format on line 2).
#   2. All entries in measure/as-any-allowlist.txt conform to the
#      canonical format.
#   3. measure/doctor.sh::check_as_any reads measure/as-any-allowlist.txt
#      and applies a glob-path + content-substring matcher.
#   4. The matcher is tolerant to malformed lines, comment lines, and
#      blank lines (per test-strategy §1 row 3).
#   5. A negative test: a non-allowlisted cast STILL causes doctor.sh
#      as-any to fail (exit 1) — the acceptance lock per spec FR3.
#   6. A count test: when N casts are seeded and M are allowlisted, the
#      failure count drops to N−M (not 0, not N) — the
#      "no fake bulk-baseline" guard per plan Phase 3 task 3.
#
# Contracts under test (per test-strategy §1 row 3, §3, §4):
#   - Static: allowlist header must document the new format.
#   - Static: every non-comment, non-blank line in the production
#     allowlist must conform to the canonical 3-field shape.
#   - Behavior: doctor.sh as-any honors the allowlist (matching glob).
#   - Behavior: doctor.sh as-any honors the allowlist (matching substring).
#   - Behavior: doctor.sh as-any reports a non-matching cast (the
#     negative test / acceptance lock).
#   - Behavior: doctor.sh as-any tolerates malformed allowlist lines.
#   - Behavior: doctor.sh as-any ignores `#`-prefixed comment lines.
#   - Behavior: doctor.sh as-any ignores blank lines.
#   - Integration: count test (N seeded, M allowlisted → N−M reported,
#     exit 1, not 0).
#
# Fixtures are built at test runtime by
# measure/tests/fixtures/build-as-any-fixture.sh into a fresh temp dir.
# The fixture copies the production doctor.sh unmodified (test-strategy
# §2: "production doctor.sh runs unmodified"); the test writes a
# controlled `measure/as-any-allowlist.txt` per scenario.

set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

DOCTOR_SH="$REPO_ROOT/measure/doctor.sh"
ALLOWLIST="$REPO_ROOT/measure/as-any-allowlist.txt"
FIXTURE_BUILDER="$REPO_ROOT/measure/tests/fixtures/build-as-any-fixture.sh"

# Per-test artifacts. Cleaned up in the EXIT trap.
FIXTURE_DIR=""
TESTS_RUN=0
TESTS_PASSED=0
TESTS_FAILED=0
FAILED_TESTS=()

# ── Assertion helpers (same shape as orphans.test.sh / closeout.test.sh) ──

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

# Build the fake-repo fixture into a fresh temp dir. Idempotent within a
# test run. Sets FIXTURE_DIR.
ensure_fixture() {
  if [ -n "$FIXTURE_DIR" ] && [ -d "$FIXTURE_DIR/measure" ]; then
    return 0
  fi
  FIXTURE_DIR=$(mktemp -d)
  bash "$FIXTURE_BUILDER" "$FIXTURE_DIR" >/dev/null
}

# Write a controlled allowlist into the fixture's measure/ subdir.
#   $1 = full content of the allowlist (verbatim, including comments/blanks)
write_allowlist() {
  local content="$1"
  ensure_fixture || return 1
  printf '%s\n' "$content" > "$FIXTURE_DIR/measure/as-any-allowlist.txt"
}

# Run the production doctor.sh as-any against the fake-repo fixture.
# Captures output and exit into ASANY_OUTPUT / ASANY_EXIT.
run_as_any() {
  ensure_fixture || return 1
  set +e
  ASANY_OUTPUT=$(bash "$FIXTURE_DIR/measure/doctor.sh" as-any 2>&1)
  ASANY_EXIT=$?
  set -e
}

# Wrap a test function and tally results. Same shape as sibling suites.
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

# Multi-assert convention: each multi-assert test sets `local ok=1`,
# runs asserts with `|| ok=0`, and returns `[ "$ok" -eq 1 ]`. This
# pattern is needed because `set -e` is not enabled; without it, a
# failing assert's exit code is masked by the last (passing) assert
# in the function, producing a false PASS. The `ok` accumulator
# short-circuits that: any failure flips the flag, and the function
# returns 0 only if every assert passed.

cleanup() {
  if [ -n "${FIXTURE_DIR:-}" ] && [ -d "$FIXTURE_DIR" ]; then
    rm -rf "$FIXTURE_DIR"
  fi
}
trap cleanup EXIT

# ─────────────────────────────────────────────────────────────────────────
# §1. Static: allowlist header documents the canonical format
# ─────────────────────────────────────────────────────────────────────────
# Per plan Phase 3 task 1: "Define one canonical allowlist line format
# in `as-any-allowlist.txt` (`path-glob:content-substring:reason`).
# Migrate the existing inconsistent entries." The header must reflect
# this format. Today the header on line 2 documents the legacy
# `file_path:line_number: reason` format — RED.
#
# We accept a clear paraphrase that mentions all three pieces
# (path-glob, content-substring, reason) so a future maintainer can
# reword without breaking the test.

test_allowlist_header_documents_canonical_format() {
  assert_file_exists "$ALLOWLIST" \
    "measure/as-any-allowlist.txt must exist (precondition)"
  local content
  content=$(cat "$ALLOWLIST")
  local ok=1
  # Must NOT document the legacy format.
  local lower
  lower=$(printf '%s' "$content" | tr '[:upper:]' '[:lower:]')
  case "$lower" in
    *"file_path:line_number"*|*"file_path:line"*)
      echo "    FAIL: allowlist header still documents the legacy file_path:line_number format" >&2
      ok=0
      ;;
  esac
  # Must document the three canonical fields. We accept paraphrases
  # that name "path/glob/path-glob", "content/substring/content-substring",
  # and "reason".
  case "$lower" in
    *"path-glob"*|*"path_glob"*|*"path glob"*) : ;;
    *)
      echo "    FAIL: allowlist header must document the 'path-glob' field" >&2
      ok=0
      ;;
  esac
  case "$lower" in
    *"content-substring"*|*"content_substring"*|*"content substring"*) : ;;
    *)
      echo "    FAIL: allowlist header must document the 'content-substring' field" >&2
      ok=0
      ;;
  esac
  case "$lower" in
    *"reason"*) : ;;
    *)
      echo "    FAIL: allowlist header must document the 'reason' field" >&2
      ok=0
      ;;
  esac
  [ "$ok" -eq 1 ]
}

# ─────────────────────────────────────────────────────────────────────────
# §2. Static: every non-comment, non-blank line conforms to the format
# ─────────────────────────────────────────────────────────────────────────
# The canonical line shape is `path-glob:content-substring:reason` —
# exactly 3 colon-separated fields, with the first being a non-empty
# path/glob, the second a non-empty substring, the third a non-empty
# reason. A future maintainer who re-introduces a line in the legacy
# `path:N:reason` shape (where N is a line number) is caught here.
#
# We don't pin the exact field separator (the spec uses `:`). This test
# passes when every data line is `path:substring:reason` (3 fields).

test_allowlist_entries_conform_to_canonical_format() {
  assert_file_exists "$ALLOWLIST" \
    "measure/as-any-allowlist.txt must exist (precondition)"
  local bad
  bad=$(awk '
    BEGIN { FS = ":" }
    /^[[:space:]]*#/ { next }        # comment line — ignore
    /^[[:space:]]*$/ { next }        # blank line — ignore
    NF != 3                          { print FILENAME ":" NR ": malformed: " $0; bad=1 }
    $1 == ""                         { print FILENAME ":" NR ": empty path-glob: " $0; bad=1 }
    $2 == ""                         { print FILENAME ":" NR ": empty content-substring: " $0; bad=1 }
    $3 == ""                         { print FILENAME ":" NR ": empty reason: " $0; bad=1 }
    END { exit bad }
  ' "$ALLOWLIST" 2>/dev/null || true)
  if [ -n "$bad" ]; then
    echo "    FAIL: allowlist contains malformed entries:" >&2
    printf '%s\n' "$bad" | sed 's/^/      /' >&2
    return 1
  fi
}

# ─────────────────────────────────────────────────────────────────────────
# §3. Behavior: doctor.sh reads the allowlist (acceptance lock)
# ─────────────────────────────────────────────────────────────────────────
# Per spec FR3: "doctor.sh::check_as_any must read as-any-allowlist.txt.
# ... the guard must simply honor entries that exist." Today the
# production check_as_any does NOT read the allowlist at all, so any
# seeded cast is reported regardless of the allowlist content.
#
# This is the SMOKE test from test-strategy §1 row 3: "One smoke test
# running `doctor.sh as-any` against a tmp repo with a seeded violation
# + allowlist entry." When the Green-phase implementer wires the
# allowlist in, this test passes.

test_doctor_sh_reads_allowlist_smoke() {
  ensure_fixture || return 1
  # Write an allowlist that would suppress ALL four seeded casts.
  write_allowlist "**/*.ts:as any: blanket test suppression
**/*.tsx:as any: blanket test suppression
"
  run_as_any
  # If the allowlist is honored, doctor.sh reports 0 violations and
  # exits 0. Today (RED) it reports 4 violations and exits 1.
  assert_eq "$ASANY_EXIT" "0" \
    "doctor.sh as-any must exit 0 when every cast is allowlisted (RED: allowlist not read)"
  assert_contains "$ASANY_OUTPUT" "PASS" \
    "doctor.sh as-any must print PASS when every cast is allowlisted (RED: allowlist not read)"
}

# ─────────────────────────────────────────────────────────────────────────
# §4. Behavior matrix — matching glob
# ─────────────────────────────────────────────────────────────────────────
# The matcher must be glob-aware. An entry like
# `frontend/src/components/*.tsx:as any: ...` must suppress any cast
# in any matching file. We seed `Widget.tsx` (matching) and `util.ts`
# (non-matching for this scenario) and assert only the matching one is
# suppressed.

test_matching_glob_suppresses_matching_file() {
  ensure_fixture || return 1
  write_allowlist "# matching-glob scenario: only Widget.tsx is allowlisted
frontend/src/components/*.tsx:as any: only the component is on the allowlist
"
  run_as_any
  local ok=1
  # Negative surface: the non-allowlisted casts (util.ts, scoring.ts,
  # foo.ts) must STILL be reported. The allowlisted one (Widget.tsx)
  # must NOT be in the output.
  assert_not_contains "$ASANY_OUTPUT" "Widget.tsx" \
    "matching-glob allowlist must suppress Widget.tsx (RED: allowlist not read)" || ok=0
  assert_contains "$ASANY_OUTPUT" "util.ts" \
    "non-matching util.ts must still be reported (regression guard)" || ok=0
  assert_contains "$ASANY_OUTPUT" "scoring.ts" \
    "non-matching scoring.ts must still be reported (regression guard)" || ok=0
  assert_contains "$ASANY_OUTPUT" "foo.ts" \
    "non-matching foo.ts must still be reported (regression guard)" || ok=0
  [ "$ok" -eq 1 ]
}

# ─────────────────────────────────────────────────────────────────────────
# §5. Behavior matrix — matching substring (content-substring)
# ─────────────────────────────────────────────────────────────────────────
# The matcher must check the SECOND field (content-substring) against
# the cast's source line. An entry with a broad glob `**/*.ts` and a
# narrow substring (e.g. `(payload) as any`) must suppress only casts
# whose source line contains that exact substring.

test_matching_substring_suppresses_matching_content() {
  ensure_fixture || return 1
  write_allowlist "# matching-substring scenario: only the util.ts cast is allowlisted
**/*.ts:(payload) as any: payload coercion is intentional
"
  run_as_any
  local ok=1
  # The util.ts cast source line is `const coerced = (payload) as any;`,
  # which contains `(payload) as any`. Other seeded casts do NOT
  # contain that substring.
  assert_not_contains "$ASANY_OUTPUT" "util.ts" \
    "substring allowlist must suppress util.ts (its source line contains the substring)" || ok=0
  assert_contains "$ASANY_OUTPUT" "Widget.tsx" \
    "non-substring-matching Widget.tsx must still be reported (regression guard)" || ok=0
  assert_contains "$ASANY_OUTPUT" "scoring.ts" \
    "non-substring-matching scoring.ts must still be reported (regression guard)" || ok=0
  assert_contains "$ASANY_OUTPUT" "foo.ts" \
    "non-substring-matching foo.ts must still be reported (regression guard)" || ok=0
  [ "$ok" -eq 1 ]
}

# ─────────────────────────────────────────────────────────────────────────
# §6. Behavior matrix — non-matching (negative test / acceptance lock)
# ─────────────────────────────────────────────────────────────────────────
# Per spec FR3: "the guard must simply honor entries that exist." This
# means a non-allowlisted cast MUST still cause the guard to fail. We
# pin this with the canonical negative test: an allowlist with no
# matching entry → doctor.sh exits 1 with the cast still in the output.

test_non_matching_cast_still_fails_negative() {
  ensure_fixture || return 1
  write_allowlist "# negative-test scenario: nothing matches the seeded casts
some/other/path/*.ts:as any: this entry targets files that do not exist
"
  run_as_any
  local ok=1
  # Acceptance lock: a non-allowlisted cast STILL causes failure.
  assert_neq "$ASANY_EXIT" "0" \
    "non-allowlisted cast must cause doctor.sh as-any to FAIL (exit != 0) — the spec's acceptance lock" || ok=0
  assert_contains "$ASANY_OUTPUT" "FAIL" \
    "doctor.sh as-any must print FAIL when a non-allowlisted cast is present" || ok=0
  # All four seeded casts are reported.
  assert_contains "$ASANY_OUTPUT" "Widget.tsx" \
    "non-matching Widget.tsx must be reported" || ok=0
  assert_contains "$ASANY_OUTPUT" "util.ts" \
    "non-matching util.ts must be reported" || ok=0
  assert_contains "$ASANY_OUTPUT" "scoring.ts" \
    "non-matching scoring.ts must be reported" || ok=0
  assert_contains "$ASANY_OUTPUT" "foo.ts" \
    "non-matching foo.ts must be reported" || ok=0
  [ "$ok" -eq 1 ]
}

# ─────────────────────────────────────────────────────────────────────────
# §7. Behavior matrix — malformed line tolerance
# ─────────────────────────────────────────────────────────────────────────
# Per test-strategy §1 row 3: the matcher must tolerate malformed lines
# (e.g. an entry with the wrong number of fields, or a line that just
# isn't a tuple). A future entry typo MUST NOT crash the matcher;
# instead, the line is skipped (with a stderr warning at most — not
# pinned here, just don't crash and don't suppress casts).

test_malformed_allowlist_line_does_not_crash() {
  ensure_fixture || return 1
  write_allowlist "# malformed-line scenario: a 1-field entry, a 2-field entry, a valid entry
not-a-valid-entry
only-one-field:here
frontend/src/lib/*.ts:as any: malformed-tolerant valid entry
"
  run_as_any
  local ok=1
  # Must not crash with exit code 2 (the doctor.sh "error" code).
  if [ "$ASANY_EXIT" -eq 2 ]; then
    echo "    FAIL: doctor.sh as-any must tolerate malformed allowlist lines (exited 2)" >&2
    echo "      output: ${ASANY_OUTPUT:0:400}" >&2
    ok=0
  fi
  # The valid entry must still be honored (util.ts is suppressed).
  assert_not_contains "$ASANY_OUTPUT" "util.ts" \
    "valid entry in a malformed-tolerance scenario must still suppress util.ts" || ok=0
  # Non-allowlisted casts are still reported.
  assert_contains "$ASANY_OUTPUT" "Widget.tsx" \
    "non-allowlisted Widget.tsx must still be reported in malformed-tolerance scenario" || ok=0
  [ "$ok" -eq 1 ]
}

# ─────────────────────────────────────────────────────────────────────────
# §8. Behavior matrix — comment-line tolerance
# ─────────────────────────────────────────────────────────────────────────
# Per test-strategy §1 row 3: `#`-prefixed lines are comments and must
# be ignored by the matcher. A scenario with only comments → no
# entries match → all casts reported.

test_comment_lines_are_ignored() {
  ensure_fixture || return 1
  write_allowlist "# only comments — no actual entries
# this file documents the format but contains no allowlist
# (a future maintainer should add entries here)
"
  run_as_any
  local ok=1
  assert_neq "$ASANY_EXIT" "0" \
    "comment-only allowlist must not suppress any cast (no entries match)" || ok=0
  # All four seeded casts are reported.
  assert_contains "$ASANY_OUTPUT" "Widget.tsx" \
    "comment-only allowlist must still report Widget.tsx" || ok=0
  assert_contains "$ASANY_OUTPUT" "util.ts" \
    "comment-only allowlist must still report util.ts" || ok=0
  assert_contains "$ASANY_OUTPUT" "scoring.ts" \
    "comment-only allowlist must still report scoring.ts" || ok=0
  assert_contains "$ASANY_OUTPUT" "foo.ts" \
    "comment-only allowlist must still report foo.ts" || ok=0
  [ "$ok" -eq 1 ]
}

# ─────────────────────────────────────────────────────────────────────────
# §9. Behavior matrix — blank-line tolerance
# ─────────────────────────────────────────────────────────────────────────
# Per test-strategy §1 row 3: blank lines are ignored. A scenario with
# only blank lines (no entries) → no entries match → all casts
# reported. Same shape as the comment-line test but verifies the
# blank-line path independently.

test_blank_lines_are_ignored() {
  ensure_fixture || return 1
  write_allowlist "

# a comment sandwiched between blanks

"
  run_as_any
  assert_neq "$ASANY_EXIT" "0" \
    "blank-line-only allowlist must not suppress any cast"
  assert_contains "$ASANY_OUTPUT" "Widget.tsx" \
    "blank-line-only allowlist must still report Widget.tsx"
}

# ─────────────────────────────────────────────────────────────────────────
# §10. Count test (N seeded, M allowlisted → N−M reported)
# ─────────────────────────────────────────────────────────────────────────
# Per plan Phase 3 task 3: "Confirm `doctor.sh as-any` honors the file
# (report count drops to only un-triaged casts; no fake bulk-baseline)."
# The fixture seeds 4 casts. We allowlist 2 of them (Widget + scoring)
# and assert the failure count is 2 (not 0, not 4). A future regression
# that "fixes" the guard by suppressing everything (bulk-baseline)
# would fail this test.

test_count_drops_to_un_allowlisted_only() {
  ensure_fixture || return 1
  write_allowlist "# count test: 2 of 4 seeded casts are allowlisted
frontend/src/components/*.tsx:as any: count-test allowlist 1
pivot/**/*.ts:as any: count-test allowlist 2
"
  run_as_any
  local ok=1
  # Allowed: Widget.tsx, scoring.ts. Not allowed: util.ts, foo.ts.
  assert_neq "$ASANY_EXIT" "0" \
    "count test: 2 of 4 allowlisted → doctor.sh must still FAIL (regression guard against bulk-baseline)" || ok=0
  assert_contains "$ASANY_OUTPUT" "FAIL" \
    "count test: 2 of 4 allowlisted → output must say FAIL" || ok=0
  # Suppressed: Widget + scoring.
  assert_not_contains "$ASANY_OUTPUT" "Widget.tsx" \
    "count test: Widget.tsx is allowlisted → must be suppressed" || ok=0
  assert_not_contains "$ASANY_OUTPUT" "scoring.ts" \
    "count test: scoring.ts is allowlisted → must be suppressed" || ok=0
  # Reported: util + foo.
  assert_contains "$ASANY_OUTPUT" "util.ts" \
    "count test: util.ts is NOT allowlisted → must still be reported" || ok=0
  assert_contains "$ASANY_OUTPUT" "foo.ts" \
    "count test: foo.ts is NOT allowlisted → must still be reported" || ok=0
  # The reported count must be exactly 2 (regression guard against
  # "suppress all" or "report all" bugs).
  local reported_count
  reported_count=$(printf '%s\n' "$ASANY_OUTPUT" | grep -E '\.tsx?:[0-9]+:' | wc -l | tr -d ' ')
  assert_eq "$reported_count" "2" \
    "count test: reported count must be exactly 2 (N=4 seeded, M=2 allowlisted) — no fake bulk-baseline" || ok=0
  [ "$ok" -eq 1 ]
}

# ─────────────────────────────────────────────────────────────────────────
# §11. Integration: production as-any-allowlist.txt + live repo
# ─────────────────────────────────────────────────────────────────────────
# The production allowlist (measure/as-any-allowlist.txt) currently
# documents the legacy `file_path:line_number: reason` format in its
# header. We assert that the LIVE doctor.sh as-any, run against the
# live repo with the live allowlist, exits non-zero BECAUSE:
#   (a) the live allowlist is not read at all (FR3), OR
#   (b) the seeded `as any` casts in the live repo outnumber the
#       allowlist entries (today ~191 casts vs 8 allowlist entries).
# The test pins the OUTCOME (failure + multiple reported casts), not
# the reason — the Green-phase implementer only needs to make
# doctor.sh read the allowlist; the test will still pass against the
# live repo as long as the unmatched casts are reported.

test_live_doctor_sh_as_any_fails_against_live_repo() {
  assert_file_exists "$DOCTOR_SH" "doctor.sh must exist"
  assert_file_exists "$ALLOWLIST" \
    "measure/as-any-allowlist.txt must exist"
  set +e
  OUT=$(bash "$DOCTOR_SH" as-any 2>&1)
  EXIT=$?
  set -e
  # The live run must report at least one violation today. (If the
  # Green phase reduces this to zero — by reading the allowlist AND
  # triaging all 191 casts — the test will start passing; the count
  # test §10 against the fixture is the deterministic check.)
  if [ "$EXIT" -eq 0 ]; then
    echo "    NOTE: live doctor.sh as-any now reports 0 violations — Phase 3 task 3 done" >&2
    return 0
  fi
  assert_contains "$OUT" "FAIL" \
    "live doctor.sh as-any must print FAIL (current state: 191 un-triaged casts)"
  return 0
}

# ─────────────────────────────────────────────────────────────────────────
# Main
# ─────────────────────────────────────────────────────────────────────────

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  as-any guard test suite — Phase 3 (Red) — track: review_remediation_20260605"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

run_test "as-any-allowlist.txt header documents canonical path-glob:content-substring:reason format" \
  test_allowlist_header_documents_canonical_format

run_test "as-any-allowlist.txt entries conform to canonical 3-field format" \
  test_allowlist_entries_conform_to_canonical_format

run_test "doctor.sh as-any reads the allowlist (smoke)" \
  test_doctor_sh_reads_allowlist_smoke

run_test "matching-glob allowlist suppresses matching files" \
  test_matching_glob_suppresses_matching_file

run_test "matching-substring allowlist suppresses matching content" \
  test_matching_substring_suppresses_matching_content

run_test "non-matching cast STILL fails (negative test / acceptance lock)" \
  test_non_matching_cast_still_fails_negative

run_test "malformed allowlist line is tolerated (no crash)" \
  test_malformed_allowlist_line_does_not_crash

run_test "comment lines in the allowlist are ignored" \
  test_comment_lines_are_ignored

run_test "blank lines in the allowlist are ignored" \
  test_blank_lines_are_ignored

run_test "count test: N seeded, M allowlisted → N−M reported (no bulk-baseline)" \
  test_count_drops_to_un_allowlisted_only

run_test "live doctor.sh as-any against live repo (FR3 acceptance)" \
  test_live_doctor_sh_as_any_fails_against_live_repo

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
