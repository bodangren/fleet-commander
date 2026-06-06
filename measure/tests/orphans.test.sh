#!/usr/bin/env bash
# Tests for the orphan-detection subcommand — Phase 3 of
# quality_gate_enforcement_20260605.
#
# Run with:  bash measure/tests/orphans.test.sh
#
# This is the RED phase. Every test is expected to FAIL until
#   - the `orphans` subcommand is implemented (per test-strategy §1:
#     "Pure functions: classify node (prod/test/fixture/generated),
#      allowlist matcher; orphans subcommand against a seeded fixture graph.db")
#   - doctor.sh accepts an `orphans` subcommand and runs it as Check 5
#     (per plan Phase 3 task 2 and test-strategy §4)
#   - measure/orphans-allowlist.txt exists with the documented format
# per measure/tracks/quality_gate_enforcement_20260605/plan.md and
# measure/tracks/quality_gate_enforcement_20260605/test-strategy.md.
#
# Contracts under test (test-strategy §1, §2, §3, §4):
#   - `doctor.sh orphans` subcommand exists and is part of `doctor.sh all`.
#   - The subcommand exits 0 when no orphans are found.
#   - The subcommand exits 1 (or otherwise non-zero) when at least one
#     orphan is found.
#   - The output lists each orphan as `path:symbol`, one per line.
#   - Generated/fixture paths are excluded by path pattern:
#       __fixtures__/, convex/_generated/, frontend/dist/, pivot/dist/
#   - A node with empty `file_path` (the build-graph data-quality artifact
#     documented in test-strategy §6) is skipped, not flagged.
#   - Convex registered handlers (tag `convex-registered`) and other known
#     false-positive classes are allowlisted by tag or path.
#   - orphans-allowlist.txt entries suppress known exports AND warn on stale
#     entries (test-strategy §3, "Allowlist drift").
#   - Override of the live graph.db is possible so the test can run against
#     a deterministic fixture instead of the production graph (test-strategy
#     §2: "do NOT scan a real directory (non-deterministic)").
#   - The subcommand does NOT touch the live ./graph.db (no side effects).
#
# Fixtures are built at test runtime by
# measure/tests/fixtures/build-orphans-fixture.sh into a fresh temp dir.
# The build script is part of this commit; the DB itself is regenerated
# per test run and is gitignored.

set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

DOCTOR_SH="$REPO_ROOT/measure/doctor.sh"
ALLOWLIST="$REPO_ROOT/measure/orphans-allowlist.txt"
FIXTURE_BUILDER="$REPO_ROOT/measure/tests/fixtures/build-orphans-fixture.sh"
SAMPLE_ALLOWLIST="$REPO_ROOT/measure/tests/fixtures/orphans-allowlist.sample.txt"

# Per-test artifacts. Cleaned up in the EXIT trap.
FIXTURE_DIR=""
TESTS_RUN=0
TESTS_PASSED=0
TESTS_FAILED=0
FAILED_TESTS=()

# ── Assertion helpers (same shape as verify.test.sh / hook.test.sh) ───────

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

# RED precondition: anything we call must be in a known state. We do NOT
# precondition on the orphans subcommand itself existing — its absence is
# exactly the RED failure we want most tests to surface.
precondition_build_graph() {
  if ! command -v build-graph >/dev/null 2>&1; then
    echo "    RED: build-graph not on PATH" >&2
    return 1
  fi
  if ! command -v sqlite3 >/dev/null 2>&1; then
    echo "    RED: sqlite3 not on PATH" >&2
    return 1
  fi
  return 0
}

# Build the fixture DB into a fresh temp dir. Idempotent. Sets FIXTURE_DIR.
ensure_fixture() {
  if [ -n "$FIXTURE_DIR" ] && [ -d "$FIXTURE_DIR" ] && [ -f "$FIXTURE_DIR/orphans.db" ]; then
    return 0
  fi
  precondition_build_graph || return 1
  FIXTURE_DIR=$(mktemp -d)
  bash "$FIXTURE_BUILDER" "$FIXTURE_DIR/orphans.db" >/dev/null
}

