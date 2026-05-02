# Product Definition - Measure Fleet Commander

## Vision & Goals

Measure Fleet Commander is a local-first orchestration control plane built on **Bun + Convex**.

The system coordinates AI-agent work across many local repositories while keeping one canonical operational state in Convex and one local execution boundary in Bun.

- **Multi-Project Oversight:** Convex stores global state for registered projects, tracks, tasks, issues, runs, logs, and configuration.
- **Persona-Based Agent Operations:** Agent and harness definitions are first-class records in Convex with local override capabilities.
- **Concurrent Dispatch Policy:** The dispatcher may select multiple tasks per run, bounded by a configurable `globalConcurrency` limit (default 5). Selection remains deterministic: highest-scoring ready tasks fill available slots.
- **Documentation Sync:** `measure/` markdown in managed repos is durable documentation and sync output. Convex is the canonical runtime state.

## Target Audience

- Engineering leads and power developers who want autonomous implementation throughput with strict traceability and local machine control.

## Runtime Truth Boundaries

### Markdown owns

- Track specifications (`spec.md`), implementation plans (`plan.md`), and lessons learned.
- Product definition, guidelines, and tech stack documentation.
- Nothing that requires real-time coordination or runtime state.

### Convex owns

- All runtime state: projects, tasks, issues, runs, logs, agents, harnesses, sprints, budget, dispatch history.
- Reactive subscriptions for live UI state.
- Function-level validation and write boundaries.
- Scheduling metadata and run coordination records.

### Nothing is duplicated across the two stores.

## Canonical Runtime Boundary

### Convex owns

- Canonical application state and backend API surface
- Reactive subscriptions for live UI state
- Function-level validation and write boundaries
- Scheduling metadata and run coordination records

### Bun owns

- Local subprocess execution (`opencode`, `claude`, other CLI tools)
- Local filesystem watch/import/export behavior against managed repositories
- Machine-local worker bridges that report lifecycle events back into Convex

## Core Product Capabilities

1. **Global Fleet Dashboard**
   - Cross-project visibility for tracks, blockers, issues, and run status.
2. **Dispatcher + Prioritization**
   - Selects best tasks using priority, dependency readiness, persona fit, and budget, up to the concurrency limit.
3. **Agent + Harness Management**
   - Edit persona prompts, model defaults, and CLI harness contracts.
4. **Issue Routing and Delegation**
   - Structured blocker/delegation workflow across personas.
5. **Execution Logs and Audit Trails**
   - Full run lifecycle, outputs, status transitions, and review outcomes.
6. **Documentation Import + Derived State**
   - Markdown is imported into Convex as derived state. Convex is the canonical source; markdown is the documentation layer.

## Retired Assumptions (Superseded by This Pivot)

- Go daemon is no longer the target long-term runtime.
- SQLite is no longer the target system of record.
- Bespoke WebSocket hub is no longer the preferred realtime layer for new UI flows.
- Filesystem-only state coordination is no longer the canonical architecture.

## Preserved/Reinterpreted Assumptions

- Managed project `measure/` artifacts remain important for traceability and portability.
- Local-first execution remains mandatory for CLI orchestration and file operations.
