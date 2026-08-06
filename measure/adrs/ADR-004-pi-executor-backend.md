# ADR-004 — Collapse the executor onto pi-measure-harness

Status: accepted (Pi is now the only executor backend)
Date: 2026-08-06
Phase: scalpel Phase 4

## Context

Fleet Commander executes agent work through one path: `executeTask` in
`pivot/src/orchestrator/executor.ts`, which resolves an agent to a
provider/model pair and drives it over the OpenCode SDK against a persistent
OpenCode server (`opencodeServer.ts`, `sdkClient.ts`).

Phase 4 of the scalpel review proposed collapsing that path onto
`pi-measure-harness`, a separate package whose `task` tool already runs a
packaged role in an isolated non-interactive Pi process and writes a JSON
provenance receipt.

The review's own precondition was to run one track both ways before deleting
anything, because the executor is the only path by which this system executes
work at all.

## Decision

Add the Pi path as a **second selectable backend** rather than replacing the
first.

- `piHarness.ts` — pure translation and parsing: harness roster loading, the
  OpenCode→Pi model map, tool-policy mirroring, argv construction, and Pi
  JSON event-stream parsing.
- `piExecutor.ts` — `executeTaskViaPi`, a drop-in for `executeTask` on the
  seven positional parameters the orchestrator supplies. Spawns `pi`, writes a
  receipt field-compatible with the harness's own, returns `ExecutionResult`.
- `piBackendPreflight.ts` — reports, per Fleet agent, whether the Pi backend
  could dispatch it.

It was introduced behind a `FLEET_EXECUTOR_BACKEND` selector so the two paths
could be compared on equal terms. After the comparison below, the OpenCode path
and the selector were both removed; see "Deletion" at the end.

## Semantics that differ by design

**Continuity is receipt-based, not session-based.** OpenCode resumes a live
server session by id. Pi runs `--no-session`; the harness carries continuity by
prepending the prior run's final output, keyed by receipt id. `executeWithRetry`
now passes `continuationOutput`, which the OpenCode backend ignores.
`ExecutionResult.sessionId` therefore carries a Pi task id under the Pi backend.

**An unmapped model fails closed.** The harness resolves models strictly
through its model map and treats an absent entry as "no model", never as a
passthrough. The Pi backend does the same and refuses to dispatch, rather than
handing an untranslated reference to the CLI.

**Role selection is model-driven.** Fleet's agent roster is org-chart shaped
(`backend-lead`, `qa-test-engineer`) and does not overlap the harness roster.
The harness keeps one `coder-*` role per model reference, so a Fleet agent is
matched to the coder role serving its configured model. An explicit
`piRole` overrides this.

## First blocker: the rosters did not line up (closed)

At the time the backend landed, **none of the 13 seeded Fleet agents resolved
to a harness role**:

| Fleet model | Blocker |
| --- | --- |
| `opencode-go/*` (4 agents) | no harness role serves this provider at all |
| `deepseek/deepseek-v4-pro` (3) | harness has `deepseek-v4-flash` and `vocengine-coding/deepseek-v4-pro`, not this |
| `minimax-cn-coding-plan/MiniMax-M2.7`, `M2.5-highspeed` (3) | harness serves only `MiniMax-M3` |
| `kimi-for-coding/k2p7` (2) | harness serves `kimi-for-coding`, `-highspeed`, `k3` |

Closed by re-pointing the agents at models the harness serves. Preflight now
reports 13/13 dispatchable, and `orgChartAgents.piReadiness.test.ts` fails the
build if that regresses.

## Second blocker: Convex auth (closed)

`convex/lib/auth.ts:resolveActor` rejects unauthenticated requests unless
`FLEET_ALLOW_ANON_BOOTSTRAP=1` is set on the deployment and `NODE_ENV` is not
production. That variable is not set on the local deployment, and pivot never
authenticates — `createConvexClient` builds a bare `ConvexHttpClient` and
nothing anywhere calls `setAuth`.

So `fleetCatalog.listAgents` throws `Authentication required`, which means
`resolveAgentCommand` throws, which means **neither backend can dispatch
anything against this deployment**. This is not a Pi-backend problem; the
OpenCode path fails at the same call. It also means the seed script can create
harnesses (`upsertHarness` is ungated) but not agents (`upsertAgent` is gated) —
so the re-pointed models are in the repo but not yet in Convex.

