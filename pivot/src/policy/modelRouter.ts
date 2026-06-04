/**
 * Smart Model Router — pure functions for automatic model selection.
 *
 * Scores candidate models per (role, taskType) using historical cost/quality data,
 * applies a routing policy, and builds fallback chains for retry logic.
 */

import type { RunContractRecord } from './rollup';
import { deriveTaskKind } from './rollup';
export type { RunContractRecord } from './rollup';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type RoutingPolicy = 'quality_first' | 'cost_first' | 'balanced' | 'manual';

export interface ModelHistoricalData {
  model: string;
  role: string;
  taskType: string;
  sampleCount: number;
  avgCostPerPoint: number;
  rejectionRate: number;
  avgDurationMs: number;
}

export interface ModelScore {
  model: string;
  score: number;
  confidence: number;
  breakdown: {
    costScore: number;
    qualityScore: number;
    speedScore: number;
  };
}

export interface ModelSelectionResult {
  selectedModel: string;
  confidence: number;
  rankedModels: ModelScore[];
  policy: RoutingPolicy;
  reason: string;
}

export interface FallbackChainEntry {
  model: string;
  reason: string;
  triggerCondition: 'rate_limit' | 'timeout' | 'error' | 'primary';
}

// ---------------------------------------------------------------------------
// Scoring
// ---------------------------------------------------------------------------

/**
 * Score a single model for a task based on historical performance data.
 * Returns a ModelScore with breakdown of cost, quality, and speed components.
 *
 * @param model - Model identifier
 * @param role - Agent role (executor, architect, reviewer)
 * @param taskType - Task kind (feature, bug, chore, review)
 * @param historicalData - Array of historical performance records
 * @returns ModelScore with composite score and confidence
 */
export function scoreModelForTask(
  model: string,
  role: string,
  taskType: string,
  historicalData: ModelHistoricalData[],
): ModelScore {
  const relevant = historicalData.filter(
    (d) => d.model === model && d.role === role && d.taskType === taskType,
  );

  if (relevant.length === 0) {
    return {
      model,
      score: 0.5,
      confidence: 0,
      breakdown: { costScore: 0.5, qualityScore: 0.5, speedScore: 0.5 },
    };
  }

  const data = relevant[0];
  const confidence = Math.min(data.sampleCount / 10, 1);

  // Cost score: lower avgCostPerPoint is better. Normalize against $1/point ceiling.
  const costScore = Math.max(0, 1 - data.avgCostPerPoint);

  // Quality score: lower rejection rate is better.
  const qualityScore = 1 - data.rejectionRate;

  // Speed score: normalize against 60s ceiling. Faster = higher score.
  const speedScore = Math.max(0, 1 - data.avgDurationMs / 60_000);

  // Weighted composite: quality(0.5) + cost(0.3) + speed(0.2)
  const score = qualityScore * 0.5 + costScore * 0.3 + speedScore * 0.2;

  return { model, score, confidence, breakdown: { costScore, qualityScore, speedScore } };
}

/**
 * Select the best model for a task given a routing policy.
 *
 * @param role - Agent role
 * @param taskType - Task kind
 * @param historicalData - Historical performance data for all candidate models
 * @param policy - Routing policy mode
 * @param availableModels - Optional explicit model list (defaults to all models in data)
 * @returns ModelSelectionResult with ranked models and selection reason
 */
export function selectModelForTask(
  role: string,
  taskType: string,
  historicalData: ModelHistoricalData[],
  policy: RoutingPolicy,
  availableModels?: string[],
): ModelSelectionResult {
  if (policy === 'manual') {
    return {
      selectedModel: '',
      confidence: 0,
      rankedModels: [],
      policy,
      reason: 'Manual mode — use agent configured model',
    };
  }

  const models = availableModels ?? [...new Set(historicalData.map((d) => d.model))];

  if (models.length === 0) {
    return {
      selectedModel: '',
      confidence: 0,
      rankedModels: [],
      policy,
      reason: 'No candidate models available',
    };
  }

  const scored = models.map((m) => scoreModelForTask(m, role, taskType, historicalData));

  // Sort based on policy
  const sorted = [...scored].sort((a, b) => {
    switch (policy) {
      case 'quality_first':
        // Prioritize quality (higher is better), break ties by cost (higher costScore = cheaper)
        if (Math.abs(b.breakdown.qualityScore - a.breakdown.qualityScore) > 0.01) {
          return b.breakdown.qualityScore - a.breakdown.qualityScore;
        }
        return b.breakdown.costScore - a.breakdown.costScore;

      case 'cost_first':
        // Prioritize cost (higher costScore = cheaper = better), break ties by quality
        if (Math.abs(b.breakdown.costScore - a.breakdown.costScore) > 0.01) {
          return b.breakdown.costScore - a.breakdown.costScore;
        }
        return b.breakdown.qualityScore - a.breakdown.qualityScore;

      case 'balanced':
      default:
        // Use composite score
        return b.score - a.score;
    }
  });

  const selected = sorted[0];

  return {
    selectedModel: selected.model,
    confidence: selected.confidence,
    rankedModels: sorted,
    policy,
    reason: buildSelectionReason(selected, policy),
  };
}

