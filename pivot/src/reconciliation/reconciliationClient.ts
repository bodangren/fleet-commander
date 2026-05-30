import type { ConvexHttpClient } from 'convex/browser';
import { api } from '../../../convex/_generated/api';

export interface ReconciliationProposalInput {
  projectSlug: string;
  artifactType: 'track' | 'task' | 'issue';
  artifactId: string;
  patchJson: string;
  sourceSide: 'convex' | 'markdown';
  reason: string;
  eventId?: string;
}

/**
 * Create a new reconciliation proposal.
 * @param client - Convex HTTP client
 * @param input - Proposal input data
 * @returns {Promise<Record<string, unknown>>} Created proposal
 */
export async function createProposal(
  client: ConvexHttpClient,
  input: ReconciliationProposalInput,
): Promise<Record<string, unknown>> {
  return client.mutation(api.reconciliationProposals.createProposal, input);
}

/**
 * Get a proposal by ID.
 * @param client - Convex HTTP client
 * @param id - Proposal ID
 * @returns {Promise<Record<string, unknown> | null>} Proposal or null
 */
export async function getProposal(
  client: ConvexHttpClient,
  id: string,
): Promise<Record<string, unknown> | null> {
  return client.query(api.reconciliationProposals.getProposal, { id });
}

/**
 * List pending proposals for a project.
 * @param client - Convex HTTP client
 * @param projectSlug - Project identifier
 * @param limit - Maximum number of results (default 50)
 * @returns {Promise<Array<Record<string, unknown>>>} Array of pending proposals
 */
export async function listPendingProposals(
  client: ConvexHttpClient,
  projectSlug: string,
  limit = 50,
): Promise<Array<Record<string, unknown>>> {
  return client.query(api.reconciliationProposals.listPendingProposals, { projectSlug, limit });
}

/**
 * List proposals for a specific artifact.
 * @param client - Convex HTTP client
 * @param artifactType - Type of artifact (track, task, issue)
 * @param artifactId - Artifact identifier
 * @returns {Promise<Array<Record<string, unknown>>>} Array of proposals
 */
export async function listProposalsByArtifact(
  client: ConvexHttpClient,
  artifactType: 'track' | 'task' | 'issue',
  artifactId: string,
): Promise<Array<Record<string, unknown>>> {
  return client.query(api.reconciliationProposals.listProposalsByArtifact, { artifactType, artifactId });
}

/**
 * Resolve a proposal by updating its status.
 * @param client - Convex HTTP client
 * @param id - Proposal ID
 * @param status - New status ('applied' or 'rejected')
 * @returns {Promise<Record<string, unknown> | null>} Updated proposal
 */
export async function resolveProposal(
  client: ConvexHttpClient,
  id: string,
  status: 'applied' | 'rejected',
): Promise<Record<string, unknown> | null> {
  return client.mutation(api.reconciliationProposals.resolveProposal, { id, status });
}

export interface ReconciliationDecisionInput {
  proposalId: string;
  decision: 'apply' | 'reject';
  reason?: string;
  conductorHash: string;
  canonicalHash: string;
}

/**
 * Record a decision for a proposal.
 * @param client - Convex HTTP client
 * @param input - Decision input data
 * @returns {Promise<Record<string, unknown>>} Created decision record
 */
export async function recordDecision(
  client: ConvexHttpClient,
  input: ReconciliationDecisionInput,
): Promise<Record<string, unknown>> {
  return client.mutation(api.reconciliationDecisions.recordDecision, input);
}

/**
 * Get decision by proposal ID.
 * @param client - Convex HTTP client
 * @param proposalId - Proposal identifier
 * @returns {Promise<Record<string, unknown> | null>} Decision or null
 */
export async function getDecisionByProposal(
  client: ConvexHttpClient,
  proposalId: string,
): Promise<Record<string, unknown> | null> {
  return client.query(api.reconciliationDecisions.getDecisionByProposal, { proposalId });
}

/**
 * Get decision by conductor and canonical hashes.
 * @param client - Convex HTTP client
 * @param conductorHash - Conductor state hash
 * @param canonicalHash - Canonical state hash
 * @returns {Promise<Record<string, unknown> | null>} Decision or null
 */
export async function getDecisionByHashes(
  client: ConvexHttpClient,
  conductorHash: string,
  canonicalHash: string,
): Promise<Record<string, unknown> | null> {
  return client.query(api.reconciliationDecisions.getDecisionByHashes, { conductorHash, canonicalHash });
}

/**
 * List decisions with a limit.
 * @param client - Convex HTTP client
 * @param limit - Maximum number of results (default 50)
 * @returns {Promise<Array<Record<string, unknown>>>} Array of decisions
 */
export async function listDecisions(
  client: ConvexHttpClient,
  limit = 50,
): Promise<Array<Record<string, unknown>>> {
  return client.query(api.reconciliationDecisions.listDecisions, { limit });
}

export interface ReconciliationProposalPayload {
  projectSlug: string;
  artifactType: 'track' | 'task' | 'issue';
  artifactId: string;
  patchJson: string;
  sourceSide: 'convex' | 'markdown';
  reason: string;
  autoApply: boolean;
  conductorHash: string;
  canonicalHash: string;
  eventId?: string;
}

/**
 * Batch apply multiple proposals at once.
 * @param client - Convex HTTP client
 * @param proposals - Array of proposals to apply
 * @returns {{ created: number; applied: number; rejected: number }} Batch result counts
 */
export async function batchApplyProposals(
  client: ConvexHttpClient,
  proposals: ReconciliationProposalPayload[],
): Promise<{ created: number; applied: number; rejected: number }> {
  return client.mutation(api.reconciliationEngine.batchApplyProposals, { proposals });
}
