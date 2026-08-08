#!/usr/bin/env bash
# Contract test for the root development stack's crash supervision.
#
# Run with: bash measure/tests/dev_restart_supervision.test.sh
#
# The root `npm run dev` command is the supported way to start Convex, Pivot,
# and the frontend together. Concurrently v10 exposes restart controls at the
# process-group level, so the contract requires unlimited retries and a short
# delay for every child, including Pivot.

set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
PACKAGE_JSON="$REPO_ROOT/package.json"
CONCURRENTLY="$REPO_ROOT/node_modules/.bin/concurrently"

TESTS_RUN=0
TESTS_PASSED=0
TESTS_FAILED=0

assert_contains() {
  local haystack="$1" needle="$2" message="$3"
  if [[ "$haystack" == *"$needle"* ]]; then
    return 0
  fi
  echo "    FAIL: $message" >&2
  echo "      expected to find: <$needle>" >&2
  echo "      command: <$haystack>" >&2
  return 1
}

run_test() {
  local name="$1" function_name="$2"
  TESTS_RUN=$((TESTS_RUN + 1))
  printf '==> %s\n' "$name"
  if "$function_name"; then
    TESTS_PASSED=$((TESTS_PASSED + 1))
    echo "    PASS"
  else
    TESTS_FAILED=$((TESTS_FAILED + 1))
    echo "    FAIL"
  fi
  echo
}

test_dev_script_restarts_children_forever() {
  local dev_script
  dev_script=$(node -e \
    'const fs = require("fs"); const pkg = JSON.parse(fs.readFileSync(process.argv[1], "utf8")); process.stdout.write(pkg.scripts?.dev ?? "");' \
    "$PACKAGE_JSON") || return 1

  assert_contains "$dev_script" "concurrently" \
    "root dev script must use concurrently for the shared development stack" || return 1
  assert_contains "$dev_script" "--restart-tries -1" \
    "root dev script must restart crashed children without a retry limit" || return 1
  assert_contains "$dev_script" "--restart-after 1000" \
    "root dev script must delay restarts to avoid a tight crash loop" || return 1
  assert_contains "$dev_script" "bun run --cwd pivot dev" \
    "root dev script must keep Pivot under the supervised process group" || return 1
}

test_concurrently_supports_restart_contract() {
  local help
  help=$("$CONCURRENTLY" --help 2>&1) || return 1
  assert_contains "$help" "--restart-tries" \
    "installed concurrently must expose the restart-tries option" || return 1
  assert_contains "$help" "--restart-after" \
    "installed concurrently must expose the restart-after option" || return 1
}

run_test "root dev script supervises crashed children" \
  test_dev_script_restarts_children_forever
run_test "installed concurrently exposes restart flags" \
  test_concurrently_supports_restart_contract

printf 'Tests: %d | Passed: %d | Failed: %d\n' \
  "$TESTS_RUN" "$TESTS_PASSED" "$TESTS_FAILED"

if [ "$TESTS_FAILED" -ne 0 ]; then
  exit 1
fi
