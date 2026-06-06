#!/usr/bin/env bash
# build-orphans-fixture.sh — Seed a deterministic SQLite knowledge graph for
# the Phase 3 orphan-detection Red tests.
#
# Usage:  build-orphans-fixture.sh <output.db>
#
# The seeded graph is intentionally tiny (6 prod-class nodes + 1 phantom)
# so the orphans subcommand has well-defined true/false positives to flag
# or skip. The shape is fixed by test-strategy §2 and §3:
#
#   1. TRUE ORPHAN: prod function whose ONLY inbound imports/calls edges come
#      from a *.test.* file. Must be reported.
#   2. PROD-ONLY: prod function with prod inbound edges. Must NOT be reported.
#   3. FIXTURE:   node inside a __fixtures__/ path. Must be skipped (path rule).
#   4. GENERATED: node inside convex/_generated/. Must be skipped (path rule).
#   5. CONVEX REGISTERED: prod convex function with a `convex-registered` tag
#      and a registered-handler pattern. The detector must allowlist these by
#      tag/path so the Convex-registered-factory false-positive class does
#      not pollute the report (see test-strategy §6 — build-graph does not
#      record edges through the Convex registered-handler decorator path).
#   6. ALLOWLISTED: prod function listed in orphans-allowlist.txt. The detector
#      must suppress it AND warn on stale allowlist entries (test-strategy §3,
#      "Allowlist drift").
#   7. PHANTOM:   function node with empty file_path — a build-graph
#      data-quality artifact. Must be skipped (test-strategy §6, the
#      SaveAsTemplateModal ambiguity case). We assert this here so a future
#      regression that re-imports the re-export phantom does not crash the
#      subcommand.
#
# No production files are scanned. The graph is hand-built with deterministic
# IDs and timestamps so tests are reproducible across machines and timezones.
# Do NOT swap this for `build-graph scan ./` — that would make the fixture
# non-deterministic (test-strategy §2).

set -euo pipefail

OUT="${1:?usage: build-orphans-fixture.sh <output.db>}"

if ! command -v build-graph >/dev/null 2>&1; then
  echo "build-orphans-fixture: build-graph not on PATH" >&2
  exit 2
fi
if ! command -v sqlite3 >/dev/null 2>&1; then
  echo "build-orphans-fixture: sqlite3 not on PATH" >&2
  exit 2
fi

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
FIXTURE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Idempotent: always rebuild from scratch.
rm -f "$OUT"
build-graph init "$OUT" >/dev/null

# Stable node IDs. Using `function:<path>:<name>` format mirrors the live DB.
F_ORPHAN_ID="function:$REPO_ROOT/frontend/src/components/SaveAsTemplateModal.tsx:SaveAsTemplateModal"
F_PROD_ID="function:$REPO_ROOT/pivot/src/policy/scoring.ts:calcScore"
F_FIXTURE_ID="function:$REPO_ROOT/frontend/src/__fixtures__/someFixture.ts:buildFixture"
F_GEN_ID="function:$REPO_ROOT/convex/_generated/api.ts:api"
F_CONVEX_ID="function:$REPO_ROOT/convex/migrate.ts:migrateProject"
F_ALLOW_ID="function:$REPO_ROOT/pivot/src/legacy.ts:legacyThing"
F_PHANTOM_ID="function:*:PhantomReExport"

# File node IDs (for the test files and prod files that import/depend on them).
FILE_SAVETEST="$REPO_ROOT/frontend/src/components/SaveAsTemplateModal.test.tsx"
FILE_SCORING="$REPO_ROOT/pivot/src/policy/scoring.ts"
FILE_PROD_CALLER="$REPO_ROOT/pivot/src/orchestrator/executor.ts"
FILE_LEGACY_TEST="$REPO_ROOT/pivot/src/legacy.test.ts"

