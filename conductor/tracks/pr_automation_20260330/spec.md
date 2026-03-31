# Specification - Pull Request Automation

## Overview
Automate pull request creation, description generation, status tracking, and merging for Fleet Commander tasks. Integrates with GitHub and GitLab via their respective CLIs (`gh`, `glab`) so that completed and reviewed tasks produce ready-to-merge PRs without manual intervention.

## Functional Requirements

- **FR1**: Create PR automatically after task completion and review pass using `gh` or `glab` CLI.
- **FR2**: Generate PR description from task spec and agent output summary using LLM.
- **FR3**: PR links to originating task in the Fleet Commander dashboard.
- **FR4**: PR status tracking (open / merged / closed) polled from the provider API.
- **FR5**: Auto-merge when all CI checks pass, with per-pipeline configuration toggle.
- **FR6**: Support both GitHub and GitLab providers selected via project config.

## Acceptance Criteria

1. A PR is created on task-review-pass with the correct source branch and base branch.
2. PR body contains a summary, task ID link, and checklist of acceptance criteria.
3. Dashboard task detail view shows the linked PR with its current status badge.
4. PR status updates within 30 seconds of a state change on the provider.
5. Auto-merge fires only when all required checks report `success` and the feature is enabled.
6. Switching provider from `github` to `gitlab` in config routes all PR operations through `glab`.

## Out of Scope

- PR template customization per repository.
- Draft PR workflow.
- Multi-repo / monorepo PR orchestration.
- Code review automation (assigning reviewers, AI review comments).
