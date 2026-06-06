#!/usr/bin/env bash
# build-as-any-fixture.sh — Seed a deterministic tmp "fake repo" for the
# Phase 3 (TD-236) as-any-guard Red tests.
#
# Usage:  build-as-any-fixture.sh <output-dir>
#
# The fake repo mirrors the production doctor.sh scan roots
# (`<root>/frontend/src`, `<root>/pivot/src`, `<root>/convex`) so the
# production `doctor.sh as-any` can be run unmodified against it. The
# fixture copies the production `measure/doctor.sh` into the tmp tree;
# the test writes a controlled `measure/as-any-allowlist.txt` per
# scenario. This isolates the test from the live repo and keeps the
# fixture non-deterministic with respect to other tracks' code
# (test-strategy §1 row 3: "tmp repo with a seeded violation + allowlist
# entry"; test-strategy §2: "do NOT scan a real directory").
#
# Seeded cast sites (all production-shape — no `.test.`, no
# `__fixtures__/`, no skip-comment lines):
#
#   1. frontend/src/components/Widget.tsx:7      — `const x = something as any;`
#      (path matches `frontend/**/*.tsx` globs; content matches `as any`)
#   2. frontend/src/lib/util.ts:5                 — `const y = (payload) as any;`
#      (path matches `frontend/src/lib/**` globs; content matches `as any`)
#   3. pivot/src/policy/scoring.ts:11             — `const z = a as any;`
#      (path matches `pivot/**` globs; content matches `as any`)
#   4. convex/foo.ts:3                            — `const w = b as any;`
#      (path matches `convex/**` globs; content matches `as any`)
#
# Tests write a scenario-specific `measure/as-any-allowlist.txt` and run
# the production `bash <tmp>/measure/doctor.sh as-any` to verify the
# matcher behavior. The four seeds give the matrix enough shape to
# assert: matching glob, matching substring, non-matching, malformed
# line tolerance, comment-line tolerance, blank-line tolerance, and a
# count test (N seeded, M allowlisted → N−M reported).
#
# Idempotent: always rebuilds the tmp tree from scratch. The tmp dir
# is gitignored (test-strategy §2: tmp artifacts are local-only).

set -euo pipefail

OUT="${1:?usage: build-as-any-fixture.sh <output-dir>}"

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
PROD_DOCTOR="$REPO_ROOT/measure/doctor.sh"

if [ ! -f "$PROD_DOCTOR" ]; then
  echo "build-as-any-fixture: production doctor.sh not found at $PROD_DOCTOR" >&2
  exit 2
fi

# Idempotent: rebuild from scratch.
rm -rf "$OUT"
mkdir -p "$OUT"

# Mirror the production scan layout so `bash doctor.sh` works unmodified.
mkdir -p "$OUT/measure"
mkdir -p "$OUT/frontend/src/components"
mkdir -p "$OUT/frontend/src/lib"
mkdir -p "$OUT/pivot/src/policy"
mkdir -p "$OUT/convex"

# Copy the production doctor.sh (unmodified) so the Red tests exercise
# the real script. The test writes a controlled allowlist next to it.
cp "$PROD_DOCTOR" "$OUT/measure/doctor.sh"
chmod +x "$OUT/measure/doctor.sh"

# Seed: 1 — frontend component, suppressible via `frontend/**/*.tsx` glob.
cat > "$OUT/frontend/src/components/Widget.tsx" <<'TS'
// Seed cast site 1: frontend component (suppressible via frontend/** globs).
export const widgetRender = (): string => {
  const data: { ok: boolean } = { ok: true };
  const coerced = data as any;
  return coerced.ok ? "ok" : "nope";
};
TS

# Seed: 2 — frontend lib util, suppressible via `frontend/src/lib/**` glob
# or `**/util.ts` substring.
cat > "$OUT/frontend/src/lib/util.ts" <<'TS'
// Seed cast site 2: frontend lib util (suppressible via frontend/src/lib/**).
export const util = (payload: unknown): string => {
  const coerced = (payload) as any;
  return String(coerced);
};
TS

# Seed: 3 — pivot policy, suppressible via `pivot/**` globs.
cat > "$OUT/pivot/src/policy/scoring.ts" <<'TS'
// Seed cast site 3: pivot policy (suppressible via pivot/** globs).
export const score = (a: number): number => {
  const z = a as any;
  return Number(z);
};
TS

# Seed: 4 — convex foo, suppressible via `convex/**` globs.
cat > "$OUT/convex/foo.ts" <<'TS'
// Seed cast site 4: convex foo (suppressible via convex/** globs).
export const foo = (b: number): number => {
  const w = b as any;
  return Number(w);
};
TS

# Default allowlist (overwritten per scenario by the test) — empty, so
# the seeded casts are all reported. The doctor.sh currently does not
# read the allowlist at all, so the test is RED on TWO axes:
#   (a) static: the production header documents the OLD `file_path:line_number:reason`
#       format (line 2 of measure/as-any-allowlist.txt).
#   (b) behavior: doctor.sh::check_as_any never consults the allowlist,
#       so seeded casts are reported regardless of allowlist entries.
cat > "$OUT/measure/as-any-allowlist.txt" <<'EOF'
# Default (empty) allowlist — overwritten per scenario by the test.
EOF

echo "build-as-any-fixture: seeded $OUT (4 cast sites, 1 doctor.sh copy, 1 empty allowlist)"
echo "build-as-any-fixture: run 'bash $OUT/measure/doctor.sh as-any' to exercise the guard"
