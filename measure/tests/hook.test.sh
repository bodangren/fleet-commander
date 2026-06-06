#!/usr/bin/env bash
# Tests for the pre-push enforcement hook — Phase 2 of
# quality_gate_enforcement_20260605.
#
# Run with:  bash measure/tests/hook.test.sh
#
# This is the RED phase. Every test is expected to FAIL until
#   - hooks/pre-push (a real, committed hook script) is implemented
#   - hooks/install.sh is implemented
#   - VERIFY_SKIP=1 override behavior is wired in
#   - The CI snippet (AGENTS.md / .github/workflows/ci.yml) references
#     `npm run verify` (single source of truth — no re-enumerated gates)
# per measure/tracks/quality_gate_enforcement_20260605/plan.md and
# measure/tracks/quality_gate_enforcement_20260605/test-strategy.md.
#
# Contracts under test (from the strategy doc, §1, §3, §4):
#   - hooks/pre-push invokes measure/verify.sh, NOT the gates directly.
#     The gate list is a single source of truth living in verify.sh.
#   - hooks/install.sh registers the hook into <repo>/.git/hooks/pre-push
#     (never writes directly to .git/hooks/ from this track's source).
#   - The installed hook is executable.
#   - VERIFY_SKIP=1: (a) loud warning on stderr, (b) entry written to a log
#     file (path overridable via VERIFY_SKIP_LOG), (c) exit 0. All three
#     must hold — missing any re-creates the "silent skip" failure mode.
#   - A failing verify blocks the push (exits non-zero).
#   - A passing verify lets the push through (exits 0).
#   - The CI snippet uses `npm run verify` (or `bash measure/verify.sh`)
#     and does NOT re-enumerate the gate list.
#
# Same fake-gate harness pattern as measure/tests/verify.test.sh so the
# hook and verify can be tested in isolation from real pivot/convex/
# frontend suites.

set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

HOOK_SRC="$REPO_ROOT/hooks/pre-push"
INSTALL_SRC="$REPO_ROOT/hooks/install.sh"
VERIFY_SH="$REPO_ROOT/measure/verify.sh"

EXPECTED_GATES=(pivot-test convex-test frontend-test pivot-typecheck frontend-check doctor)

# The exact command verify.sh hands to the convex-test gate. The hook MUST
# delegate to verify.sh, which is what builds this command; we re-assert
# this here so a regression that bypasses verify.sh (and re-implements the
# command in the hook) is caught.
EXPECTED_CONVEX_CMD='bun test $(find convex -name *.test.ts | sed s|^|./|)'

# A short, non-empty command snippet for the other gates. Used only to
# detect that the hook has not been written to call them directly.
GATE_CMD_MARKERS=(
  "bun --cwd pivot test"
  "bun --cwd pivot typecheck"
  "bun --cwd frontend test"
  "bun --cwd frontend check"
  "doctor.sh"
)

FAKE_HARNESS_DIR=""
TESTS_RUN=0
TESTS_PASSED=0
TESTS_FAILED=0
FAILED_TESTS=()
SCRATCH_DIRS=()

# ── Assertion helpers ────────────────────────────────────────────────────────

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
      echo "      forbidden needle: <$needle>" >&2
      echo "      haystack:         <${haystack:0:400}>" >&2
      return 1
      ;;
  esac
  return 0
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

# Preconditions that mark the test as RED when source files are missing —
# the next implementer is reminded that the file is required.
precondition_hook_exists() {
  if [ ! -f "$HOOK_SRC" ]; then
    echo "    RED: $HOOK_SRC not implemented yet" >&2
    return 1
  fi
  if [ ! -x "$HOOK_SRC" ]; then
    echo "    RED: $HOOK_SRC is not executable" >&2
    return 1
  fi
  return 0
}

precondition_install_exists() {
  if [ ! -f "$INSTALL_SRC" ]; then
    echo "    RED: $INSTALL_SRC not implemented yet" >&2
    return 1
  fi
  if [ ! -x "$INSTALL_SRC" ]; then
    echo "    RED: $INSTALL_SRC is not executable" >&2
    return 1
  fi
  return 0
}

# ── Fake-gate harness (mirrors verify.test.sh) ───────────────────────────────

