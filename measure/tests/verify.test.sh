#!/usr/bin/env bash
# Tests for measure/verify.sh — Phase 1 of quality_gate_enforcement_20260605
#
# Run with:  bash measure/tests/verify.test.sh
#
# This is the RED phase. Every test is expected to FAIL until verify.sh
# is implemented per measure/tracks/quality_gate_enforcement_20260605/plan.md
# and measure/tracks/quality_gate_enforcement_20260605/test-strategy.md.
#
# Contract under test (from the strategy doc):
#   - verify.sh runs 6 gates in this order:
#       pivot-test, convex-test, frontend-test, pivot-typecheck, frontend-check, doctor
#   - Exit code 0 only when all 6 gates exit 0.
#   - Per-gate summary is printed.
#   - A failing gate MUST NOT short-circuit the remaining gates.
#   - convex-test invocation is verbatim:
#       bun test $(find convex -name '*.test.ts' | sed 's|^|./|')
#     (the `./` prefix matters because bunfig.toml sets root=pivot).
#   - doctor gate invokes ./measure/doctor.sh all.
#   - Gate list is defined once in verify.sh (no scattered duplication).
#   - package.json exposes a `verify` script that points at verify.sh.

set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
VERIFY_SH="$REPO_ROOT/measure/verify.sh"

EXPECTED_GATES=(pivot-test convex-test frontend-test pivot-typecheck frontend-check doctor)
EXPECTED_CONVEX_CMD='bun test $(find convex -name *.test.ts | sed s|^|./|)'

# Path to the temp dir that holds the runtime-generated fake-gate harness.
# Populated lazily by ensure_fake_harness; cleaned up by the EXIT trap.
FAKE_HARNESS_DIR=""

TESTS_RUN=0
TESTS_PASSED=0
TESTS_FAILED=0
FAILED_TESTS=()

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

assert_file_exists() {
  local path="$1" msg="${2:-}"
  if [ -f "$path" ]; then return 0; fi
  echo "    FAIL: $msg (file not found: $path)" >&2
  return 1
}

assert_file_executable() {
  local path="$1" msg="${2:-}"
  if [ -x "$path" ]; then return 0; fi
  echo "    FAIL: $msg (not executable: $path)" >&2
  return 1
}

assert_file_nonempty() {
  local path="$1" msg="${2:-}"
  if [ -s "$path" ]; then return 0; fi
  echo "    FAIL: $msg (file empty: $path)" >&2
  return 1
}

# Skip a test cleanly if verify.sh does not yet exist; the test still counts
# as a failure (RED) so the next implementer is reminded.
precondition_verify_exists() {
  if [ ! -f "$VERIFY_SH" ]; then
    echo "    RED: $VERIFY_SH not implemented yet" >&2
    return 1
  fi
  if [ ! -x "$VERIFY_SH" ]; then
    echo "    RED: $VERIFY_SH is not executable" >&2
    return 1
  fi
  return 0
}

# Build the fake-gate harness in a fresh temp directory. Each gate stub
# invokes run_fake_gate from a shared _lib.sh, mirroring the contract
# from the test-strategy doc without committing any production files.
# Sets the global FAKE_HARNESS_DIR to the temp dir.
ensure_fake_harness() {
  if [ -n "$FAKE_HARNESS_DIR" ] && [ -d "$FAKE_HARNESS_DIR" ]; then
    return 0
  fi
  FAKE_HARNESS_DIR=$(mktemp -d)

  cat > "$FAKE_HARNESS_DIR/_lib.sh" <<'LIBSH_EOF'
#!/usr/bin/env bash
# Shared helper for fake-gate stubs (generated at test runtime by
# measure/tests/verify.test.sh).
#
# Contract:
#   - Exit code is $FAKE_<NAME_UPPER>_EXIT (default 0).
#   - Invocation "<name> <args...>" is appended to $FAKE_<NAME_UPPER>_LOG
#     (default /dev/null) so tests can assert order and arguments.
#   - "<name> <args...>" is also echoed to stdout, so verify.sh can capture
#     per-gate output for its summary.
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
# Fake gate stub: $gate (generated at test runtime by
# measure/tests/verify.test.sh)
SCRIPT_DIR="\$(cd "\$(dirname "\${BASH_SOURCE[0]}")" && pwd)"
. "\$SCRIPT_DIR/_lib.sh"
run_fake_gate $gate "\$@"
GATE_EOF
    chmod +x "$FAKE_HARNESS_DIR/$gate"
  done
}

