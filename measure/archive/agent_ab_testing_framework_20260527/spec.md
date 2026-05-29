# Spec: Agent A/B Testing Framework

## Problem
Fleet Commander has no systematic way to compare agent configurations. Users pick models and roles based on guesswork rather than data. Cost/point trends exist but are not tied to controlled experiments.

## Solution
Build an A/B testing framework that lets users compare two agent configurations on identical tasks and measures cost, duration, quality (rejection rate), and output similarity.

## Acceptance Criteria
- [ ] Users can create an "experiment" with two agent configs (model, temperature, system prompt variant, skills)
- [ ] Experiments run on a selected task or a synthetic benchmark task
- [ ] Results show: cost, duration, rejection rate, and a diff/similarity score of outputs
- [ ] Experiments are stored in Convex with `experiments` and `experimentRuns` tables
- [ ] UI includes experiment list, create form, and results comparison view

## Out of Scope
- Auto-optimizing agent configs (manual creation only)
- Cross-project experiments
- Statistical significance calculations beyond basic comparison

## Related Tech Debt
- TD-113 (Recharts jsdom issues) — may affect results charts; use custom HTML/CSS or snapshot tests
