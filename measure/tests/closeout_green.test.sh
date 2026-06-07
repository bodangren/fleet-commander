#!/usr/bin/env bash
# Tests for the closeout all-greens result — Phase 5 task 2 of
# quality_gate_enforcement_20260605.
#
# Run with:  bash measure/tests/closeout_green.test.sh
#
# This is the RED phase. Every test is expected to FAIL until `verify`
# actually produces an all-greens run AND that run is recorded in
# `measure/tracks/quality_gate_enforcement_20260605/plan.md` under
# Phase 5 Task 2 (per the plan: "Run `verify`; record an all-green
# result" and test-strategy §1 Phase 5 row: "verify + orphans both
# green on a dry-run track close | Full verify on main").
#
# Contracts under test:
#   §1. CAPABILITY (passes today): `verify.sh` produces a structured
#       all-greens run when every gate exits 0 — per-gate PASS markers,
#       a final "All gates passed" summary, and exit 0. This pins the
#       output FORMAT the closeout E2E depends on (per test-strategy
#       §5 Phase 5 row: "Doc-lint test that workflow.md contains the
#       closeout-rule string" — and by extension that verify.sh
#       produces a recognizable all-greens marker that the closeout
#       run can grep).
#   §2. RECORD (currently RED): `plan.md` Phase 5 Task 2 contains a
#       "Verify run" entry whose per-gate lines show PASS for all 6
#       gates and whose summary shows an all-greens result. The current
#       entry shows red gates (pivot-typecheck FAIL, convex-test FAIL,
#       frontend-test FAIL, doctor FAIL), so the recorded entry is not
#       yet an all-greens record. This is the literal acceptance
#       criterion of the task: "record an all-green result".
#
# The tests in this file are STATIC / FAKE-GATE only. The full live
# `verify` run is reserved for the supervisor (per test-strategy §6:
# "the only true E2E is a single all-green `verify` run at closeout
# (AC #6)"). The Mid role pins the *contract* (capability + recorded
# entry); the supervisor's E2E confirms the *state* (real verify is
# actually all-green at closeout time).
#
# Architecture guardrails (test-strategy §4):
#   - Single source of truth: the closeout rule (workflow.md) and the
#     gate list (verify.sh) are already canonicalized. The recorded
#     Verify run entry in plan.md MUST use the same 6 gate names
#     defined in verify.sh's GATES array.
#   - No new dependencies. Pure bash.
#   - Aggregated, not per-gate, assertion: §2 asserts all 6 gates
#     appear as PASS in the recorded entry, not a subset (matches the
#     "Aggregation, not short-circuit" rule from test-strategy §3).

set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

VERIFY_SH="$REPO_ROOT/measure/verify.sh"
PLAN_MD="$REPO_ROOT/measure/tracks/quality_gate_enforcement_20260605/plan.md"
ORPHANS_ALLOWLIST="$REPO_ROOT/measure/orphans-allowlist.txt"

EXPECTED_GATES=(pivot-test convex-test frontend-test pivot-typecheck frontend-check doctor)

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
      echo "      haystack: <${haystack:0:600}>" >&2
      return 1
      ;;
  esac
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

assert_file_executable() {
  local path="$1" msg="${2:-}"
  if [ -x "$path" ]; then return 0; fi
  echo "    FAIL: $msg (not executable: $path)" >&2
  return 1
}

# Build a fresh fake-gate harness in a temp dir. Each stub honors
# FAKE_<NAME_UPPER>_EXIT (default 0) and records its invocation in
# FAKE_<NAME_UPPER>_LOG. Mirrors the contract used by
# measure/tests/verify.test.sh so this test file stays
# self-contained.
ensure_fake_harness() {
  if [ -n "${FAKE_HARNESS_DIR:-}" ] && [ -d "$FAKE_HARNESS_DIR" ]; then
    return 0
  fi
  FAKE_HARNESS_DIR=$(mktemp -d)
  cat > "$FAKE_HARNESS_DIR/_lib.sh" <<'LIBSH_EOF'
#!/usr/bin/env bash
# Shared helper for fake-gate stubs (generated at test runtime by
# measure/tests/closeout_green.test.sh).
run_fake_gate() {
  local name="$1"; shift
  local key="${name^^}"
  key="${key//-/_}"
  local exit_var="FAKE_${key}_EXIT"
  local log_var="FAKE_${key}_LOG"
  local exit_code="${!exit_var:-0}"
  local log="${!log_var:-/dev/null}"
  {
    printf '%s\t%s\n' "$name" "$*"
  } >> "$log"
  printf 'fake-gate %s\t%s\n' "$name" "$*"
  exit "$exit_code"
}
LIBSH_EOF
  chmod +x "$FAKE_HARNESS_DIR/_lib.sh"
  for gate in "${EXPECTED_GATES[@]}"; do
    cat > "$FAKE_HARNESS_DIR/$gate" <<GATE_EOF
#!/usr/bin/env bash
SCRIPT_DIR="\$(cd "\$(dirname "\${BASH_SOURCE[0]}")" && pwd)"
. "\$SCRIPT_DIR/_lib.sh"
run_fake_gate $gate "\$@"
GATE_EOF
    chmod +x "$FAKE_HARNESS_DIR/$gate"
  done
}

