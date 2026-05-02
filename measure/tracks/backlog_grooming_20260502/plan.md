# Backlog Grooming — Implementation Plan

## Phase 1: Staleness Detection

- [ ] Add `stalenessThreshold` field to projects table (default 14 days)
- [ ] Implement `detectStaleTasks` Convex query: non-terminal tasks with updatedAt < threshold
- [ ] Add `stale` boolean and `staleSince` timestamp to tasks table
- [ ] Auto-flag logic runs on orchestrator cycle or Convex cron
- [ ] Add stale badge indicator to frontend kanban task cards
- [ ] Write unit tests for staleness detection with various threshold values
- [ ] Benchmark: efficient scan of large task sets with date index

## Phase 2: Duplicate Detection

- [ ] Implement `findDuplicateTasks` Convex query: exact title match (case-insensitive)
- [ ] Add fuzzy matching: Jaccard similarity on tokenized descriptions (threshold 0.8)
- [ ] Build duplicate candidate pairs: taskA, taskB, similarity score, match type
- [ ] Store candidates in a groomedItems view (not persisted, computed on demand)
- [ ] Frontend duplicate review UI: side-by-side comparison, merge/dismiss actions
- [ ] Implement `mergeTasks` mutation: combine sub-items, transfer comments, close duplicate
- [ ] Write tests for exact and fuzzy duplicate detection

## Phase 3: Auto-Prioritization and Grooming Report

- [ ] Build dependency graph from tasks.blockedBy relationships
- [ ] Compute blocking score: number of downstream dependents (direct + transitive)
- [ ] Identify critical path: chain of tasks with highest transitive blocking
- [ ] Generate priority adjustment proposals: blocking score → suggested priority
- [ ] Implement weekly grooming report aggregation: stale, duplicates, priority proposals
- [ ] Store reports in groomedReports (new table or Convex document)
- [ ] Dashboard widget: latest grooming report summary with action items
- [ ] One-click apply for priority adjustments from report UI
- [ ] End-to-end test: create stale/duplicate/blocking tasks, verify report generation
