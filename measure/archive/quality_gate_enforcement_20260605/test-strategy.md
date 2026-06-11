# Test Strategy: Quality-Gate Enforcement & Dead-Code Sweep

This track is **infrastructure, not product code**: shell entrypoints, git hooks,
and a graph-driven report. Tests must validate behavior without invoking the
real, expensive (and currently-red) gates. Phase 4 is wire-or-delete, so its
"tests" are mostly graph queries and existing suites.

## 1. Testing Pyramid (per phase)

| Phase | Unit (bats/shell) | Integration | E2E |
|---|---|---|---|
| 1 verify entrypoint | Per-gate exit aggregation, summary formatting, arg passthrough | Run `verify.sh` against `hooks/test/fake-gates/` stubs | One real `verify` invocation captured as baseline (manual) |
| 2 pre-push hook | Hook script unit test (push event detection, override flag parsing) | Hook → `verify.sh` → fake-gates wiring; assert `VERIFY_SKIP=1` warns & exits 0 | Real install on a scratch clone; simulate `git push` |
| 3 orphan detector | Pure functions: classify node (prod/test/fixture/generated), allowlist matcher | `orphans` subcommand against a seeded fixture `graph.db` | Run against live `./graph.db`; snapshot to allowlist |
| 4 dead-code sweep | N/A (deletions/wirings exercise existing suites) | Existing pivot/convex/frontend tests must stay green after each wire-or-delete | Re-run orphans report; must shrink |
| 5 closeout rule | Doc-only; lint that `workflow.md` contains the rule string | `verify` + orphans both green on a dry-run track close | Full `verify` on main |

Bias is heavy at the unit/integration layer; the only true E2E is a single
all-green `verify` run at closeout (AC #6).

## 2. Shared Fixtures & Mocks

- **`hooks/test/fake-gates/`** (already scaffolded, see its README): the
  canonical mock harness for Phases 1, 2, and 5. Every shell test MUST use it
  via `VERIFY_FAKE_GATE_DIR` rather than invoking real `bun --cwd …` commands.
  Per-gate exit codes are controlled by `FAKE_<GATE>_EXIT`; invocation order is
  asserted via `FAKE_<GATE>_LOG`.
- **Seeded `graph.db` fixture** (Phase 3): a tiny SQLite DB committed under
  `measure/tests/fixtures/orphans.db` containing ~6 nodes — one true orphan,
  one prod symbol with prod callers, one test-only fixture, one generated file,
  one Convex registered handler (false-positive class), one allowlisted entry.
  Build it with `build-graph init` + `INSERT`s in a setup script; do NOT scan a
  real directory (non-deterministic).
- **Scratch git repo** for hook tests: `mktemp -d` + `git init` + symlink the
  hook; tear down in `trap`. No shared state between tests.

## 3. Cross-Phase Edge Cases & Dependencies

- **Phase 1 ↔ 2:** the hook must invoke `verify.sh` via the same entrypoint
  tests use; do not duplicate the gate list in the hook (single source of
  truth, otherwise drift recurs — same root cause as TD-236).
- **`VERIFY_SKIP=1` semantics:** must (a) print a loud warning to stderr,
  (b) record an entry to a log file the user can grep, (c) still exit 0. Test
  all three; missing any one re-creates the "silent skip" failure mode.
- **Aggregation, not short-circuit:** `verify` must run ALL gates even after
  the first failure and report each — otherwise users fix one gate, push, and
  hit the next gate in CI. Add a test where `FAKE_PIVOT_TEST_EXIT=1` and
  `FAKE_DOCTOR_EXIT=1` and assert both appear in the summary.
- **Convex test invocation:** the `find … | sed 's|^|./|'` form is required by
  `bunfig` root=pivot (per plan Phase 1). Pin it in a test that asserts the
  exact constructed command line. Empty `find` result must NOT pass vacuously.
- **Orphan classifier false positives:** Convex `query`/`mutation`/`action`
  handlers, Vite route modules, and React lazy imports are reachable through
  edges build-graph does not always record. The detector MUST allowlist these
  by tag/path pattern, not by inbound-edge count alone. Seed the fixture with
  at least one of each and assert they are NOT flagged.
- **Generated/fixture exclusion:** `__fixtures__/`, `convex/_generated/`,
  `frontend/dist/`, `pivot/dist/` must be excluded (mirror `doctor.sh` rules).
- **Allowlist drift:** test that removing an orphan from source but leaving
  it in the allowlist produces a warning (stale-entry detection), or
  Phase 4's sweep will leave a junk allowlist behind.

## 4. Architecture Guardrails

- `verify.sh` lives at `measure/verify.sh` and is the **only** place the gate
  list is enumerated. The pre-push hook, CI snippet, and closeout doc all
  reference it; none re-enumerates gates.
- Hook scripts go under `hooks/` (already exists) with an `install.sh`; never
  under `.git/hooks/` directly (not version-controlled).
- Orphan detection is a `doctor.sh` **Check 5** (per plan), not a separate
  binary. Same exit-code contract (0/1/2), same allowlist file pattern as
  `as-any-allowlist.txt` / `boundary-allowlist.txt`. Consistency matters: see
  TD-236 (inconsistent allowlist format silently broke Check 1).
- No new dependencies. Pure bash + `build-graph` CLI + SQLite.
- The orphans report uses the `build-graph query` CLI, NOT a custom SQLite
  binding. Re-uses graph indexes; one source of truth for graph schema.

## 5. Per-Phase Test Approach Notes

- **Phase 1:** Author `measure/tests/verify.test.sh` first (TDD). Cover:
  all-pass, single-gate fail, multi-gate fail, missing stub dir (real-mode
  smoke), summary ordering, non-zero aggregate exit.
- **Phase 2:** TDD the hook script with the same fake-gate harness. Add a
  scratch-repo integration test for the install step. Override test asserts
  warning + log + exit-0.
- **Phase 3:** TDD against the seeded fixture DB. Snapshot the live-DB output
  to `orphans-allowlist.txt`; commit. Negative test: inject a known orphan,
  assert it surfaces; remove allowlist entry, assert FAIL exit.
- **Phase 4:** No new test files. For each wire-or-delete: run the owning
  package's existing suite; if deleting, also delete the stale test (do not
  leave `.skip` — that hides regressions, see `test_coverage_claims` lesson).
