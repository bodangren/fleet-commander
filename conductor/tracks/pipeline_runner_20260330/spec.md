# Specification - Pipeline Definition & Runner

## Overview
Introduce a CI/CD-style pipeline system to Fleet Commander. Pipelines are defined in YAML, executed by a Go-based runner engine, and surfaced in the React dashboard. This enables automated multi-step workflows triggered by task completion or manual invocation.

## Functional Requirements

- **FR1**: Pipeline definition format in `conductor/pipelines.yml` supporting stages, steps, commands, and conditional execution.
- **FR2**: Pipeline runner engine that executes stages sequentially and steps within stages in parallel where possible.
- **FR3**: Pipeline trigger on task completion event or manual trigger from the dashboard UI.
- **FR4**: Structured pipeline execution logs stored alongside existing execution logs.
- **FR5**: Pipeline status display in the dashboard (pending / running / succeeded / failed).
- **FR6**: Support for environment variables and secrets injection into pipeline steps.

## Acceptance Criteria

1. A valid `conductor/pipelines.yml` is parsed without errors and the schema is validated on load.
2. The runner executes a two-stage pipeline where stage-one steps run in parallel and stage-two waits for stage-one completion.
3. A pipeline can be triggered manually via a dashboard button and returns a unique execution ID.
4. A pipeline triggered by a task completion hook runs automatically when the task enters `done` status.
5. Execution logs are written as structured JSON entries with timestamps, stage, step, and output.
6. Dashboard shows real-time pipeline status transitions (pending → running → succeeded/failed).
7. Secrets defined in a `.env` file are available to pipeline steps without leaking into logs.

## Out of Scope

- Distributed / remote pipeline execution (local-only for now).
- Pipeline scheduling (cron-like triggers).
- Visual pipeline editor in the dashboard.
