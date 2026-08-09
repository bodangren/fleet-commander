# Track: Frontend warning/test trust recovery — TD-268

**Status:** In progress  
**Priority:** High  
**Risk:** Elevated

TD-268 owns the frontend warning baseline that remained after TD-263. It is a
test-trust and warning-classification track, not a license to change unrelated
product behavior. The authoritative opening baseline is **59 React `act(...)`
warnings across 12 legacy areas**, one Vitest `vi.fn` implementation warning in
App tests, one Kanban duplicate-key warning in
`ProjectViewPage.typedApi.test.tsx`, and one expected `InsightsErrorBoundary`
error log that must be captured and asserted.

- [Specification](./spec.md)
- [Implementation plan](./plan.md)
- [Test strategy](./test-strategy.md)
- [Metadata](./metadata.json)

The 12 React-warning areas are SprintPlanningPage; ProjectViewPage save;
ProjectViewPage performance; AgentDefaults; ProjectTemplates; Retrospective;
DependencyEditor; `useProjectView`; `useAgentForm`; ProjectCard; AgentsPage;
and `useSprintPlanning`. ProjectViewPage save and performance remain separate
ledger areas even though they share a component.

This documentation opening authorizes no source/test implementation, graph
update, browser mutation, credential use, seed/import, factory action, or
commit. Those are bounded implementation and closeout activities in the plan.
