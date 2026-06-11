# Spec: Status & Enum Source-of-Truth Unification

## Problem

`schema_status_drift` is a recurring gotcha in `lessons-learned.md`, and the
2026-06-05 review hit it head-on: `providers.status` is written with two
incompatible vocabularies — operational (`active|idle|rate_limited`) and health
(`healthy|degraded|unhealthy`) — by different subsystems, causing typecheck
errors and silent dead branches (TD-235). The same risk exists across the schema
wherever status strings are defined: tasks, sprints, agents, employees,
circuit breakers, providers, AB tests, kanban columns. Several are defined as
inline `v.union(v.literal(...))` in multiple places rather than from one
exported validator, so frontend display maps, pivot logic, and Convex
validators can drift apart.

## Solution

Make every status/enum vocabulary a single exported source of truth in
`convex/lib/validators.ts`, derive a matching TypeScript union and (where used)
the frontend display map from it, and add a guard so new inline status unions
are flagged. Resolve the acute `providers.status` overload by splitting
operational status from a new `healthStatus` field.

## Acceptance Criteria

- [ ] Inventory: every status/enum literal union in `convex/schema/**` and
      `convex/lib/validators.ts`, plus their pivot/frontend consumers, listed
      with their current definition site(s).
- [ ] Each status vocabulary is defined **once** as an exported validator;
      duplicate inline unions are replaced with imports.
- [ ] A derived TS type and (where a UI renders it) a single display-label/color
      map are exported from one module, so adding a value is a one-place change.
- [ ] `providers.status` overload resolved via a separate `healthStatus` field
      (closes TD-235); operational status semantics preserved; data migrated.
- [ ] A `doctor.sh` check (or extension) flags new inline `v.union(v.literal(...))`
      status fields in schema files that don't reference an exported validator.
- [ ] All suites + typecheck green; `build-graph` updated.

## Out of Scope

- Renaming existing status values or changing state-machine transitions.
- Non-status enums that are genuinely local to one function.
- The orchestrator state machine internals (separate track).

## Cross-References

- Acute instance: TD-235 (coordinate with provider_health_resilience Phase 7).
- Recurring lesson: `schema_status_drift`.
