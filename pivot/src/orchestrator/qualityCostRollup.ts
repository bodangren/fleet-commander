/**
 * Quality-run cost rollup and recovery decision logic.
 *
 * Rolls every quality-stage attempt's cost, tokens, and model telemetry
 * into the parent work run exactly once, and owns the circuit/retry,
 * blocker-creation, and owner-notification decision when a hard gate
 * is exhausted.
 *
 * Pure functions — inputs are never mutated.
 *
 * @module qualityCostRollup
 */

// ──────────────────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────────────────

/** A single quality-stage attempt record. */
export interface QualityStageAttempt {
  stageKind: string;
  role: string;
  attempt: number;
  status: string;
  costUSD: number;
  tokens: number;
  model: string;
  startedAt: number;
  finishedAt: number;
}

/** An app-owned retry surcharge entry. */
export interface AppRetryEntry {
  stageKind: string;
  retryCostUSD: number;
  retryTokens: number;
}

/** Aggregated cost rollup for a quality run. */
export interface QualityRollup {
  totalCostUSD: number;
  totalTokens: number;
}

/** Input for the cost rollup function. */
export interface QualityRollupInput {
  attempts: QualityStageAttempt[];
  appRetries: AppRetryEntry[];
}

/** Recovery decision from the evaluator. */
export interface QualityRecoveryDecision {
  shouldBlock: boolean;
  shouldNotify: boolean;
  shouldTripCircuit: boolean;
  reason: string;
}

/** Input for the recovery evaluator. */
export interface QualityRecoveryInput {
  stageKind: string;
  role: string;
  maxAttempts: number;
  attempts: Array<{ attempt: number; status: string }>;
  gateHard: boolean;
}

// ──────────────────────────────────────────────────────────────────────
// Cost rollup
// ──────────────────────────────────────────────────────────────────────

/**
 * Sums every passed/failed attempt cost exactly once. Retried attempts
 * are counted individually (not multiplied by retry count). Skipped
 * attempts are excluded (zero-cost log entry, not billable).
 *
 * App-owned retries (`appRetries`) add a surcharge to the total but
 * do not multiply stage-attempt costs (proves no double charge).
 *
 * @param input - Attempts and app-retry surcharge entries
 */
export function rollupQualityStageCosts(input: QualityRollupInput): QualityRollup {
  let totalCostUSD = 0;
  let totalTokens = 0;

  for (const attempt of input.attempts) {
    if (attempt.status === 'skipped') continue;
    totalCostUSD += attempt.costUSD;
    totalTokens += attempt.tokens;
  }

  for (const retry of input.appRetries) {
    totalCostUSD += retry.retryCostUSD;
    totalTokens += retry.retryTokens;
  }

  return { totalCostUSD, totalTokens };
}

// ──────────────────────────────────────────────────────────────────────
// Recovery decision
// ──────────────────────────────────────────────────────────────────────

/**
 * Evaluates whether a quality stage should be blocked, the owner
 * notified, and the circuit breaker tripped.
 *
 * Rules:
 * - When a hard gate is exhausted (attempts reached the policy cap
 *   and the last attempt failed), returns shouldBlock=true,
 *   shouldNotify=true, and shouldTripCircuit=true.
 * - While attempts remain, returns all false.
 * - For non-hard gates (advisory feedback), does NOT trip the circuit
 *   even if attempts are exhausted.
 *
 * @param input - Stage kind, role, max attempts, attempt history, and gate hardness
 */
export function evaluateQualityRecovery(input: QualityRecoveryInput): QualityRecoveryDecision {
  // Guard against zero/negative maxAttempts — treat as non-exhausted
  if (input.maxAttempts <= 0) {
    return {
      shouldBlock: false,
      shouldNotify: false,
      shouldTripCircuit: false,
      reason: `Invalid maxAttempts (${input.maxAttempts}) for "${input.stageKind}" — treating as non-exhausted`,
    };
  }

  const exhausted = input.attempts.length >= input.maxAttempts;
  const lastAttempt = input.attempts[input.attempts.length - 1];
  const lastFailed = lastAttempt && lastAttempt.status !== 'passed' && lastAttempt.status !== 'skipped';

  if (exhausted && lastFailed && input.gateHard) {
    return {
      shouldBlock: true,
      shouldNotify: true,
      shouldTripCircuit: true,
      reason: `Hard gate exhausted on "${input.stageKind}": ${input.attempts.length}/${input.maxAttempts} attempts failed`,
    };
  }

  return {
    shouldBlock: false,
    shouldNotify: false,
    shouldTripCircuit: false,
    reason: exhausted
      ? `Gate exhausted on "${input.stageKind}": ${input.attempts.length}/${input.maxAttempts} attempts (advisory, recoverable)`
      : `Attempts remaining for "${input.stageKind}": ${input.attempts.length}/${input.maxAttempts}`,
  };
}