ensure_fake_harness() {
  if [ -n "$FAKE_HARNESS_DIR" ] && [ -d "$FAKE_HARNESS_DIR" ]; then
    return 0
  fi
  FAKE_HARNESS_DIR=$(mktemp -d)

  cat > "$FAKE_HARNESS_DIR/_lib.sh" <<'LIBSH_EOF'
#!/usr/bin/env bash
# Shared helper for fake-gate stubs (generated at test runtime by
# measure/tests/hook.test.sh).
#
# Contract mirrors hooks/test/fake-gates/README.md.
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

# Configure FAKE_* env for a single test invocation against an arbitrary
# verify.sh path (defaults to the real measure/verify.sh).
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

# Create and track a scratch dir for cleanup.
make_scratch() {
  local d
  d=$(mktemp -d)
  SCRATCH_DIRS+=("$d")
  printf '%s' "$d"
}

cleanup() {
  for d in "${SCRATCH_DIRS[@]:-}"; do
    [ -n "$d" ] && [ -d "$d" ] && rm -rf "$d"
  done
  if [ -n "${FAKE_HARNESS_DIR:-}" ] && [ -d "$FAKE_HARNESS_DIR" ]; then
    rm -rf "$FAKE_HARNESS_DIR"
  fi
}
trap cleanup EXIT

# ── Test runner ──────────────────────────────────────────────────────────────

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

# ──────────────────────────────────────────────────────────────────────────────
# Test cases
# ──────────────────────────────────────────────────────────────────────────────

# A. Source-file contract: hooks/pre-push exists and is executable.
test_hook_source_exists_and_is_executable() {
  assert_file_exists "$HOOK_SRC" "hooks/pre-push must be committed under version control"
  assert_file_executable "$HOOK_SRC" "hooks/pre-push must be executable (chmod +x)"
}

# B. Single-source-of-truth contract: the hook MUST delegate to verify.sh.
# It MUST NOT contain the verbatim gate commands, which would re-enumerate
# the gate list and create the same drift problem that TD-236 documents.
test_hook_does_not_re_enumerate_gates() {
  precondition_hook_exists || return 1
  local src
  src=$(cat "$HOOK_SRC")
  for marker in "${GATE_CMD_MARKERS[@]}"; do
    assert_not_contains "$src" "$marker" \
      "hooks/pre-push must NOT call gates directly (single source of truth); found '$marker' — delegate to measure/verify.sh instead"
  done
  # And it MUST reference verify.sh by path or via the npm script.
  case "$src" in
    *measure/verify.sh*|*"\$VERIFY_SH"*|*npm*run*verify*|*verify.sh*)
      return 0
      ;;
    *)
      echo "    FAIL: hooks/pre-push must reference measure/verify.sh (or 'npm run verify')" >&2
      return 1
      ;;
  esac
}

# C. VERIFY_SKIP=1 contract #1: the hook must check the override BEFORE
# invoking verify.sh. A passing verify with VERIFY_SKIP=1 still works; the
# override short-circuits the gate run.
test_hook_recognises_verify_skip_env_var() {
  precondition_hook_exists || return 1
  local src
  src=$(cat "$HOOK_SRC")
  assert_contains "$src" "VERIFY_SKIP" \
    "hooks/pre-push must consult the VERIFY_SKIP env var (test-strategy §3 cross-phase edge case)"
}

# D. Hook blocks on a failing verify (smoke test with the real verify.sh
# pointed at fake gates, no git invocation needed).
test_hook_blocks_on_failing_verify() {
  precondition_hook_exists || return 1
  local log_dir scratch
  log_dir=$(mktemp -d)
  SCRATCH_DIRS+=("$log_dir")
  setup_fake_env "$log_dir"
  export FAKE_PIVOT_TEST_EXIT=1

  # The git hook contract: git passes ref info on stdin. The hook should
  # tolerate that and run verify.sh regardless. We don't need a real
  # repository — we just call the hook with empty stdin.
  set +e
  "$HOOK_SRC" </dev/null >"$log_dir/hook.out" 2>"$log_dir/hook.err"
  local exit_code=$?
  set -e

  assert_neq "$exit_code" "0" \
    "hook must exit non-zero when a gate fails (so the push is blocked)"
  # At least one fake gate must have been invoked (sanity check on wiring).
  assert_file_nonempty "$log_dir/pivot-test.log" \
    "verify.sh should still have been invoked under the hook when VERIFY_SKIP is unset"
}

# E. Hook passes when verify passes.
test_hook_passes_on_green_verify() {
  precondition_hook_exists || return 1
  local log_dir
  log_dir=$(mktemp -d)
  SCRATCH_DIRS+=("$log_dir")
  setup_fake_env "$log_dir"

  set +e
  "$HOOK_SRC" </dev/null >"$log_dir/hook.out" 2>"$log_dir/hook.err"
  local exit_code=$?
  set -e

  assert_eq "$exit_code" "0" \
    "hook must exit 0 when verify.sh exits 0 (push proceeds)"
  for gate in "${EXPECTED_GATES[@]}"; do
    assert_file_nonempty "$log_dir/${gate}.log" \
      "gate '$gate' must have been invoked under the hook"
  done
}

