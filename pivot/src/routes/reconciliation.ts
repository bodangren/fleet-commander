import { Router, json, notFound } from './router.js';
import { api } from '../../../convex/_generated/api.js';

export interface ReconciliationProposalRouteEntry {
  _id: string;
  projectSlug: string;
  artifactType: string;
  artifactId: string;
  patchJson: string;
  sourceSide: string;
  reason: string;
  status: string;
  createdAt: number;
  [key: string]: unknown;
}

/**
 * Registers reconciliation proposal routes for list, apply, and reject operations.
 * @param router - Bun Router instance
 * @param client - Client with query and mutation methods (ConvexHttpClient or mock)
 */
export function registerReconciliationRoutes(
  router: Router,
  client: { query: (...args: any[]) => Promise<any>; mutation: (...args: any[]) => Promise<any> },
): void {
  router.get('/api/reconciliation/proposals', async (request) => {
    const url = new URL(request.url);
    const projectSlug = url.searchParams.get('projectSlug') || '';
    const limit = parseInt(url.searchParams.get('limit') || '50', 10);

    try {
      const proposals = await client.query(
        api.reconciliationProposals.listPendingProposals,
        { projectSlug, limit },
      );
      return json(proposals);
    } catch {
      return json({ error: 'internal_server' }, 500);
    }
  });

  router.post('/api/reconciliation/proposals/:id/apply', async (request, params) => {
    try {
      const result = await client.mutation(
        api.reconciliationProposals.resolveProposal,
        { id: params.id, status: 'applied' },
      );
      if (!result) return notFound();
      return json(result);
    } catch {
      return json({ error: 'internal_server' }, 500);
    }
  });

  router.post('/api/reconciliation/proposals/:id/reject', async (request, params) => {
    try {
      const result = await client.mutation(
        api.reconciliationProposals.resolveProposal,
        { id: params.id, status: 'rejected' },
      );
      if (!result) return notFound();
      return json(result);
    } catch {
      return json({ error: 'internal_server' }, 500);
    }
  });
}
