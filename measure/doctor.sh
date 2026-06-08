#!/usr/bin/env bash
# doctor.sh — Architectural linting and structural checks for Fleet Commander.
#
# Checks:
#   1. `as any` guard — finds production `as any` usages outside approved exceptions
#   2. Boundary dependency check — finds cross-slice imports that require review
#   3. Stub-mutation guard — finds Convex mutations whose handler ignores ctx
#   4. God-file guard — finds source files over the line threshold
#   5. Orphan detection — finds exported symbols with only test-inbound edges
#
# Usage: ./measure/doctor.sh [as-any|boundary|stub-mutation|god-file|orphans|status-vocabulary|all]
# Exit code 0 = all checks pass; 1 = violations found; 2 = error

# God-file line threshold (files at or above this many lines must be allowlisted)
GODFILE_THRESHOLD=500

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# Parse arguments
CHECK="${1:-all}"

# Colors for output (disabled when stdout is not a terminal)
if [ -t 1 ]; then
  RED='\033[0;31m'
  GREEN='\033[0;32m'
  YELLOW='\033[1;33m'
  NC='\033[0m' # No Color
else
  RED=''
  GREEN=''
  YELLOW=''
  NC=''
fi

# Track overall status
EXIT_CODE=0

# ──────────────────────────────────────────────────────────────────────────────
# Check 1: `as any` guard
# ──────────────────────────────────────────────────────────────────────────────