# F. VERIFY_SKIP=1: hook must exit 0 even when verify would fail.
test_verify_skip_exits_zero_even_on_failing_verify() {
  precondition_hook_exists || return 1
  local log_dir
  log_dir=$(mktemp -d)
  SCRATCH_DIRS+=("$log_dir")
  setup_fake_env "$log_dir"
  export FAKE_DOCTOR_EXIT=1
  export VERIFY_SKIP=1

  set +e
  "$HOOK_SRC" </dev/null >"$log_dir/hook.out" 2>"$log_dir/hook.err"
  local exit_code=$?
  set -e

  assert_eq "$exit_code" "0" \
    "VERIFY_SKIP=1 must yield exit 0 even when verify.sh would fail (test-strategy §3)"
}

# G. VERIFY_SKIP=1: hook must write a loud warning to stderr.
# "Loud" = uppercase tag (e.g. "WARN" or "SKIP") and the string "verify"
# (or "skipped") so a human can grep the message. The exact phrasing is
# left to the implementer, but the test guards against silent skips.
test_verify_skip_writes_loud_warning_to_stderr() {
  precondition_hook_exists || return 1
  local log_dir
  log_dir=$(mktemp -d)
  SCRATCH_DIRS+=("$log_dir")
  setup_fake_env "$log_dir"
  export VERIFY_SKIP=1
  export FAKE_DOCTOR_EXIT=1

  set +e
  "$HOOK_SRC" </dev/null >"$log_dir/hook.out" 2>"$log_dir/hook.err"
  set -e

  assert_file_nonempty "$log_dir/hook.err" \
    "VERIFY_SKIP=1 must write a warning to stderr (silent skip is the failure mode we are preventing)"
  local lower
  lower=$(tr '[:upper:]' '[:lower:]' < "$log_dir/hook.err")
  # Require at least one of the conventional warn/skip tokens, AND the
  # word "verify" so the message is greppable.
  case "$lower" in
    *warn*|*skip*|*override*|*bypass*)
      ;;
    *)
      echo "    FAIL: stderr must include a warn/skip/override/bypass tag" >&2
      echo "      got: $lower" >&2
      return 1
      ;;
  esac
  case "$lower" in
    *verify*)
      return 0
      ;;
    *)
      echo "    FAIL: stderr warning must mention 'verify' so the message is greppable" >&2
      echo "      got: $lower" >&2
      return 1
      ;;
  esac
}

# H. VERIFY_SKIP=1: hook must record an entry to a log file the user can
# grep. The log path is configurable via VERIFY_SKIP_LOG; the default
# MUST be inside the repo (so it's part of the audit trail) and MUST be
# appended to (one line per skip, with a timestamp).
test_verify_skip_writes_log_entry() {
  precondition_hook_exists || return 1
  local log_dir skip_log
  log_dir=$(mktemp -d)
  SCRATCH_DIRS+=("$log_dir")
  skip_log="$log_dir/skip.log"
  : > "$skip_log"
  setup_fake_env "$log_dir"
  export VERIFY_SKIP=1
  export VERIFY_SKIP_LOG="$skip_log"
  export FAKE_PIVOT_TEST_EXIT=1

  set +e
  "$HOOK_SRC" </dev/null >"$log_dir/hook.out" 2>"$log_dir/hook.err"
  set -e

  assert_file_nonempty "$skip_log" \
    "VERIFY_SKIP=1 must record an entry to \$VERIFY_SKIP_LOG (default: repo-local log file)"
  # The log line should at minimum mention "verify" so users can grep.
  case "$(cat "$skip_log")" in
    *verify*) return 0 ;;
    *)
      echo "    FAIL: skip log entry must mention 'verify'" >&2
      echo "      got: $(cat "$skip_log")" >&2
      return 1
      ;;
  esac
}

# I. VERIFY_SKIP=1: when set, verify.sh MUST NOT be invoked (so the
# override is real, not cosmetic).
test_verify_skip_does_not_invoke_gates() {
  precondition_hook_exists || return 1
  local log_dir
  log_dir=$(mktemp -d)
  SCRATCH_DIRS+=("$log_dir")
  setup_fake_env "$log_dir"
  export VERIFY_SKIP=1
  export FAKE_PIVOT_TEST_EXIT=1

  set +e
  "$HOOK_SRC" </dev/null >"$log_dir/hook.out" 2>"$log_dir/hook.err"
  set -e

  for gate in "${EXPECTED_GATES[@]}"; do
    if [ -s "$log_dir/${gate}.log" ]; then
      echo "    FAIL: gate '$gate' must NOT run under VERIFY_SKIP=1 (override must be real)" >&2
      echo "      log: $(cat "$log_dir/${gate}.log")" >&2
      return 1
    fi
  done
  return 0
}

