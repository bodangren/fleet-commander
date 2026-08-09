# Warning ledger: frontend warning/test trust recovery

**Track:** `frontend_warning_test_trust_recovery_20260809` (TD-268)  
**Implementation:** `4fed5cb7`  
**Closed:** 2026-08-09

This ledger keeps the opening evidence and the closeout evidence separate. It
does not turn a replay count into a deterministic historical baseline.

## Count reconciliation

| Evidence point                                                                 |       React `act(...)` | Other output                                                                           | Interpretation                                                                                                                                                        |
| ------------------------------------------------------------------------------ | ---------------------: | -------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Opening record in the track docs (`c5c2fa2b`)                                  | **59 across 12 areas** | App bare `vi.fn`: 1; Kanban duplicate key: 1; expected Insights boundary error: 1      | Stable opening record used by the track; the expected error is not a warning.                                                                                         |
| Fresh git-archive replay of the opening (`c5c2fa2b`) against 20 targeted files |                 **60** | Duplicate key: **1**                                                                   | Replay grouped as Sprint: **8**, Project View: **15**, agent config: **28**, secondary: **9**. This is timing/setup variability, not a correction of the recorded 59. |
| Final focused aggregate                                                        |       **0 unexpected** | **0** unexpected `vi.fn`/duplicate-key output; expected Insights log captured/asserted | **23 files / 154 passed**.                                                                                                                                            |
| Final full frontend                                                            |                  **0** | **0 warning output**                                                                   | **176 files / 1,285 passed in 157.87s**.                                                                                                                              |
| Earlier clean full runs                                                        |                  **0** | **0 warning output**                                                                   | Both earlier runs were **1,284 passed**, before the added regression increased the passing total to 1,285.                                                            |

The opening 59 is therefore the authoritative recorded baseline, while the
60-event archive replay is retained as a reproducibility caveat. The original
59 capture did **not** preserve per-area cardinalities; that missing artifact is
a process flaw. The replay counts below are the actionable per-area breakdown,
and must not be back-projected as a precise partition of the original 59.
Every owner below closed at zero unexpected warnings.

## Stable 12-area owner ledger

The area names and ownership are stable even when repeated async settlement can
change how many warning lines a fresh run emits. Project View save and
performance remain separate owners despite sharing a component.

| Owner area                    | Opening ledger ownership                               | Fresh replay count | Primary contract repaired                                                               | Final unexpected warnings |
| ----------------------------- | ------------------------------------------------------ | -----------------: | --------------------------------------------------------------------------------------- | ------------------------: |
| `SprintPlanningPage`          | Named owner; original per-area count was not preserved |                  4 | Await user actions and recommendation/loading settlement; preserve planning assertions. |                         0 |
| `ProjectViewPage` save        | Named owner; original per-area count was not preserved |                  3 | Await save/error transitions and retain submitted-payload assertions.                   |                         0 |
| `ProjectViewPage` performance | Named owner; original per-area count was not preserved |                  1 | Await deferred data and preserve meaningful performance-state assertions.               |                         0 |
| `AgentDefaults`               | Named owner; original per-area count was not preserved |                  2 | Use contract-accurate provider/callback fixtures and awaited form state.                |                         0 |
| `ProjectTemplates`            | Named owner; original per-area count was not preserved |                  2 | Await template reads/actions and assert visible loading/empty states.                   |                         0 |
| `Retrospective`               | Named owner; original per-area count was not preserved |                  2 | Await dialog/form interactions and preserve payload assertions.                         |                         0 |
| `DependencyEditor`            | Named owner; original per-area count was not preserved |                  3 | Await add/remove transitions and retain dependency assertions.                          |                         0 |
| `useProjectView`              | Named owner; original per-area count was not preserved |                 11 | Settle project/next-task reads under the production lifecycle.                          |                         0 |
| `useAgentForm`                | Named owner; original per-area count was not preserved |                 24 | Keep harness/model fixtures and callback promises inside the awaited lifecycle.         |                         0 |
| `ProjectCard`                 | Named owner; original per-area count was not preserved |                  2 | Await navigation/selection and use stable project identities.                           |                         0 |
| `AgentsPage`                  | Named owner; original per-area count was not preserved |                  2 | Assert finite roster/provider states and tolerate optional-read failure.                |                         0 |
| `useSprintPlanning`           | Named owner; original per-area count was not preserved |                  4 | Await recommendation reads and preserve loading/error assertions.                       |                         0 |
| **Total**                     | **Replay only; not a partition of the original 59**    |             **60** |                                                                                         |                         0 |

The replay's groups are Sprint (SprintPlanningPage + useSprintPlanning = 8),
Project View (save + performance + useProjectView = 15), agent config
(AgentDefaults + ProjectTemplates + useAgentForm = 28), and secondary
(Retrospective + DependencyEditor + ProjectCard + AgentsPage = 9).

## Independent warning/error entries

| Entry                                                      | Opening                                              | Closeout classification and proof                                                                                                                 |
| ---------------------------------------------------------- | ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| App test bare `vi.fn`                                      | 1 implementation-warning event                       | Replaced with an implemented contract-accurate spy/mock and retained invocation behavior; no warning output remained.                             |
| Kanban duplicate key (`ProjectViewPage.typedApi.test.tsx`) | 1 duplicate-key event in addition to the React total | Repaired the identity/fixture contract with stable unique IDs; no index key or warning filter was used.                                           |
| `InsightsErrorBoundary` expected error                     | 1 intentional error-path log                         | Captured locally, asserted the expected message/error shape, and restored `console.error`; it is excluded only from the unexpected-warning count. |

## Production boundary findings

The weak tests found four real boundaries, so the implementation was not
test-only: actual `ProjectDetail` omitted description/assigned agents; a legacy
imported path leaked description data; canonical `assigneeId` was not resolved;
and an optional agent failure could return 500. The focused repairs use a
deduped ID→name runtime join, safe project roster fields, resilient detail
handling, and sanitizer/new-import paths that blank descriptions. These changes
are covered by the focused aggregate and preserve the read-only product
contract.

## Safety and follow-up

Final real system Chrome passed **4/4 specs in 26.9s**. `live-core` opened and
cancelled Save as Template against the actual GET, scrubbed the path, asserted
exact task/agent counts, and observed zero POST/PUT/PATCH/DELETE. Services on
5173, 8081, and 3210 all returned 200. No credentials, seed/import, factory
action, or browser/API mutation ran.

The next priority is P1 frontend bundle splitting: the build still reports a
**1,354.26kB / 382.84kB gzip** chunk over the 500k advisory. Next are bounded
Doctor god-file/orphan-debt tracks; Bounded Factory remains approval-gated.
