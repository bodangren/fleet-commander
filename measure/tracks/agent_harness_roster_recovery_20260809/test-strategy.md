# Test Strategy: Agent harness roster recovery

## Evidence principle

This is a roster-contract recovery, not a harness implementation. The evidence
must establish that the seeded intern can be dispatched by the installed harness
and that no browser or Convex mutation was needed. The historical TD-266 result
is retained as the failure baseline: full Pivot was 1,707/1,709 because the
seeded intern required the retired Kimi highspeed model.

## Contract checks

The focused `orgChartAgents.piReadiness` suite must prove:

- `ORG_CHART_AGENTS` is non-empty and every seeded model is a well-formed
  provider/model reference;
- `intern.model` is exactly `openai/gpt-5.6-luna`;
- the checked-in served-model contract contains the replacement and does not
  contain `kimi-for-coding/kimi-for-coding-highspeed`;
- the installed harness roster serves every checked-in model;
- `assessReadiness` reports every seeded agent ready;
- both roster drift tests run in the acceptance environment, so the result is
  5/5 passed rather than a pass with skipped environment checks.

The source/doc review must additionally confirm that the active intern front
matter and org-chart table use the same replacement, while ADRs, closeouts, and
reports retain their historical old-model references.

## Gate matrix

| Gate | Required result | Purpose |
| --- | --- | --- |
| Focused Pi readiness | 5/5 passed, 0 failed, 0 skipped | Installed roster and seeded-agent contract |
| Full Pivot | 1,709/1,709 passed, 0 failed | No regression from the model/doc change |
| Pivot typecheck | Pass | Source/type contract |
| Frontend check | Pass | Documentation-adjacent repository gate |
| Doctor | Pass or only pre-existing findings | No new structural debt/allowlist |
| Graph update/stats/audit | Synchronized; output recorded | Dependency knowledge is current |
| JSON/line-count/diff | Pass | Track documentation integrity |

## Real system-Chrome acceptance

Use the live stack and system Chrome, not mocked or intercepted browser tests:

```bash
PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/google-chrome \
  bun run --cwd frontend test:e2e:live -- e2e/agent-harness-roster-live.spec.ts --workers=1
```

The `@live` journey must cold-load `/agents` and `/providers`, assert the
expected Agents and LLM Providers surfaces, and collect page errors, console
errors, failed responses, and request methods. It must require successful
responses, zero page/console/backend errors, and zero `POST`, `PUT`, `PATCH`, or
`DELETE` requests. It must not click Save, Delete, Test/Readiness, Import,
Dispatch, or any factory control, and must not call seed helpers or use
credentials.

## Full-gate commands

```bash
bun --cwd pivot test src/sync/orgChartAgents.piReadiness.test.ts
bun --cwd pivot test
bun --cwd pivot typecheck
bun --cwd frontend check
bash measure/doctor.sh all
build-graph update ./graph.db pivot/src/sync/createOrgChartAgents.ts \
  pivot/src/sync/orgChartAgents.piReadiness.test.ts measure/agents/intern.md \
  measure/agents/org-chart.md
build-graph stats ./graph.db
build-graph audit ./graph.db
git diff --check
```

No live Convex test, deployed-harness write, credentialed factory acceptance, or
direct data mutation is valid evidence for this track. Broader org-chart drift
may be recorded as follow-up but must not be folded into the focused pass.
