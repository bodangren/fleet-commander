# Provider Health Resilience Runbook

Operational runbook for simulating provider outages, verifying fallback behavior, and confirming recovery. This runbook covers the provider_failover track's verification requirements.

## Pre-Outage Setup

- [ ] Confirm the primary provider endpoint is healthy and responding
- [ ] Verify the dashboard shows all-green status for provider health
- [ ] Confirm the fallback chain is configured: primary provider → secondary provider → tertiary provider
- [ ] Check that circuit breaker is closed and all agents report healthy
- [ ] Record the current provider endpoint for later restoration (e.g., `api.primary-provider.com`)

To block the provider endpoint during the outage simulation, add an entry to `/etc/hosts`:

```
127.0.0.1  api.primary-provider.com
```

This redirects the primary provider DNS to localhost, effectively blocking all outbound requests to the primary provider.

## Outage Simulation

- [ ] Add the `/etc/hosts` entry to block the primary provider endpoint
- [ ] Verify the dashboard transitions to red status showing unhealthy provider state
- [ ] Confirm the fallback chain fires: requests route to the next provider in the chain
- [ ] Observe that circuit breaker opens after the configured failure threshold
- [ ] Verify that tasks dispatched during the outage use the fallback provider
- [ ] Check that error notifications are emitted for the provider failure

Expected behavior during outage:
- Dashboard shows red/unhealthy indicators for the primary provider
- Fallback provider handles requests transparently
- No task failures due to provider unavailability (graceful degradation)
- Circuit breaker transitions from closed → open → half-open on retry

## Recovery Verification

- [ ] Remove the `/etc/hosts` block to restore the primary provider endpoint
- [ ] Verify the dashboard transitions from red back to green status
- [ ] Confirm the primary provider is restored as the active provider
- [ ] Check that the circuit breaker closes after successful health checks
- [ ] Verify that subsequent tasks use the primary provider again
- [ ] Confirm no data loss or duplicate processing occurred during the outage

## Post-Recovery

- [ ] Review the provider health timeline for the outage duration
- [ ] Verify cost accounting reflects any fallback provider usage during the outage
- [ ] Confirm that the recovery was automatic (no manual intervention required beyond restoring the endpoint)
- [ ] Document any anomalies observed during the outage or recovery
- [ ] Update the provider health dashboard to confirm green status across all providers
- [ ] Archive the outage simulation results for future reference