# Configure the fake-gate env for a single test invocation.
#   $1 = per-gate log directory (created if missing)
# The caller can override FAKE_*_EXIT/LOG via the extra arguments.
setup_fake_env() {
  local log_dir="$1"
  ensure_fake_harness
  mkdir -p "$log_dir"
  for gate in "${EXPECTED_GATES[@]}"; do
    local key="${gate^^}"
    key="${key//-/_}"
    : > "$log_dir/${gate}.log"
    export "FAKE_${key}_LOG"="$log_dir/${gate}.log"
    if ! declare -p "FAKE_${key}_EXIT" &>/dev/null; then
      export "FAKE_${key}_EXIT"="0"
    fi
  done
  export VERIFY_FAKE_GATE_DIR="$FAKE_HARNESS_DIR"
}

# Run verify.sh, capturing output, exit code, and the per-gate log dir.
#   $@ = extra env-var assignments to apply before the run
# Sets globals: VERIFY_OUTPUT, VERIFY_EXIT, VERIFY_LOG_DIR
run_verify() {
  VERIFY_LOG_DIR=$(mktemp -d)
  setup_fake_env "$VERIFY_LOG_DIR"
  for kv in "$@"; do
    export "$kv"
  done
  set +e
  VERIFY_OUTPUT=$("$VERIFY_SH" 2>&1)
  VERIFY_EXIT=$?
  set -e
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

cleanup() {
  if [ -n "${VERIFY_LOG_DIR:-}" ] && [ -d "$VERIFY_LOG_DIR" ]; then
    rm -rf "$VERIFY_LOG_DIR"
  fi
  if [ -n "${FAKE_HARNESS_DIR:-}" ] && [ -d "$FAKE_HARNESS_DIR" ]; then
    rm -rf "$FAKE_HARNESS_DIR"
  fi
}
trap cleanup EXIT

# ──────────────────────────────────────────────────────────────────────────────
# Test cases
# ──────────────────────────────────────────────────────────────────────────────

test_verify_script_exists_and_is_executable() {
  assert_file_exists "$VERIFY_SH" "verify.sh must exist at measure/verify.sh"
  assert_file_executable "$VERIFY_SH" "verify.sh must be executable (chmod +x)"
}

test_npm_run_verify_defined_in_package_json() {
  local pkg="$REPO_ROOT/package.json"
  assert_file_exists "$pkg" "package.json must exist at repo root"
  local script
  script=$(grep -E '"verify"\s*:' "$pkg" || true)
  assert_contains "$script" "verify.sh" \
    "package.json scripts.verify must reference measure/verify.sh so CI and humans share one entrypoint"
}

test_verify_uses_verbatim_convex_test_command_in_source() {
  precondition_verify_exists || return 1
  # Static contract: the source must contain the exact find + sed pattern.
  local src
  src=$(cat "$VERIFY_SH")
  assert_contains "$src" "find convex -name" \
    "verify.sh must use 'find convex -name' (per test-strategy cross-phase edge case)"
  assert_contains "$src" "sed 's|^|./|'" \
    "verify.sh must add './' prefix to each path (bunfig.toml root=pivot)"
  assert_contains "$src" 'bun test' \
    "verify.sh must invoke 'bun test' for the convex gate"
}

test_verify_invokes_measure_doctor_sh_all() {
  precondition_verify_exists || return 1
  local src
  src=$(cat "$VERIFY_SH")
  assert_contains "$src" "doctor.sh" \
    "verify.sh must invoke measure/doctor.sh for the doctor gate"
  assert_contains "$src" "all" \
    "verify.sh must pass 'all' to doctor.sh"
}

test_verify_gate_list_defined_once() {
  precondition_verify_exists || return 1
  # Source-of-truth: every gate label should appear in exactly one contiguous
  # array/list definition. We approximate this by counting how many lines
  # contain 2+ gate labels. The real list should be a single bash array.
  local multi_label_lines
  multi_label_lines=$(grep -nE 'pivot-test|convex-test|frontend-test|pivot-typecheck|frontend-check' "$VERIFY_SH" \
    | awk -F: '{ line=$0; gsub(/[0-9]+:/, "", line); n=0;
        for (g in gates) {} 
        if (line ~ /pivot-test/) n++;
        if (line ~ /convex-test/) n++;
        if (line ~ /frontend-test/) n++;
        if (line ~ /pivot-typecheck/) n++;
        if (line ~ /frontend-check/) n++;
        if (n>=3) print line; }' || true)
  # We expect exactly one such line: the canonical gate array.
  local count
  count=$(printf '%s\n' "$multi_label_lines" | grep -c '.' || true)
  assert_eq "$count" "1" \
    "verify.sh must define the gate list in exactly one place (single source of truth)"
}

test_verify_all_gates_pass_exits_zero() {
  precondition_verify_exists || return 1
  run_verify
  assert_eq "$VERIFY_EXIT" "0" \
    "verify.sh must exit 0 when every gate exits 0"
  for gate in "${EXPECTED_GATES[@]}"; do
    assert_contains "$VERIFY_OUTPUT" "$gate" \
      "summary output must mention $gate"
  done
}

test_verify_single_failure_exits_nonzero() {
  precondition_verify_exists || return 1
  run_verify FAKE_PIVOT_TEST_EXIT=1
  assert_neq "$VERIFY_EXIT" "0" \
    "verify.sh must exit non-zero when pivot-test fails"
  assert_contains "$VERIFY_OUTPUT" "pivot-test" \
    "summary output must still mention pivot-test (the failing gate)"
}

test_verify_runs_all_gates_even_on_partial_failure() {
  precondition_verify_exists || return 1
  run_verify FAKE_PIVOT_TEST_EXIT=1
  for gate in "${EXPECTED_GATES[@]}"; do
    assert_file_nonempty "$VERIFY_LOG_DIR/${gate}.log" \
      "gate '$gate' must still run when pivot-test fails (no short-circuit)"
  done
}

test_verify_multi_gate_failure_reports_all_failing_gates() {
  precondition_verify_exists || return 1
  # Aggregation contract from test-strategy §3 "Aggregation, not short-circuit":
  # with TWO gates failing (pivot-test and doctor), the summary must mention
  # BOTH, and the four healthy gates must still have been invoked. This is the
  # exact regression that produced the "fix one gate, hit the next in CI" loop
  # the track exists to prevent.
  run_verify FAKE_PIVOT_TEST_EXIT=1 FAKE_DOCTOR_EXIT=1
  assert_neq "$VERIFY_EXIT" "0" \
    "verify.sh must exit non-zero when multiple gates fail"
  local lower
  lower=$(printf '%s' "$VERIFY_OUTPUT" | tr '[:upper:]' '[:lower:]')
  case "$lower" in
    *pivot-test*) ;;
    *)
      echo "    FAIL: summary must still mention pivot-test (the first failure)" >&2
      echo "      got: ${VERIFY_OUTPUT:0:400}" >&2
      return 1
      ;;
  esac
  case "$lower" in
    *doctor*) ;;
    *)
      echo "    FAIL: summary must mention doctor (a later failure, not short-circuited)" >&2
      echo "      got: ${VERIFY_OUTPUT:0:400}" >&2
      return 1
      ;;
  esac
  for gate in convex-test frontend-test pivot-typecheck frontend-check; do
    assert_file_nonempty "$VERIFY_LOG_DIR/${gate}.log" \
      "gate '$gate' must still run when pivot-test and doctor both fail"
  done
}

