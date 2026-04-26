# Specification — Harness Capability Schema (A2)

## Overview

Current harness YAMLs (e.g. `measure/harnesses/opencode.yaml`) describe only how to invoke a CLI. Dispatch has no basis for choosing between harnesses beyond static persona-to-harness mapping. This track extends the harness spec with structured capability declarations and operational policy, and mirrors the merged profile into Convex.

Runtime telemetry (success_rate_7d, latency, cost) is out of scope here — it is produced by B1 and consumed by B2.

## Functional Requirements

- **FR1:** Extend harness YAML schema with two new blocks: `capabilities` (static) and `policy` (operational).
- **FR2:** `capabilities` fields: `supports_sessions`, `supports_multiturn_continue`, `max_context_class` (small|medium|large|xlarge), `tool_use`, `file_edit`, `shell`, `structured_output_reliability` (low|medium|high), `streaming`.
- **FR3:** `policy` fields: `allowed_task_classes[]`, `forbidden_task_classes[]`, `default_timeout_ms`, `retry_policy` (none|linear|exponential), `concurrency_limit`, `budget_weight` (0–1), `sandbox` (local|networked|isolated).
- **FR4:** Convex `harnessProfiles` table stores the merged profile per harness name; source-of-truth remains YAML, Convex is an index.
- **FR5:** A Bun loader reads all `measure/harnesses/*.yaml` and upserts profiles into Convex on startup and on file change.
- **FR6:** Missing or invalid capability/policy blocks are tolerated with loud warnings; harness remains usable with conservative defaults.

## Acceptance Criteria

1. `src/shared/harnessProfile.ts` defines Zod schema for the extended YAML shape.
2. `measure/harnesses/opencode.yaml` updated with real values for both blocks; documented in a comment header.
3. `convex/schema.ts` adds `harnessProfiles` table indexed by `name`.
4. `pivot/src/harness/loader.ts` loads YAMLs, validates, upserts into Convex.
5. File-watch triggers re-upsert within 1s of edit.
6. Invalid YAML logs a `harness.profile.invalid` event and applies conservative defaults (no sessions, small context, no tool use, 1 concurrency).
7. 80%+ coverage on loader + schema.
8. `npm run check` clean, all existing tests pass.

## Out of Scope

- Runtime telemetry aggregation (B1).
- Dispatch integration (A3/B2).
- Harness marketplace / import (deferred).
- Auto-discovery of new harness binaries.

## Tech Stack

- **Config:** YAML in `measure/harnesses/`
- **Validation:** Zod in `src/shared/`
- **Storage:** Convex `harnessProfiles` table
- **File watching:** existing Bun file-watcher infra