# Run the orphans subcommand with a given fixture DB and capture output/exit.
#   $1 = path to fixture graph.db
# Sets globals: ORPHANS_OUTPUT, ORPHANS_EXIT
run_orphans() {
  local db="$1"
  set +e
  ORPHANS_OUTPUT=$(ORPHANS_DB="$db" "$DOCTOR_SH" orphans 2>&1)
  ORPHANS_EXIT=$?
  set -e
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

cleanup() {
  if [ -n "${FIXTURE_DIR:-}" ] && [ -d "$FIXTURE_DIR" ]; then
    rm -rf "$FIXTURE_DIR"
  fi
}
trap cleanup EXIT

# ─────────────────────────────────────────────────────────────────────────────
# Static-contract tests (do not depend on the subcommand running)
# ─────────────────────────────────────────────────────────────────────────────

test_doctor_sh_supports_orphans_subcommand() {
  precondition_build_graph || return 1
  assert_file_exists "$DOCTOR_SH" "doctor.sh must exist"
  # The subcommand must be wired in the case statement (test-strategy §4
  # guardrail: Check 5 lives inside doctor.sh, not in a separate binary).
  local src
  src=$(cat "$DOCTOR_SH")
  assert_contains "$src" "orphans" \
    "doctor.sh must reference 'orphans' (Check 5 wiring per plan Phase 3 task 2)"
}

test_doctor_sh_help_includes_orphans() {
  precondition_build_graph || return 1
  # Existing checks are documented in the usage string. The orphans check
  # must be listed too so `doctor.sh` is self-documenting.
  local src
  src=$(cat "$DOCTOR_SH")
  assert_contains "$src" "as-any|boundary|stub-mutation|god-file" \
    "doctor.sh usage string must enumerate checks (precondition: existing contract)"
  assert_contains "$src" "orphans" \
    "doctor.sh usage string must include 'orphans' so the check is self-documenting"
}

test_orphans_allowlist_exists_at_documented_path() {
  # test-strategy §4: "Same allowlist file pattern as as-any-allowlist.txt
  # / boundary-allowlist.txt" — the path is measure/orphans-allowlist.txt.
  assert_file_exists "$ALLOWLIST" \
    "measure/orphans-allowlist.txt must exist (test-strategy §4 allowlist contract)"
}

test_orphans_allowlist_documents_format() {
  precondition_build_graph || return 1
  assert_file_exists "$ALLOWLIST" "allowlist file must exist (precondition)"
  local header
  header=$(head -5 "$ALLOWLIST" 2>/dev/null || true)
  assert_contains "$header" ":" \
    "allowlist header must document the path:symbol format"
}

# ─────────────────────────────────────────────────────────────────────────────
# Behavior tests against the seeded fixture
# ─────────────────────────────────────────────────────────────────────────────

test_orphans_subcommand_runs_against_fixture_db() {
  # The contract: `doctor.sh orphans` accepts an override (env var ORPHANS_DB)
  # so tests can run against a fixture, per test-strategy §2. We assert this
  # is wired by checking that invoking it against a valid fixture DB does not
  # error with "file not found" or similar. (Until implemented, this fails
  # with a usage error or with "no such subcommand".)
  precondition_build_graph || return 1
  ensure_fixture || return 1
  run_orphans "$FIXTURE_DIR/orphans.db"
  # We accept any exit code for this smoke test — what we want to assert is
  # that the subcommand at least ran (i.e. the fixture DB was read). When
  # implemented correctly, the exit code will be 1 (orphan found) — see the
  # next test for that.
  case "$ORPHANS_OUTPUT" in
    *"No such file"*|*"command not found"*|*"Usage:"*)
      echo "    FAIL: orphans subcommand did not run against fixture DB" >&2
      echo "      output: ${ORPHANS_OUTPUT:0:300}" >&2
      return 1
      ;;
  esac
  return 0
}

test_orphans_reports_true_orphan_with_path_symbol_format() {
  # The fixture seeds one true orphan: SaveAsTemplateModal at
  # frontend/src/components/SaveAsTemplateModal.tsx with ONLY test-inbound
  # edges. The subcommand must surface it as a single line in `path:symbol`
  # form (per plan Phase 3 task 1: "Output path:symbol.").
  precondition_build_graph || return 1
  ensure_fixture || return 1
  run_orphans "$FIXTURE_DIR/orphans.db"
  assert_neq "$ORPHANS_EXIT" "0" \
    "orphans subcommand must exit non-zero when a true orphan is present"
  # Allow either an absolute path or a repo-relative path; both are valid
  # "path:symbol" forms. Just assert the orphan symbol and a recognizable
  # file path component.
  assert_contains "$ORPHANS_OUTPUT" "SaveAsTemplateModal.tsx" \
    "orphan output must include the orphan's file path"
  assert_contains "$ORPHANS_OUTPUT" ":SaveAsTemplateModal" \
    "orphan output must include the orphan's symbol after the colon (path:symbol format)"
}

