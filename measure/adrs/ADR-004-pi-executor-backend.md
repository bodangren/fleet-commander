# ADR 0001 — Pi harness as a selectable executor backend

Status: accepted (backend added, not yet default)
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
- `executorBackend.ts` — `FLEET_EXECUTOR_BACKEND` selects `opencode`
  (default) or `pi`. Unrecognised values warn and fall back; dispatch cannot
  be halted by a typo.
- `piBackendPreflight.ts` — reports, per Fleet agent, whether the Pi backend
  could dispatch it.

Nothing was deleted. The OpenCode path remains the default.

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

## Blocking finding

Against the harness as it stands, **none of the 13 seeded Fleet agents resolves
to a harness role**:

| Fleet model | Blocker |
| --- | --- |
| `opencode-go/*` (4 agents) | no harness role serves this provider at all |
| `deepseek/deepseek-v4-pro` (3) | harness has `deepseek-v4-flash` and `vocengine-coding/deepseek-v4-pro`, not this |
| `minimax-cn-coding-plan/MiniMax-M2.7`, `M2.5-highspeed` (3) | harness serves only `MiniMax-M3` |
| `kimi-for-coding/k2p7` (2) | harness serves `kimi-for-coding`, `-highspeed`, `k3` |

This is measured from the seed script `pivot/src/sync/createOrgChartAgents.ts`;
the live Convex deployment was not reachable at the time of writing. Re-run the
preflight against the live roster before acting on it.

The executor cannot be collapsed onto the harness until this is closed, by one
of: re-pointing Fleet agents at models the harness serves; adding `coder-*`
roles for Fleet's models; or introducing an explicit per-agent `piRole`.

## Second blocker, found while wiring the comparison run

The roster gap is closed (see the follow-up commit): all 13 agents now resolve,
and every target model is registered with the installed `pi`. The comparison
run is still blocked, on something older and broader.

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

Resolving it is a deliberate choice about auth posture, not a mechanical fix:
either set `FLEET_ALLOW_ANON_BOOTSTRAP=1` on the local deployment, or give
pivot a real identity.

## Consequences

- Phase 4 is unblocked for evaluation and blocked for deletion. The
  "run one track both ways" comparison the review asked for can now be run by
  flipping one environment variable — once the roster gap is closed.
- The OpenCode dependency (`@opencode-ai/sdk`), `opencodeServer.ts`, and
  `sdkClient.ts` all remain live and cannot be removed yet.

## Observed harness drift (separate repo, not changed here)

- `lib/core.mjs` hardcodes a 9-entry `MODEL_MAP`; `config/model-map.json` holds
  12. They disagree on the three `kimi-for-coding/*` entries. The harness's own
  `task` tool reads `core.mjs`; this backend reads the JSON. They will pick
  different models for kimi until reconciled.
- Three roles declare models absent from both maps:
  `coder-openai-gpt-5-6-luna-fast`, `measure-adversarial-testing`,
  `measure-ux-browser-review`.
- The installed `pi` is 0.83.0; the harness README targets 0.80.6.
