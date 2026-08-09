# Specification: Agent harness roster recovery

## Status and decision

TD-267 is an in-progress readiness and documentation recovery opened from the
TD-266 closeout. TD-266 reached 1,707/1,709 Pivot tests; the two failures were
`orgChartAgents.piReadiness` cases because the seeded `intern` pointed at
`kimi-for-coding/kimi-for-coding-highspeed`, which the installed
`/home/daniebo/Desktop/pi-measure-harness` roster does not serve.

The checked-in Pi readiness list also carries that retired model as a served
entry, while the active `measure/agents/intern.md` and
`measure/agents/org-chart.md` documentation uses a different intern model from
the seeded source. The decision for this track is to use the installed-harness
model `openai/gpt-5.6-luna` as the single active intern reference, and to remove
the retired Kimi highspeed entry from the checked-in served-model contract.

Historical ADRs, TD-266 closeout text, and prior evidence that mention the old
model are preserved as historical evidence. They are not active roster
configuration and must not be rewritten to make the new run look green.

## Requirements

1. The seeded `intern` in `pivot/src/sync/createOrgChartAgents.ts` uses exactly
   `openai/gpt-5.6-luna`; its role, mode, temperature, permissions, prompt
   loading, and Convex write behavior are otherwise unchanged.
2. `pivot/src/sync/orgChartAgents.piReadiness.test.ts` removes exactly the
   retired `kimi-for-coding/kimi-for-coding-highspeed` served-model entry and
   retains `openai/gpt-5.6-luna` plus every other currently evidenced served
   model. The contract must still test every seeded agent and cannot pass
   vacuously.
3. The active intern front matter in `measure/agents/intern.md` and the Intern
   row in `measure/agents/org-chart.md` both name exactly
   `openai/gpt-5.6-luna` and retain the existing `subagent` role semantics.
4. The implementation must preserve the historical references in
   `measure/adrs/ADR-004-pi-executor-backend.md`, TD-266 closeout/evidence, and
   other prior reports. No global ban on the retired string may erase valid
   historical evidence.
5. The replacement is proven against the installed harness roster; this track
   does not edit `/home/daniebo/Desktop/pi-measure-harness`, install packages,
   alter provider credentials, deploy Convex, or perform a live Convex write.
6. Real system Chrome may observe the existing Agents and Providers pages only.
   The journey must use no mocks, route interception, fixture seed, credentials,
   factory action, import, save, delete, readiness mutation, or dispatch.

## Acceptance criteria

1. Focused Pi readiness is **5/5 passed, 0 failed, 0 skipped**, including both
   installed-roster drift checks, and reports no stranded seeded agent.
2. Full Pivot is **1,709/1,709 tests passed, 0 failed**; Pivot typecheck and the
   repository's frontend `check` gate are green.
3. The changed source/docs are reflected by the required `build-graph update`;
   graph stats/audit output and any pre-existing graph limitation are recorded
   without adding an allowlist entry for this roster issue.
4. Real system Chrome loads `/agents` and `/providers` against the running local
   stack and observes the expected Agents and LLM Providers surfaces. All
   responses are successful, with zero page errors, console errors, failed
   responses, or unrecovered backend errors.
5. Browser/network evidence shows zero `POST`, `PUT`, `PATCH`, or `DELETE`
   requests and no import, seed, save, delete, readiness, dispatch, or
   credentialed factory action.
6. `metadata.json` is valid JSON, all track docs remain within their documented
   size budget, and `git diff --check` passes. The track stays in progress until
   every criterion is evidenced.

## Out of scope and follow-up

- Editing or upgrading the external pi harness, its model map, installed Pi
  package, provider credentials, or any remote/deployed Convex state.
- Running Bounded Factory acceptance, creating an agent, assigning a task,
  starting a sprint, dispatching Pi, or making any browser/API/Convex mutation.
- Rebalancing the broader org chart, reconciling every stale provider/model
  reference, changing role policy, or rewriting legacy/ADR/report evidence.
  Broader org-chart documentation drift is a follow-up after this bounded intern
  recovery.
- Product changes, schema changes, new routes, new APIs, new test frameworks, or
  unrelated warning/Doctor/graph remediation.
