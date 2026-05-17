# Local Convex Postgres Startup Debugging

## Problem

The local Convex development environment is not starting properly because the Postgres database path fails during startup.

## Goals

- Reproduce the local startup failure with the repo's configured development command or the narrowest Convex command.
- Identify whether the failure is caused by local service state, environment configuration, Convex CLI behavior, or repository scripts.
- Apply the smallest repository fix if the root cause is in committed configuration.
- Document local-only remediation steps if the root cause is outside the repository.

## Non-Goals

- Do not redesign the Convex schema or application data model.
- Do not change unrelated frontend or pivot behavior.
- Do not overwrite unrelated local Convex skill or generated API changes already present in the worktree.

## Acceptance Criteria

- The failing command and root cause are captured in the plan.
- A fix or explicit local remediation path is recorded.
- The relevant startup command is rerun after remediation and its result is documented.
- Measure registry and plan status are updated before closing the work.
