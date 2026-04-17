# Track: Fix Tasks Table Index TD-028

## Problem

TD-028: `tasks` table lacks a `by_taskKey` index; simulation route auto-fetch scans all tasks.

This causes performance issues when the simulation route needs to find tasks by their taskKey, as it must scan all tasks instead of using an index lookup.

## Solution

Add `.index('by_taskKey', ['taskKey'])` to the tasks table schema and create a corresponding query function that uses the index.

## Spec

### Schema Changes

1. Add `by_taskKey` composite index to `tasks` table in `convex/schema.ts`:
   ```typescript
   .index("by_taskKey", ["taskKey"])
   ```

2. The existing `taskKey` field is a string that uniquely identifies a task within a project (format: `${projectId}:${sequentialId}`).

### Query Changes

1. Add `getTaskByTaskKey` query in `convex/tasks.ts` that uses the new index:
   - Input: `taskKey: string`
   - Output: The task document or null
   - Uses `withIndex("by_taskKey").filter(t => t.taskKey === taskKey).first()`

2. Update any simulation routes that currently scan all tasks to use this new query.

## Dependencies

- None (this is a standalone fix)

## Verification

- `npm run pivot:test` passes
- `npm run check` on frontend passes
- TypeScript compilation succeeds