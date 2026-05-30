import type { ConvexHttpClient } from 'convex/browser';
import { api } from '../../../convex/_generated/api';

export interface PolicyWeightsInput {
  name: string;
  weightsJson: string;
}

/**
 * Fetches policy weights by name from Convex.
 * @param client - Convex HTTP client
 * @param name - Policy weights name
 * @returns Policy weights record or null
 */
export async function getPolicyWeights(
  client: ConvexHttpClient,
  name: string,
): Promise<Record<string, unknown> | null> {
  return client.query(api.policyWeights.getPolicyWeights, { name });
}

/**
 * Lists policy weights from Convex with optional limit.
 * @param client - Convex HTTP client
 * @param limit - Maximum number of records to return
 * @returns Array of policy weights records
 */
export async function listPolicyWeights(
  client: ConvexHttpClient,
  limit = 100,
): Promise<Array<Record<string, unknown>>> {
  return client.query(api.policyWeights.listPolicyWeights, { limit });
}

/**
 * Creates or updates policy weights in Convex.
 * @param client - Convex HTTP client
 * @param input - Policy weights input with name and JSON weights
 * @returns Created/updated policy weights record
 */
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

/**
 * Creates a score audit record in Convex.
 * @param client - Convex HTTP client
 * @param input - Score audit input data
 * @returns Created score audit record
 */
export async function createScoreAudit(
  client: ConvexHttpClient,
  input: ScoreAuditInput,
): Promise<Record<string, unknown>> {
  return client.mutation(api.scoreAudit.createScoreAudit, input);
}

/**
 * Lists score audits for a specific task from Convex.
 * @param client - Convex HTTP client
 * @param chosenTaskId - Task identifier
 * @param limit - Maximum number of records to return
 * @returns Array of score audit records
 */
export async function listScoreAuditByTask(
  client: ConvexHttpClient,
  chosenTaskId: string,
  limit = 50,
): Promise<Array<Record<string, unknown>>> {
  return client.query(api.scoreAudit.listScoreAuditByTask, { chosenTaskId, limit });
}

/**
 * Lists recent score audits from Convex
 * @param client - ConvexHttpClient instance
 * @param limit - Maximum number of results to return (default: 50)
 * @returns Array of score audit records
 */
export async function listRecentScoreAudit(
  client: ConvexHttpClient,
  limit = 50,
): Promise<Array<Record<string, unknown>>> {
  return client.query(api.scoreAudit.listRecentScoreAudit, { limit });
}

/**
 * Lists score audits with outcomes since a timestamp from Convex
 * @param client - ConvexHttpClient instance
 * @param since - Timestamp to filter records newer than this value
 * @param limit - Maximum number of results to return (default: 1000)
 * @returns Array of score audit records with outcomes
 */
export async function listScoreAuditWithOutcomes(
  client: ConvexHttpClient,
  since: number,
  limit = 1000,
): Promise<Array<Record<string, unknown>>> {
  return client.query(api.scoreAudit.listScoreAuditWithOutcomes, { since, limit });
}