test_orphans_does_not_report_prod_symbol_with_prod_callers() {
  # The fixture seeds `calcScore` with inbound edges from BOTH a prod file
  # (pivot/src/orchestrator/executor.ts) and the test file. This is NOT an
  # orphan — the subcommand must not flag it.
  precondition_build_graph || return 1
  ensure_fixture || return 1
  run_orphans "$FIXTURE_DIR/orphans.db"
  assert_not_contains "$ORPHANS_OUTPUT" "calcScore" \
    "orphans subcommand must NOT flag calcScore (it has prod callers)"
}

test_orphans_excludes_fixture_path_nodes() {
  # The fixture seeds `buildFixture` inside __fixtures__/. Even with no
  # inbound edges, the path-exclusion rule must skip it. Mirrors the
  # doctor.sh Check 1/3/4 exclusion rules (test-strategy §3).
  precondition_build_graph || return 1
  ensure_fixture || return 1
  run_orphans "$FIXTURE_DIR/orphans.db"
  assert_not_contains "$ORPHANS_OUTPUT" "buildFixture" \
    "orphans subcommand must NOT flag nodes under __fixtures__/"
}

test_orphans_excludes_generated_path_nodes() {
  # The fixture seeds `api` inside convex/_generated/. Path-exclusion rule
  # must skip it (test-strategy §3: "convex/_generated/, frontend/dist/,
  # pivot/dist/ must be excluded").
  precondition_build_graph || return 1
  ensure_fixture || return 1
  run_orphans "$FIXTURE_DIR/orphans.db"
  assert_not_contains "$ORPHANS_OUTPUT" "convex/_generated/api.ts" \
    "orphans subcommand must NOT flag nodes under convex/_generated/"
}

test_orphans_skips_phantom_node_with_empty_file_path() {
  # The fixture seeds a function node with file_path='' (the data-quality
  # artifact documented in test-strategy §6 — the
  # SaveAsTemplateModal re-export phantom). The detector MUST skip these
  # rather than crash or report them as orphan.
  precondition_build_graph || return 1
  ensure_fixture || return 1
  run_orphans "$FIXTURE_DIR/orphans.db"
  assert_not_contains "$ORPHANS_OUTPUT" "PhantomReExport" \
    "orphans subcommand must skip nodes with empty file_path (build-graph data-quality bug)"
}

test_orphans_allowlists_convex_registered_by_tag() {
  # The fixture seeds `migrateProject` (convex/migrate.ts) with the
  # `convex-registered` tag and zero inbound edges. Without a tag-based
  # allowlist it would be a false positive (test-strategy §3, §6 — the
  # exact class of false-positive that produced 15+ noisy entries in the
  # strategy doc's analysis).
  precondition_build_graph || return 1
  ensure_fixture || return 1
  run_orphans "$FIXTURE_DIR/orphans.db"
  assert_not_contains "$ORPHANS_OUTPUT" "migrateProject" \
    "orphans subcommand must allowlist Convex-registered handlers (tag-based rule)"
}

test_orphans_allowlist_suppresses_known_export() {
  # The fixture seeds `legacyThing` at pivot/src/legacy.ts. The fixture
  # builder writes a sample allowlist at
  # measure/tests/fixtures/orphans-allowlist.sample.txt with one entry
  # pointing at this node. The test copies that allowlist into the active
  # orphans-allowlist.txt location, runs the subcommand, and asserts the
  # entry is suppressed. (This is the same flow the implementer will use
  # to populate the live allowlist from the snapshot described in
  # test-strategy §5: "Snapshot the live-DB output to orphans-allowlist.txt;
  # commit.")
  precondition_build_graph || return 1
  ensure_fixture || return 1
  assert_file_exists "$SAMPLE_ALLOWLIST" "sample allowlist must exist (built by fixture script)"
  # Install the sample allowlist into the active location for the test.
  local active="$FIXTURE_DIR/active-allowlist.txt"
  cp "$SAMPLE_ALLOWLIST" "$active"
  # The subcommand must read ORPHANS_ALLOWLIST (or equivalent). We set it.
  set +e
  ORPHANS_OUTPUT=$(ORPHANS_DB="$FIXTURE_DIR/orphans.db" \
                   ORPHANS_ALLOWLIST="$active" \
                   "$DOCTOR_SH" orphans 2>&1)
  ORPHANS_EXIT=$?
  set -e
  assert_not_contains "$ORPHANS_OUTPUT" "legacyThing" \
    "orphans subcommand must suppress entries listed in the allowlist"
}