# Match a file path against a glob pattern (supports ** and *).
# Uses recursive segment matching — ** matches zero or more path segments;
# * matches any characters within a single segment.
#   $1 = path (e.g. "frontend/src/lib/util.ts")
#   $2 = pattern (e.g. "**/*.ts" or "convex/**/*")
_glob_match() {
  local path="$1" pattern="$2"
  local IFS='/'
  local -a path_segs=() pat_segs=()
  local seg

  while IFS= read -r -d '/' seg || [ -n "$seg" ]; do
    [ -n "$seg" ] && path_segs+=("$seg")
  done <<< "$path/"
  while IFS= read -r -d '/' seg || [ -n "$seg" ]; do
    [ -n "$seg" ] && pat_segs+=("$seg")
  done <<< "$pattern/"

  _glob_match_segs() {
    local pi="$1" qi="$2"
    while [ "$qi" -lt "${#pat_segs[@]}" ]; do
      if [ "${pat_segs[$qi]}" = "**" ]; then
        qi=$((qi + 1))
        local i=$pi
        while [ "$i" -le "${#path_segs[@]}" ]; do
          if _glob_match_segs "$i" "$qi"; then return 0; fi
          i=$((i + 1))
        done
        return 1
      fi
      if [ "$pi" -ge "${#path_segs[@]}" ]; then return 1; fi
      case "${path_segs[$pi]}" in
        ${pat_segs[$qi]}) ;;
        *) return 1 ;;
      esac
      pi=$((pi + 1))
      qi=$((qi + 1))
    done
    [ "$pi" -ge "${#path_segs[@]}" ]
  }

  _glob_match_segs 0 0
}

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

  # Load allowlist and filter violations
  local allowlist="$SCRIPT_DIR/as-any-allowlist.txt"
  if [ -f "$allowlist" ]; then
    local -a allow_paths=() allow_substrs=()
    while IFS= read -r line; do
      [[ "$line" =~ ^[[:space:]]*# ]] && continue
      [[ "$line" =~ ^[[:space:]]*$ ]] && continue
      local glob="${line%%:*}"
      local rest="${line#*:}"
      local substr="${rest%%:*}"
      [ -n "$glob" ] && [ -n "$substr" ] && {
        allow_paths+=("$glob")
        allow_substrs+=("$substr")
      }
    done < "$allowlist"

    if [ "${#allow_paths[@]}" -gt 0 ]; then
      local filtered=""
      while IFS= read -r v; do
        [ -z "$v" ] && continue
        local filepath="${v%%:*}"
        local rel="${filepath#"$REPO_ROOT"/}"
        local content="${v#*:}"
        content="${content#*:}"
        local skip=0
        local i
        for i in "${!allow_paths[@]}"; do
          if _glob_match "$rel" "${allow_paths[$i]}" && [[ "$content" == *"${allow_substrs[$i]}"* ]]; then
            skip=1
            break
          fi
        done
        if [ "$skip" -eq 0 ]; then
          filtered="${filtered}${v}"$'\n'
        fi
      done <<< "$violations"
      violations="$filtered"
    fi
  fi

  violations=$(echo "$violations" | grep -v '^[[:space:]]*$' || true)

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

  # Load allowlist entries
  local allowlist="$SCRIPT_DIR/boundary-allowlist.txt"
  local allowed_tmp=""
  if [ -f "$allowlist" ]; then
    allowed_tmp=$(mktemp)
    sed 's/#.*//' "$allowlist" | sed 's/[[:space:]]*$//' | grep -v '^[[:space:]]*$' > "$allowed_tmp" || true
  fi

  # Check for cross-slice imports that might violate architecture boundaries
  # Frontend should not directly import from pivot or convex internals
  local violations_raw
  violations_raw=$(build-graph query "$DB" "
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

  if [ -z "$violations_raw" ] || [[ "$violations_raw" == *"(no results)"* ]]; then
    echo -e "${GREEN}PASS${NC} — No boundary violations found."
    [ -n "$allowed_tmp" ] && rm -f "$allowed_tmp"
    return 0
  fi

  # Apply allowlist filtering
  local violations=""
  while IFS= read -r line; do
    [ -z "$line" ] && continue
    [[ "$line" == *"source"* ]] && continue
    [[ "$line" == *"---"* ]] && continue
    local src tgt
    src=$(echo "$line" | awk -F'|' '{gsub(/^[[:space:]]+|[[:space:]]+$/, "", $1); print $1}')
    tgt=$(echo "$line" | awk -F'|' '{gsub(/^[[:space:]]+|[[:space:]]+$/, "", $2); print $2}')
    [ -z "$src" ] && continue
    local src_rel="${src#"$REPO_ROOT"/}"
    local tgt_rel="${tgt#"$REPO_ROOT"/}"
    local skip=0
    if [ -n "$allowed_tmp" ] && [ -s "$allowed_tmp" ]; then
      while IFS= read -r entry; do
        [ -z "$entry" ] && continue
        local entry_src="${entry%%:*}"
        local entry_rest="${entry#*:}"
        local entry_tgt="${entry_rest%%:*}"
        if _glob_match "$src_rel" "$entry_src" && _glob_match "$tgt_rel" "$entry_tgt"; then
          skip=1
          break
        fi
      done < "$allowed_tmp"
    fi
    if [ "$skip" -eq 0 ]; then
      violations="${violations}${line}"$'\n'
    fi
  done <<< "$violations_raw"

  [ -n "$allowed_tmp" ] && rm -f "$allowed_tmp"

  violations=$(echo "$violations" | grep -v '^[[:space:]]*$' || true)

  if [ -z "$violations" ]; then
    echo -e "${GREEN}PASS${NC} — No boundary violations found (all allowlisted)."
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
# Check 3: Stub-mutation guard
# ──────────────────────────────────────────────────────────────────────────────
# Flags exported Convex mutations whose handler is declared with an underscore-
# prefixed context parameter (`async (_ctx ...)` / `async (_ ...)`). Such a
# handler cannot write to the db, schedule, or call another mutation — it is a
# stub (see the `stub_mutations` lesson). Known pre-existing stubs live in
# measure/stub-mutation-allowlist.txt.
check_stub_mutations() {
  echo -e "━━━ Check 3: ${YELLOW}Stub-mutation${NC} guard ━━━"

  local allowlist="$SCRIPT_DIR/stub-mutation-allowlist.txt"
  local allowed=""
  if [ -f "$allowlist" ]; then
    # strip inline comments, comment lines, and blanks
    allowed=$(sed 's/#.*//' "$allowlist" | sed 's/[[:space:]]*$//' | grep -v '^[[:space:]]*$' || true)
  fi

  local findings
  findings=$(cd "$REPO_ROOT" && find convex -type f -name "*.ts" \
    ! -name "*.test.ts" ! -path "*/_generated/*" ! -path "*/__fixtures__/*" 2>/dev/null \
    | while read -r f; do
        awk '
          /^export const [A-Za-z0-9_]+ = (internalMutation|mutation)\(\{/ { inblk=1; name=$3; start=NR; next }
          /^export const / { inblk=0 }
          inblk && /handler:[[:space:]]*async[[:space:]]*\([[:space:]]*_/ {
            print FILENAME":"start":"name; inblk=0;
          }
        ' "$f"
      done)

  local violations=""
  if [ -n "$findings" ]; then
    while IFS= read -r line; do
      [ -z "$line" ] && continue
      local path name key
      path=$(echo "$line" | cut -d: -f1)
      name=$(echo "$line" | cut -d: -f3)
      key="$path:$name"
      if ! echo "$allowed" | grep -qxF "$key"; then
        violations="${violations}${line}"$'\n'
      fi
    done <<< "$findings"
  fi

  violations=$(echo "$violations" | grep -v '^[[:space:]]*$' || true)

  if [ -z "$violations" ]; then
    echo -e "${GREEN}PASS${NC} — No new stub mutations (handlers ignoring ctx)."
    return 0
  fi

  local count
  count=$(echo "$violations" | wc -l)
  echo -e "${RED}FAIL${NC} — $count new stub mutation(s) whose handler ignores ctx:"
  echo ""
  echo "$violations" | sed 's/^/  /'
  echo ""
  echo "A mutation that ignores its context param cannot persist anything."
  echo "Options:"
  echo "  1. Implement the handler (write via ctx.db / ctx.scheduler / ctx.runMutation)"
  echo "  2. Remove the mutation if it is dead"
  echo "  3. If intentionally deferred, add 'path.ts:name' to"
  echo "     $allowlist with a tracked tech-debt ID"
  EXIT_CODE=1
}

# ──────────────────────────────────────────────────────────────────────────────
# Check 4: God-file guard
# ──────────────────────────────────────────────────────────────────────────────
# Flags source files at or above GODFILE_THRESHOLD lines. Known pre-existing
# god-files live in measure/godfile-allowlist.txt.
check_god_files() {
  echo -e "━━━ Check 4: ${YELLOW}God-file${NC} guard (>= ${GODFILE_THRESHOLD} lines) ━━━"

  local allowlist="$SCRIPT_DIR/godfile-allowlist.txt"
  local allowed=""
  if [ -f "$allowlist" ]; then
    allowed=$(sed 's/#.*//' "$allowlist" | sed 's/[[:space:]]*$//' | grep -v '^[[:space:]]*$' || true)
  fi

  local violations=""
  while IFS= read -r f; do
    [ -z "$f" ] && continue
    local lines rel
    lines=$(wc -l < "$f" | tr -d ' ')
    if [ "$lines" -ge "$GODFILE_THRESHOLD" ]; then
      rel="${f#"$REPO_ROOT"/}"
      if ! echo "$allowed" | grep -qxF "$rel"; then
        violations="${violations}${rel} (${lines} lines)"$'\n'
      fi
    fi
  done < <(find "$REPO_ROOT/frontend/src" "$REPO_ROOT/pivot/src" "$REPO_ROOT/convex" \
    -type f \( -name "*.ts" -o -name "*.tsx" \) \
    ! -name "*.test.ts" ! -name "*.test.tsx" \
    ! -path "*/__fixtures__/*" ! -path "*/_generated/*" 2>/dev/null)

  violations=$(echo "$violations" | grep -v '^[[:space:]]*$' || true)

  if [ -z "$violations" ]; then
    echo -e "${GREEN}PASS${NC} — No new god-files over ${GODFILE_THRESHOLD} lines."
    return 0
  fi

  local count
  count=$(echo "$violations" | wc -l)
  echo -e "${RED}FAIL${NC} — $count file(s) at or above ${GODFILE_THRESHOLD} lines:"
  echo ""
  echo "$violations" | sed 's/^/  /'
  echo ""
  echo "Options:"
  echo "  1. Split the file into focused modules (extract pure functions/components)"
  echo "  2. If intentionally deferred, add the path to"
  echo "     $allowlist with a tracked tech-debt ID"
  EXIT_CODE=1
}

# ──────────────────────────────────────────────────────────────────────────────
# Check 5: Orphan detection
# ──────────────────────────────────────────────────────────────────────────────
# Finds exported symbols whose only inbound imports/calls edges originate from
# test files (*.test.*). Such symbols are "orphans" — wired only by tests, not
# by production code.  Known false-positives are suppressed via
# measure/orphans-allowlist.txt (same pattern as the other checks).
#
# Env overrides for testing:
#   ORPHANS_DB         — path to a graph.db fixture (default: $REPO_ROOT/graph.db)
#   ORPHANS_ALLOWLIST  — path to allowlist file (default: $SCRIPT_DIR/orphans-allowlist.txt)
check_orphans() {
  echo -e "━━━ Check 5: ${YELLOW}Orphan${NC} detection ━━━"

  local DB="${ORPHANS_DB:-$REPO_ROOT/graph.db}"
  local allowlist="${ORPHANS_ALLOWLIST:-$SCRIPT_DIR/orphans-allowlist.txt}"

  if ! command -v build-graph &> /dev/null; then
    echo -e "${YELLOW}SKIP${NC} — build-graph not found on PATH."
    return 0
  fi

  if [ ! -f "$DB" ]; then
    echo -e "${YELLOW}SKIP${NC} — graph.db not found at $DB."
    return 0
  fi

  # Load allowlist entries (stripped of comments and blanks) into a temp file
  # for reliable grep -f usage with large lists.
  local allowed_tmp=""
  local allowed_count=0
  if [ -f "$allowlist" ]; then
    allowed_tmp=$(mktemp)
    sed 's/#.*//' "$allowlist" | sed 's/[[:space:]]*$//' | grep -v '^[[:space:]]*$' > "$allowed_tmp" || true
    allowed_count=$(wc -l < "$allowed_tmp" | tr -d ' ')
  fi

  # ── Find orphan candidates in a single query ────────────────────────────
  # An exported function is an orphan if:
  #   - file_path is non-empty (skip phantom nodes)
  #   - path does NOT match excluded patterns (__fixtures__/, _generated/, dist/)
  #   - it does NOT carry the "convex-registered" tag
  #   - ALL inbound imports/calls edges come from test files (*.test.*)
  #
  # We use a LEFT JOIN + GROUP BY to compute inbound edge counts in one pass.
  local orphans_raw
  orphans_raw=$(build-graph query "$DB" "
    SELECT n.id, n.name, n.file_path,
      COUNT(e.id) AS total_inbound,
      SUM(CASE WHEN s.file_path LIKE '%.test.%' OR s.file_path LIKE '%.test.tsx' THEN 1 ELSE 0 END) AS test_inbound
    FROM nodes n
    LEFT JOIN edges e ON e.target = n.id AND e.type IN ('imports', 'calls')
    LEFT JOIN nodes s ON e.source = s.id
    WHERE n.type = 'function'
      AND n.tags LIKE '%\"exported\"%'
      AND n.file_path != ''
      AND n.file_path NOT LIKE '%/__fixtures__/%'
      AND n.file_path NOT LIKE '%/convex/_generated/%'
      AND n.file_path NOT LIKE '%/frontend/dist/%'
      AND n.file_path NOT LIKE '%/pivot/dist/%'
      AND n.file_path NOT LIKE '%/measure/%'
      AND n.tags NOT LIKE '%\"convex-registered\"%'
    GROUP BY n.id
    HAVING total_inbound = 0 OR total_inbound = test_inbound
    ORDER BY n.file_path, n.name
  " 2>&1) || true

  if [ -z "$orphans_raw" ]; then
    echo -e "${GREEN}PASS${NC} — No orphaned exports found."
    [ -n "$allowed_tmp" ] && rm -f "$allowed_tmp"
    return 0
  fi

  # ── Process results and apply allowlist ─────────────────────────────────
  local violations=""
  local stale_warnings=""

  # Extract relative-path:symbol keys from the query results in one pass.
  # The query output has columns separated by | with leading/trailing spaces.
  # We strip the header and separator rows, then convert each data row to
  # the "rel_path:symbol" format the allowlist uses.
  local keys_tmp
  keys_tmp=$(mktemp)
  echo "$orphans_raw" | awk -F'|' -v root="$REPO_ROOT/" '
    NR <= 2 { next }                        # skip header + separator
    {
      fp = $3; nm = $2
      gsub(/^[[:space:]]+|[[:space:]]+$/, "", fp)
      gsub(/^[[:space:]]+|[[:space:]]+$/, "", nm)
      if (nm == "") next
      # Make path relative
      sub("^" root, "", fp)
      print fp ":" nm
    }
  ' > "$keys_tmp" 2>/dev/null || true

  # Filter out allowlisted entries using a single grep -v -f pass (much faster
  # than per-row grep -qxF when the allowlist has hundreds of entries).
  if [ -n "$allowed_tmp" ] && [ -s "$allowed_tmp" ]; then
    violations=$(grep -vxFf "$allowed_tmp" "$keys_tmp" 2>/dev/null || true)
  else
    violations=$(cat "$keys_tmp" 2>/dev/null || true)
  fi
  rm -f "$keys_tmp"

  # ── Check allowlist for stale entries (batched query) ────────────────────
  if [ -n "$allowed_tmp" ] && [ "$allowed_count" -gt 0 ]; then
    # Batch the UNION ALL query into chunks to avoid "Argument list too long".
    local batch_size=80
    local union_clauses=""
    local clause_count=0
    local total_checked=0

    flush_batch() {
      [ -z "$union_clauses" ] && return
      local stale_result
      stale_result=$(build-graph query "$DB" "$union_clauses" 2>&1) || true
      if [ -n "$stale_result" ] && [[ "$stale_result" != *"(no results)"* ]]; then
        while IFS='|' read -r ep es; do
          ep=$(echo "$ep" | xargs)
          es=$(echo "$es" | xargs)
          [ -z "$ep" ] && continue
          [[ "$ep" == *"(no results)"* ]] && continue
          stale_warnings="${stale_warnings}  STALE allowlist entry: ${ep}:${es} (symbol not found in graph.db)"$'\n'
        done < <(echo "$stale_result" | tail -n +3)
      fi
      union_clauses=""
      clause_count=0
    }

    while IFS= read -r entry; do
      [ -z "$entry" ] && continue
      local entry_path entry_sym
      entry_path="${entry%%:*}"
      entry_sym="${entry#*:}"
      entry_sym="${entry_sym//\'/\'\'}"
      entry_path="${entry_path//\'/\'\'}"
      if [ -n "$union_clauses" ]; then
        union_clauses="${union_clauses} UNION ALL "
      fi
      union_clauses="${union_clauses}SELECT '${entry_path}' AS ep, '${entry_sym}' AS es WHERE NOT EXISTS (SELECT 1 FROM nodes WHERE name = '${entry_sym}' AND file_path LIKE '%${entry_path}%' AND type IN ('function','class'))"
      clause_count=$((clause_count + 1))
      if [ "$clause_count" -ge "$batch_size" ]; then
        flush_batch
      fi
    done < "$allowed_tmp"
    flush_batch
  fi

  # ── Step 4: Report ──────────────────────────────────────────────────────
  violations=$(echo "$violations" | grep -v '^[[:space:]]*$' || true)

  if [ -n "$stale_warnings" ]; then
    echo -e "${YELLOW}WARNING${NC} — Stale allowlist entries detected:"
    echo "$stale_warnings"
  fi

  if [ -z "$violations" ]; then
    echo -e "${GREEN}PASS${NC} — No orphaned exports found."
    [ -n "$allowed_tmp" ] && rm -f "$allowed_tmp"
    return 0
  fi

  local count
  count=$(echo "$violations" | wc -l)
  echo -e "${RED}FAIL${NC} — $count orphaned export(s) (only test-inbound edges):"
  echo ""
  echo "$violations" | sed 's/^/  /'
  echo ""
  echo "Options:"
  echo "  1. Wire the export into production code"
  echo "  2. Remove the export if it is dead"
  echo "  3. If intentionally deferred, add 'path:symbol' to"
  echo "     $allowlist with a tracked tech-debt ID"
  EXIT_CODE=1

  # Cleanup temp file.
  [ -n "$allowed_tmp" ] && rm -f "$allowed_tmp"
}

# ──────────────────────────────────────────────────────────────────────────────
# Check 6: Status-vocabulary guard
# ──────────────────────────────────────────────────────────────────────────────
# Flags inline `v.union(v.literal(...))` patterns in convex/schema/ that are
# not sourced from convex/lib/validators.ts.  Status vocabularies must be
# defined once in validators.ts and imported — inline definitions cause drift.
#
# Env overrides for testing:
#   STATUS_VOCAB_SCHEMA_DIR — directory to scan (default: $REPO_ROOT/convex/schema)
check_status_vocabulary() {
  echo -e "━━━ Check 6: ${YELLOW}Status-vocabulary${NC} guard ━━━"

  local schema_dir="${STATUS_VOCAB_SCHEMA_DIR:-$REPO_ROOT/convex/schema}"
  local allowlist="$SCRIPT_DIR/status-vocabulary-allowlist.txt"

  if [ ! -d "$schema_dir" ]; then
    echo -e "${YELLOW}SKIP${NC} — Schema directory not found at $schema_dir."
    return 0
  fi

  # Load allowlist entries (stripped of comments and blanks).
  local allowed_tmp=""
  if [ -f "$allowlist" ]; then
    allowed_tmp=$(mktemp)
    sed 's/#.*//' "$allowlist" | sed 's/[[:space:]]*$//' | grep -v '^[[:space:]]*$' > "$allowed_tmp" || true
  fi

  # Find inline v.union(v.literal( patterns in .ts files.
  # Exclude test files and _generated directories.
  local violations=""
  while IFS= read -r match; do
    [ -z "$match" ] && continue
    local filepath="${match%%:*}"
    local rel="${filepath#"$REPO_ROOT"/}"
    # Apply allowlist: match by repo-relative path, basename of file path,
    # or basename of allowlist entry (handles temp-dir overrides in tests).
    if [ -n "$allowed_tmp" ]; then
      local base
      base="$(basename "$filepath")"
      local skip=0
      while IFS= read -r entry; do
        [ -z "$entry" ] && continue
        local entry_base
        entry_base="$(basename "$entry")"
        if [ "$rel" = "$entry" ] || [ "$base" = "$entry" ] || [ "$base" = "$entry_base" ]; then
          skip=1
          break
        fi
      done < "$allowed_tmp"
      [ "$skip" -eq 1 ] && continue
    fi
    violations="${violations}${match}"$'\n'
  done < <(grep -rn 'v\.union(.*v\.literal(' \
    --include="*.ts" --include="*.tsx" \
    "$schema_dir" \
    2>/dev/null \
    | grep -v "\.test\.ts" \
    | grep -v "\.test\.tsx" \
    | grep -v "_generated" \
    || true)

  violations=$(echo "$violations" | grep -v '^[[:space:]]*$' || true)

  [ -n "$allowed_tmp" ] && rm -f "$allowed_tmp"

  if [ -z "$violations" ]; then
    echo -e "${GREEN}PASS${NC} — No inline status unions found in schema (all sourced from validators.ts)."
    return 0
  fi

  local count
  count=$(echo "$violations" | wc -l)
  echo -e "${RED}FAIL${NC} — $count inline status union(s) found in schema:"
  echo ""
  echo "$violations" | sed 's/^/  /'
  echo ""
  echo "Status vocabularies must be defined once in convex/lib/validators.ts."
  echo "Options:"
  echo "  1. Import the canonical validator from convex/lib/validators.ts"
  echo "  2. If intentionally deferred, add the relative path to"
  echo "     $allowlist"
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
  stub-mutation)
    check_stub_mutations
    ;;
  god-file)
    check_god_files
    ;;
  orphans)
    check_orphans
    ;;
  status-vocabulary)
    check_status_vocabulary
    ;;
  all)
    check_as_any
    echo ""
    check_boundary
    echo ""
    check_stub_mutations
    echo ""
    check_god_files
    echo ""
    check_orphans
    echo ""
    check_status_vocabulary
    ;;
  *)
    echo "Usage: $0 [as-any|boundary|stub-mutation|god-file|orphans|status-vocabulary|all]"
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
