# Test Strategy: E2E QA/QC Smoke Test (Kimi WebBridge)

## Scope

This strategy covers the QA discovery track `e2e_qa_smoke_20260613`. The track validates the **user-facing** surface of Fleet Commander — every route, every button, every form — by driving the user's real browser via Kimi WebBridge.

The track produces evidence, not code: a route inventory, a run log, a coverage report, a screenshot archive, and a findings document feeding the next remediation track.

## Testing Pyramid

This track replaces the apex of the pyramid with a **browser-driven smoke test**:

```
              ┌────────────────────────┐
              │ Kimi WebBridge smoke    │  ← THIS TRACK
              │ (real browser, real     │
              │  user session, real     │
              │  stack)                 │
              └────────────────────────┘
                ▲
                │  reuses (but does not run)
       ┌────────┴────────┐
       │  Playwright E2E  │  ← TD-250 baseline (out of scope)
       │  30 pass / 34 fail│
       └──────────────────┘
                ▲
       ┌────────┴────────┐
       │ Vitest (frontend)│  ← exists; out of scope
       │ Vitest (pivot)   │  ← exists; out of scope
       │ bun test (convex)│  ← exists; out of scope
       └──────────────────┘
```

## Why Kimi WebBridge (not Playwright)

| Property | Kimi WebBridge | Playwright (TD-250 baseline) |
|---|---|---|
| Uses real user session/cookies | **Yes** (drives the user's actual browser) | No (separate headless context) |
| Crosses SSO / login walls | **Yes** (the user is already logged in) | No (must stub auth) |
| Handles `event.isTrusted` checks | No (synthetic) | Yes (real OS events) |
| Executes against the real dev stack | **Yes** (frontend Vite, pivot Bun, Convex cloud) | Yes |
| Already running / wired | **Yes** (daemon + extension) | Yes (Playwright) |
| Coverage of Fleet Commander today | New (this track) | 30 pass / 34 fail baseline |

**Decision:** Kimi WebBridge is the right tool for a "user's standpoint" smoke test because it validates the actual flow the user sees, including auth and session state. The 34 pre-existing Playwright failures (TD-250) are a separate concern owned by a future E2E-baseline track.

## Per-Phase Gate Commands

### Phase 1 — Inventory

```bash
# Static inventory of every route + interactive element
bun run measure/tracks/e2e_qa_smoke_20260613/scripts/build-inventory.ts
diff -q measure/tracks/e2e_qa_smoke_20260613/route-inventory.json \
        measure/tracks/e2e_qa_smoke_20260613/route-inventory.snapshot.json
# snapshot.json is the committed copy; diff must be empty (idempotent)
```

### Phase 2 — Dev stack health

```bash
# Frontend (Vite dev)
curl -fsS http://localhost:5173 >/dev/null
# Pivot (Bun)
curl -fsS http://localhost:8081/api/health >/dev/null
# Convex
test -n "$CONVEX_DEPLOYMENT"
# Kimi WebBridge
~/.kimi-webbridge/bin/kimi-webbridge status
#   must return running:true, extension_connected:true
```

### Phase 3 — Route coverage

```bash
# Iterates route-inventory.json, navigates each route, screenshots
bun run measure/tracks/e2e_qa_smoke_20260613/scripts/qa-executor.ts \
  --phase routes --inventory route-inventory.json \
  --out qa-routes.json
jq '.routes | length' qa-routes.json   # expect 38
jq '[.routes[].status] | group_by(.) | map({(.[0]): length}) | add' qa-routes.json
```

### Phase 4 — Element coverage

```bash
bun run measure/tracks/e2e_qa_smoke_20260613/scripts/qa-executor.ts \
  --phase elements --inventory route-inventory.json \
  --in qa-routes.json --out qa-elements.json
jq '[.elements[].status] | group_by(.) | map({(.[0]): length}) | add' qa-elements.json
```

### Phase 5 — Cross-route nav

```bash
bun run measure/tracks/e2e_qa_smoke_20260613/scripts/qa-executor.ts \
  --phase navigation --inventory route-inventory.json \
  --in qa-elements.json --out qa-navigation.json
```

### Phase 6 — Findings

```bash
bun run measure/tracks/e2e_qa_smoke_20260613/scripts/findings-generator.ts \
  --routes qa-routes.json --elements qa-elements.json \
  --navigation qa-navigation.json --out findings.md
# Auto-append to tech-debt.md
```

### Phase 7 — Coverage report

```bash
bun run measure/tracks/e2e_qa_smoke_20260613/scripts/coverage-reporter.ts \
  --routes qa-routes.json --elements qa-elements.json \
  --navigation qa-navigation.json --findings findings.md \
  --out coverage-report.md --screenshots-dir screenshots/
```

## Reference Inventory Snapshot (Phase 1 expected output)

The Phase 1 inventory must produce, at minimum, the following 38 routes (matching the React Router 7 data-router configuration):

```
1.  /                              PortfolioRedirect
2.  /portfolio                     PortfolioPage
3.  /agents                        AgentsPage
4.  /agents/:name/edit             AgentEditorPage
5.  /agents/leaderboard            LeaderboardPage
6.  /agent-templates               AgentTemplatesPage
7.  /agent-templates/:id/edit      AgentTemplateEditorPage
8.  /templates                     ProjectTemplatesPage
9.  /providers                     ProvidersPage
10. /project/:id                   ProjectViewPage
11. /tasks/:taskId/timeline        TaskTimelinePage
12. /settings                      Navigate → /settings/app
13. /settings/app                  AppConfigSection
14. /settings/notifications        NotificationSettingsSection
15. /settings/agents               AgentDefaultsSection
16. /settings/profile              ProfileSettingsSection
17. /pipelines                     PipelinesPage
18. /analytics                     AnalyticsDashboard
19. /performance                   PerformanceDashboard
20. /costs                         CostsPage
21. /ops                           OpsPage
22. /ops/monitor                   MonitorPage
23. /ops/diagnose                  DiagnosePage
24. /ops/optimize                  OptimizePage
25. /ops/reconcile                 ReconcilePage
26. /ops/simulate                  SimulatePage
27. /sprint-planning               SprintPlanningPage
28. /board                         KanbanBoardPage
29. /retrospectives                RetrospectivePage
30. /notifications                 NotificationHistoryPage
31. /blockers                      BlockersPage
32. /alerts                        AlertsPage
33. /harnesses                     HarnessesPage
34. /harnesses/:name/edit          HarnessEditorPage
35. /history/sprints               SprintsHistoryPage
36. /history/agents                AgentsHistoryPage
37. /history/tasks                 TasksHistoryPage
38. /*                              Navigate → /
```

The inventory script must walk this list and produce a JSON document with `{ path, component, paramKind?, interactiveElements: [{ testId?, ariaLabel?, role, tag, text? }] }`.

## Kimi WebBridge Command Cookbook (for the executor)

```bash
# Health
~/.kimi-webbridge/bin/kimi-webbridge status

# Open the app in a new tab (use newTab:true the first time)
curl -s -X POST http://127.0.0.1:10086/command \
  -H 'Content-Type: application/json' \
  -d '{"action":"navigate","args":{"url":"http://localhost:5173/portfolio","newTab":true,"group_title":"QA Smoke 2026-06-13"},"session":"qa-2026-06-13"}'

# Snapshot the current page (returns @e refs)
curl -s -X POST http://127.0.0.1:10086/command \
  -d '{"action":"snapshot","session":"qa-2026-06-13"}'

# Click @e5
curl -s -X POST http://127.0.0.1:10086/command \
  -d '{"action":"click","args":{"selector":"@e5"},"session":"qa-2026-06-13"}'

# Fill an input
curl -s -X POST http://127.0.0.1:10086/command \
  -d '{"action":"fill","args":{"selector":"@e12","value":"smoke-test-value"},"session":"qa-2026-06-13"}'

# Screenshot to disk (NEVER inline the base64)
bash /home/daniel-bo/.agents/skills/kimi-webbridge/scripts/screenshot.sh \
  -s qa-2026-06-13 -o measure/tracks/e2e_qa_smoke_20260613/screenshots/portfolio.png

# Close the session at the end
curl -s -X POST http://127.0.0.1:10086/command \
  -d '{"action":"close_session","session":"qa-2026-06-13"}'
```

## Findings Severity Rubric

| Severity | Examples |
|---|---|
| **Critical** | Route returns 4xx/5xx; click triggers uncaught exception; data loss path observed |
| **High** | Click does not navigate; button is unreachable; form fails to submit; ARIA invalid; toast not displayed |
| **Medium** | Visual regression vs. inventory; missing tooltip; console warning; unexpected empty state |
| **Low** | Stylistic (font, spacing); missing alt text; "TODO" comment in rendered output |

## Privacy & Data Hygiene

- The smoke test fills inputs with the placeholder string `smoke-test-<timestamp>` so it never injects real PII.
- Screenshots are stored under `measure/tracks/e2e_qa_smoke_20260613/screenshots/` and excluded from git by default (committed only on opt-in).
- The executor never reads cookies, tokens, or `localStorage` content — it only inspects the DOM and the network.

## Known Limitations (carried over from Kimi WebBridge skill)

- Sites that strictly check `event.isTrusted` reject synthetic clicks. The executor falls back to `evaluate(() => el.click())` and files a finding if the fallback also fails.
- Cross-origin iframes are out of scope — the executor only drives the top frame.
- The 34 pre-existing Playwright E2E baseline failures (TD-250) are NOT in scope for this track.

## Tooling & Files

```
measure/tracks/e2e_qa_smoke_20260613/
├── index.md
├── metadata.json
├── spec.md                      ← this file (the spec; strategy is test-strategy.md)
├── plan.md
├── test-strategy.md             ← you are here
├── route-inventory.md           ← generated by Phase 1
├── route-inventory.json         ← generated by Phase 1
├── route-inventory.snapshot.json← committed copy (idempotency check)
├── findings.md                  ← generated by Phase 6
├── coverage-report.md           ← generated by Phase 7
├── screenshots/                 ← generated by Phases 3-5
│   └── INDEX.md                 ← generated by Phase 7
├── scripts/
│   ├── build-inventory.ts       ← Phase 1
│   ├── qa-executor.ts           ← Phases 3-5
│   ├── findings-generator.ts    ← Phase 6
│   └── coverage-reporter.ts     ← Phase 7
└── runs/
    ├── qa-routes-<ts>.json
    ├── qa-elements-<ts>.json
    ├── qa-navigation-<ts>.json
    └── SUMMARY-<ts>.md
```

## Architecture Guardrails (from `measure/workflow.md`)

- No new scheduler, claimant, or timer.
- No production code paths imported by QA scripts (scripts live under the track directory, not `pivot/` or `frontend/`).
- Kimi WebBridge is read/observation-only — it never modifies repo state except to commit the track's own output under `measure/tracks/e2e_qa_smoke_20260613/`.
