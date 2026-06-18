# Provider Health Resilience — Verification Runbook

Manual outage simulation and recovery runbook for verifying end-to-end provider health behavior.

## Pre-Outage Setup

- [ ] Confirm the dashboard shows all providers as healthy (green)
- [ ] Identify the primary provider endpoint to block
- [ ] Verify fallback chain configuration is active

## Outage Simulation

- [ ] Block the primary provider endpoint by adding an entry to `/etc/hosts`
- [ ] Wait for health checks to detect the outage
- [ ] Observe the dashboard shows the provider as red and unhealthy
- [ ] Confirm the fallback to the next provider fires correctly

## Recovery Verification

- [ ] Restore the provider endpoint by removing the `/etc/hosts` block entry
- [ ] Wait for health checks to detect recovery
- [ ] Observe the dashboard returns to green for the primary provider
- [ ] Confirm traffic resumes on the primary

## Post-Recovery

- [ ] Verify no data loss occurred during the outage window
- [ ] Review fallback logs for correct chain behavior
- [ ] Document recovery timing for future SLA baselines
