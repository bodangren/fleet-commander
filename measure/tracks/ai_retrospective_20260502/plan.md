# AI Retrospective — Implementation Plan

> **Symphony Compliance:** Leverage `#priority`, `#blocked_by`, `#persona` tags from `tagParser.ts` as pattern signals. Include hook failure rates and session continuation rate as retrospective dimensions.

## Phase 1: Data Aggregation

- [ ] Define `retrospectives` table schema in Convex
- [ ] Build `aggregateSprintData` function
  - [ ] Collect task counts (completed, blocked, failed, carried over)
  - [ ] Calculate agent workload distribution
  - [ ] Extract issue patterns (group by error type)
  - [ ] Compute velocity metrics (planned vs completed, trend)
  - [ ] Aggregate hook failure rates by phase (beforeRun/afterRun/afterCreate)
  - [ ] Compute session continuation rate (resumed sessions / total sessions)
  - [ ] Correlate `#priority` tag with completion rate (do critical tasks complete faster?)
  - [ ] Correlate `#blocked_by` chains with cycle time
- [ ] Write unit tests for aggregation logic with mock sprint data
- [ ] Create `generateRetrospective` mutation to trigger aggregation

## Phase 2: LLM Analysis

- [ ] Design retrospective prompt template
  - [ ] Sprint summary section prompt
  - [ ] Pattern detection section prompt (include hook failure and session data)
  - [ ] Top blockers section prompt (enriched with `#blocked_by` chain analysis)
  - [ ] Improvement suggestions section prompt
  - [ ] Agent workload balance section prompt
  - [ ] Priority accuracy section: did `#priority:critical` tasks correlate with higher completion urgency?
- [ ] Implement LLM call using existing AI infrastructure
- [ ] Parse and validate LLM output as structured markdown
- [ ] Store generated report in `retrospectives` table
- [ ] Write tests for prompt construction and output parsing
- [ ] Iterate on prompt quality across 3 test sprints

## Phase 3: Report Scheduling & Output

- [ ] Build cron job for weekly scheduled retrospective generation
- [ ] Create `RetrospectiveViewer` page component
- [ ] Add retrospective list view with date/sprint filters
- [ ] Add "Generate Retrospective" manual trigger button
- [ ] Wire report output to notification/webhook channel (optional)
- [ ] End-to-end test: trigger → generate → view report
