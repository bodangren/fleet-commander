# Closeout: Agent harness roster recovery

**Closed:** 2026-08-09  
**Status:** completed  
**TD-267:** Resolved

## Delivery

The seeded `intern`, checked-in readiness contract, and active intern/org-chart
documentation now consistently use the installed-harness model
`openai/gpt-5.6-luna`. The retired
`kimi-for-coding/kimi-for-coding-highspeed` served entry was removed. ADRs,
TD-266 closeout text, and prior reports retain their historical references.

The track was opened in `f91b9679` and implementation completed in
`f7fc4fe2`. No external harness, package, credential, seed, Convex write,
deployment, import, dispatch, browser/API mutation, or Bounded Factory action
was performed.

## Verification

- Focused Pi readiness: **5/5 passed, 0 failed, 0 skipped**, with 20
  expectations; both installed-harness drift checks executed.
- Full Pivot: **1,709/1,709 passed**, 3,819 expectations across 148 files in
  **8.09s**.
- Pivot typecheck, frontend check, repository lint, JSON validation, line-count
  validation, and `git diff --check` passed.
- Final real system Chrome: **4/4 in 24.0s**. Agents and Providers were
  source-aware with finite states. No mocks, actions, writes, page/console/API
  errors, unrecovered request failures, credentials, seed, Convex mutation,
  external-harness write, or factory activity occurred. Raw superseded
  `net::ERR_ABORTED` reads remained visible and were recovered only when the
  same method/path returned a successful 2xx response.

## Graph and Doctor evidence

The required incremental graph update covered three TS files (**3→24 nodes,
6→27 edges**) and two active docs (**0→2 nodes**). Implementation stats were
**5,847 nodes / 8,139 edges / 709 files**. Graph audit exited 1 with the known
**677 `orphan_edges`** noise. The closeout-doc sync then produced current stats
of **5,851 / 8,139 / 713**; incrementally updating the durable audit-report
Markdown itself still exits 4 with `Expected the module specifier to be a
string literal.` The limitation is recorded in [GitHub issue #2](https://github.com/bodangren/fleet-commander/issues/2#issuecomment-5229216912).

Measure Doctor retained only known findings: the 516-line
`qualityWorkflowRunner`, 65 orphan findings, and 38 stale warnings. These are
not TD-267 failures.

## Follow-up

Warning/test-trust repair, frontend bundle splitting, remaining Doctor/graph/
dead-code cleanup, and approval-gated Bounded Factory activation remain outside
this resolved track.