cleanup() {
  if [ -n "${FAKE_HARNESS_DIR:-}" ] && [ -d "$FAKE_HARNESS_DIR" ]; then
    rm -rf "$FAKE_HARNESS_DIR"
  fi
}
trap cleanup EXIT

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
# §1. CAPABILITY — verify.sh produces a structured all-greens run
# ─────────────────────────────────────────────────────────────────────────────
# This is the capability test: when every fake gate exits 0, verify.sh
# must produce (a) per-gate PASS markers, (b) a final "All gates
# passed" summary marker, and (c) exit 0. This is the OUTPUT FORMAT the
# closeout E2E depends on (the supervisor grepping the closeout run for
# an all-greens marker). This test passes today — the missing piece is
# the actual recorded all-greens result (see §2).
#
# Note: this is intentionally NOT a live-`verify` run. The Mid role
# pins the capability (format contract); the supervisor's full E2E at
# closeout time confirms the state (real verify is all-green).

test_verify_structured_all_greens_output() {
  assert_file_exists "$VERIFY_SH" "measure/verify.sh must exist"
  assert_file_executable "$VERIFY_SH" "measure/verify.sh must be executable"

  ensure_fake_harness
  local log_dir
  log_dir=$(mktemp -d)
  for gate in "${EXPECTED_GATES[@]}"; do
    local key="${gate^^}"
    key="${key//-/_}"
    : > "$log_dir/${gate}.log"
    export "FAKE_${key}_LOG"="$log_dir/${gate}.log"
    export "FAKE_${key}_EXIT"="0"
  done
  export VERIFY_FAKE_GATE_DIR="$FAKE_HARNESS_DIR"

  local output exit_code
  set +e
  output=$("$VERIFY_SH" 2>&1)
  exit_code=$?
  set -e

  rm -rf "$log_dir"

  assert_eq "$exit_code" "0" \
    "verify.sh must exit 0 when every gate exits 0 (capability for closeout all-greens)"

  # (a) Per-gate PASS markers for all 6 gates. Each gate's status line
  # must contain "<gate>: PASS" (case-insensitive) so the closeout E2E
  # can grep the run for a known marker.
  local lower
  lower=$(printf '%s' "$output" | tr '[:upper:]' '[:lower:]')
  for gate in "${EXPECTED_GATES[@]}"; do
    case "$lower" in
      *"$gate: pass"*)
        ;;
      *)
        echo "    FAIL: per-gate PASS marker for '$gate' missing from all-greens output" >&2
        echo "      output: <${output:0:600}>" >&2
        return 1
        ;;
    esac
  done

  # (b) Final "All gates passed" summary marker. Accepts the same
  # phrasings the closeout.test.sh §7 test accepts (case-insensitive).
  local has_green_marker=0
  case "$lower" in
    *all*gates*passed*) has_green_marker=1 ;;
  esac
  case "$lower" in
    *all*green*|*all*checks*green*|*all*checks*passed*) has_green_marker=1 ;;
  esac
  case "$lower" in
    *verify*succeeded*|*verify*green*) has_green_marker=1 ;;
  esac
  if [ "$has_green_marker" -ne 1 ]; then
    echo "    FAIL: verify.sh must end the all-greens run with a recognizable marker" >&2
    echo "      expected one of: 'All gates passed' / 'all green' / 'all checks green' /" >&2
    echo "                       'verify succeeded' / 'verify green'" >&2
    echo "      output: <${output:0:600}>" >&2
    return 1
  fi

  # (c) No FAIL marker in the all-greens output. Regression guard: a
  # future refactor that mis-formats the per-gate line (e.g. emits
  # "<gate>: FAIL" even on success) would still satisfy (a) and (b) on
  # a surface read; this guards against that.
  case "$lower" in
    *"fail"*)
      echo "    FAIL: all-greens output must not contain 'FAIL' (regression guard)" >&2
      echo "      output: <${output:0:600}>" >&2
      return 1
      ;;
  esac

  return 0
}

# ─────────────────────────────────────────────────────────────────────────────
# §2. RECORD — plan.md Phase 5 Task 2 records an all-greens Verify run
# ─────────────────────────────────────────────────────────────────────────────
# The literal acceptance criterion of Phase 5 Task 2 is "record an
# all-green result". The plan already has a "Verify run" sub-bullet
# under Task 2 that records the gate results (currently showing red
# gates). This test pins that the recorded entry is in the
# all-greens state: all 6 gates show PASS, the overall result is
# all-greens, and no gate shows FAIL. Currently RED because the
# recorded entry (2026-06-06) shows pivot-typecheck / convex-test /
# frontend-test / doctor as FAIL.

