/**
 * Phase S3 Red tests for the quality-run cost rollup and recovery
 * decision logic.
 *
 * The S3 phase "Persist And Recover Quality Runs" must roll every
 * quality-stage attempt's cost, tokens, and model telemetry into the
 * parent work run exactly once, and must own the circuit/retry,
 * blocker-creation, and owner-notification decision when a hard gate
 * is exhausted. The test-strategy §3 cross-phase rule is explicit:
 * "Retry budget: app-owned (`executeWithRetry`) vs stage-owned
 * (gate retry) must never double-charge cost." This file pins the
 * single rollup that is later re-asserted in S5 parity.
 *
 *   1. `rollupQualityStageCosts` sums every passed/failed attempt
 *      cost exactly once. Retried attempts are not summed twice
 *      (only the recorded attempt cost contributes; the retry policy
 *      is owned by the runner, not the cost rollup).
 *   2. `rollupQualityStageCosts` is a pure function: equal inputs
 *      produce equal outputs; the input array is not mutated.
 *   3. `rollupQualityStageCosts` honors an `appRetries` accounting
 *      field that the app-owned `executeWithRetry` writes — it adds
 *      app-retried dispatches to the total but does not multiply
 *      stage-attempt costs by retry count (proves no double charge).
 *   4. `evaluateQualityRecovery` returns `shouldBlock=true` and
 *      `shouldNotify=true` when a hard gate is exhausted (attempts
 *      reached the policy cap and the last attempt failed).
 *   5. `evaluateQualityRecovery` returns `shouldBlock=false` and
 *      `shouldNotify=false` while attempts remain.
 *   6. `evaluateQualityRecovery` opens a circuit-breaker entry
 *      (returns `shouldTripCircuit=true`) when the failure pattern
 *      matches the canonical "hard gate exhausted" case.
 *
 * The module under test does not exist yet. These tests are
 * intentionally Red and are committed under the `*.red.test.ts`
 * suffix per the S3 test-strategy §7 "Intentionally-red tests &
 * exclusion" rule.
 *
 * Owned by Phase S3 Test task 4; the `[~]` marker in `plan.md`
 * references this file. The Green sibling lands when
 * `pivot/src/orchestrator/qualityCostRollup.ts` is implemented and
 * these tests pass.
 */

import { describe, expect, it } from 'bun:test';
import {
  rollupQualityStageCosts,
  evaluateQualityRecovery,
  type QualityStageAttempt,
  type QualityRollup,
} from './qualityCostRollup';

function attempt(overrides: Partial<QualityStageAttempt>): QualityStageAttempt {
  return {
    stageKind: 'red',
    role: 'executor',
    attempt: 1,
    status: 'passed',
    costUSD: 0,
    tokens: 0,
    model: 'claude-sonnet-4',
    startedAt: 0,
    finishedAt: 0,
    ...overrides,
  };
}

