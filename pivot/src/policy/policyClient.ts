import type { ConvexHttpClient } from 'convex/browser';
import { api } from '../../../convex/_generated/api';

export interface PolicyWeightsInput {
  name: string;
  weightsJson: string;
}

export async function getPolicyWeights(
  client: ConvexHttpClient,
  name: string,
): Promise<Record<string, unknown> | null> {
  return client.query(api.policyWeights.getPolicyWeights, { name });
}

export async function listPolicyWeights(
  client: ConvexHttpClient,
  limit = 100,
): Promise<Array<Record<string, unknown>>> {
  return client.query(api.policyWeights.listPolicyWeights, { limit });
}

export async function upsertPolicyWeights(
  client: ConvexHttpClient,
  input: PolicyWeightsInput,
): Promise<Record<string, unknown>> {
  return client.mutation(api.policyWeights.upsertPolicyWeights, input);
}

export interface ScoreAuditInput {
  chosenTaskId: string;
  candidatesJson: string;
  breakdownJson: string;
  justification: string;
  weightsVersion: number;
  llmTieBreak: boolean;
}

export async function createScoreAudit(
  client: ConvexHttpClient,
  input: ScoreAuditInput,
): Promise<Record<string, unknown>> {
  return client.mutation(api.scoreAudit.createScoreAudit, input);
}

export async function listScoreAuditByTask(
  client: ConvexHttpClient,
  chosenTaskId: string,
  limit = 50,
): Promise<Array<Record<string, unknown>>> {
  return client.query(api.scoreAudit.listScoreAuditByTask, { chosenTaskId, limit });
}

export async function listRecentScoreAudit(
  client: ConvexHttpClient,
  limit = 50,
): Promise<Array<Record<string, unknown>>> {
  return client.query(api.scoreAudit.listRecentScoreAudit, { limit });
}

export async function listScoreAuditWithOutcomes(
  client: ConvexHttpClient,
  since: number,
  limit = 1000,
): Promise<Array<Record<string, unknown>>> {
  return client.query(api.scoreAudit.listScoreAuditWithOutcomes, { since, limit });
}