test_plan_records_all_greens_verify_run() {
  assert_file_exists "$PLAN_MD" "plan.md must exist at measure/tracks/quality_gate_enforcement_20260605/plan.md"
  local content
  content=$(cat "$PLAN_MD")

  # The recorded entry is the "Verify run" sub-bullet under Phase 5
  # Task 2. Extract from the first "Verify run (" to the end of the
  # Task 2 description (the line that begins with "All gates currently
  # red" is the boundary marker the plan uses; an all-greens entry
  # replaces it with a green-summary line).
  local entry
  entry=$(printf '%s\n' "$content" | awk '
    /^  Verify run \(/ { in_entry=1 }
    in_entry { print }
    in_entry && /^  All gates currently red/ { in_entry=0 }
  ')

  if [ -z "$entry" ]; then
    echo "    FAIL: no 'Verify run' entry found under Phase 5 Task 2 in plan.md" >&2
    return 1
  fi

  # All 6 gates must appear with PASS in the recorded entry.
  for gate in "${EXPECTED_GATES[@]}"; do
    case "$entry" in
      *"$gate: **PASS**"*|*"$gate: PASS"*)
        ;;
      *)
        echo "    FAIL: recorded 'Verify run' entry does not show $gate: PASS" >&2
        echo "      entry: <${entry:0:800}>" >&2
        return 1
        ;;
    esac
  done

  # No gate may show FAIL in the recorded entry. This is the
  # aggregation guard (test-strategy §3: "Aggregation, not
  # short-circuit"): one red gate voids the all-greens record.
  case "$entry" in
    *"FAIL"*)
      echo "    FAIL: recorded 'Verify run' entry still contains a FAIL" >&2
      echo "      entry: <${entry:0:800}>" >&2
      return 1
      ;;
  esac

  # The overall result line must reflect all-greens state. The plan
  # uses "All gates currently red" as the red marker and would
  # replace it with an all-greens equivalent (e.g. "All gates
  # green"). The entry must not still carry the red marker.
  case "$entry" in
    *"All gates currently red"*)
      echo "    FAIL: recorded 'Verify run' entry still carries the red-marker line" >&2
      echo "      entry: <${entry:0:800}>" >&2
      return 1
      ;;
  esac

  return 0
}

# ─────────────────────────────────────────────────────────────────────────────
# §3. ORPHANS RECORD — plan.md Phase 5 Task 2 also records a clean orphans
# ─────────────────────────────────────────────────────────────────────────────
# The closeout rule (workflow.md) requires BOTH verify to pass AND the
# orphans report to be clean (with the allowlist-with-TD-id escape
# hatch). The recorded entry must therefore also document the orphans
# gate's state. Currently the plan's Verify run entry does not mention
# orphans; this test pins that the recorded entry documents the
# orphans gate as clean (or allowlist-driven) for the all-greens
# closeout. Currently RED.

test_plan_records_clean_orphans_for_closeout() {
  assert_file_exists "$PLAN_MD" "plan.md must exist"
  local content
  content=$(cat "$PLAN_MD")

  local entry
  entry=$(printf '%s\n' "$content" | awk '
    /^  Verify run \(/ { in_entry=1 }
    in_entry { print }
    in_entry && /^  All gates currently red/ { in_entry=0 }
  ')

  if [ -z "$entry" ]; then
    echo "    FAIL: no 'Verify run' entry found under Phase 5 Task 2 in plan.md" >&2
    return 1
  fi

  # The recorded entry must mention the orphans gate state. Accept
  # either a "clean" status OR an "allowlisted" status (per the
  # closeout rule's escape hatch in workflow.md).
  local lower
  lower=$(printf '%s' "$entry" | tr '[:upper:]' '[:lower:]')
  case "$lower" in
    *orphans*clean*|*orphans*ok*|*orphans*pass*|*orphans:clean*|*orphans:pass*)
      return 0
      ;;
  esac
  case "$lower" in
    *orphans*allowlist*|*orphans*allow-listed*)
      return 0
      ;;
  esac

  echo "    FAIL: recorded 'Verify run' entry does not document the orphans gate state" >&2
  echo "      expected one of (case-insensitive):" >&2
  echo "        'orphans: clean' / 'orphans: pass' / 'orphans clean' / 'orphans pass'" >&2
  echo "        'orphans allowlisted' / 'orphans allow-listed'" >&2
  echo "      entry: <${entry:0:800}>" >&2
  return 1
}

# ─────────────────────────────────────────────────────────────────────────────
# Main
# ─────────────────────────────────────────────────────────────────────────────

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  closeout all-greens result test suite — Phase 5 task 2 (Red)"
echo "  track: quality_gate_enforcement_20260605"
echo "  (capability + recorded-entry contract; live E2E is the supervisor's"
echo "   full verify.sh run at closeout time)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

run_test "verify.sh produces a structured all-greens run when every gate passes (capability)" \
  test_verify_structured_all_greens_output

run_test "plan.md Phase 5 Task 2 records an all-greens Verify run (RED: entry still shows red gates)" \
  test_plan_records_all_greens_verify_run

run_test "plan.md Phase 5 Task 2 records a clean-orphans state for the closeout (RED: entry silent on orphans)" \
  test_plan_records_clean_orphans_for_closeout

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
