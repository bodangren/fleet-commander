# Scalpel branch — handoff

Branch: `chore/scalpel` (off `fix/review-36h-orchestrator-notifications` at `c5de1d5`)
Nothing pushed. Nothing merged. Four commits, each green on its own.

```
7ff948a  test: Phase 5 — remove tests that verify the test suite, fix the gates
ad70de7  refactor: Phase 2 — delete the dead YAML pipeline engine
fd1f2b9  feat(measure): Phase 6 — risk-based stage selection and evidence gates
bbc487c  chore: Phase 1 — untrack binaries, evict stale run logs, fix identity
```

## Verify it yourself

```bash
bun run --cwd pivot test          # 1637 pass, 0 fail
bun --cwd pivot typecheck         # exit 0
bunx convex codegen               # exit 0  (was exit 1 before this branch)
bun run --cwd frontend test       # note: `bun run`, NOT `bun` — see below
```

## What changed

| | Before | After |
| --- | --- | --- |
| Working tree | 474 MB | 80 MB |
| Tracked files | 2,125 | ~1,050 |
| pivot tests | 1,843 | 1,637 |
| Execution engines | 2 | 1 |
| `convex codegen` | exit 1 | exit 0 |

Phase 1 and Phase 2 removed roughly 5,150 lines of code and 1,027 files.
Phase 6 added 94 tests, none of them static-evidence.

## Things you should check first

**1. The frontend gate never worked.** `verify.sh` ran `bun --cwd frontend test`.
That invokes Bun's own test runner against the frontend tree instead of the
package script (vitest); it hangs forever and prints nothing. The correct form
is `bun run --cwd frontend test`. Fixed in `measure/verify.sh` and
`measure/workflow.md`. This is consistent with `.verify-skips.log` having held
36 bypasses and zero passes.

**2. `verify.sh`'s summary never printed results.** The final loop echoed gate
names only, so the output looked identical whether everything passed or
everything failed. Fixed.

**3. The convex test gate is red, and was before this branch.**
`find ./convex -name '*.test.ts' | xargs bun test` gives **166 named failures**
at `c5de1d5`. This branch produces the same 166 — I diffed the sorted failure
sets and they are identical. I did not fix these and did not try. `verify.sh`
cannot pass until someone does.

**4. `convex codegen` was broken, which broke CI.** `convex/__fixtures__/auth.ts`
imported `bun:test` from inside `convex/`, which Convex bundles as function
modules. esbuild could not resolve it, so codegen exited 1 — and CI's
"Schema Check" job runs `convex codegen --init`. Fixed.

## Where deleted material went

`../fleet-commander-archive/` — see its README.

| | |
| --- | --- |
| `runs/` | 591 Measure run dirs, 361 MB |
| `measure-archive/` | 211 archived tracks, 143 Go files, 12 MB |
| `fleet-commander-go-binary-20260402` | 17 MB pre-pivot ELF |
| `convex-local-backup-20260806/` | 60 MB Convex state, taken before Phase 3 |

All of it is also in git history at `c5de1d5`.

## Corrections to the original review

Three things in my plan were wrong. I found them while executing and did not
follow the plan off the cliff.

**`pipelineRuns` is not part of the pipeline engine.** The plan said to delete
that table in Phase 2. It is the orchestrator's own run ledger, written by
`PipelineRunLifecycle` on every dispatch. Deleting it would have broken the
core loop. Kept. `routes/pipelineEngine.ts` is likewise kept — despite the
name it triggers `runAllProjects()`.

**The characterization tests are not ceremony.** The plan said to delete both.
`orchestrator.characterization.test.ts` caught a real defect in this branch:
Phase 6's first stage-trimming draft dropped the `strategy` stage from setup
tracks, and that test failed exactly as it should have.
`dependencyUtils.characterization.test.ts` calls real functions against real
fixtures. Both kept. `guards/noSecondScheduler.test.ts` is also kept — it is
grep-based, but "one scheduler, one claimant" is a real invariant.

**Risk signals need tuning against real data.** My first regex escalated
"Tailwind CSS 4 migration" to `critical`. Data migrations now require a data
noun in the same clause or a `migrations/` path. Both directions have
regression tests. Expect to find more of these — the signal list in
`pivot/src/shared/riskClass.ts` is meant to be edited.

## Phase 6 — what to actually try

Risk class goes in a track's `metadata.json`:

```json
{ "track_id": "...", "type": "chore", "risk_class": "normal" }
```

| class | stages that must run |
| --- | --- |
| `normal` (default) | red, green, phase_acceptance |
| `elevated` | + strategy, acceptance |
| `critical` | all eight |

Escalation is one-way — evidence in the title or spec can raise the class,
nothing lowers it. Trimming only drops *mandatory* stages the class does not
need; optional stages keep their own applicability, which is why a setup track
still gets `strategy`.

The four live tracks are already classified. Only
`quality_workflow_runner_prod_wiring_20260625` is `elevated`.

The acceptance gate is wired into the schema and has a working runner
(`pivot/src/shared/runAcceptanceGate.ts`, real `git worktree` isolation, tests
prove a dirty tree cannot satisfy it). **It is not yet called from the
orchestrator's closeout path.** That is the next step, and it is deliberate —
I did not want to add a hard completion gate to a running system without you
watching it.

## Not done

**Phase 3 (delete the company simulation).** Not started. Sized it: the
cleanly separable cluster is `abTests` + `experimentRuns` + `simulationRuns` +
`performanceBaselines` (about 20 files). `employees` (19 files) and
`leaderboard` (14) are separable with more care.

`sprints` is 76 files and I do not think it belongs on the list — sprint
planning is how work gets selected, which is not simulation. `retrospectives`
(21 files) is your call. Apply the test from the review: *has a decision ever
changed because of this data?*

Convex state is backed up, so the schema change is safe to attempt.

**Phase 4 (collapse the executor onto pi-measure-harness).** Not started, on
purpose. It removes the only path by which this system executes anything. The
review said to run one track both ways before deleting the executor, and that
needs you awake. The delegation target exists — the harness `task` tool starts
a non-interactive Pi process and writes a JSON receipt.

## The thing worth arguing about

Phases 1, 2 and 5 removed weight. Only Phase 6 addresses the defect you
actually have. The June audit found 9 of 15 "complete" tracks were false
positives — a verification failure. Fleet Commander's mass is in *dispatch*:
scoring, budget reservation, circuit breakers, provider health, A/B tests.
None of that catches a track that lies about being done.

Phase 5 deleted 2,810 lines in `pivot/src/upgrade-baseline/` — seven test
files with **zero source files**, asserting the contents of an archived
track's paperwork. When I removed `measure/archive/`, 109 further pivot tests
failed, every one of them reading a completed track's documents. That is the
shape of the problem, and it is worth sitting with before deciding how much
more to cut.