sqlite3 "$OUT" <<SQL
-- ── Nodes ───────────────────────────────────────────────────────────────────
INSERT INTO nodes (id, type, name, file_path, line_start, line_end, summary, tags) VALUES
  ('file:$FILE_SAVETEST',     'file',     'SaveAsTemplateModal.test.tsx', '$FILE_SAVETEST',     1, 50,  NULL, '[]'),
  ('file:$FILE_SCORING',      'file',     'scoring.ts',                   '$FILE_SCORING',      1, 200, NULL, '[]'),
  ('file:$FILE_PROD_CALLER',  'file',     'executor.ts',                  '$FILE_PROD_CALLER',  1, 300, NULL, '[]'),
  ('file:$FILE_LEGACY_TEST',  'file',     'legacy.test.ts',               '$FILE_LEGACY_TEST',  1, 30,  NULL, '[]'),

  -- 1. TRUE ORPHAN: prod export, only test-inbound
  ('$F_ORPHAN_ID',  'function', 'SaveAsTemplateModal', '$REPO_ROOT/frontend/src/components/SaveAsTemplateModal.tsx', 10, 90,
    'Modal for saving the current project as a reusable template', '["exported"]'),

  -- 2. PROD-ONLY: prod export with prod callers
  ('$F_PROD_ID',    'function', 'calcScore',           '$REPO_ROOT/pivot/src/policy/scoring.ts', 1, 30,
    'Compute pivot score from policy inputs',                   '["exported"]'),

  -- 3. FIXTURE: inside __fixtures__/, must be skipped
  ('$F_FIXTURE_ID', 'function', 'buildFixture',        '$REPO_ROOT/frontend/src/__fixtures__/someFixture.ts', 1, 20,
    'Test fixture builder',                                     '["exported"]'),

  -- 4. GENERATED: inside convex/_generated/, must be skipped
  ('$F_GEN_ID',     'function', 'api',                 '$REPO_ROOT/convex/_generated/api.ts', 1, 20,
    'Generated Convex API table',                               '["exported","generated"]'),

  -- 5. CONVEX REGISTERED: false-positive class, must be allowlisted by tag/path
  ('$F_CONVEX_ID',  'function', 'migrateProject',      '$REPO_ROOT/convex/migrate.ts', 1, 40,
    'Migrates a legacy project to current schema',              '["exported","convex-registered"]'),

  -- 6. ALLOWLISTED: prod export, present in orphans-allowlist.txt
  ('$F_ALLOW_ID',   'function', 'legacyThing',         '$REPO_ROOT/pivot/src/legacy.ts', 1, 25,
    'Legacy helper, scheduled for removal in Q3',               '["exported"]'),

  -- 7. PHANTOM: empty file_path data-quality artifact, must be skipped
  ('$F_PHANTOM_ID', 'function', 'PhantomReExport',     '', NULL, NULL, NULL,                                              '["exported"]');

-- ── Edges ───────────────────────────────────────────────────────────────────
-- 1. TRUE ORPHAN: only inbound edge is from a *.test.* file (test→orphan)
INSERT INTO edges (source, target, type, direction) VALUES
  ('file:$FILE_SAVETEST', '$F_ORPHAN_ID', 'imports', 'upstream');

-- 2. PROD-ONLY: inbound from both prod and test
INSERT INTO edges (source, target, type, direction) VALUES
  ('file:$FILE_PROD_CALLER', '$F_PROD_ID', 'imports', 'upstream'),
  ('file:$FILE_SAVETEST',    '$F_PROD_ID', 'imports', 'upstream');

-- 3. FIXTURE: tests reference it, but path exclusion should drop it
INSERT INTO edges (source, target, type, direction) VALUES
  ('file:$FILE_SAVETEST', '$F_FIXTURE_ID', 'imports', 'upstream');

-- 4. GENERATED: production code calls into the generated API (typical), but
--    the path itself is excluded. With zero inbound edges it would otherwise
--    be flagged as orphan; with the generated-path rule it must not be.
--    (We give it zero inbound edges on purpose to confirm the path rule.)

-- 5. CONVEX REGISTERED: zero inbound edges. Tag-based allowlist must drop it.
--    (Build-graph does not record edges through the Convex
--     registered-handler decorator path; see test-strategy §6.)

-- 6. ALLOWLISTED: zero inbound edges. orphans-allowlist.txt entry must drop
--    it AND the detector must warn that the allowlist entry is stale (the
--    source no longer exists, so the entry is dead) — see test-strategy §3
--    "Allowlist drift". We do NOT create the source file to exercise that
--    path. The test sets up the allowlist entry pointing at the node, so
--    the detector must match it; the staleness check is exercised via a
--    separate orphan-removed test case.

-- (No edges needed for FIXTURE, GENERATED, CONVEX, ALLOW, or PHANTOM at the
--  function-node level; they're classified by path/tag/allowlist rules.)

-- ── Meta ────────────────────────────────────────────────────────────────────
INSERT INTO meta (key, value) VALUES
  ('project_root', '$REPO_ROOT'),
  ('fixture_purpose', 'orphans-red-tests'),
  ('fixture_seed_count', '7');
SQL

# The fixture DB is the source of truth for the Red tests. The test suite
# also writes a sample orphans-allowlist.txt (one entry: the legacyThing
# prod export) so the allowlist-staleness case has something to act on.
SAMPLE_ALLOWLIST="$FIXTURE_DIR/orphans-allowlist.sample.txt"
cat > "$SAMPLE_ALLOWLIST" <<EOF
# Sample orphans-allowlist (used by orphans.test.sh Red tests)
# Format: <relative_path>:<symbol>
# Comments (#) and blank lines are ignored.
pivot/src/legacy.ts:legacyThing
EOF

echo "build-orphans-fixture: seeded $OUT (4 file + 7 function nodes, 4 edges)"
echo "build-orphans-fixture: sample allowlist at $SAMPLE_ALLOWLIST"
