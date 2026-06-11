# Spec: Quality-Gate Enforcement & Dead-Code Sweep

## Problem

The 2026-06-05 review found the meta-failure behind every other finding: the
quality gates were red and it was tolerated. Tracks closed citing "999 pass / 18
fail (pre-existing)"; typecheck carried 8+ errors across sessions; the frontend
suite had 6 red tests; `doctor.sh`'s as-any check was silently non-functional;
and a headline feature shipped as an **orphaned component**
(`SaveAsTemplateModal`, imported by no page — TD-238) while its track was marked
complete. The codebase has a documented history of this: `dead_code`,
`orphan_detection`, `track_closeout`, and `test_coverage_claims` are all
recurring lessons, and TD-209 / TD-213 are dead exported subsystems still open.

There is no enforced gate that would have caught any of this at merge time, and
no automated orphan detection despite `build-graph` being available.

## Solution

Two halves, one goal — make "done" mean verified:

1. **Enforcement:** a single `verify` entrypoint that runs the full gate
   (aggregate pivot test, convex test, frontend test, `pivot typecheck`,
   `frontend check`, `doctor.sh all`) and a CI/pre-push hook that blocks on it.
   Add a Measure closeout rule: a track cannot be archived while any gate is red.
2. **Dead-code sweep:** use `build-graph` to find production exports/components
   with only test-inbound edges (orphans), then wire-or-delete them.

## Acceptance Criteria

- [ ] One command (e.g. `npm run verify` / `measure/verify.sh`) runs all gates
      and exits non-zero on any failure; output names which gate failed.
- [ ] A pre-push (or CI) hook runs `verify`; a documented bypass exists only with
      an explicit, logged override.
- [ ] An `orphans` mode/report (build-graph-driven) lists production symbols and
      components whose only inbound edges are test files.
- [ ] Each current orphan is resolved: wired into a production caller or deleted
      with its stale tests. At minimum: `SaveAsTemplateModal` (TD-238, via its
      owning track), and the TD-209 / TD-213 dead exports.
- [ ] A Measure closeout checklist item added to `workflow.md`: "all gates green
      (verify passes) AND no new orphans" is required before a track is archived.
- [ ] Gates are green at track close; `build-graph` updated.

## Out of Scope

- Fixing the specific currently-red tests (owned by review_remediation / the
  feature tracks) — this track consumes their green result, it does not fix them.
- Building a full CI service; a local hook + documented CI snippet is sufficient.
- The as-any guard repair itself (TD-236, review_remediation) — this track wires
  it into the aggregate gate once it works.

## Cross-References

- Consumes green from: review_remediation, provider_health_resilience,
  project_template_marketplace.
- Lessons: `dead_code`, `orphan_detection`, `track_closeout`, `test_coverage_claims`.
- Dead exports to sweep: TD-209, TD-213.
