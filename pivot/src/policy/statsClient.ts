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

export async function getDispatchPolicyStats(
  client: ConvexHttpClient,
  persona: string,
  taskKind: string,
  repoType: string,
): Promise<Record<string, unknown> | null> {
  return client.query(api.dispatchPolicyStats.getDispatchPolicyStats, { persona, taskKind, repoType });
}

export async function listDispatchPolicyStats(
  client: ConvexHttpClient,
  limit = 100,
): Promise<DispatchPolicyStatsInput[]> {
  return client.query(api.dispatchPolicyStats.listDispatchPolicyStats, { limit }) as Promise<DispatchPolicyStatsInput[]>;
}

export async function upsertHarnessReliabilityStats(
  client: ConvexHttpClient,
  input: HarnessReliabilityStatsInput,
): Promise<Record<string, unknown>> {
  return client.mutation(api.harnessReliabilityStats.upsertHarnessReliabilityStats, input);
}

export async function getHarnessReliabilityStats(
  client: ConvexHttpClient,
  harnessName: string,
): Promise<Record<string, unknown> | null> {
  return client.query(api.harnessReliabilityStats.getHarnessReliabilityStats, { harnessName });
}

export async function listHarnessReliabilityStats(
  client: ConvexHttpClient,
  limit = 100,
): Promise<HarnessReliabilityStatsInput[]> {
  return client.query(api.harnessReliabilityStats.listHarnessReliabilityStats, { limit }) as Promise<HarnessReliabilityStatsInput[]>;
}
