#!/usr/bin/env bash
# orphan-export-guard.sh — Finds pivot source files with no non-test importers.
#
# Convex files are excluded because they're accessed via the Convex API
# (generated imports), not direct file imports. Entry points (server.ts,
# run.ts), barrel exports (index.ts), and sync scripts are also excluded.
#
# Usage: ./measure/orphan-export-guard.sh [graph.db]
# Exit code 0 = no orphans; 1 = orphans found; 2 = error

set -euo pipefail

DB="${1:-./graph.db}"

if [ ! -f "$DB" ]; then
  echo "ERROR: graph database not found at $DB"
  exit 2
fi

# Count pivot source files with zero non-test import edges
RESULT=$(build-graph query "$DB" "
SELECT n.file_path AS path
FROM nodes n
WHERE n.type = 'file'
  AND n.file_path LIKE '%/pivot/src/%'
  AND n.file_path NOT LIKE '%.test.ts'
  AND n.file_path NOT LIKE '%.test.tsx'
  AND n.file_path NOT LIKE '%/__fixtures__%'
  AND n.file_path NOT LIKE '%/test-%'
  AND n.file_path NOT LIKE '%/_generated/%'
  AND n.file_path NOT LIKE '%/node_modules/%'
  AND n.file_path NOT LIKE '%/index.ts'
  AND n.file_path NOT LIKE '%/server.ts'
  AND n.file_path NOT LIKE '%/run.ts'
  AND n.file_path NOT LIKE '%/sync/%'
  AND NOT EXISTS (
    SELECT 1 FROM edges e
    WHERE e.target = n.id
      AND e.type = 'imports'
      AND e.source NOT LIKE '%.test.ts'
      AND e.source NOT LIKE '%.test.tsx'
      AND e.source NOT LIKE '%/__fixtures__%'
      AND e.source NOT LIKE '%/test-%'
  )
ORDER BY n.file_path
" 2>&1)

if [ -z "$RESULT" ]; then
  echo "Orphan-export guard: PASS — no orphan pivot source files found."
  exit 0
fi

COUNT=$(echo "$RESULT" | wc -l)
echo "Orphan-export guard: FAIL — $COUNT pivot source files with no non-test importers."
echo ""
echo "$RESULT"
echo ""
echo "Wire these files into production or delete them."
exit 1
