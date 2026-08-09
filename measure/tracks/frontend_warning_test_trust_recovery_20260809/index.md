# Track: Frontend warning/test trust recovery — TD-268

**Status:** Completed (closed 2026-08-09)<br>
**Priority:** High  
**Risk:** Elevated

TD-268 owned the frontend warning baseline that remained after TD-263. It was a
test-trust and warning-classification track, not a license to change unrelated
product behavior. The opening record was **59 React `act(...)` warnings across
12 legacy areas**, one Vitest `vi.fn` implementation warning in App tests, one
Kanban duplicate-key warning in `ProjectViewPage.typedApi.test.tsx`, and one
expected `InsightsErrorBoundary` error log. The closeout ledger preserves that
record and separately documents the fresh archive replay that emitted 60
`act(...)` warnings; the replay is timing/setup evidence, not a replacement
baseline.

- [Specification](./spec.md)
- [Implementation plan](./plan.md)
- [Test strategy](./test-strategy.md)
- [Metadata](./metadata.json)
- [Warning ledger](./warning-ledger.md)
- [Closeout](./closeout.md)

The 12 React-warning areas are SprintPlanningPage; ProjectViewPage save;
ProjectViewPage performance; AgentDefaults; ProjectTemplates; Retrospective;
DependencyEditor; `useProjectView`; `useAgentForm`; ProjectCard; AgentsPage;
and `useSprintPlanning`. ProjectViewPage save and performance remain separate
ledger areas even though they share a component.

Implementation completed in `4fed5cb7`. The focused aggregate passed 23 files /
154 tests warning-free; the final full frontend passed 176 files / 1,285 tests
in 157.87s with zero warning output. Production-boundary defects found by the
weak tests were fixed with focused contracts and are listed in the closeout;
the durable audit history remains intact.