- **Phase 5:** Doc-lint test that `workflow.md` contains the closeout-rule
  string; a green `verify` + clean orphans run as the final gate.

## 6. Build-Graph Findings That Shaped This Strategy

- `graph.db` is fresh (~1h old, 4675 nodes, 6584 edges, 609 files, 4 packages).
- `WorktreeManager` and `DispatchPacer` (TD-213) return **no matches** in the
  graph — they may already be deleted, OR the names differ, OR they live in
  files excluded from scan. Phase 4 must `build-graph search` partial names
  and `git log -S` before assuming "already gone." If truly absent, close
  TD-213 as resolved rather than wiring/deleting.
- `SaveAsTemplateModal` is ambiguous (two nodes: a real `function` at
  `frontend/src/components/SaveAsTemplateModal.tsx` and a phantom with empty
  `file_path` — likely a re-export artifact). Phase 4 cross-check must use
  the file-pathed node; the phantom would falsely show as orphan. **Flag this
  as a build-graph data-quality bug** for the orphan detector to handle
  (skip nodes with empty `file_path`).
- A naive "exported & zero inbound edges" SQL query returned 15+ obvious
  false positives in 10 seconds: Convex registered functions (`migrateProject`,
  `getProjectHealth`, `generateDemoProject`), retry helpers (`withRetry`),
  typed-client factories (`createConvexClient`, `typedQuery`, `typedMutation`).
  This validates the design above: the detector MUST classify by
  tag/path/decorator before reporting, and ship with a seeded allowlist on
  day one. A raw query would generate ~50–100 noisy entries and get ignored
  — the exact failure mode this track exists to fix.
