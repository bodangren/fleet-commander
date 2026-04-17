import { filterEligibleTasks, type ConstraintContext } from '../orchestrator/constraints';
import { selectBestCandidate } from './dispatch';
import type { Task } from '../orchestrator/types';
import type { DispatchPolicyStatsInput, HarnessReliabilityStatsInput } from './statsClient';
import type { ScoreWeights } from './scoring';

export interface SimulationDispatch {
  historicalChoice: string;
  candidates: Task[];
  allTasks: Map<string, Task>;
  trackStatuses?: Map<string, string>;
  outcome?: {
    executorStatus?: 'succeeded' | 'failed';
    reviewerStatus?: 'passed' | 'failed' | 'needs-changes';
    recoveryAction?: string;
    retries?: number;
    coverageRegression?: boolean;
    cost?: number;
    durationMs?: number;
  };
}

export interface SimulationResult {
  historicalChoice: string;
  simulatedChoice: string | null;
  matched: boolean;
  deltaImpact: number;
  rejections: import('../orchestrator/constraints').DispatchRejection[];
}

export interface SimulationReport {
  totalDispatches: number;
  divergences: SimulationResult[];
  throughputDelta: number;
  costDelta: number;
  passRateDelta: number;
  retryRateDelta: number;
  coverageRegressionDelta: number;
  starvationMaxAgeDelta: number;
  rejectionRate: number;
  misconfigurationWarning: boolean;
}

export async function simulateDispatches(
  dispatches: SimulationDispatch[],
  weights: Partial<ScoreWeights>,
  rules: Partial<ConstraintContext>,
  policyStats: DispatchPolicyStatsInput[],
  harnessStats: HarnessReliabilityStatsInput[],
): Promise<SimulationResult[]> {
  const results: SimulationResult[] = [];

  for (const dispatch of dispatches) {
    const context: ConstraintContext = {
      allTasks: dispatch.allTasks,
      budgetRemaining: rules.budgetRemaining,
      activeWorktreeTasks: rules.activeWorktreeTasks,
      agentHarnessMap: rules.agentHarnessMap,
      reviewDebtByAgent: rules.reviewDebtByAgent,
      reviewDebtThreshold: rules.reviewDebtThreshold,
      coveragePercentage: rules.coveragePercentage,
      coverageThreshold: rules.coverageThreshold,
      allocationPolicy: rules.allocationPolicy,
      runningTasks: rules.runningTasks,
    };

    const { eligible, rejections } = filterEligibleTasks(
      dispatch.candidates,
      context,
      dispatch.trackStatuses,
    );

    let simulatedChoice: string | null = null;
    let deltaImpact = 0;

    if (eligible.length > 0) {
      const selected = await selectBestCandidate(
        eligible.map((c) => c.task),
        { name: 'opencode' },
        policyStats,
        harnessStats,
        { weights },
      );

      if (selected) {
        simulatedChoice = selected.task.taskKey;
        deltaImpact = Math.abs(selected.score);
      }
    }

    // Compute more meaningful delta impact when historical choice differs
    if (!simulatedChoice || simulatedChoice !== dispatch.historicalChoice) {
      // Find the historical candidate to compute score gap
      const historicalTask = dispatch.candidates.find(
        (t) => t.taskKey === dispatch.historicalChoice,
      );
      if (historicalTask && eligible.length > 0) {
        const { scoreCandidate } = await import('./scoring');
        const historicalScore = scoreCandidate(
          historicalTask,
          { name: 'opencode' },
          policyStats,
          harnessStats,
          { weights, allTasks: dispatch.candidates },
        ).score;

        let simulatedScore = 0;
        if (simulatedChoice) {
          const simulatedTask = dispatch.candidates.find(
            (t) => t.taskKey === simulatedChoice,
          );
          if (simulatedTask) {
            simulatedScore = scoreCandidate(
              simulatedTask,
              { name: 'opencode' },
              policyStats,
              harnessStats,
              { weights, allTasks: dispatch.candidates },
            ).score;
          }
        }
        deltaImpact = Math.abs(simulatedScore - historicalScore);
      }
    }

    results.push({
      historicalChoice: dispatch.historicalChoice,
      simulatedChoice,
      matched: simulatedChoice === dispatch.historicalChoice,
      deltaImpact,
      rejections,
    });
  }

  return results;
}

