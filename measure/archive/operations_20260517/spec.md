# Specification: Operations

## Overview

Build the Monitor, Diagnose, and Optimize operations views with real-time status, reconciliation, and A/B testing.

## Reference

- **UI Mockup**: `measure/ui-mockups.html` — Monitor, Diagnose, Optimize views (sidebar → Operations)
- **Product Definition**: `measure/product.md` — Dashboard Views
- **Design System**: `DESIGN.md` — Linear design tokens for operations UI

## Views

### Monitor View

- System status bar (queue, agents, throughput, error rate)
- Queue depth and pipeline throughput charts
- Agent status table with current task, runtime, cost today

### Diagnose View

- Reconcile: Auto-detected issues with fix proposals
- Audit Trail: Filterable event log by agent and time range
- Root Cause: Investigation links for anomalies

### Optimize View

- A/B Tests: Live test with control vs treatment results
- Create New A/B Test: Select agent role, models, split ratio
- Policy Parameters: Retry limit, parallelism, review thoroughness, budget alerts

## Requirements

### R1: Monitor

- Real-time system status
- Queue depth tracking
- Agent status monitoring
- Pipeline throughput metrics

### R2: Diagnose

- Auto-detect system issues
- Generate fix proposals
- Provide audit trail
- Enable root cause analysis

### R3: Optimize

- Create and manage A/B tests
- Track test results (cost, rejection rate, quality)
- Tune policy parameters
- Run cost experiments

## Acceptance Criteria

- [ ] Monitor shows real-time system status
- [ ] Diagnose detects and proposes fixes
- [ ] Optimize enables A/B testing
- [ ] Policy parameters can be tuned
- [ ] All views update in realtime
- [ ] A/B test results are accurate