describe('rollupQualityStageCosts — no double charge', () => {
  it('sums every passed/failed attempt cost exactly once', () => {
    const rollup: QualityRollup = rollupQualityStageCosts({
      attempts: [
        attempt({ stageKind: 'red', status: 'passed', costUSD: 0.40, tokens: 1_000 }),
        attempt({ stageKind: 'green', status: 'passed', costUSD: 0.30, tokens: 800 }),
        attempt({ stageKind: 'phase_acceptance', status: 'passed', costUSD: 0.25, tokens: 600 }),
      ],
      appRetries: [],
    });

    expect(rollup.totalCostUSD).toBeCloseTo(0.95, 5);
    expect(rollup.totalTokens).toBe(2_400);
  });

  it('counts retried attempts individually (no multiplication by retry count)', () => {
    const rollup = rollupQualityStageCosts({
      attempts: [
        attempt({ stageKind: 'red', attempt: 1, status: 'gate_feedback', costUSD: 0.20, tokens: 500 }),
        attempt({ stageKind: 'red', attempt: 2, status: 'passed', costUSD: 0.20, tokens: 500 }),
      ],
      appRetries: [],
    });

    expect(rollup.totalCostUSD).toBeCloseTo(0.40, 5);
    expect(rollup.totalTokens).toBe(1_000);
  });

  it('excludes skipped attempts (zero-cost log entry, not billable)', () => {
    const rollup = rollupQualityStageCosts({
      attempts: [
        attempt({ stageKind: 'red', status: 'passed', costUSD: 0.20, tokens: 500 }),
        attempt({ stageKind: 'ux', status: 'skipped', attempt: 0, costUSD: 0, tokens: 0 }),
      ],
      appRetries: [],
    });

    expect(rollup.totalCostUSD).toBeCloseTo(0.20, 5);
    expect(rollup.totalTokens).toBe(500);
  });

  it('honors appRetries for app-owned retries but does not multiply stage-attempt costs by retry count', () => {
    const rollup = rollupQualityStageCosts({
      attempts: [
        attempt({ stageKind: 'red', status: 'passed', costUSD: 0.30, tokens: 800 }),
        attempt({ stageKind: 'green', status: 'passed', costUSD: 0.30, tokens: 800 }),
      ],
      appRetries: [
        { stageKind: 'red', retryCostUSD: 0.05, retryTokens: 100 },
        { stageKind: 'green', retryCostUSD: 0.05, retryTokens: 100 },
      ],
    });

    // Total = (0.30 + 0.30) stage cost + (0.05 + 0.05) app retry surcharge.
    // Crucially, the stage cost of 0.30 is NOT multiplied by the retry count
    // (it would be 0.60 if it were). This is the no-double-charge rule.
    expect(rollup.totalCostUSD).toBeCloseTo(0.70, 5);
    expect(rollup.totalTokens).toBe(1_800);
  });

  it('returns zero rollup for an empty attempt list', () => {
    const rollup = rollupQualityStageCosts({ attempts: [], appRetries: [] });
    expect(rollup.totalCostUSD).toBe(0);
    expect(rollup.totalTokens).toBe(0);
  });

  it('does not mutate its input attempt list', () => {
    const attempts: QualityStageAttempt[] = [
      attempt({ stageKind: 'red', status: 'passed', costUSD: 0.10, tokens: 100 }),
    ];
    const snapshot = JSON.stringify(attempts);
    rollupQualityStageCosts({ attempts, appRetries: [] });
    expect(JSON.stringify(attempts)).toBe(snapshot);
  });
});

describe('evaluateQualityRecovery — circuit / blocker / owner notification', () => {
  it('returns shouldBlock=true and shouldNotify=true when a hard gate is exhausted', () => {
    const decision = evaluateQualityRecovery({
      stageKind: 'phase_acceptance',
      role: 'reviewer',
      maxAttempts: 2,
      attempts: [
        { attempt: 1, status: 'gate_feedback' },
        { attempt: 2, status: 'failed' },
      ],
      gateHard: true,
    });

    expect(decision.shouldBlock).toBe(true);
    expect(decision.shouldNotify).toBe(true);
    expect(decision.shouldTripCircuit).toBe(true);
    expect(decision.reason).toMatch(/exhausted|hard gate/i);
  });

  it('returns shouldBlock=false and shouldNotify=false while attempts remain', () => {
    const decision = evaluateQualityRecovery({
      stageKind: 'red',
      role: 'executor',
      maxAttempts: 3,
      attempts: [{ attempt: 1, status: 'gate_feedback' }],
      gateHard: true,
    });

    expect(decision.shouldBlock).toBe(false);
    expect(decision.shouldNotify).toBe(false);
    expect(decision.shouldTripCircuit).toBe(false);
  });

  it('does NOT trip the circuit for a non-hard gate (advisory feedback is recoverable)', () => {
    const decision = evaluateQualityRecovery({
      stageKind: 'red',
      role: 'executor',
      maxAttempts: 1,
      attempts: [{ attempt: 1, status: 'failed' }],
      gateHard: false,
    });

    expect(decision.shouldBlock).toBe(false);
    expect(decision.shouldTripCircuit).toBe(false);
  });

  it('emits a blocker reason that names the failed stage and the policy cap', () => {
    const decision = evaluateQualityRecovery({
      stageKind: 'adversarial',
      role: 'reviewer',
      maxAttempts: 1,
      attempts: [{ attempt: 1, status: 'failed' }],
      gateHard: true,
    });

    expect(decision.reason).toContain('adversarial');
    expect(decision.reason).toMatch(/1\/1|attempts/i);
  });
});
