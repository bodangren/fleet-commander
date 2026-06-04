# Graph Node Audit — Methodology

You are reviewing one **slice** of the codebase graph against the originating
**Measure track phase** for each node. Your job: produce a structured report
of construction- and interaction-quality findings, per node, with an actionable
priority ranking.

## Inputs you have

1. **Your slice's inventory JSON**: `measure/reviews/graph-node-audit/inventories/<slice>.json`
   - Contains every file in your slice with: node list, originating track, introducing commit.
2. **Codebase graph**: `./graph.db` (use `build-graph` CLI — `inspect`, `callers`, `deps`, `query`).
3. **Archived tracks**: `measure/archive/<track_id>/{spec.md, plan.md, metadata.json}`.
4. **The source code**: read freely.

## Methodology (per file in your slice)

For each file in your inventory:

### Step 1 — Resolve the originating phase
- Open `measure/archive/<best_track>/plan.md`. If the file has ≥2 track
  candidates, also peek at the others; pick the one whose **plan phase**
  most plausibly introduces this file (look for: matching filename in code blocks,
  matching feature description, matching commit subject pattern).
- Record the **phase number/title** the file came from. If you can't identify
  one, write `phase: ?` and keep going — don't HALT.
- Open `spec.md` only if the plan is ambiguous (i.e. you need acceptance criteria
  context to judge whether the implementation matches intent).

### Step 2 — Review each node in the file

For every node in the file (skip `param` nodes — they roll up into their parent
function) evaluate against these axes:

**Construction quality** (what's inside the node):
- **Cohesion**: does the function/class do one thing, or is it doing too much?
- **Naming**: is the name descriptive and consistent with neighbours? Any
  abbreviations or unclear identifiers?
- **JSDoc**: is the JSDoc present and accurate? (the graph stores `summary` —
  if it's empty for an exported symbol that's a finding).
- **Types**: are inputs/outputs typed precisely? Any `any`, broad `unknown` not
  narrowed, or implicit `any`?
- **Error handling**: are failure paths explicit? Any swallowed errors?
- **Complexity**: graph stores a `complexity` score — flag anything ≥ 15 as
  too complex.
- **Spec alignment**: does the implementation match what the originating phase
  promised? (Read the phase's task list and acceptance criteria.)

**Interaction quality** (how the node connects to its neighbours):
- **Callers** (`build-graph callers ./graph.db <name>`): is the node called
  proportionally to its importance? Orphan exports (0 callers) on exported
  symbols are findings. High-fan-in (>10 callers) is a coupling risk — flag if
  the symbol isn't a clearly-shared utility.
- **Dependencies** (`build-graph deps ./graph.db <name> --downstream`): does
  the node depend on layers it shouldn't? (e.g. `convex/` code reaching into
  `pivot/`, UI code importing server-only modules).
- **Boundary leaks**: does the node leak implementation details across the
  package boundary (pivot ↔ frontend ↔ convex)?
- **Test coverage**: does a sibling `.test.ts(x)` exist? If the node is
  exported but untested, flag it.

### Step 3 — Score and prioritise

For each node where you have a finding, assign one of:

- **Critical** — broken contract, security/correctness risk, or major spec
  mismatch with current callers. Should be fixed urgently.
- **High** — significant coupling/cohesion/test-gap issue; will hurt future
  maintenance.
- **Medium** — clear improvement but no functional risk (naming, missing
  JSDoc, light dead code).
- **Low** — stylistic nit.

Skip nodes that look healthy — don't pad the report. The default outcome for a
well-formed exported symbol that matches its spec phase should be
`No findings`.

## Output format

Write your report to: `measure/reviews/graph-node-audit/slices/<slice_id>.md`

Use this exact template:

```markdown
# Graph Node Audit — <slice title>

**Slice:** `<slice_id>`
**Files reviewed:** N
**Nodes reviewed:** M
**Findings:** Critical: a · High: b · Medium: c · Low: d
**Date:** <today>

---

## 1. Slice Overview

<2–4 sentences: what subsystem this slice is, which tracks dominate, the
overall health signal you observed.>

## 2. Per-file findings

### `path/to/file.ts`

**Originating track:** `<track_id>` — phase `<phase>` — commit `<sha>`
**Phase contract (1 line):** <what the phase was supposed to deliver>

#### Node: `functionName` (function, lines 12-45)
- **Severity:** High
- **Construction:** <finding>
- **Interaction:** <finding> (callers: N, deps: M)
- **Recommendation:** <concrete next step>

#### Node: `ClassName` (class, lines 60-200)
- **Severity:** Medium
- ...

<repeat per node with findings; skip clean nodes>

---

## 3. Cross-cutting patterns in this slice

<Bullet list of patterns you saw repeated >2 times. E.g. "8 exported functions
in pipeline/ lack JSDoc — likely the same TDD oversight."  This section is what
will feed `lessons-learned.md`.>

## 4. Top-10 improvement queue

| # | Node | Severity | Effort | Why |
|---|------|----------|--------|-----|
| 1 | `...` | Critical | S | ... |
| ...                                |

## 5. Track ↔ Implementation diffs

<Any cases where a node's behaviour clearly drifted from the originating
phase's acceptance criteria. Format: track / phase / what spec said / what
code does / impact.>
```

## Limits / guardrails

- **Do not edit any source code.** This is a read-only review.
- **Do not run tests or lints.** Just inspect.
- **Stay inside your slice.** If a finding involves a node outside your slice,
  note the cross-slice link but don't audit the foreign node.
- **Budget**: aim for ~60–90 minutes of inspection wall-time. Quality > coverage.
  If your slice exceeds 100 files with findings, group similar findings into
  pattern bullets in §3 rather than listing each node individually.
- **No fluff.** A finding without a concrete recommendation is noise.
- **Output goes in ONE file**: `measure/reviews/graph-node-audit/slices/<slice_id>.md`.
  Return a short summary of your findings as your final message; do not paste
  the whole report back.

## Helpful commands

```bash
# Inspect one node (metadata + edges)
build-graph inspect ./graph.db <symbol-name>

# All callers of an exported symbol
build-graph callers ./graph.db <symbol-name>

# What this node depends on
build-graph deps ./graph.db <symbol-name> --downstream

# All nodes in a file
build-graph query ./graph.db "SELECT id, type, name, line_start, line_end, summary FROM nodes WHERE file_path LIKE '%/relative/path.ts' ORDER BY line_start"

# Resolve ambiguous candidates by reading the plan
cat measure/archive/<track_id>/plan.md | head -200
```
