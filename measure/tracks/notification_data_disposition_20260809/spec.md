# Spec: Historical notification data disposition

## Overview

TD-264 retired the complete notification product but deliberately retained the `notifications` and
`notificationPreferences` schema tables until their data state was known. This track resolves that
temporary boundary. Read-only inspection of the configured local Convex persistence store maps the
tables through their live index metadata and proves both have zero documents:

| Table | Persistence table ID | Mapping evidence | `numValues` | Stored size |
| --- | --- | --- | ---: | --- |
| `notifications` | `XFmcVXsPQ5PmcG9ssqNQwQ` | `by_user`, `by_user_and_read`, `by_user_and_type` | 0 | `AAAAAAAAAAA=` |
| `notificationPreferences` | `EdLg9sL24JCPNyZQbvJQwQ` | `by_user` | 0 | `AAAAAAAAAAA=` |

The repository's `.env.local` names only `anonymous:anonymous-agent` at `127.0.0.1`; no production
deployment is configured. The Convex CLI read command is not accepted as evidence because it hangs
on an unrelated Sentry DNS failure. SQLite was opened read-only and no data was mutated.

The smallest safe outcome is full schema deletion with no migration component, backfill, export, or
tombstone API. The running local watcher may apply the empty-table schema change. This code is not a
claim about an unknown remote deployment: any future deployment must independently prove both table
counts are zero before applying the schema commit.

## Functional Requirements

### FR-1: Remove the empty historical tables

- Remove `notifications` and `notificationPreferences` from `convex/schema/operations.ts`.
- Remove their indexes and fields with the declarations; do not add replacement or archival tables.
- Keep Alerts, task state/history, recovery evidence, and execution logs unchanged.

### FR-2: Remove notification-only vocabulary

- Remove `notificationType`, `notificationChannel`, `NotificationType`, and `NotificationChannel`
  when source analysis proves no non-retirement caller remains.
- Update schema/validator tests and generated types to describe the smaller schema.
- Keep ordinary UI toast terminology such as blocker-resolution success toasts; those are not the
  retired notification product.

### FR-3: Preserve a fail-closed remote boundary

- Do not create or run a deletion mutation, migration component, export, seed, or public/internal
  data-inspection function when the configured local tables contain zero rows.
- Record the exact read-only local evidence and the absence of a configured remote deployment.
- Document that a different deployment must repeat a zero-row preflight before applying this commit;
  do not claim remote rows were inspected.

### FR-4: Prove the reduced system

- Source contracts must reject either table declaration, either notification validator/type, any
  revived runtime/API/frontend/Pivot surface, and any retired allowlist path.
- Convex codegen/typecheck/runtime and the remaining Convex tests must pass with no notification
  wrapper or schema-preservation test.
- Full Pivot/frontend gates and the existing no-mock system-Chrome retirement journey must remain
  green. The browser run must perform zero mutations and no credentialed factory action.

## Non-Functional Requirements

- Treat deletion/schema change as critical risk even though the observed tables are empty.
- Prefer deletion over compatibility code, a one-off migration subsystem, or archived schemas.
- Do not query the SQLite store from application production code or commit local database files.
- Do not expose secrets or include raw unrelated persisted documents in evidence.
- Do not alter packages, lockfiles, authentication, Alerts, factory execution, or continuous mode.

## Acceptance Criteria

1. The two local table IDs are mapped through current index metadata and both summary counts are zero.
2. No production source, schema, generated API, validator, type, or Doctor allowlist exposes the
   retired notification product or its historical tables.
3. No data-writing migration/export/delete function is added or run.
4. Convex, Pivot, frontend, clean-checkout, graph/diff, and real system-Chrome gates are recorded with
   exact results.
5. Any remote/deployed data uncertainty is stated explicitly; no remote deletion is performed.

## Out of Scope

- Reintroducing notifications, email, webhooks, preferences, or per-user auth.
- Deleting or exporting unknown remote data without an independently approved deployment preflight.
- Credentialed Bounded Factory execution.
- Fleet bootstrap latency, React warning cleanup, bundle splitting, or unrelated dead-code work.
