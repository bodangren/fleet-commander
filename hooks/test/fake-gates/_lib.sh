#!/usr/bin/env bash
# Shared helper for fake-gate stubs (measure/tracks/quality_gate_enforcement_20260605).
#
# Contract:
#   - Exit code is $FAKE_<NAME_UPPER>_EXIT (default 0).
#   - Invocation "<name> <args...>" is appended to $FAKE_<NAME_UPPER>_LOG
#     (default /dev/null) so tests can assert order and arguments.
#   - "<name> <args...>" is also echoed to stdout, so verify.sh can capture
#     per-gate output for its summary.
#
# Reused by Phase 1 (verify entrypoint) and Phase 2 (pre-push hook) tests.

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
