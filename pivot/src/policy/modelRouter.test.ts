import { describe, expect, it } from 'bun:test';
import {
  scoreModelForTask,
  selectModelForTask,
  buildFallbackChain,
  aggregateModelHistory,
  type ModelHistoricalData,
  type RunContractRecord,
} from './modelRouter';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeHistory(overrides: Partial<ModelHistoricalData> = {}): ModelHistoricalData {
  return {
    model: 'gpt-4o',
    role: 'executor',
    taskType: 'feature',
    sampleCount: 10,
    avgCostPerPoint: 0.3,
    rejectionRate: 0.1,
    avgDurationMs: 5000,
    ...overrides,
  };
}

function makeRecord(overrides: Partial<RunContractRecord> = {}): RunContractRecord {
  return {
    taskId: 'task-feature-1',
    projectSlug: 'test-project',
    createdAt: Date.now(),
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// scoreModelForTask
// ---------------------------------------------------------------------------

describe('scoreModelForTask', () => {
  it('returns default score when no historical data exists', () => {
    const result = scoreModelForTask('gpt-4o', 'executor', 'feature', []);
    expect(result.model).toBe('gpt-4o');
    expect(result.score).toBe(0.5);
    expect(result.confidence).toBe(0);
    expect(result.breakdown.costScore).toBe(0.5);
    expect(result.breakdown.qualityScore).toBe(0.5);
    expect(result.breakdown.speedScore).toBe(0.5);
  });

  it('returns default score when model has no matching data', () => {
    const data = [makeHistory({ model: 'claude-3-opus' })];
    const result = scoreModelForTask('gpt-4o', 'executor', 'feature', data);
    expect(result.score).toBe(0.5);
    expect(result.confidence).toBe(0);
  });

  it('returns default score when role has no matching data', () => {
    const data = [makeHistory({ role: 'architect' })];
    const result = scoreModelForTask('gpt-4o', 'executor', 'feature', data);
    expect(result.score).toBe(0.5);
  });

  it('returns default score when taskType has no matching data', () => {
    const data = [makeHistory({ taskType: 'bug' })];
    const result = scoreModelForTask('gpt-4o', 'executor', 'feature', data);
    expect(result.score).toBe(0.5);
  });

  it('computes score from historical data', () => {
    const data = [
      makeHistory({
        avgCostPerPoint: 0.2,
        rejectionRate: 0.05,
        avgDurationMs: 3000,
        sampleCount: 10,
      }),
    ];
    const result = scoreModelForTask('gpt-4o', 'executor', 'feature', data);

    expect(result.score).toBeGreaterThan(0.5);
    expect(result.confidence).toBe(1); // 10/10 = 1.0
    expect(result.breakdown.qualityScore).toBeCloseTo(0.95, 2); // 1 - 0.05
    expect(result.breakdown.costScore).toBeCloseTo(0.8, 2); // 1 - 0.2
    expect(result.breakdown.speedScore).toBeCloseTo(0.95, 2); // 1 - 3000/60000
  });

  it('caps confidence at 1.0 even with many samples', () => {
    const data = [makeHistory({ sampleCount: 100 })];
    const result = scoreModelForTask('gpt-4o', 'executor', 'feature', data);
    expect(result.confidence).toBe(1);
  });

  it('scales confidence linearly with sample count', () => {
    const data = [makeHistory({ sampleCount: 3 })];
    const result = scoreModelForTask('gpt-4o', 'executor', 'feature', data);
    expect(result.confidence).toBeCloseTo(0.3, 2);
  });

  it('handles zero cost model', () => {
    const data = [makeHistory({ avgCostPerPoint: 0 })];
    const result = scoreModelForTask('gpt-4o', 'executor', 'feature', data);
    expect(result.breakdown.costScore).toBe(1);
  });

  it('handles 100% rejection rate', () => {
    const data = [makeHistory({ rejectionRate: 1.0 })];
    const result = scoreModelForTask('gpt-4o', 'executor', 'feature', data);
    expect(result.breakdown.qualityScore).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// selectModelForTask
// ---------------------------------------------------------------------------

describe('selectModelForTask', () => {
  const historicalData: ModelHistoricalData[] = [
    makeHistory({ model: 'gpt-4o', avgCostPerPoint: 0.5, rejectionRate: 0.05, avgDurationMs: 3000 }),
    makeHistory({ model: 'gpt-4o-mini', avgCostPerPoint: 0.05, rejectionRate: 0.2, avgDurationMs: 2000 }),
    makeHistory({ model: 'claude-3-opus', avgCostPerPoint: 0.8, rejectionRate: 0.02, avgDurationMs: 5000 }),
  ];

  it('returns empty result for manual policy', () => {
    const result = selectModelForTask('executor', 'feature', historicalData, 'manual');
    expect(result.policy).toBe('manual');
    expect(result.selectedModel).toBe('');
    expect(result.reason).toContain('Manual mode');
  });

  it('returns empty result when no models available', () => {
    const result = selectModelForTask('executor', 'feature', [], 'balanced');
    expect(result.selectedModel).toBe('');
    expect(result.reason).toContain('No candidate models');
  });

  it('selects best model under balanced policy', () => {
    const result = selectModelForTask('executor', 'feature', historicalData, 'balanced');
    expect(result.selectedModel).toBe('gpt-4o-mini');
    expect(result.rankedModels.length).toBe(3);
    expect(result.confidence).toBeGreaterThan(0);
  });

  it('selects cheapest model under cost_first policy', () => {
    const result = selectModelForTask('executor', 'feature', historicalData, 'cost_first');
    expect(result.selectedModel).toBe('gpt-4o-mini');
    expect(result.reason).toContain('cost_first');
  });

  it('selects highest quality model under quality_first policy', () => {
    const result = selectModelForTask('executor', 'feature', historicalData, 'quality_first');
    expect(result.selectedModel).toBe('claude-3-opus');
    expect(result.reason).toContain('quality_first');
  });

  it('quality_first breaks ties by cost', () => {
    const data: ModelHistoricalData[] = [
      makeHistory({ model: 'model-a', rejectionRate: 0.05, avgCostPerPoint: 0.3 }),
      makeHistory({ model: 'model-b', rejectionRate: 0.05, avgCostPerPoint: 0.1 }),
    ];
    const result = selectModelForTask('executor', 'feature', data, 'quality_first');
    expect(result.selectedModel).toBe('model-b'); // same quality, cheaper
  });

  it('cost_first breaks ties by quality', () => {
    const data: ModelHistoricalData[] = [
      makeHistory({ model: 'model-a', rejectionRate: 0.05, avgCostPerPoint: 0.1 }),
      makeHistory({ model: 'model-b', rejectionRate: 0.15, avgCostPerPoint: 0.1 }),
    ];
    const result = selectModelForTask('executor', 'feature', data, 'cost_first');
    expect(result.selectedModel).toBe('model-a'); // same cost, better quality
  });

  it('uses explicit availableModels when provided', () => {
    const result = selectModelForTask(
      'executor',
      'feature',
      historicalData,
      'balanced',
      ['gpt-4o', 'gpt-4o-mini'],
    );
    expect(result.rankedModels.length).toBe(2);
    expect(result.rankedModels.map((m) => m.model)).toContain('gpt-4o');
    expect(result.rankedModels.map((m) => m.model)).toContain('gpt-4o-mini');
  });

  it('returns default score for models without historical data', () => {
    const result = selectModelForTask(
      'executor',
      'feature',
      historicalData,
      'balanced',
      ['unknown-model'],
    );
    expect(result.rankedModels.length).toBe(1);
    expect(result.rankedModels[0].score).toBe(0.5);
    expect(result.rankedModels[0].confidence).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// buildFallbackChain
// ---------------------------------------------------------------------------

describe('buildFallbackChain', () => {
  const rankedModels = [
    { model: 'gpt-4o', score: 0.9, confidence: 1, breakdown: { costScore: 0.8, qualityScore: 0.95, speedScore: 0.9 } },
    { model: 'claude-3-opus', score: 0.85, confidence: 1, breakdown: { costScore: 0.6, qualityScore: 0.98, speedScore: 0.7 } },
    { model: 'gpt-4o-mini', score: 0.7, confidence: 0.8, breakdown: { costScore: 0.95, qualityScore: 0.8, speedScore: 0.95 } },
    { model: 'gemini-1.5-flash', score: 0.6, confidence: 0.5, breakdown: { costScore: 0.99, qualityScore: 0.7, speedScore: 0.99 } },
  ];

  it('builds chain with primary as first entry', () => {
    const chain = buildFallbackChain('gpt-4o', rankedModels);
    expect(chain.length).toBe(4);
    expect(chain[0].model).toBe('gpt-4o');
    expect(chain[0].triggerCondition).toBe('primary');
  });

  it('excludes primary from fallbacks', () => {
    const chain = buildFallbackChain('gpt-4o', rankedModels);
    const fallbacks = chain.slice(1);
    expect(fallbacks.every((f) => f.model !== 'gpt-4o')).toBe(true);
  });

  it('preserves ranking order in fallbacks', () => {
    const chain = buildFallbackChain('gpt-4o', rankedModels);
    expect(chain[1].model).toBe('claude-3-opus');
    expect(chain[2].model).toBe('gpt-4o-mini');
    expect(chain[3].model).toBe('gemini-1.5-flash');
  });

  it('limits fallbacks to maxFallbacks', () => {
    const chain = buildFallbackChain('gpt-4o', rankedModels, 2);
    expect(chain.length).toBe(3); // primary + 2 fallbacks
  });

  it('defaults to 3 max fallbacks', () => {
    const manyModels = [
      ...rankedModels,
      { model: 'extra-1', score: 0.5, confidence: 0.3, breakdown: { costScore: 0.5, qualityScore: 0.5, speedScore: 0.5 } },
      { model: 'extra-2', score: 0.4, confidence: 0.2, breakdown: { costScore: 0.5, qualityScore: 0.5, speedScore: 0.5 } },
    ];
    const chain = buildFallbackChain('gpt-4o', manyModels);
    expect(chain.length).toBe(4); // primary + 3 fallbacks
  });

  it('handles single model (no fallbacks)', () => {
    const chain = buildFallbackChain('gpt-4o', [rankedModels[0]]);
    expect(chain.length).toBe(1);
    expect(chain[0].model).toBe('gpt-4o');
  });

  it('handles empty ranked models', () => {
    const chain = buildFallbackChain('gpt-4o', []);
    expect(chain.length).toBe(1);
    expect(chain[0].model).toBe('gpt-4o');
  });

  it('assigns trigger conditions based on score profile', () => {
    const models = [
      { model: 'primary', score: 0.9, confidence: 1, breakdown: { costScore: 0.8, qualityScore: 0.9, speedScore: 0.9 } },
      { model: 'premium-fb', score: 0.8, confidence: 1, breakdown: { costScore: 0.3, qualityScore: 0.9, speedScore: 0.6 } },
      { model: 'fast-fb', score: 0.7, confidence: 0.8, breakdown: { costScore: 0.7, qualityScore: 0.7, speedScore: 0.8 } },
      { model: 'generic-fb', score: 0.6, confidence: 0.5, breakdown: { costScore: 0.5, qualityScore: 0.5, speedScore: 0.5 } },
    ];
    const chain = buildFallbackChain('primary', models);
    expect(chain[1].triggerCondition).toBe('rate_limit'); // high quality, low cost score
    expect(chain[2].triggerCondition).toBe('timeout'); // high speed
    expect(chain[3].triggerCondition).toBe('error'); // generic
  });
});

// ---------------------------------------------------------------------------
// aggregateModelHistory
// ---------------------------------------------------------------------------

describe('aggregateModelHistory', () => {
  it('returns empty array for empty records', () => {
    const result = aggregateModelHistory([], () => 'gpt-4o');
    expect(result).toEqual([]);
  });

  it('skips records with empty model', () => {
    const records = [makeRecord()];
    const result = aggregateModelHistory(records, () => '');
    expect(result).toEqual([]);
  });

  it('aggregates records by model, role, and taskType', () => {
    const records = [
      makeRecord({ taskId: 'task-feature-1', executorStatus: 'succeeded', costUsd: 0.5 }),
      makeRecord({ taskId: 'task-feature-2', executorStatus: 'succeeded', costUsd: 0.7 }),
    ];
    const result = aggregateModelHistory(records, () => 'gpt-4o');

    expect(result.length).toBe(1);
    expect(result[0].model).toBe('gpt-4o');
    expect(result[0].role).toBe('executor');
    expect(result[0].taskType).toBe('feature');
    expect(result[0].sampleCount).toBe(2);
    expect(result[0].avgCostPerPoint).toBeCloseTo(0.6, 2);
    expect(result[0].rejectionRate).toBe(0);
  });

  it('groups by different models', () => {
    const records = [
      makeRecord({ taskId: 'task-feature-1', executorStatus: 'succeeded', costUsd: 0.5 }),
      makeRecord({ taskId: 'task-feature-2', executorStatus: 'succeeded', costUsd: 0.3 }),
    ];
    let callCount = 0;
    const result = aggregateModelHistory(records, () => {
      callCount++;
      return callCount === 1 ? 'gpt-4o' : 'claude-3-opus';
    });

    expect(result.length).toBe(2);
    expect(result.map((r) => r.model)).toContain('gpt-4o');
    expect(result.map((r) => r.model)).toContain('claude-3-opus');
  });

  it('derives persona from record', () => {
    const records = [
      makeRecord({ architectOutput: 'plan', costUsd: 0.5 }),
    ];
    const result = aggregateModelHistory(records, () => 'gpt-4o');
    expect(result[0].role).toBe('architect');
  });

  it('handles records with no cost data', () => {
    const records = [
      makeRecord({ taskId: 'task-feature-1', executorStatus: 'succeeded' }),
    ];
    const result = aggregateModelHistory(records, () => 'gpt-4o');
    expect(result[0].avgCostPerPoint).toBe(0);
  });

  it('handles records with no reviewer status', () => {
    const records = [
      makeRecord({ taskId: 'task-feature-1', executorStatus: 'succeeded' }),
    ];
    const result = aggregateModelHistory(records, () => 'gpt-4o');
    expect(result[0].rejectionRate).toBe(0);
  });

  it('derives taskType from taskId', () => {
    const records = [
      makeRecord({ taskId: 'task-bug-1', executorStatus: 'succeeded' }),
    ];
    const result = aggregateModelHistory(records, () => 'gpt-4o');
    expect(result[0].taskType).toBe('bug');
  });
});
