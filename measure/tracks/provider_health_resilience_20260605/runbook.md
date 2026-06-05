# Provider Health & Resilience — Manual Verification Runbook

This runbook walks an operator through verifying the provider health monitoring,
automatic fallback, and recovery behavior end-to-end in a live environment.

**Prerequisites:**
- `npm run dev` running (Convex dev server, pivot server, frontend)
- At least two providers configured in the system (e.g., OpenAI + Anthropic)
- Access to the provider dashboard at `http://localhost:5173/providers`

---

## Pre-Outage Setup

Before simulating an outage, confirm the system is in a healthy baseline state.

- [ ] Open the provider dashboard at `/providers` and verify all providers show a **green** `healthy` status badge
- [ ] Confirm each provider card displays a non-zero average latency value
- [ ] Verify the fallback history table is empty (no prior fallback events)
- [ ] Check that the provider health monitor is running: look for probe log lines in the pivot server output every ~60 seconds
- [ ] Note the primary model assigned to the provider you will block (e.g., `gpt-4o` on OpenAI)

---

## Outage Simulation

Simulate a provider outage by blocking the provider endpoint at the OS level.

- [ ] Identify the provider's API hostname (e.g., `api.openai.com`)
- [ ] Block the endpoint by adding a `/etc/hosts` entry that routes it to `127.0.0.1`:
  ```bash
  # Add to /etc/hosts (requires sudo)
  127.0.0.1  api.openai.com
  ```
- [ ] Wait up to 2 minutes for the next health probe cycle to detect the failure
- [ ] Open the provider dashboard and verify the blocked provider now shows a **red** `unhealthy` status badge
- [ ] Verify the dashboard displays an elevated failure count for the affected provider
- [ ] Submit a new task that would normally use the blocked provider's model
- [ ] Verify the task succeeds by falling back to the next healthy provider in the chain
- [ ] Check the fallback history table on the dashboard: a new row should appear with `fallbackFrom` = blocked model, `fallbackTo` = the model that handled the task, and a `fallbackReason` indicating the provider error
- [ ] Verify a notification toast appeared on the dashboard reporting the provider outage

---

## Recovery Verification

Restore the provider and confirm the system recovers automatically.

- [ ] Remove the `/etc/hosts` block for the provider:
  ```bash
  # Remove or comment out the line in /etc/hosts
  # 127.0.0.1  api.openai.com
  ```
- [ ] Wait up to 2 minutes for the next health probe cycle to detect the recovery
- [ ] Open the provider dashboard and verify the previously blocked provider now shows a **green** `healthy` status badge
- [ ] Verify the failure count has reset or is decreasing
- [ ] Submit a new task and verify it uses the **primary** model (the originally blocked provider), not a fallback
- [ ] Confirm no new fallback event was logged for the recovery task

---

## Post-Recovery

Final validation to confirm the system is fully operational.

- [ ] All providers on the dashboard show **green** `healthy` status
- [ ] Average latency values are within normal range for all providers
- [ ] The fallback history table retains the entries from the outage for audit purposes
- [ ] The provider health monitor continues probing on its regular ~60-second cycle
- [ ] No stale notification toasts remain on the dashboard
- [ ] Document the verification result (pass/fail) and any observations in the track's plan.md
