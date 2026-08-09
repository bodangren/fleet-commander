# Plan: Agent harness roster recovery

This track is intentionally documentation-first. The opening pass creates only
the Measure track files and registry/debt entries; implementation tasks below
remain pending until the roster evidence and boundaries are accepted.

## Phase 1: Contract and evidence

- [ ] Task 1.1: Record the TD-266 failure baseline
  - [ ] Preserve the exact 1,707/1,709 full-Pivot result and the two
    `orgChartAgents.piReadiness` failures.
  - [ ] Identify the seeded intern reference, the retired checked-in served-model
    entry, and the installed harness root without editing the external harness.
- [ ] Task 1.2: Freeze the replacement contract
  - [ ] Set the only active intern model reference to
    `openai/gpt-5.6-luna`.
  - [ ] Require removal of the retired Kimi highspeed entry from the checked-in
    served-model list while preserving all other evidenced entries.
  - [ ] Preserve ADR, closeout, and report history that describes the old model.
- [ ] Task 1.3: Freeze the safety and scope boundary
  - [ ] Require no external harness, credentials, live Convex, deployment, seed,
    import, dispatch, or browser/API mutation.
  - [ ] Record broader org-chart/provider documentation drift as follow-up.

## Phase 2: Focused regression contract

- [ ] Task 2.1: Update the seeded roster contract
  - [ ] Point only `intern` at `openai/gpt-5.6-luna` in
    `pivot/src/sync/createOrgChartAgents.ts`.
  - [ ] Keep role semantics, prompt loading, and all non-model fields unchanged.
- [ ] Task 2.2: Update the checked-in readiness evidence
  - [ ] Remove only `kimi-for-coding/kimi-for-coding-highspeed` from
    `HARNESS_SERVED_MODELS`.
  - [ ] Keep the non-vacuous all-agents and provider/model-shape assertions.
  - [ ] Require both installed-harness drift checks to execute, not skip, in the
    accepted environment.
- [ ] Task 2.3: Align active intern/org-chart documentation
  - [ ] Update `measure/agents/intern.md` front matter to the exact replacement.
  - [ ] Update the active Intern row in `measure/agents/org-chart.md`.
  - [ ] Do not rewrite historical ADRs or prior evidence.

## Phase 3: Read-only browser proof

- [ ] Task 3.1: Add or adapt the live read-only Agents/Providers journey
  - [ ] Load `/agents` and `/providers` in real system Chrome against the live
    local stack, with no mock, route interception, seed, or credentials.
  - [ ] Assert truthful page headings/content, successful responses, and no page,
    console, failed-response, or unrecovered backend errors.
  - [ ] Capture request methods and assert zero POST/PUT/PATCH/DELETE, import,
    seed, save, delete, readiness, dispatch, and factory activity.

## Phase 4: Gates, graph, and closeout evidence

- [ ] Task 4.1: Run focused and full tests
  - [ ] Run focused readiness and require 5/5 passed, 0 failed, 0 skipped.
  - [ ] Run full Pivot and require 1,709/1,709 passed, 0 failed.
- [ ] Task 4.2: Run repository checks
  - [ ] Run Pivot typecheck and `bun --cwd frontend check`.
  - [ ] Run `bash measure/doctor.sh all`; classify only pre-existing findings.
- [ ] Task 4.3: Synchronize and inspect the graph
  - [ ] Run `build-graph update ./graph.db` for every changed source/doc path
    accepted by the repository graph workflow.
  - [ ] Record `build-graph stats`/audit output and keep unrelated graph debt
    separate from TD-267.
- [ ] Task 4.4: Validate documentation and close truthfully
  - [ ] Run JSON validation, line-count checks, and `git diff --check`.
  - [ ] Record exact commands, counts, browser request/error evidence, and the
    absence of mutations.
  - [ ] Mark complete only after every acceptance criterion passes; otherwise
    retain `in_progress` and name the blocker.

## Exact acceptance command set

```bash
bun --cwd pivot test src/sync/orgChartAgents.piReadiness.test.ts
bun --cwd pivot test
bun --cwd pivot typecheck
bun --cwd frontend check
PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/google-chrome \
  bun run --cwd frontend test:e2e:live -- e2e/agent-harness-roster-live.spec.ts --workers=1
bash measure/doctor.sh all
build-graph update ./graph.db pivot/src/sync/createOrgChartAgents.ts \
  pivot/src/sync/orgChartAgents.piReadiness.test.ts measure/agents/intern.md \
  measure/agents/org-chart.md
build-graph stats ./graph.db
build-graph audit ./graph.db
git diff --check
```

The live command is observational only. It must not be replaced by the
credentialed Bounded Factory journey.