Closed by setting `FLEET_ALLOW_ANON_BOOTSTRAP=1` on the local deployment, and
by repairing `upsertAgent`, whose patch branch spread six non-column arguments
into `ctx.db.patch` and so could never update an existing agent.

## Third blocker: the harness catalog was a stub (closed)

`resolveAgentCommand` required a row from `fleetCatalog.listHarnesses`. That
query returns `[]`; `getHarnessByName` returns `null`; `upsertHarness` is a
no-op. All three are on `measure/stub-mutation-allowlist.txt`, stubbed on
2026-05-20 when the `harnesses` table was dropped in a schema migration. There
is no such table.

So every agent resolved to `{providerId:'', modelId:''}` and `executeTask`
answered "could not be resolved to a valid harness" for every task — under
OpenCode exactly as under Pi. **No task had dispatched in roughly two and a
half months.** This is the likeliest mechanism behind the June audit's finding
that 9 of 15 "complete" tracks were false positives.

The lookup was vestigial: provider and model are parsed from `agent.model` in
the resolver itself, and the only field the row supplied was `commandTemplate`,
whose CLI mode the resolver already warned was unsupported. Removed, and
resolution now comes from `agent.model` alone.

## Observed harness drift (separate repo, not changed here)

- `lib/core.mjs` hardcodes a 9-entry `MODEL_MAP`; `config/model-map.json` holds
  12. They disagree on the three `kimi-for-coding/*` entries. The harness's own
  `task` tool reads `core.mjs`; this backend reads the JSON. They will pick
  different models for kimi until reconciled.
- Three roles declare models absent from both maps:
  `coder-openai-gpt-5-6-luna-fast`, `measure-adversarial-testing`,
  `measure-ux-browser-review`.
- The installed `pi` is 0.83.0; the harness README targets 0.80.6.


## Outcome of the comparison run (2026-08-06)

Both backends were dispatched the same trivial prompt as agent `intern`, in an
isolated scratch repo so neither could touch this tree.

| | Pi | OpenCode |
| --- | --- | --- |
| status | succeeded | failed |
| output | `READY` | `""` |
| error | — | `Invalid response from OpenCode SDK` |
| duration | 8547 ms | 908 ms |
| model | `kimi-coding/kimi-for-coding-highspeed` | `kimi-for-coding-highspeed` |
| tokens in/out | 13459 / 17 | 20 (estimate) / 0 |

The OpenCode failure is the *same class of defect* the Pi backend had to solve.
`executeTask` passes `resolved.agent` — a Fleet org-chart name such as `intern` —
straight through as the OpenCode agent id. OpenCode's roster is the harness
roster, so no such agent exists. Probed directly against the SDK:

```
agent=intern                          dataType=undefined  err=UnknownError
agent=coder-kimi-for-coding-highspeed dataType=object     err=undefined
agent=undefined                       dataType=object     err=undefined
```

So the OpenCode path failed for every Fleet agent, and would have kept failing
after the harness-lookup repair. It is a fixable bug, not proof the SDK is
unusable — but the Pi backend already does the translation correctly, which is
what settled the decision.

## Deletion (this commit)

Removed: `executeTask`, `executeTaskWithFallback`, `FallbackEvent` and the
fallback persistence from `executor.ts`; `executorBackend.ts` and its selector;
`executor.fallback.test.ts`. `executeWithRetry` now calls `executeTaskViaPi`
directly, and `FLEET_EXECUTOR_BACKEND` no longer exists — there is one backend.

`executor.ts` keeps `executeCommand` and `estimateTokens`, which the
quality-workflow lifecycle hooks use for non-agent shell commands.

**`@opencode-ai/sdk` could not be dropped.** `sdkClient.ts` and
`opencodeServer.ts` have two consumers unrelated to task execution:
`sync/opencodeStoryRunner.ts` and `routes/retrospectives.ts`, both started from
`server.ts`. Retiring the dependency means porting those two onto Pi as well;
that is a separate piece of work and was left alone.
