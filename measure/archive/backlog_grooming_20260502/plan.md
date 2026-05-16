# Backlog Grooming — Implementation Plan

> **Symphony Compliance:** Consume `tagParser.ts` for `#blocked_by` and `#priority` tag extraction. Session-aware staleness detection. Persona-tag-aware duplicate detection.

## Phase 1: Staleness Detection

- [ ] Add `stalenessThreshold` field to projects table (default 14 days)
- [ ] Implement `detectStaleTasks` Convex query: non-terminal tasks with updatedAt < threshold
- [ ] Exclude tasks with active `sessionId` from staleness — session-bound tasks may be mid-continuation
- [ ] Add `stale` boolean and `staleSince` timestamp to tasks table
- [ ] Auto-flag logic runs on orchestrator cycle or Convex cron
- [ ] Add stale badge indicator to frontend kanban task cards
- [ ] Write unit tests for staleness detection with various threshold and session scenarios
- [ ] Benchmark: efficient scan of large task sets with date index

## Phase 2: Duplicate Detection

- [ ] Implement `findDuplicateTasks` Convex query: exact title match (case-insensitive)
- [ ] Add fuzzy matching: Jaccard similarity on tokenized descriptions (threshold 0.8)
- [ ] Weight duplicates by `#persona` tag: tasks with same title but different `#persona` are likely distinct (cross-team work), not duplicates
- [ ] Build duplicate candidate pairs: taskA, taskB, similarity score, match type
- [ ] Store candidates in a groomedItems view (not persisted, computed on demand)
- [ ] Frontend duplicate review UI: side-by-side comparison, merge/dismiss actions
- [ ] Implement `mergeTasks` mutation: combine sub-items, transfer comments, close duplicate
- [ ] Write tests for exact and fuzzy duplicate detection (including persona-aware dedup)

## Phase 3: Auto-Prioritization and Grooming Report

- [ ] Consume `#blocked_by` tags via `tagParser.parseTaskLine` — build dependency graph from both `tasks.blockedBy` relationships AND `#blocked_by` tag references
- [ ] Consume `#priority` tags — tasks with `#priority:critical` should surface higher in grooming reports
- [ ] Compute blocking score: number of downstream dependents (direct + transitive, including tag-based deps)
- [ ] Identify critical path: chain of tasks with highest transitive blocking
- [ ] Generate priority adjustment proposals: blocking score + `#priority` tag → suggested priority
- [ ] Implement weekly grooming report aggregation: stale, duplicates, priority proposals
- [ ] Store reports in groomedReports (new table or Convex document)
- [ ] Dashboard widget: latest grooming report summary with action items
- [ ] One-click apply for priority adjustments from report UI
- [ ] End-to-end test: create stale/duplicate/blocking tasks with tags, verify report generation