test_verify_real_mode_smoke_runs_without_fake_gate_dir() {
  precondition_verify_exists || return 1
  # Real-mode smoke test from test-strategy §5: when VERIFY_FAKE_GATE_DIR is
  # unset (the production use case), verify.sh must attempt the real commands
  # without crashing on a missing stub dir. We provide echo stubs on PATH so
  # the run completes quickly and we can observe the script's behavior.
  local stub_dir
  stub_dir=$(mktemp -d)
  for gate in "${EXPECTED_GATES[@]}"; do
    cat > "$stub_dir/$gate" <<STUB_EOF
#!/usr/bin/env bash
echo "real-mode $gate"
exit 0
STUB_EOF
    chmod +x "$stub_dir/$gate"
  done

  local log
  log=$(mktemp)
  set +e
  env -u VERIFY_FAKE_GATE_DIR \
      -u FAKE_PIVOT_TEST_EXIT -u FAKE_CONVEX_TEST_EXIT -u FAKE_FRONTEND_TEST_EXIT \
      -u FAKE_PIVOT_TYPECHECK_EXIT -u FAKE_FRONTEND_CHECK_EXIT -u FAKE_DOCTOR_EXIT \
      PATH="$stub_dir:$PATH" \
      "$VERIFY_SH" >"$log" 2>&1
  set -e

  # Assert the script started and tried to run gates (didn't crash on startup
  # due to a missing stub dir). At least 2 of 6 gates should appear in output.
  local lower attempted
  lower=$(tr '[:upper:]' '[:lower:]' < "$log")
  attempted=0
  for gate in "${EXPECTED_GATES[@]}"; do
    case "$lower" in
      *"$gate"*) attempted=$((attempted + 1)) ;;
    esac
  done

  rm -rf "$stub_dir" "$log"

  if [ "$attempted" -lt 2 ]; then
    echo "    FAIL: real-mode smoke — script did not attempt enough gates (attempted=$attempted)" >&2
    return 1
  fi
  return 0
}

