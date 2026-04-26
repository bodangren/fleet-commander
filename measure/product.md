# Product Definition - Measure Fleet Commander

## Vision & Goals

Measure Fleet Commander is a local-first orchestration control plane built on **Bun + Convex**.

The system coordinates AI-agent work across many local repositories while keeping one canonical operational state in Convex and one local execution boundary in Bun.

- **Multi-Project Oversight:** Convex stores global state for registered projects, tracks, tasks, issues, runs, logs, and configuration.
- **Persona-Based Agent Operations:** Agent and harness definitions are first-class records in Convex with local override capabilities.
- **Single-Execution Dispatch Policy:** Dispatcher policy remains deterministic (one selected task per orchestrator run), even though runtime infrastructure has changed.
- **Documentation Sync:** `measure/` markdown in managed repos remains durable documentation and export/sync output, not the sole source of runtime truth.

## Target Audience

- Engineering leads and power developers who want autonomous implementation throughput with strict traceability and local machine control.

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
   - Selects one best task using priority, dependency readiness, persona fit, and budget.
3. **Agent + Harness Management**
   - Edit persona prompts, model defaults, and CLI harness contracts.
4. **Issue Routing and Delegation**
   - Structured blocker/delegation workflow across personas.
5. **Execution Logs and Audit Trails**
   - Full run lifecycle, outputs, status transitions, and review outcomes.
6. **Documentation Synchronization**
   - Reversible import/export between Convex records and track markdown artifacts.

## Retired Assumptions (Superseded by This Pivot)

- Go daemon is no longer the target long-term runtime.
- SQLite is no longer the target system of record.
- Bespoke WebSocket hub is no longer the preferred realtime layer for new UI flows.
- Filesystem-only state coordination is no longer the canonical architecture.

## Preserved/Reinterpreted Assumptions

- Managed project `measure/` artifacts remain important for traceability and portability.
- Deterministic dispatch policy remains.
- Local-first execution remains mandatory for CLI orchestration and file operations.