test_orphans_allowlist_stale_entry_warns() {
  # test-strategy §3 "Allowlist drift": removing an orphan from source but
  # leaving it in the allowlist produces a warning. The detector must
  # detect that the source symbol no longer exists and emit a warning, so
  # Phase 4's sweep does not leave a junk allowlist behind.
  #
  # We construct a synthetic allowlist that points at a non-existent
  # symbol (some/path/that/does/not/exist.ts:Nope) and assert the
  # subcommand's output mentions a "stale" (or equivalent) warning.
  precondition_build_graph || return 1
  ensure_fixture || return 1
  local stale="$FIXTURE_DIR/stale-allowlist.txt"
  cat > "$stale" <<EOF
# Stale-entry test: points at a symbol that does not exist in the fixture.
some/path/that/does/not/exist.ts:Nope
EOF
  set +e
  ORPHANS_OUTPUT=$(ORPHANS_DB="$FIXTURE_DIR/orphans.db" \
                   ORPHANS_ALLOWLIST="$stale" \
                   "$DOCTOR_SH" orphans 2>&1)
  ORPHANS_EXIT=$?
  set -e
  # We don't pin the exact wording; any of these is acceptable.
  local lower
  lower=$(printf '%s' "$ORPHANS_OUTPUT" | tr '[:upper:]' '[:lower:]')
  case "$lower" in
    *stale*|*unknown*|*nonexistent*|*missing*|*not?found*)
      return 0
      ;;
    *)
      echo "    FAIL: subcommand must warn about stale allowlist entries" >&2
      echo "      got: ${ORPHANS_OUTPUT:0:400}" >&2
      return 1
      ;;
  esac
}

test_orphans_does_not_mutate_live_graph_db() {
  # The live graph.db at $REPO_ROOT/graph.db must be untouched by the test
  # run (we are testing the orphans subcommand, not the live project).
  # We hash it before and after a run, and assert the hash is unchanged.
  precondition_build_graph || return 1
  if [ ! -f "$REPO_ROOT/graph.db" ]; then
    echo "    SKIP: no live graph.db at $REPO_ROOT/graph.db" >&2
    return 0
  fi
  ensure_fixture || return 1
  local before after
  before=$(sha256sum "$REPO_ROOT/graph.db" | awk '{print $1}')
  run_orphans "$FIXTURE_DIR/orphans.db"
  after=$(sha256sum "$REPO_ROOT/graph.db" | awk '{print $1}')
  assert_eq "$after" "$before" \
    "orphans subcommand must not mutate the live graph.db"
}

test_orphans_does_not_crash_on_empty_db() {
  # Defensive: an empty (just-initialized) graph.db should be handled
  # gracefully — the subcommand must exit 0 with a "no nodes" message,
  # not crash with a SQL error. (Edge case: a fresh project before any
  # scan has been run.)
  precondition_build_graph || return 1
  local empty_db
  empty_db=$(mktemp)
  build-graph init "$empty_db" >/dev/null
  set +e
  ORPHANS_OUTPUT=$(ORPHANS_DB="$empty_db" "$DOCTOR_SH" orphans 2>&1)
  ORPHANS_EXIT=$?
  set -e
  rm -f "$empty_db"
  # Acceptable: exit 0 with "no nodes / no orphans" message, OR a clear
  # skip message. Must not exit with 2 (doctor.sh error code).
  if [ "$ORPHANS_EXIT" -eq 2 ]; then
    echo "    FAIL: orphans subcommand must handle empty graph.db gracefully" >&2
    echo "      exit: $ORPHANS_EXIT" >&2
    echo "      output: ${ORPHANS_OUTPUT:0:300}" >&2
    return 1
  fi
  return 0
}

# ─────────────────────────────────────────────────────────────────────────────
# doctor.sh integration
# ─────────────────────────────────────────────────────────────────────────────

