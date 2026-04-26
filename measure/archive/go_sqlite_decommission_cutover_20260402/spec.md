# Specification - Go/SQLite Decommission and Cutover

## Overview

After frontend and orchestrator parity slices are migrated to Bun + Convex, the repo needs an explicit cutover track to retire superseded Go/SQLite runtime surfaces safely. This track governs the decommission sequence, rollback controls, and final architecture enforcement.

## Motivation

- The current pivot baseline intentionally deferred final removal of legacy runtime paths.
- Without a dedicated cutover track, duplicate runtime systems can drift and create operational ambiguity.
- Decommission needs strict gating and rollback controls, not ad hoc cleanup.

## Functional Requirements

- **FR1**: Define hard cutover prerequisites from prior migration tracks (frontend + orchestrator parity).
- **FR2**: Remove or archive obsolete Go runtime modules and SQLite runtime dependencies that are superseded.
- **FR3**: Ensure primary development and runtime docs no longer prescribe Go/SQLite as active architecture.
- **FR4**: Provide operator checklist for backup, verification, rollback trigger criteria, and rollback execution.
- **FR5**: Validate surviving Bun + Convex stack end-to-end with no hidden dependency on removed paths.
- **FR6**: Update tech-debt/lessons/track artifacts to reflect closure decisions and residual risks.

## Acceptance Criteria

1. Cutover checklist exists and is executed with recorded evidence.
2. Superseded Go/SQLite runtime paths for migrated slices are removed or archived.
3. Build/test/dev workflows for surviving stack pass.
4. Rollback procedure is documented and practical (including backup points).
5. Track registry and related docs reflect the new steady-state architecture.

## Non-Goals

- Removing Go tooling that is still intentionally retained for non-migrated capabilities.
- Refactoring unrelated code solely for style during decommission.
- Introducing new product features.

## Risks and Constraints

- Premature deletion can break fallback paths if parity claims are inaccurate.
- Hidden dependencies from scripts/tests may still reference legacy modules.
- Rollback must remain low-friction until production confidence is established.