test_verify_runs_gates_in_expected_order() {
  precondition_verify_exists || return 1
  # Use a single shared log so we can read invocation order.
  local shared
  shared=$(mktemp)
  : > "$shared"
  ensure_fake_harness
  for gate in "${EXPECTED_GATES[@]}"; do
    local key="${gate^^}"
    key="${key//-/_}"
    export "FAKE_${key}_LOG"="$shared"
    export "FAKE_${key}_EXIT"="0"
  done
  export VERIFY_FAKE_GATE_DIR="$FAKE_HARNESS_DIR"
  set +e
  "$VERIFY_SH" >/dev/null 2>&1
  set -e
  local actual
  actual=$(awk -F'\t' 'NF>=1 {print $1}' "$shared" | tr '\n' ' ' | sed 's/ $//')
  rm -f "$shared"
  local expected
  expected=$(printf '%s ' "${EXPECTED_GATES[@]}")
  expected="${expected% }"
  assert_eq "$actual" "$expected" \
    "gates must run in the documented order"
}

test_verify_passes_verbatim_convex_test_command_to_fake() {
  precondition_verify_exists || return 1
  run_verify
  local recorded
  recorded=$(awk -F'\t' '/^convex-test\t/ {sub(/^convex-test\t/, ""); print; exit}' \
    "$VERIFY_LOG_DIR/convex-test.log" 2>/dev/null || true)
  assert_eq "$recorded" "$EXPECTED_CONVEX_CMD" \
    "verify.sh must pass the verbatim 'bun test \$(find ... | sed ...)' command to the convex-test gate"
}

test_verify_passes_doctor_sh_all_to_doctor_fake() {
  precondition_verify_exists || return 1
  run_verify
  local recorded
  recorded=$(awk -F'\t' '/^doctor\t/ {sub(/^doctor\t/, ""); print; exit}' \
    "$VERIFY_LOG_DIR/doctor.log" 2>/dev/null || true)
  assert_contains "$recorded" "doctor.sh" \
    "verify.sh must pass a doctor.sh invocation to the doctor gate"
  assert_contains "$recorded" "all" \
    "verify.sh must pass 'all' as the doctor.sh subcommand"
}

test_verify_summary_distinguishes_pass_and_fail() {
  precondition_verify_exists || return 1
  run_verify FAKE_CONVEX_TEST_EXIT=1
  # Output must clearly mark the failing gate so humans can find it.
  # Acceptable markers: "FAIL", "✗", "❌", "[fail]" (case-insensitive).
  local lower
  lower=$(printf '%s' "$VERIFY_OUTPUT" | tr '[:upper:]' '[:lower:]')
  case "$lower" in
    *fail*|*✗*|*❌*) return 0 ;;
    *)
      echo "    FAIL: summary must mark failing gates (got: ${VERIFY_OUTPUT:0:300})" >&2
      return 1
      ;;
  esac
}

# ──────────────────────────────────────────────────────────────────────────────
# Main
# ──────────────────────────────────────────────────────────────────────────────

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  verify.sh test suite — Phase 1 (Red)"
echo "  track: quality_gate_enforcement_20260605"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

run_test "verify.sh exists and is executable" \
  test_verify_script_exists_and_is_executable

run_test "package.json exposes npm run verify" \
  test_npm_run_verify_defined_in_package_json

run_test "verify.sh source uses verbatim convex-test command" \
  test_verify_uses_verbatim_convex_test_command_in_source

run_test "verify.sh source invokes doctor.sh all" \
  test_verify_invokes_measure_doctor_sh_all

run_test "verify.sh defines the gate list in one place" \
  test_verify_gate_list_defined_once

run_test "verify.sh exits 0 when all gates pass" \
  test_verify_all_gates_pass_exits_zero

run_test "verify.sh exits non-zero when one gate fails" \
  test_verify_single_failure_exits_nonzero

run_test "verify.sh runs every gate even on partial failure" \
  test_verify_runs_all_gates_even_on_partial_failure

run_test "verify.sh reports ALL failing gates (multi-gate aggregation)" \
  test_verify_multi_gate_failure_reports_all_failing_gates

run_test "verify.sh real-mode smoke runs without VERIFY_FAKE_GATE_DIR" \
  test_verify_real_mode_smoke_runs_without_fake_gate_dir

run_test "verify.sh runs gates in the documented order" \
  test_verify_runs_gates_in_expected_order

run_test "verify.sh passes the verbatim convex-test command" \
  test_verify_passes_verbatim_convex_test_command_to_fake

run_test "verify.sh passes doctor.sh all to the doctor gate" \
  test_verify_passes_doctor_sh_all_to_doctor_fake

run_test "verify.sh summary distinguishes pass/fail" \
  test_verify_summary_distinguishes_pass_and_fail

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