/**
 * Build human-readable reason for model selection.
 */
function buildSelectionReason(score: ModelScore, policy: RoutingPolicy): string {
  const parts: string[] = [];
  parts.push(`Selected ${score.model}`);

  if (score.confidence === 0) {
    parts.push('(no historical data — using defaults)');
  } else {
    parts.push(`(confidence: ${(score.confidence * 100).toFixed(0)}%)`);
  }

  switch (policy) {
    case 'quality_first':
      parts.push('under quality_first policy');
      break;
    case 'cost_first':
      parts.push('under cost_first policy');
      break;
    case 'balanced':
      parts.push('under balanced policy');
      break;
  }

  return parts.join(' ');
}

// ---------------------------------------------------------------------------
// Fallback Chain
// ---------------------------------------------------------------------------

/**
 * Build an ordered fallback chain for model retry logic.
 * Primary model is first, followed by alternatives ordered by score.
 *
 * @param primaryModel - The selected primary model
 * @param rankedModels - Pre-ranked model scores from selectModelForTask
 * @param maxFallbacks - Maximum number of fallback entries (default: 3)
 * @returns Ordered FallbackChainEntry array
 */
export function buildFallbackChain(
  primaryModel: string,
  rankedModels: ModelScore[],
  maxFallbacks = 3,
): FallbackChainEntry[] {
  const chain: FallbackChainEntry[] = [];

  // Primary entry
  chain.push({
    model: primaryModel,
    reason: 'Primary selection',
    triggerCondition: 'primary',
  });

  // Fallbacks: skip primary, take next best
  const fallbacks = rankedModels.filter((m) => m.model !== primaryModel).slice(0, maxFallbacks);

  for (const fb of fallbacks) {
    chain.push({
      model: fb.model,
      reason: `Fallback (score: ${fb.score.toFixed(3)})`,
      triggerCondition: determineFallbackTrigger(fb),
    });
  }

  return chain;
}

/**
 * Determine the trigger condition for a fallback model based on its score profile.
 * Models with high quality but high cost are better for rate_limit fallbacks.
 * Models with balanced scores are good for timeout fallbacks.
 */
function determineFallbackTrigger(score: ModelScore): 'rate_limit' | 'timeout' | 'error' {
  // If quality is high but cost is also high, it's likely a premium model — good for rate limits
  if (score.breakdown.qualityScore > 0.8 && score.breakdown.costScore < 0.5) {
    return 'rate_limit';
  }
  // If speed is good, use for timeout fallbacks
  if (score.breakdown.speedScore > 0.7) {
    return 'timeout';
  }
  return 'error';
}

// ---------------------------------------------------------------------------
// Helpers for aggregating historical data from run contracts
// ---------------------------------------------------------------------------

/**
 * Aggregate run contract records into model historical data.
 * Groups by (model, role, taskType) and computes averages.
 *
 * @param records - Run contract records with cost and outcome data
 * @param modelExtractor - Function to extract model name from a record
 * @returns ModelHistoricalData array
 */
export function aggregateModelHistory(
  records: RunContractRecord[],
  modelExtractor: (record: RunContractRecord) => string,
): ModelHistoricalData[] {
  const buckets = new Map<string, { records: RunContractRecord[]; model: string; role: string; taskType: string }>();

  for (const record of records) {
    const model = modelExtractor(record);
    if (!model) continue;

    const role = derivePersonaFromRecord(record);
    const taskType = deriveTaskKind(record.taskId);
    const key = `${model}::${role}::${taskType}`;

    let bucket = buckets.get(key);
    if (!bucket) {
      bucket = { records: [], model, role, taskType };
      buckets.set(key, bucket);
    }
    bucket.records.push(record);
  }

  const results: ModelHistoricalData[] = [];

  for (const bucket of buckets.values()) {
    const { model, role, taskType, records: recs } = bucket;

    const costs = recs
      .map((r) => r.costUsd)
      .filter((v): v is number => v !== undefined && v >= 0);

    const reviewerStatuses = recs
      .map((r) => r.reviewerStatus)
      .filter((v): v is 'passed' | 'failed' | 'needs-changes' => v !== undefined);

    const rejectedCount = reviewerStatuses.filter((s) => s === 'failed').length;
    const rejectionRate = reviewerStatuses.length > 0 ? rejectedCount / reviewerStatuses.length : 0;

    const avgCostPerPoint = costs.length > 0 ? costs.reduce((a, b) => a + b, 0) / costs.length : 0;

    // Duration is not directly available in RunContractRecord; use 0 as placeholder
    const avgDurationMs = 0;

    results.push({
      model,
      role,
      taskType,
      sampleCount: recs.length,
      avgCostPerPoint,
      rejectionRate,
      avgDurationMs,
    });
  }

  return results;
}

/**
 * Derive persona from a run contract record (mirrors rollup.ts logic).
 */
function derivePersonaFromRecord(
  record: RunContractRecord,
): 'architect' | 'executor' | 'reviewer' | 'recovery' {
  if (record.recoveryAction) return 'recovery';
  if (record.reviewerStatus) return 'reviewer';
  if (record.executorStatus) return 'executor';
  if (record.architectOutput) return 'architect';
  return 'executor';
}
