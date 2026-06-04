# Spec: Smart Model Router

## Problem
Agent configurations hardcode a single LLM model per agent. There is no intelligence choosing the right model for a given task. Expensive models are used for simple tasks, and cheap models fail on complex ones. The A/B testing framework can compare models but does not auto-select the winner for production dispatch.

## Solution
A production model router that automatically selects the optimal model for each task based on task metadata, agent role, historical performance data, and a cost-quality tradeoff policy set by the Engineering Manager.

## Acceptance Criteria
- [ ] `selectModelForTask` pure function: inputs = task type, story points, agent role, historical cost/quality per model; output = recommended model with confidence score
- [ ] Routing policy modes: `quality_first` (minimize rejections), `cost_first` (minimize spend), `balanced` (default)
- [ ] Router uses A/B test results and historical run data to score models per (role, task type) combination
- [ ] Fallback chain: if primary model fails (timeout / rate limit), retry with next-best model automatically
- [ ] Per-task audit log: which model was selected, why, and fallback history
- [ ] UI toggle in project settings: routing policy per project (`quality_first` | `cost_first` | `balanced` | `manual`)
- [ ] When policy is `manual`, use the agent's configured model (existing behavior)

## Out of Scope
- Real-time model API health checks
- Multi-model ensemble responses
- Fine-tuning or custom model deployment
