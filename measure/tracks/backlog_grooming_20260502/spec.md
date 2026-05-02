# Backlog Grooming

## Overview

Automated backlog maintenance that detects stale tasks, identifies duplicates, and auto-prioritizes based on dependency graphs. Generates grooming reports for human review.

## Functional Requirements

1. **Staleness Detection**
   - Detect tasks with no status change in N days (configurable, default 14 days)
   - Exclude completed/cancelled tasks from staleness check
   - Auto-flag stale tasks: set `stale` flag, add comment with staleness duration
   - Configurable per-project staleness threshold

2. **Duplicate Detection**
   - Identify tasks with identical titles (case-insensitive, trimmed)
   - Fuzzy matching for similar descriptions (Jaccard similarity > 0.8)
   - Flag potential duplicates: link tasks, suggest merge
   - Dedup report lists candidate pairs with similarity scores

3. **Task Decomposition**
   - Detect tasks with >10 sub-items as candidates for decomposition
   - Suggest grouping related sub-items into child tasks
   - Auto-create decomposition proposals (not applied automatically)

4. **Auto-Prioritization**
   - Build dependency graph from task blocker relationships
   - Tasks blocking multiple others → increase priority
   - Transitive dependency analysis (A blocks B blocks C → A is critical path)
   - Priority adjustment proposals: current priority vs. suggested

5. **Grooming Report**
   - Periodic report (configurable, default weekly) summarizing all findings
   - Sections: stale tasks, potential duplicates, decomposition candidates, priority adjustments
   - Report stored and accessible from dashboard
   - Actionable items: one-click apply for priority changes, merge suggestions

## Data Sources

- `tasks` — status, updatedAt, title, description, priority, blockers
- `tracks` — track-level grouping for decomposition analysis
- `issues` — linked issues for context

## Acceptance Criteria

- [ ] Stale tasks flagged within 24h of threshold expiry
- [ ] Duplicate detection identifies exact title matches and >0.8 similarity descriptions
- [ ] Dependency graph correctly identifies critical path tasks
- [ ] Priority adjustment proposals reflect blocking relationships
- [ ] Grooming report generated on schedule and accessible from dashboard
- [ ] All groomed items require human approval before changes apply
- [ ] Configurable thresholds per project

## Out of Scope

- Automatic task merging without human approval
- AI-powered task decomposition suggestions
- Cross-project dependency analysis
- Backlog grooming for archived projects
