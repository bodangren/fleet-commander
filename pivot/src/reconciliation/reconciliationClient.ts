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

export async function createProposal(
  client: ConvexHttpClient,
  input: ReconciliationProposalInput,
): Promise<Record<string, unknown>> {
  return client.mutation(api.reconciliationProposals.createProposal, input);
}

export async function getProposal(
  client: ConvexHttpClient,
  id: string,
): Promise<Record<string, unknown> | null> {
  return client.query(api.reconciliationProposals.getProposal, { id });
}

export async function listPendingProposals(
  client: ConvexHttpClient,
  projectSlug: string,
  limit = 50,
): Promise<Array<Record<string, unknown>>> {
  return client.query(api.reconciliationProposals.listPendingProposals, { projectSlug, limit });
}

export async function listProposalsByArtifact(
  client: ConvexHttpClient,
  artifactType: 'track' | 'task' | 'issue',
  artifactId: string,
): Promise<Array<Record<string, unknown>>> {
  return client.query(api.reconciliationProposals.listProposalsByArtifact, { artifactType, artifactId });
}

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

export async function recordDecision(
  client: ConvexHttpClient,
  input: ReconciliationDecisionInput,
): Promise<Record<string, unknown>> {
  return client.mutation(api.reconciliationDecisions.recordDecision, input);
}

export async function getDecisionByProposal(
  client: ConvexHttpClient,
  proposalId: string,
): Promise<Record<string, unknown> | null> {
  return client.query(api.reconciliationDecisions.getDecisionByProposal, { proposalId });
}

export async function getDecisionByHashes(
  client: ConvexHttpClient,
  conductorHash: string,
  canonicalHash: string,
): Promise<Record<string, unknown> | null> {
  return client.query(api.reconciliationDecisions.getDecisionByHashes, { conductorHash, canonicalHash });
}

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

export async function batchApplyProposals(
  client: ConvexHttpClient,
  proposals: ReconciliationProposalPayload[],
): Promise<{ created: number; applied: number; rejected: number }> {
  return client.mutation(api.reconciliationEngine.batchApplyProposals, { proposals });
}
