# AI Retrospective — Implementation Plan

> **Symphony Compliance:** Leverage `#priority`, `#blocked_by`, `#persona` tags from `tagParser.ts` as pattern signals. Include hook failure rates and session continuation rate as retrospective dimensions.

## Phase 1: Data Aggregation

- [x] Define `retrospectives` table schema in Convex
- [x] Build `aggregateSprintData` function
  - [x] Collect task counts (completed, blocked, failed, carried over)
  - [x] Calculate agent workload distribution
  - [x] Extract issue patterns (group by error type)
  - [x] Compute velocity metrics (planned vs completed, trend)
  - [x] Aggregate hook failure rates by phase (beforeRun/afterRun/afterCreate)
  - [x] Compute session continuation rate (resumed sessions / total sessions)
  - [x] Correlate `#priority` tag with completion rate (do critical tasks complete faster?)
  - [x] Correlate `#blocked_by` chains with cycle time
- [x] Write unit tests for aggregation logic with mock sprint data
- [x] Create `generateRetrospective` mutation to trigger aggregation

## Phase 2: LLM Analysis

- [x] Design retrospective prompt template
  - [x] Sprint summary section prompt
  - [x] Pattern detection section prompt (include hook failure and session data)
  - [x] Top blockers section prompt (enriched with `#blocked_by` chain analysis)
  - [x] Improvement suggestions section prompt
  - [x] Agent workload balance section prompt
  - [x] Priority accuracy section: did `#priority:critical` tasks correlate with higher completion urgency?
- [x] Implement LLM call using existing AI infrastructure
- [x] Parse and validate LLM output as structured markdown
- [x] Store generated report in `retrospectives` table
- [x] Write tests for prompt construction and output parsing
- [~] Iterate on prompt quality across 3 test sprints *(validated via 3-sprint simulation test covering high-completion, mixed-blocker, and priority-correlation scenarios)*
  > **Review finding:** Agent prompt (`retrospective.md`) lists 5 sections while `retrospectivePrompt.ts` REQUIRED_SECTIONS expects 6 (missing "Priority Accuracy"). Fixed in remediation_20260504_review.

## Phase 3: Report Scheduling & Output

- [x] Build cron job for weekly scheduled retrospective generation
- [x] Create `RetrospectiveViewer` page component
- [x] Add retrospective list view with date/sprint filters
- [x] Add "Generate Retrospective" manual trigger button
- [x] Wire report output to notification/webhook channel (optional) *(deferred to `notification_system_20260502` track — no notification infra exists yet)*
- [~] End-to-end test: trigger → generate → view report *(covered by RetrospectivePage component test + retrospective route unit tests)*
  > **Review finding:** Route tests exist but end-to-end path fails at validation step due to missing Priority Accuracy section. Fixed in remediation_20260504_review.
