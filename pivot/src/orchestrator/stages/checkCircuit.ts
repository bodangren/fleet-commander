import { ConvexHttpClient } from 'convex/browser';
import { api } from '../../../../convex/_generated/api';
import { logAndCaptureError } from '../logger';

/**
 * Result of a circuit breaker check.
 */
export type CircuitCheckResult =
  | { allowed: true }
  | { allowed: false; reason: string };

/**
 * Initializes the circuit breaker for the agent (idempotent) and evaluates
 * whether dispatch should be allowed.
 *
 * When the agent has no assignee the breaker is skipped entirely. When the
 * breaker itself errors, returns allowed=true (fail-open) so the orchestrator
 * can continue.
 */
export async function checkCircuit(
  client: ConvexHttpClient,
  agentId: string | undefined,
  projectSlug: string,
  taskKey: string,
): Promise<CircuitCheckResult> {
  if (!agentId) {
    return { allowed: true };
  }
  try {
    await client.mutation(api.circuitBreakers.initCircuitBreaker, { agentId });
    const circuitState = await client.mutation(
      api.circuitBreakers.evaluateCircuitState,
      { agentId },
    );
    if (circuitState === 'open') {
      return {
        allowed: false,
        reason: `Circuit breaker open for agent ${agentId}`,
      };
    }
    return { allowed: true };
  } catch (err) {
    await logAndCaptureError(
      client,
      'warning',
      'Circuit breaker evaluation failed',
      { projectSlug, taskKey, agentId, operation: 'circuitBreaker' },
      err,
    );
    return { allowed: true };
  }
}

/**
 * Records a successful dispatch for the agent's circuit breaker.
 * Failures are logged but never thrown.
 */
export async function recordCircuitSuccess(
  client: ConvexHttpClient,
  agentId: string,
  projectSlug: string,
  taskKey: string,
): Promise<void> {
  try {
    await client.mutation(api.circuitBreakers.recordCircuitSuccess, { agentId });
  } catch (err) {
    await logAndCaptureError(
      client,
      'warning',
      'Circuit breaker success recording failed',
      { projectSlug, taskKey, agentId, operation: 'recordCircuitSuccess' },
      err,
    );
  }
}

/**
 * Records a failed dispatch for the agent's circuit breaker.
 * Failures are logged but never thrown.
 */
export async function recordCircuitFailure(
  client: ConvexHttpClient,
  agentId: string,
  failureType: string | undefined,
  projectSlug: string,
  taskKey: string,
): Promise<void> {
  try {
    await client.mutation(api.circuitBreakers.recordCircuitFailure, {
      agentId,
      failureType,
    });
  } catch (err) {
    await logAndCaptureError(
      client,
      'warning',
      'Circuit breaker failure recording failed',
      { projectSlug, taskKey, agentId, operation: 'recordCircuitFailure' },
      err,
    );
  }
}
