#!/usr/bin/env bash
# doctor.sh — Architectural linting and structural checks for Fleet Commander.
#
# Checks:
#   1. `as any` guard — finds production `as any` usages outside approved exceptions
#   2. Boundary dependency check — finds cross-slice imports that require review
#
# Usage: ./measure/doctor.sh [as-any|boundary|all]
# Exit code 0 = all checks pass; 1 = violations found; 2 = error

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# Parse arguments
CHECK="${1:-all}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Track overall status
EXIT_CODE=0

# ──────────────────────────────────────────────────────────────────────────────
# Check 1: `as any` guard
# ──────────────────────────────────────────────────────────────────────────────
check_as_any() {
  echo -e "━━━ Check 1: ${YELLOW}as any${NC} guard ━━━"

  # Find all `as any` in production code (exclude test files, fixtures, node_modules)
  local violations
  violations=$(grep -rn "as any" \
    --include="*.ts" --include="*.tsx" \
    "$REPO_ROOT/frontend/src" \
    "$REPO_ROOT/pivot/src" \
    "$REPO_ROOT/convex" \
    2>/dev/null \
    | grep -v "\.test\.ts" \
    | grep -v "\.test\.tsx" \
    | grep -v "__fixtures__" \
    | grep -v "node_modules" \
    | grep -v "// eslint-disable" \
    | grep -v "// no-as-any-check" \
    | grep -v "incomplete dependencies" \
    || true)

  if [ -z "$violations" ]; then
    echo -e "${GREEN}PASS${NC} — No 'as any' usages found in production code."
    return 0
  fi

  local count
  count=$(echo "$violations" | wc -l)
  echo -e "${RED}FAIL${NC} — $count 'as any' usages in production code:"
  echo ""
  echo "$violations" | head -30
  if [ "$count" -gt 30 ]; then
    echo "... and $((count - 30)) more"
  fi
  echo ""
  echo "Options:"
  echo "  1. Fix the type issue and remove the 'as any' cast"
  echo "  2. Add '// no-as-any-check' comment on the specific line"
  echo "  3. Add to $SCRIPT_DIR/as-any-allowlist.txt with a documented reason"
  EXIT_CODE=1
}

# ──────────────────────────────────────────────────────────────────────────────
# Check 2: Boundary dependency check
# ──────────────────────────────────────────────────────────────────────────────
check_boundary() {
  echo -e "━━━ Check 2: ${YELLOW}Boundary dependency${NC} check ━━━"

  # Check if build-graph is available
  if ! command -v build-graph &> /dev/null; then
    echo -e "${YELLOW}SKIP${NC} — build-graph not found on PATH."
    return 0
  fi

  local DB="$REPO_ROOT/graph.db"
  if [ ! -f "$DB" ]; then
    echo -e "${YELLOW}SKIP${NC} — graph.db not found."
    return 0
  fi

  # Check for cross-slice imports that might violate architecture boundaries
  # Frontend should not directly import from pivot or convex internals
  local violations
  violations=$(build-graph query "$DB" "
    SELECT
      s.file_path AS source,
      t.file_path AS target,
      e.type AS edge_type
    FROM edges e
    JOIN nodes s ON e.source = s.id
    JOIN nodes t ON e.target = t.id
    WHERE e.type = 'imports'
      AND s.file_path LIKE '%/frontend/src/%'
      AND (t.file_path LIKE '%/pivot/src/%' OR t.file_path LIKE '%/convex/%')
      AND s.file_path NOT LIKE '%.test.%'
      AND s.file_path NOT LIKE '%/__fixtures__%'
    ORDER BY s.file_path
  " 2>&1) || true

  if [ -z "$violations" ]; then
    echo -e "${GREEN}PASS${NC} — No boundary violations found."
    return 0
  fi

  local count
  count=$(echo "$violations" | wc -l)
  echo -e "${RED}FAIL${NC} — $count cross-slice imports found (frontend -> pivot/convex):"
  echo ""
  echo "$violations"
  echo ""
  echo "Frontend code should use API routes, not direct imports from pivot/convex."
  EXIT_CODE=1
}

# ──────────────────────────────────────────────────────────────────────────────
# Main
# ──────────────────────────────────────────────────────────────────────────────
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║           Fleet Commander — Doctor Health Check            ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""

case "$CHECK" in
  as-any)
    check_as_any
    ;;
  boundary)
    check_boundary
    ;;
  all)
    check_as_any
    echo ""
    check_boundary
    ;;
  *)
    echo "Usage: $0 [as-any|boundary|all]"
    exit 2
    ;;
esac

echo ""
if [ $EXIT_CODE -eq 0 ]; then
  echo -e "${GREEN}All doctor checks passed.${NC}"
else
  echo -e "${RED}Doctor checks failed. See above for details.${NC}"
fi

exit $EXIT_CODE