export function aggregateSimulationReport(
  results: SimulationResult[],
  dispatches: SimulationDispatch[],
): SimulationReport {
  const totalDispatches = results.length;
  const divergences = results.filter((r) => !r.matched);

  let historicalThroughput = 0;
  let simulatedThroughput = 0;
  let historicalCost = 0;
  let simulatedCost = 0;
  let historicalPassed = 0;
  let historicalReviewed = 0;
  let simulatedPassed = 0;
  let simulatedReviewed = 0;
  let historicalRetries = 0;
  let simulatedRetries = 0;
  let historicalCoverageRegressions = 0;
  let simulatedCoverageRegressions = 0;
  let historicalMaxAge = 0;
  let simulatedMaxAge = 0;
  const now = Date.now();
  let totalRejections = 0;
  let totalCandidates = 0;

  for (let i = 0; i < results.length; i++) {
    const result = results[i];
    const dispatch = dispatches[i];
    const outcome = dispatch.outcome;

    // Historical was always chosen (by definition)
    historicalThroughput++;
    if (outcome) {
      historicalCost += outcome.cost ?? 0;
      if (outcome.reviewerStatus) {
        historicalReviewed++;
        if (outcome.reviewerStatus === 'passed') historicalPassed++;
      }
      historicalRetries += outcome.retries ?? 0;
      if (outcome.coverageRegression) historicalCoverageRegressions++;
      const historicalTask = dispatch.allTasks.get(dispatch.historicalChoice);
      if (historicalTask) {
        const age = now - historicalTask.updatedAt;
        if (age > historicalMaxAge) historicalMaxAge = age;
      }
    }

    totalCandidates += dispatch.candidates.length;
    totalRejections += result.rejections.length;

    if (result.simulatedChoice) {
      simulatedThroughput++;
      if (outcome) {
        // Assume outcome follows the chosen task for simulation
        // In a real replay, we'd look up the simulated task's outcome
        // For counterfactual comparison, we use the same outcome when matched,
        // otherwise we estimate based on the new task's properties
        const simulatedTask = dispatch.allTasks.get(result.simulatedChoice);
        if (simulatedTask) {
          const age = now - simulatedTask.updatedAt;
          if (age > simulatedMaxAge) simulatedMaxAge = age;
        }

        if (result.matched) {
          simulatedCost += outcome.cost ?? 0;
          if (outcome.reviewerStatus) {
            simulatedReviewed++;
            if (outcome.reviewerStatus === 'passed') simulatedPassed++;
          }
          simulatedRetries += outcome.retries ?? 0;
          if (outcome.coverageRegression) simulatedCoverageRegressions++;
        } else {
          // For diverged choices, estimate from policy stats or use neutral
          simulatedCost += outcome.cost ?? 0;
          if (outcome.reviewerStatus) {
            simulatedReviewed++;
            // Counterfactual: assume same pass rate for simplicity
            if (outcome.reviewerStatus === 'passed') simulatedPassed++;
          }
          simulatedRetries += outcome.retries ?? 0;
          if (outcome.coverageRegression) simulatedCoverageRegressions++;
        }
      }
    }
  }

  const throughputDelta =
    historicalThroughput === 0
      ? 0
      : (simulatedThroughput - historicalThroughput) / historicalThroughput;

  const costDelta =
    historicalCost === 0 ? 0 : (simulatedCost - historicalCost) / historicalCost;

  const passRateDelta =
    historicalReviewed === 0
      ? 0
      : (simulatedPassed / Math.max(simulatedReviewed, 1) -
          historicalPassed / Math.max(historicalReviewed, 1));

  const retryRateDelta =
    historicalThroughput === 0
      ? 0
      : (simulatedRetries / Math.max(simulatedThroughput, 1) -
          historicalRetries / Math.max(historicalThroughput, 1));

  const coverageRegressionDelta =
    historicalThroughput === 0
      ? 0
      : (simulatedCoverageRegressions / Math.max(simulatedThroughput, 1) -
          historicalCoverageRegressions / Math.max(historicalThroughput, 1));

  const starvationMaxAgeDelta =
    historicalMaxAge === 0 ? 0 : (simulatedMaxAge - historicalMaxAge) / historicalMaxAge;

  const rejectionRate =
    totalCandidates === 0 ? 0 : totalRejections / totalCandidates;

  return {
    totalDispatches,
    divergences,
    throughputDelta,
    costDelta,
    passRateDelta,
    retryRateDelta,
    coverageRegressionDelta,
    starvationMaxAgeDelta,
    rejectionRate,
    misconfigurationWarning: rejectionRate > 0.25,
  };
}
