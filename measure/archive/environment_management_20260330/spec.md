# Specification - Environment Management

## Overview
Introduce an environment abstraction to Fleet Commander so projects can define deployment targets (staging, production, etc.) with associated variables, secrets, and deployment scripts. Environments integrate with the pipeline runner for deployment execution and provide a dashboard view for one-click deploys and rollbacks.

## Functional Requirements

- **FR1**: Environment model with name, variables map, deployment target URL, and current status.
- **FR2**: Environment configuration stored in `measure/environments.yml` with schema validation.
- **FR3**: Deployment scripts per environment executed through the pipeline runner.
- **FR4**: One-click deploy trigger from the dashboard environment view.
- **FR5**: Deployment history log recording who deployed what, when, and the result.
- **FR6**: Rollback to a previous successful deployment with a single action.

## Acceptance Criteria

1. `measure/environments.yml` with two environments (staging, production) loads without validation errors.
2. Environment CRUD API returns correct JSON and persists changes to the YAML file.
3. Deploying to an environment runs the associated pipeline and records a history entry.
4. Dashboard shows each environment with name, target URL, last deploy time, and status.
5. Deployment history displays the last 20 entries with deployer, timestamp, version, and result.
6. Clicking rollback on a history entry redeploys that version and creates a new history record.

## Out of Scope

- Infrastructure provisioning (Terraform, Pulumi).
- Secret vault integration (HashiCorp Vault, AWS Secrets Manager).
- Multi-cloud or Kubernetes deployment orchestration.
- Environment cloning or drift detection.