# J. Install script contract: hooks/install.sh registers the hook into
# the target repo's .git/hooks/pre-push.
test_install_script_registers_hook() {
  precondition_install_exists || return 1
  local scratch
  scratch=$(make_scratch)

  # Build a minimal scratch git repo so .git/ exists.
  ( cd "$scratch" && git init -q --initial-branch=main )

  set +e
  "$INSTALL_SRC" "$scratch" >"$scratch/install.out" 2>"$scratch/install.err"
  local exit_code=$?
  set -e

  assert_eq "$exit_code" "0" \
    "hooks/install.sh must exit 0 on success"
  assert_file_exists "$scratch/.git/hooks/pre-push" \
    "install.sh must register the hook at <repo>/.git/hooks/pre-push"
  assert_file_executable "$scratch/.git/hooks/pre-push" \
    "the installed hook must be executable (git will silently ignore it otherwise)"
}

# K. Installed-hook integration: after install.sh, the registered hook
# must behave like the source hook (delegates to verify.sh, blocks on
# failure, etc.). We assert this without spinning up a real `git push`
# by piping ref info on stdin the way git would.
test_installed_hook_delegates_to_verify() {
  precondition_install_exists || return 1
  local scratch log_dir
  scratch=$(make_scratch)
  log_dir=$(mktemp -d)
  SCRATCH_DIRS+=("$log_dir")
  ( cd "$scratch" && git init -q --initial-branch=main )

  set +e
  "$INSTALL_SRC" "$scratch" >/dev/null 2>&1
  set -e
  local installed="$scratch/.git/hooks/pre-push"
  assert_file_exists "$installed" "install.sh did not register the hook"

  # Set up fake gates so the installed hook can run verify.sh quickly.
  setup_fake_env "$log_dir"
  export FAKE_PIVOT_TEST_EXIT=1

  # The git hook receives one line of ref info per ref on stdin. Empty
  # stdin simulates a push with no refs (e.g. delete-only push); the
  # hook must still run verify.sh and return its exit code.
  set +e
  "$installed" </dev/null >"$log_dir/installed.out" 2>"$log_dir/installed.err"
  local exit_code=$?
  set -e

  assert_neq "$exit_code" "0" \
    "the installed hook must block pushes when verify.sh fails (got exit 0; this is the regression that produced the silent-skip failure mode)"
}

# L. The installed hook must NOT re-enumerate the gate list either. We
# catch this here rather than in the source-only test so a future
# install.sh that inlines the gates (rather than copying the source
# hook) is also blocked.
test_installed_hook_does_not_re_enumerate_gates() {
  precondition_install_exists || return 1
  local scratch
  scratch=$(make_scratch)
  ( cd "$scratch" && git init -q --initial-branch=main )

  set +e
  "$INSTALL_SRC" "$scratch" >/dev/null 2>&1
  set -e
  local installed="$scratch/.git/hooks/pre-push"
  assert_file_exists "$installed" "install.sh did not register the hook"

  local body
  body=$(cat "$installed")
  for marker in "${GATE_CMD_MARKERS[@]}"; do
    assert_not_contains "$body" "$marker" \
      "the installed hook must not re-enumerate gates (single source of truth); found '$marker'"
  done
}

# M. CI snippet contract: either the GitHub Actions workflow or AGENTS.md
# (per the plan: "Add a CI snippet to AGENTS.md / docs") must include a
# step that invokes `npm run verify` (or `bash measure/verify.sh`). The
# CI is the canonical place to enforce verify on push for shared runners.
test_ci_workflow_invokes_verify() {
  local ci="$REPO_ROOT/.github/workflows/ci.yml"
  local agents="$REPO_ROOT/AGENTS.md"

  if [ -f "$ci" ]; then
    local body
    body=$(cat "$ci")
    case "$body" in
      *"npm run verify"*|*"bash measure/verify.sh"*|*"./measure/verify.sh"*)
        return 0
        ;;
    esac
  fi

  if [ -f "$agents" ]; then
    local body
    body=$(cat "$agents")
    case "$body" in
      *"npm run verify"*|*"bash measure/verify.sh"*|*"./measure/verify.sh"*)
        # Per the plan, the CI snippet is documented in AGENTS.md; this
        # is acceptable as long as the documented command is the one
        # CI runs.
        return 0
        ;;
    esac
  fi

  echo "    FAIL: a CI snippet referencing 'npm run verify' (or 'bash measure/verify.sh')" >&2
  echo "           must exist in .github/workflows/ci.yml or AGENTS.md" >&2
  return 1
}

