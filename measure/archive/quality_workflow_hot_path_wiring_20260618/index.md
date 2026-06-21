# Quality Workflow Hot-Path Wiring

## Status

New remediation track from the 2026-06-18 post-rewrite wiring review.

## Problem

The quality-workflow integration exists as library code and tests can inject fake hooks, but production does not supply a real `QualityWorkflowRunner` to `AutoRunner`. Any project selecting `standard` or `strict` therefore reaches `runConfiguredQualityWorkflow`, records the profile snapshot, and fails closed with `QualityWorkflowHooks.runner is required but was not provided`.

## Evidence

- `pivot/src/server.ts` constructs `new AutoRunner(..., { isEnabled, gitHooks })` and leaves only a comment saying a real runner must be supplied.
- `pivot/src/orchestrator/autoRunner.ts` supports `qualityWorkflowHooks` but `runAutoRunner()` also omits them.
- `pivot/src/orchestrator/qualityWorkflowDispatch.ts` fails when `hooks.runner` is absent.
- Repository search found `QualityWorkflowRunner` implementations only in tests.

## Scope

Implement and wire the production runner. Do not create a second scheduler, task claimant, or standalone Measure supervisor process.
