import { describe, expect, it, beforeEach, vi } from 'bun:test';
import type { ConvexHttpClient } from 'convex/browser';
import { selectBestCandidate } from './dispatch';
import {
  applyBudgetPenalty,
  shouldEscalateRetry,
  selectHarnessByEconomics,
  requiredReviewDepth,
  isBudgetBreached,
  deriveCostLevel,
  deriveRiskLevel,
} from './economic';
import type { Task } from '../orchestrator/types';

vi.mock('../../../convex/_generated/api', () => ({ api: {} }));

describe('economic integration', () => {
  describe('dispatch with budget penalty', () => {
    const mockTask: Task = {
      taskKey: 'feature-1',
      projectSlug: 'test-project',
      trackId: 'track-1',
      title: 'Test task',
      status: 'ready',
      dependencies: [],
      updatedAt: Date.now(),
    };

    const policyStats = [
      {
        persona: 'executor',
        taskKind: 'feature',
        repoType: 'default',
        meanDurationMs: 60000,
        p50Cost: 0.5,
        p90Cost: 0.8,
        reviewFailRate: 0.1,
        retryRate: 0.2,
        blockerCreationRate: 0.05,
        coverageRegressionRate: 0.1,
        sampleCount: 50,
        windowDays: 7,
        insufficientData: false,
        lastUpdatedAt: Date.now(),
      },
    ];

    const harnessStats = [
      {
        harnessName: 'opencode',
        successRate7d: 0.9,
        medianLatencyMs: 30000,
        averageTokens: 5000,
        reviewPassRateByTaskClassJson: '{}',
        topFailureModesJson: '[]',
        lastUpdatedAt: Date.now(),
      },
    ];

    it('applies budget penalty when selecting best candidate', async () => {
      const budget = {
        scope: 'global',
        periodStart: Date.now() - 86400000,
        periodEnd: Date.now() + 86400000,
        cap: 1000,
        spent: 800,
        policy: 'soft' as const,
        updatedAt: Date.now(),
      };

      const baseScoreResult = await selectBestCandidate(
        [mockTask],
        { name: 'opencode' },
        policyStats,
        harnessStats,
      );

      const penalizedScore = applyBudgetPenalty(
        baseScoreResult!.score,
        budget,
        policyStats[0].p90Cost * 100,
      );

      expect(penalizedScore).toBeLessThan(baseScoreResult!.score);
    });

    it('returns zero score when strict budget is exhausted', () => {
      const budget = {
        scope: 'global',
        periodStart: Date.now() - 86400000,
        periodEnd: Date.now() + 86400000,
        cap: 100,
        spent: 100,
        policy: 'strict' as const,
        updatedAt: Date.now(),
      };

      const penalizedScore = applyBudgetPenalty(100, budget, 50);
      expect(penalizedScore).toBe(0);
    });
  });

  describe('retry escalation with budget', () => {
    it('escalates after max retries regardless of budget', () => {
      const history = [
        { taskId: 'task-1', action: 'retry' },
        { taskId: 'task-1', action: 'retry' },
        { taskId: 'task-1', action: 'retry' },
      ];
      const budget = { spent: 100, cap: 1000, policy: 'soft' as const };
      const result = shouldEscalateRetry(history, 'task-1', budget);
      expect(result).toBe('escalate');
    });

    it('escalates immediately when strict budget is exhausted', () => {
      const history: Array<{ taskId: string; action: string }> = [];
      const budget = { spent: 1000, cap: 1000, policy: 'strict' as const };
      const result = shouldEscalateRetry(history, 'task-1', budget);
      expect(result).toBe('escalate');
    });

    it('allows retry when budget is not exhausted and retries are under limit', () => {
      const history = [{ taskId: 'task-1', action: 'retry' }];
      const budget = { spent: 100, cap: 1000, policy: 'soft' as const };
      const result = shouldEscalateRetry(history, 'task-1', budget);
      expect(result).toBe('retry');
    });
  });

  describe('harness selection with economics', () => {
    const harnesses = [
      { name: 'premium-harness', costWeight: 1.0, supportedTaskClasses: ['feature', 'bug'] as const },
      { name: 'standard-harness', costWeight: 0.6, supportedTaskClasses: ['feature', 'bug', 'chore'] as const },
      { name: 'cheap-harness', costWeight: 0.2, supportedTaskClasses: ['feature', 'bug', 'chore', 'review'] as const },
    ];

    it('selects cheap harness when budget is tight', () => {
      const task = { taskKey: 'chore-1', taskClass: 'chore' as const, riskLevel: 'low' as const };
      const budget = { spent: 950, cap: 1000, policy: 'soft' as const };
      const selected = selectHarnessByEconomics(task, harnesses, budget);
      expect(selected).toBe('cheap-harness');
    });

    it('selects premium harness for high-risk tasks regardless of budget', () => {
      const task = { taskKey: 'bug-1', taskClass: 'bug' as const, riskLevel: 'high' as const };
      const budget = { spent: 100, cap: 1000, policy: 'soft' as const };
      const selected = selectHarnessByEconomics(task, harnesses, budget);
      expect(selected).toBe('premium-harness');
    });

    it('selects mid-tier harness when budget is moderate', () => {
      const task = { taskKey: 'feature-1', taskClass: 'feature' as const, riskLevel: 'medium' as const };
      const budget = { spent: 500, cap: 1000, policy: 'soft' as const };
      const selected = selectHarnessByEconomics(task, harnesses, budget);
      expect(selected).toBe('standard-harness');
    });
  });

  describe('review depth with risk/cost', () => {
    it('returns lightweight for low-risk low-cost tasks', () => {
      const result = requiredReviewDepth('low', 'low');
      expect(result).toBe('lightweight');
    });

    it('returns multi_agent for high-risk high-cost tasks', () => {
      const result = requiredReviewDepth('high', 'high');
      expect(result).toBe('multi_agent');
    });

    it('returns standard for medium combinations', () => {
      const result = requiredReviewDepth('medium', 'medium');
      expect(result).toBe('standard');
    });

    it('escalates cost level increases review depth', () => {
      const lowCost = requiredReviewDepth('medium', 'low');
      const highCost = requiredReviewDepth('medium', 'high');
      const depthOrder: Record<string, number> = { lightweight: 1, standard: 2, multi_agent: 3 };
      expect(depthOrder[highCost]).toBeGreaterThan(depthOrder[lowCost]);
    });
  });

  describe('deriveRiskLevel and deriveCostLevel', () => {
    it('derives high risk for bug tasks', () => {
      expect(deriveRiskLevel('bug')).toBe('high');
    });

    it('derives medium risk for feature tasks', () => {
      expect(deriveRiskLevel('feature')).toBe('medium');
    });

    it('derives low risk for chore tasks', () => {
      expect(deriveRiskLevel('chore')).toBe('low');
    });

    it('derives low cost for low expected cost', () => {
      expect(deriveCostLevel(0.1)).toBe('low');
    });

    it('derives medium cost for medium expected cost', () => {
      expect(deriveCostLevel(0.5)).toBe('medium');
    });

    it('derives high cost for high expected cost', () => {
      expect(deriveCostLevel(0.9)).toBe('high');
    });
  });

  describe('budget breach detection', () => {
    it('detects breach for strict policy at cap', () => {
      const budget = {
        scope: 'global',
        periodStart: Date.now() - 86400000,
        periodEnd: Date.now() + 86400000,
        cap: 100,
        spent: 100,
        policy: 'strict' as const,
        updatedAt: Date.now(),
      };
      expect(isBudgetBreached(budget)).toBe(true);
    });

    it('detects breach for soft policy at cap', () => {
      const budget = {
        scope: 'global',
        periodStart: Date.now() - 86400000,
        periodEnd: Date.now() + 86400000,
        cap: 100,
        spent: 100,
        policy: 'soft' as const,
        updatedAt: Date.now(),
      };
      expect(isBudgetBreached(budget)).toBe(true);
    });

    it('does not detect breach for advisory policy at cap', () => {
      const budget = {
        scope: 'global',
        periodStart: Date.now() - 86400000,
        periodEnd: Date.now() + 86400000,
        cap: 100,
        spent: 100,
        policy: 'advisory' as const,
        updatedAt: Date.now(),
      };
      expect(isBudgetBreached(budget)).toBe(false);
    });

    it('detects breach for advisory policy over cap', () => {
      const budget = {
        scope: 'global',
        periodStart: Date.now() - 86400000,
        periodEnd: Date.now() + 86400000,
        cap: 100,
        spent: 101,
        policy: 'advisory' as const,
        updatedAt: Date.now(),
      };
      expect(isBudgetBreached(budget)).toBe(true);
    });
  });
});