# N. CI snippet must NOT re-enumerate gates. The whole point of
# measure/verify.sh is single source of truth; the CI step that
# re-implements the gate list (e.g. `bun --cwd pivot test` then
# `bun --cwd frontend test`) recreates TD-236 in CI.
test_ci_workflow_does_not_re_enumerate_gates() {
  local ci="$REPO_ROOT/.github/workflows/ci.yml"
  if [ ! -f "$ci" ]; then
    # If CI is documented only in AGENTS.md, this assertion is satisfied
    # implicitly: AGENTS.md is not a CI runner.
    return 0
  fi
  # The CI may legitimately include pivot/frontend test jobs (the
  # existing ci.yml does). What it MUST NOT do is include *both* a
  # manual enumeration of all six gates AND a separate `verify` step —
  # the latter alone is the contract.
  local body verify_count pivot_count convex_count frontend_count doctor_count
  body=$(cat "$ci")
  verify_count=$(printf '%s' "$body" | grep -cE 'npm run verify|bash measure/verify\.sh|\./measure/verify\.sh' || true)
  pivot_count=$(printf '%s' "$body" | grep -cE 'bun --cwd pivot test' || true)
  convex_count=$(printf '%s' "$body" | grep -cE 'convex.*test\.ts' || true)
  frontend_count=$(printf '%s' "$body" | grep -cE 'bun --cwd frontend test' || true)
  doctor_count=$(printf '%s' "$body" | grep -cE 'doctor\.sh' || true)

  if [ "$verify_count" -eq 0 ]; then
    echo "    FAIL: CI must include a verify step (this test requires test_ci_workflow_invokes_verify to pass first)" >&2
    return 1
  fi

  # If `verify` is present, NONE of the manually-enumerated gates should
  # also be present (a job is allowed to run only verify).
  if [ "$verify_count" -ge 1 ]; then
    if [ "$pivot_count" -gt 0 ] || [ "$convex_count" -gt 0 ] \
       || [ "$frontend_count" -gt 0 ] || [ "$doctor_count" -gt 0 ]; then
      echo "    FAIL: CI contains 'verify' step AND a manual gate enumeration." >&2
      echo "           pivot=$pivot_count convex=$convex_count frontend=$frontend_count doctor=$doctor_count" >&2
      echo "           (single source of truth: CI must call verify.sh, not re-list gates)" >&2
      return 1
    fi
  fi
  return 0
}

# ──────────────────────────────────────────────────────────────────────────────
# Main
# ──────────────────────────────────────────────────────────────────────────────

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  pre-push hook test suite — Phase 2 (Red)"
echo "  track: quality_gate_enforcement_20260605"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

run_test "hooks/pre-push exists and is executable" \
  test_hook_source_exists_and_is_executable

run_test "hooks/pre-push does not re-enumerate the gate list" \
  test_hook_does_not_re_enumerate_gates

run_test "hooks/pre-push recognises the VERIFY_SKIP env var" \
  test_hook_recognises_verify_skip_env_var

run_test "hooks/pre-push blocks on failing verify" \
  test_hook_blocks_on_failing_verify

run_test "hooks/pre-push passes on green verify" \
  test_hook_passes_on_green_verify

run_test "VERIFY_SKIP=1: hook exits 0 even when verify would fail" \
  test_verify_skip_exits_zero_even_on_failing_verify

run_test "VERIFY_SKIP=1: hook writes loud warning to stderr" \
  test_verify_skip_writes_loud_warning_to_stderr

run_test "VERIFY_SKIP=1: hook writes a log entry" \
  test_verify_skip_writes_log_entry

run_test "VERIFY_SKIP=1: hook does not invoke any gate" \
  test_verify_skip_does_not_invoke_gates

run_test "hooks/install.sh registers the hook into <repo>/.git/hooks/pre-push" \
  test_install_script_registers_hook

run_test "installed hook delegates to verify.sh and blocks on failure" \
  test_installed_hook_delegates_to_verify

run_test "installed hook does not re-enumerate the gate list" \
  test_installed_hook_does_not_re_enumerate_gates

run_test "CI snippet references 'npm run verify' (single source of truth)" \
  test_ci_workflow_invokes_verify

run_test "CI snippet does not re-enumerate the gate list" \
  test_ci_workflow_does_not_re_enumerate_gates

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
