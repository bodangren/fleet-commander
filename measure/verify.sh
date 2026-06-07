#!/usr/bin/env bash
# verify.sh — Quality-gate enforcement entrypoint for Fleet Commander.
#
# Runs all quality gates in a fixed order and prints a per-gate summary.
# Exits 0 only when every gate passes. Never short-circuits: a failing gate
# does NOT prevent subsequent gates from running.
#
# Gates (in order):
#   1. pivot-test      — bun run --cwd pivot test
#   2. convex-test     — bun test $(find convex -name '*.test.ts' | sed 's|^|./|')
#   3. frontend-test   — bun --cwd frontend test
#   4. pivot-typecheck — bun --cwd pivot typecheck
#   5. frontend-check  — bun --cwd frontend check
#   6. doctor          — ./measure/doctor.sh all
#
# Usage: ./measure/verify.sh
#
# Test hook: when VERIFY_FAKE_GATE_DIR is set, each gate is dispatched to
# $VERIFY_FAKE_GATE_DIR/<gate-name> instead of the real command. The gate
# stub receives the real command as its first argument.

set -uo pipefail
# Note: -e is intentionally omitted so that a failing gate does not abort the
# script. We handle failures explicitly and aggregate them.

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# ── Gate registry (single source of truth) ───────────────────────────────────
GATES=(pivot-test convex-test frontend-test pivot-typecheck frontend-check doctor)

# ── Gate commands ────────────────────────────────────────────────────────────
get_gate_cmd() {
  local gate="$1"
  case "$gate" in
    pivot-test)      echo "bun run --cwd pivot test" ;;
    convex-test)     echo "find ./convex -name '*.test.ts' -print0 | xargs -0 bun test" ;;
    frontend-test)   echo "bun --cwd frontend test" ;;
    pivot-typecheck) echo "bun --cwd pivot typecheck" ;;
    frontend-check)  echo "bun --cwd frontend check" ;;
    doctor)          echo "./measure/doctor.sh all" ;;
    *)               echo ""; return 1 ;;
  esac
}

# ── Per-gate runner ──────────────────────────────────────────────────────────
# Dispatches a single gate. In fake mode, delegates to $VERIFY_FAKE_GATE_DIR/<gate>;
# in real mode, evaluates the command in $REPO_ROOT.
# Prints gate output to stdout; returns the gate's exit code.
run_gate() {
  local gate="$1"
  local cmd
  cmd=$(get_gate_cmd "$gate") || return 1

  if [ -n "${VERIFY_FAKE_GATE_DIR:-}" ] && [ -d "$VERIFY_FAKE_GATE_DIR" ]; then
    "$VERIFY_FAKE_GATE_DIR/$gate" "$cmd"
    return $?
  fi

  (cd "$REPO_ROOT" && eval "$cmd")
  return $?
}

# ── Main ─────────────────────────────────────────────────────────────────────
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║         Fleet Commander — Verify Quality Gates             ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""

OVERALL_EXIT=0

for gate in "${GATES[@]}"; do
  echo "Running $gate..."
  gate_output=$(run_gate "$gate" 2>&1)
  gate_exit=$?

  if [ "$gate_exit" -eq 0 ]; then
    echo "  $gate: PASS"
  else
    echo "  $gate: FAIL (exit $gate_exit)"
    OVERALL_EXIT=1
  fi

  if [ -n "$gate_output" ]; then
    echo "$gate_output" | sed 's/^/    /'
  fi
  echo ""
done

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Summary:"
for gate in "${GATES[@]}"; do
  echo "  $gate"
done

if [ "$OVERALL_EXIT" -eq 0 ]; then
  echo ""
  echo "All gates passed."
else
  echo ""
  echo "Some gates failed. See above for details."
fi

exit "$OVERALL_EXIT"