test_doctor_sh_all_runs_orphans_check() {
  # When invoked as `doctor.sh all`, the orphans check must be one of the
  # checks that runs. We assert by checking the output mentions "orphans"
  # (the check header) AND that the gate exits 1 (orphan present in
  # fixture). We use a synthetic doctor.sh run that points the orphans
  # check at the fixture DB.
  precondition_build_graph || return 1
  ensure_fixture || return 1
  set +e
  OUT=$(ORPHANS_DB="$FIXTURE_DIR/orphans.db" "$DOCTOR_SH" all 2>&1)
  EXIT=$?
  set -e
  case "$OUT" in
    *"orphans"*) ;;
    *)
      echo "    FAIL: doctor.sh all must include the orphans check" >&2
      echo "      got: ${OUT:0:400}" >&2
      return 1
      ;;
  esac
  # With the true orphan in the fixture, doctor.sh all should exit 1.
  if [ "$EXIT" -ne 1 ]; then
    echo "    FAIL: doctor.sh all should exit 1 with an orphan in the fixture (got $EXIT)" >&2
    return 1
  fi
  return 0
}

test_doctor_sh_help_lists_orphans() {
  precondition_build_graph || return 1
  set +e
  OUT=$("$DOCTOR_SH" 2>&1)
  EXIT=$?
  set -e
  # Calling with no args should print usage (existing behavior, exit 2).
  # The usage text must include 'orphans'.
  case "$OUT" in
    *"orphans"*) return 0 ;;
    *)
      echo "    FAIL: doctor.sh usage/help must list 'orphans' as a check" >&2
      echo "      got: ${OUT:0:400}" >&2
      return 1
      ;;
  esac
}

test_doctor_sh_orphans_subcommand_path_runs_check_5() {
  # test-strategy §4: "Orphan detection is a doctor.sh Check 5, not a
  # separate binary. Same exit-code contract (0/1/2), same allowlist file
  # pattern." This test pins that contract end-to-end against the fixture.
  precondition_build_graph || return 1
  ensure_fixture || return 1
  set +e
  OUT=$(ORPHANS_DB="$FIXTURE_DIR/orphans.db" "$DOCTOR_SH" orphans 2>&1)
  EXIT=$?
  set -e
  # Exit code contract: 0 = clean, 1 = orphans found, 2 = error.
  if [ "$EXIT" -ne 0 ] && [ "$EXIT" -ne 1 ]; then
    echo "    FAIL: doctor.sh orphans must exit 0 (clean) or 1 (orphans found), got $EXIT" >&2
    echo "      output: ${OUT:0:300}" >&2
    return 1
  fi
  return 0
}

# ─────────────────────────────────────────────────────────────────────────────
# Main
# ─────────────────────────────────────────────────────────────────────────────

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  orphans subcommand test suite — Phase 3 (Red)"
echo "  track: quality_gate_enforcement_20260605"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

run_test "doctor.sh supports the orphans subcommand" \
  test_doctor_sh_supports_orphans_subcommand

run_test "doctor.sh usage string includes orphans" \
  test_doctor_sh_help_includes_orphans

run_test "orphans-allowlist.txt exists at the documented path" \
  test_orphans_allowlist_exists_at_documented_path

run_test "orphans-allowlist.txt documents the path:symbol format" \
  test_orphans_allowlist_documents_format

run_test "orphans subcommand runs against a fixture DB (override wired)" \
  test_orphans_subcommand_runs_against_fixture_db

run_test "orphans reports the true orphan in path:symbol format" \
  test_orphans_reports_true_orphan_with_path_symbol_format

run_test "orphans does NOT report a prod symbol with prod callers" \
  test_orphans_does_not_report_prod_symbol_with_prod_callers

run_test "orphans excludes nodes under __fixtures__/" \
  test_orphans_excludes_fixture_path_nodes

run_test "orphans excludes nodes under convex/_generated/" \
  test_orphans_excludes_generated_path_nodes

run_test "orphans skips phantom nodes with empty file_path" \
  test_orphans_skips_phantom_node_with_empty_file_path

run_test "orphans allowlists Convex-registered handlers by tag" \
  test_orphans_allowlists_convex_registered_by_tag

run_test "orphans allowlist suppresses a known export" \
  test_orphans_allowlist_suppresses_known_export

run_test "orphans allowlist warns on stale entries" \
  test_orphans_allowlist_stale_entry_warns

run_test "orphans does not mutate the live graph.db" \
  test_orphans_does_not_mutate_live_graph_db

run_test "orphans handles an empty graph.db gracefully" \
  test_orphans_does_not_crash_on_empty_db

run_test "doctor.sh all runs the orphans check" \
  test_doctor_sh_all_runs_orphans_check

run_test "doctor.sh help lists orphans as a check" \
  test_doctor_sh_help_lists_orphans

run_test "doctor.sh orphans uses the 0/1/2 exit-code contract" \
  test_doctor_sh_orphans_subcommand_path_runs_check_5

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
