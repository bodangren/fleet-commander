# Test strategy: Frontend warning/test trust recovery

## Oracles

The primary oracle is a classified console and behavioral ledger:

```text
React act warnings       59 at opening -> 0 unexpected
App bare vi.fn warning    1 at opening -> 0
Kanban duplicate key      1 at opening -> 0
Insights boundary log     expected -> locally captured + asserted
```

The React total is partitioned into exactly 12 areas: SprintPlanningPage;
ProjectViewPage save; ProjectViewPage performance; AgentDefaults;
ProjectTemplates; Retrospective; DependencyEditor; `useProjectView`;
`useAgentForm`; ProjectCard; AgentsPage; and `useSprintPlanning`. The final
report must include the before/after count for each area. No warning may be
reclassified as "noise" without a source test, fixture, or production owner.

## Red → Green layers

1. **Warning capture and classification.** Run the affected tests with console
   capture that records warning text, source test, area, and primary class.
   Capture only for ledgering; do not globally silence output. Verify the
   opening count before repairs and the exact residual count after each lane.
2. **Async interaction contracts.** Use the real component/hook boundary and a
   per-test `userEvent.setup()`. Await every interaction and then await a
   semantic assertion for the resulting state, payload, or callback. Deferred
   promises are allowed to prove ordering; fixed sleeps, fake timers used only
   to hide warnings, and elapsed-time assertions are not.
3. **Fixture/provider contracts.** Keep fixture promises, callbacks, Convex
   adapters, and provider state shaped like production. Assert the meaningful
   result (rendered state, submitted data, error/retry, or selected identity),
   not merely that React rendered once. Restore spies and providers in cleanup.
4. **Warning-specific contracts.** App tests use an implemented mock or no
   mock when unused. Kanban fixtures have unique contract-valid identities; if
   production can emit duplicates, a focused red regression precedes the
   smallest production fix. The Insights boundary test captures
   `console.error`, asserts the expected error/message, and restores it in
   `finally`/cleanup.
5. **Focused suites.** Run each bounded cluster and inspect both assertions and
   console output. A passing test with an unclassified warning is not green.
   Repeat shared fixture suites in isolation and in the aggregate order when
   setup state could leak.
6. **Full frontend gates.** Run the complete frontend test suite, then
   `check`, build, repository lint, and diff validation. Require zero
   unexpected React `act`, unimplemented-`vi.fn`, and duplicate-key warnings;
   expected Insights logging must be represented by the explicit capture
   assertion rather than an unexplained console line.
7. **Real browser acceptance.** Use real system Chrome against the local stack
   for core project navigation and the affected planning, project/Kanban,
   templates/retrospective/dependency, and agents surfaces as applicable.
   Observe console/network output and key visible state. The journey is
   read-only: no credentials, route interception, seed/import, factory action,
   or POST/PUT/PATCH/DELETE request.

## Classification decision table

| Observation | Required classification | Acceptable repair |
| --- | --- | --- |
| State update follows an awaited user action but test finishes early | Async test contract | Await interaction and semantic settlement assertion |
| `userEvent` promise is ignored | Interaction contract | Per-test `userEvent.setup()` and awaited call |
| Deferred fixture/provider resolves outside the test lifecycle | Fixture contract | Contract-accurate fixture and deterministic cleanup |
| Real UI updates after an action without a valid boundary | Production defect | Red regression, smallest production fix, retained behavior |
| App invokes bare `vi.fn` | Mock contract | Explicit implementation or remove unused mock |
| Kanban data repeats a task/project identity only in fixture | Fixture identity contract | Unique fixture IDs matching production identity |
| Kanban production path can repeat a key | Production identity defect | Red regression and stable domain key; never array index |
| Insights boundary logs the intentionally thrown test error | Expected error-path observability | Local capture, exact assertion, guaranteed restore |

## Safety and regression matrix

| Scenario | Required result |
| --- | --- |
| Each of 12 legacy areas | No React `act` warning; behavior assertion remains meaningful |
| App test mock invocation | No unimplemented-`vi.fn` warning; invocation contract asserted |
| Kanban task/project rendering | Unique stable keys; no warning; duplicate-data decision documented |
| Insights expected failure | Error log captured/asserted locally; no leaked console spy |
| Focused frontend clusters | Tests pass with zero unclassified warnings |
| Full frontend suite | Passes without the three unexpected warning classes |
| Core/affected real Chrome | Existing surfaces usable, console clean, read-only request ledger |
| Source-quality gates | Check/typecheck, build, lint, Doctor, graph evidence, diff check pass or are explicitly classified |

## Prohibited shortcuts

- No global `console.warn`/`console.error` spy, React warning filter, Vitest
  setup suppression, or blanket `vi.spyOn` that hides unrelated output.
- No `waitForTimeout`, arbitrary sleep, fake timer, or scheduler tick added
  solely to make React warnings disappear.
- No removal/weakened assertion, `// eslint-disable`, snapshot broadening, or
  array-index key used as a warning escape.
- No production change without red evidence of a real defect.

The final closeout must list the exact warning ledger, focused/full command
results, expected Insights assertion, any production change rationale,
read-only Chrome evidence, Doctor result, graph synchronization/audit, and
`git diff --check`. This documentation-only opening deliberately runs none of
those checks.
