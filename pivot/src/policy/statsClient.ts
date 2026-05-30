import type { ConvexHttpClient } from 'convex/browser';
import { api } from '../../../convex/_generated/api';

export interface DispatchPolicyStatsInput {
  persona: string;
  taskKind: string;
  repoType: string;
  meanDurationMs?: number;
  p50Cost: number;
  p90Cost: number;
  reviewFailRate: number;
  retryRate: number;
  blockerCreationRate?: number;
  coverageRegressionRate?: number;
  sampleCount: number;
  windowDays: number;
  insufficientData: boolean;
  lastUpdatedAt: number;
}

export interface HarnessReliabilityStatsInput {
  harnessName: string;
  successRate7d: number;
  medianLatencyMs: number;
  averageTokens: number;
  reviewPassRateByTaskClassJson: string;
  topFailureModesJson: string;
  lastUpdatedAt: number;
}

/**
 * Upsert dispatch policy stats to Convex
 * @param client - ConvexHttpClient instance
 * @param input - Dispatch policy statistics input data
 * @returns The upserted dispatch policy stats record
 */
export async function upsertDispatchPolicyStats(
  client: ConvexHttpClient,
  input: DispatchPolicyStatsInput,
): Promise<Record<string, unknown>> {
  const withDefaults = {
    blockerCreationRate: 0,
    coverageRegressionRate: 0,
    ...input,
  };
  return client.mutation(api.dispatchPolicyStats.upsertDispatchPolicyStats, withDefaults);
}

/**
 * Get dispatch policy stats by key (persona, taskKind, repoType)
 * @param client - ConvexHttpClient instance
 * @param persona - Persona type
 * @param taskKind - Task kind
 * @param repoType - Repo type
 * @returns Dispatch policy stats record or null if not found
 */
export async function getDispatchPolicyStats(
  client: ConvexHttpClient,
  persona: string,
  taskKind: string,
  repoType: string,
): Promise<Record<string, unknown> | null> {
  return client.query(api.dispatchPolicyStats.getDispatchPolicyStats, { persona, taskKind, repoType });
}

/**
 * List dispatch policy stats
 * @param client - ConvexHttpClient instance
 * @param limit - Maximum number of results to return (default: 100)
 * @returns Array of DispatchPolicyStatsInput records
 */
export async function listDispatchPolicyStats(
  client: ConvexHttpClient,
  limit = 100,
): Promise<DispatchPolicyStatsInput[]> {
  return client.query(api.dispatchPolicyStats.listDispatchPolicyStats, { limit }) as Promise<DispatchPolicyStatsInput[]>;
}

/**
 * Upsert harness reliability stats to Convex
 * @param client - ConvexHttpClient instance
 * @param input - Harness reliability statistics input data
 * @returns The upserted harness reliability stats record
 */
export async function upsertHarnessReliabilityStats(
  client: ConvexHttpClient,
  input: HarnessReliabilityStatsInput,
): Promise<Record<string, unknown>> {
  return client.mutation(api.harnessReliabilityStats.upsertHarnessReliabilityStats, input);
}

/**
 * Get harness reliability stats by harness name
 * @param client - ConvexHttpClient instance
 * @param harnessName - Name of the harness
 * @returns Harness reliability stats record or null if not found
 */
export async function getHarnessReliabilityStats(
  client: ConvexHttpClient,
  harnessName: string,
): Promise<Record<string, unknown> | null> {
  return client.query(api.harnessReliabilityStats.getHarnessReliabilityStats, { harnessName });
}

/**
 * List harness reliability stats
 * @param client - ConvexHttpClient instance
 * @param limit - Maximum number of results to return (default: 100)
 * @returns Array of HarnessReliabilityStatsInput records
 */
export async function listHarnessReliabilityStats(
  client: ConvexHttpClient,
  limit = 100,
): Promise<HarnessReliabilityStatsInput[]> {
  return client.query(api.harnessReliabilityStats.listHarnessReliabilityStats, { limit }) as Promise<HarnessReliabilityStatsInput[]>;
}
