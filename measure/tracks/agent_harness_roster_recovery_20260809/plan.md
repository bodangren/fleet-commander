# Plan: Agent harness roster recovery

This track closed on 2026-08-09. The track was opened in `f91b9679` and the
implementation was completed in `f7fc4fe2`; all acceptance evidence and
documentation gates below are recorded in [closeout.md](./closeout.md).

## Phase 1: Contract and evidence

- [x] Task 1.1: Record the TD-266 failure baseline
  - [x] Preserve the exact 1,707/1,709 full-Pivot result and the two
    `orgChartAgents.piReadiness` failures.
  - [x] Identify the seeded intern reference, the retired checked-in served-model
    entry, and the installed harness root without editing the external harness.
- [x] Task 1.2: Freeze the replacement contract
  - [x] Set the only active intern model reference to
    `openai/gpt-5.6-luna`.
  - [x] Require removal of the retired Kimi highspeed entry from the checked-in
    served-model list while preserving all other evidenced entries.
  - [x] Preserve ADR, closeout, and report history that describes the old model.
- [x] Task 1.3: Freeze the safety and scope boundary
  - [x] Require no external harness, credentials, live Convex, deployment, seed,
    import, dispatch, or browser/API mutation.
  - [x] Record broader org-chart/provider documentation drift as follow-up.

## Phase 2: Focused regression contract

- [x] Task 2.1: Update the seeded roster contract
  - [x] Point only `intern` at `openai/gpt-5.6-luna` in
    `pivot/src/sync/createOrgChartAgents.ts`.
  - [x] Keep role semantics, prompt loading, and all non-model fields unchanged.
- [x] Task 2.2: Update the checked-in readiness evidence
  - [x] Remove only `kimi-for-coding/kimi-for-coding-highspeed` from
    `HARNESS_SERVED_MODELS`.
  - [x] Keep the non-vacuous all-agents and provider/model-shape assertions.
  - [x] Require both installed-harness drift checks to execute, not skip, in the
    accepted environment.
- [x] Task 2.3: Align active intern/org-chart documentation
  - [x] Update `measure/agents/intern.md` front matter to the exact replacement.
  - [x] Update the active Intern row in `measure/agents/org-chart.md`.
  - [x] Do not rewrite historical ADRs or prior evidence.

## Phase 3: Read-only browser proof

- [x] Task 3.1: Add or adapt the live read-only Agents/Providers journey
  - [x] Load `/agents` and `/providers` in real system Chrome against the live
    local stack, with no mock, route interception, seed, or credentials.
  - [x] Assert truthful page headings/content, successful responses, and no page,
    console, failed-response, or unrecovered backend errors.
  - [x] Capture request methods and assert zero POST/PUT/PATCH/DELETE, import,
    seed, save, delete, readiness, dispatch, and factory activity.

## Phase 4: Gates, graph, and closeout evidence

- [x] Task 4.1: Run focused and full tests
  - [x] Run focused readiness and require 5/5 passed, 0 failed, 0 skipped.
  - [x] Run full Pivot and require 1,709/1,709 passed, 0 failed.
- [x] Task 4.2: Run repository checks
  - [x] Run Pivot typecheck and `bun --cwd frontend check`.
  - [x] Run `bash measure/doctor.sh all`; classify only pre-existing findings.
- [x] Task 4.3: Synchronize and inspect the graph
  - [x] Run `build-graph update ./graph.db` for every changed source/doc path
    accepted by the repository graph workflow.
  - [x] Record `build-graph stats`/audit output and keep unrelated graph debt
    separate from TD-267.
- [x] Task 4.4: Validate documentation and close truthfully
  - [x] Run JSON validation, line-count checks, and `git diff --check`.
  - [x] Record exact commands, counts, browser request/error evidence, and the
    absence of mutations.
  - [x] Mark complete only after every acceptance criterion passes; otherwise
    retain `in_progress` and name the blocker.

## Closeout evidence

- Focused Pi readiness: **5/5 passed, 0 failed, 0 skipped**, with 20
  expectations; both installed-harness drift checks executed.
- Full Pivot: **1,709/1,709 passed**, 3,819 expectations, 148 files, in
  **8.09s**. Pivot typecheck, frontend check, repository lint, and diff checks
  were green.
- Final real system Chrome: **4/4 in 24.0s**. Agents/Providers remained
  source-aware with finite states; no mocks, actions, writes, page/console/API
  errors, unrecovered request failures, credentials, seed, Convex mutation,
  external-harness write, or factory action occurred. Superseded
  `net::ERR_ABORTED` reads were retained in telemetry and tolerated only when
  the same method/path had a successful 2xx replacement.
- Graph update covered three TS files (**3→24 nodes, 6→27 edges**) and two
  active docs (**0→2 nodes**). Implementation stats were **5,847 nodes / 8,139
  edges / 709 files**; audit exit 1 retained the known **677 `orphan_edges`**
  noise. Synchronizing the closeout docs then produced current stats of **5,851
  / 8,139 / 713**. The durable audit-report Markdown still triggers the known
  incremental-parser error.
- Doctor’s only findings were the known 516-line `qualityWorkflowRunner`, 65
  orphan findings, and 38 stale warnings. GitHub issue [#2](https://github.com/bodangren/fleet-commander/issues/2#issuecomment-5229216912)
  was updated with the graph limitation.
- Next priorities are warning/test-trust repair, bundle splitting, remaining
  Doctor/graph/dead-code cleanup, and approval-gated factory activation.

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
