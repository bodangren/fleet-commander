# Current Directive

> This file defines the primary focus for autonomous execution. All tracks must serve this directive.

## Active Directive

**Complete MVP functionality for LLM agent selection, execution, and scheduling in terminal sessions.**

## Scope

- Enable users to choose which LLM agent (e.g., `@gemini`, `@claude`) to use for specific tasks
- Integrate agent selection with the terminal session execution flow
- Ensure bi-directional sync between UI and conductor markdown files
- Support scheduling/timing configurations for agent execution (cron-style intervals, while loops, delays)

## Success Criteria

- Users can select an LLM agent from the UI for a given task
- Clicking "Run" launches the configured agent command in the integrated terminal
- Agent mappings are configurable via settings
- Users can set execution timing: one-time, interval (cron), or loop (while) modes
- Scheduled runs display next execution time and allow pause/resume/cancel

## Timeline

Started: 2026-01-23
Target Completion: Ongoing
