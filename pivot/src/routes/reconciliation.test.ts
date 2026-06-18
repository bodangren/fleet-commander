// Intentionally failing until Phase 2 of operations_api_contract_closure_20260618.
// These tests pin the server-side contract for the Operations/Reconcile page:
// GET /api/reconciliation/proposals and the apply/reject subroutes.
// The import below fails at HEAD because pivot/src/routes/reconciliation.ts
// does not exist yet. Do NOT skip; the red state is the proof.
import { describe, expect, it, mock, beforeEach } from 'bun:test';
import { Router } from './router';
import {
  registerReconciliationRoutes,
  type ReconciliationProposalRouteEntry,
} from './reconciliation';

const mockClient = {
  mutation: mock(async () => {}),
  query: mock(async () => {}),
};

/**
 * Creates a new Request object for testing reconciliation route handlers.
 * Mirrors the helper from retrospectives.test.ts so the route-handler style
 * matches the rest of the pivot route tests.
 * @param method - HTTP method (GET, POST, etc.)
 * @param path - URL path
 * @param body - Optional request body
 * @returns Request object
 */
function makeRequest(method: string, path: string, body?: Record<string, unknown>): Request {
  return new Request(`http://localhost${path}`, {
    method,
    headers: body ? { 'content-type': 'application/json' } : {},
    body: body ? JSON.stringify(body) : undefined,
  });
}

/**
 * Builds a sample proposal object shaped like `ReconciliationProposalEntry`
 * (frontend/src/lib/convex-data/reconciliation.ts:43) plus the convex-side
 * `resolvedAt` and `eventId` fields. The pivot route contract is verified
 * against this shape — fields not in the frontend type are tolerated by
 * the structural assertion.
 * @param overrides - Per-field overrides for the proposal
 * @returns Sample reconciliation proposal
 */
function makeProposal(overrides: Record<string, unknown> = {}): ReconciliationProposalRouteEntry {
  return {
    _id: 'prop-1',
    projectSlug: 'demo-project',
    artifactType: 'task',
    artifactId: 'task-1',
    patchJson: '{"action":"keep_canonical"}',
    sourceSide: 'convex',
    reason: 'Strategy prefer_canonical: Task modified',
    status: 'pending',
    createdAt: 1_700_000_000_000,
    ...overrides,
  };
}

describe('reconciliation routes', () => {
  let router: Router;

  beforeEach(() => {
    router = new Router();
    mockClient.mutation.mockReset();
    mockClient.query.mockReset();
  });

  describe('GET /api/reconciliation/proposals', () => {
    it('returns 200 with the pending-proposals array', async () => {
      const proposals = [makeProposal(), makeProposal({ _id: 'prop-2', status: 'pending' })];
      (mockClient.query as any).mockImplementation(async () => proposals);

      registerReconciliationRoutes(router, mockClient as any);
      const match = router.match('GET', '/api/reconciliation/proposals');
      expect(match).not.toBeNull();

      const response = await match!.handler(
        makeRequest('GET', '/api/reconciliation/proposals?projectSlug=demo-project&limit=10'),
        {},
      );
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(Array.isArray(data)).toBe(true);
      expect(data).toHaveLength(2);
      expect(data[0]._id).toBe('prop-1');
      expect(data[0].projectSlug).toBe('demo-project');
      expect(data[0].artifactType).toBe('task');
      expect(data[0].status).toBe('pending');
    });

    it('returns an empty array when no pending proposals exist', async () => {
      (mockClient.query as any).mockImplementation(async () => []);

      registerReconciliationRoutes(router, mockClient as any);
      const match = router.match('GET', '/api/reconciliation/proposals');
      const response = await match!.handler(
        makeRequest('GET', '/api/reconciliation/proposals'),
        {},
      );
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data).toEqual([]);
    });

    it('forwards projectSlug and limit query params to listPendingProposals', async () => {
      (mockClient.query as any).mockImplementation(async () => []);

      registerReconciliationRoutes(router, mockClient as any);
      const match = router.match('GET', '/api/reconciliation/proposals');
      await match!.handler(
        makeRequest('GET', '/api/reconciliation/proposals?projectSlug=demo&limit=5'),
        {},
      );

      expect(mockClient.query).toHaveBeenCalledTimes(1);
      const [fnArg, argsArg] = (mockClient.query as any).mock.calls[0] as [unknown, Record<string, unknown>];
      const fnName =
        typeof fnArg === 'object' && fnArg !== null
          ? (fnArg as any)[Symbol.for('functionName')] ?? (fnArg as any).toString()
          : fnArg;
      expect(fnName).toBe('reconciliationProposals:listPendingProposals');
      expect(argsArg).toEqual({ projectSlug: 'demo', limit: 5 });
    });

    it('returns 500 when the Convex query throws', async () => {
      (mockClient.query as any).mockImplementation(async () => {
        throw new Error('Convex unavailable');
      });

      registerReconciliationRoutes(router, mockClient as any);
      const match = router.match('GET', '/api/reconciliation/proposals');
      const response = await match!.handler(
        makeRequest('GET', '/api/reconciliation/proposals'),
        {},
      );
      expect(response.status).toBe(500);
    });
  });

  describe('POST /api/reconciliation/proposals/:id/apply', () => {
    it('returns the resolved proposal with status=applied', async () => {
      const resolved = makeProposal({ status: 'applied' });
      (mockClient.mutation as any).mockImplementation(async () => resolved);

      registerReconciliationRoutes(router, mockClient as any);
      const match = router.match('POST', '/api/reconciliation/proposals/prop-1/apply');
      expect(match).not.toBeNull();

      const response = await match!.handler(
        makeRequest('POST', '/api/reconciliation/proposals/prop-1/apply'),
        { id: 'prop-1' },
      );
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data._id).toBe('prop-1');
      expect(data.status).toBe('applied');
    });

    it('forwards { id, status: "applied" } to resolveProposal', async () => {
      (mockClient.mutation as any).mockImplementation(async () => makeProposal({ status: 'applied' }));

      registerReconciliationRoutes(router, mockClient as any);
      const match = router.match('POST', '/api/reconciliation/proposals/prop-7/apply');
      await match!.handler(
        makeRequest('POST', '/api/reconciliation/proposals/prop-7/apply'),
        { id: 'prop-7' },
      );

      expect(mockClient.mutation).toHaveBeenCalledTimes(1);
      const [fnArg, argsArg] = (mockClient.mutation as any).mock.calls[0] as [unknown, Record<string, unknown>];
      const fnName =
        typeof fnArg === 'object' && fnArg !== null
          ? (fnArg as any)[Symbol.for('functionName')] ?? (fnArg as any).toString()
          : fnArg;
      expect(fnName).toBe('reconciliationProposals:resolveProposal');
      expect(argsArg).toEqual({ id: 'prop-7', status: 'applied' });
    });

    it('returns 404 when Convex resolves null (id not found)', async () => {
      (mockClient.mutation as any).mockImplementation(async () => null);

      registerReconciliationRoutes(router, mockClient as any);
      const match = router.match('POST', '/api/reconciliation/proposals/missing/apply');
      const response = await match!.handler(
        makeRequest('POST', '/api/reconciliation/proposals/missing/apply'),
        { id: 'missing' },
      );
      expect(response.status).toBe(404);
    });

    it('returns 500 when the Convex mutation throws', async () => {
      (mockClient.mutation as any).mockImplementation(async () => {
        throw new Error('Convex unavailable');
      });

      registerReconciliationRoutes(router, mockClient as any);
      const match = router.match('POST', '/api/reconciliation/proposals/prop-1/apply');
      const response = await match!.handler(
        makeRequest('POST', '/api/reconciliation/proposals/prop-1/apply'),
        { id: 'prop-1' },
      );
      expect(response.status).toBe(500);
    });
  });

  describe('POST /api/reconciliation/proposals/:id/reject', () => {
    it('returns the resolved proposal with status=rejected', async () => {
      const resolved = makeProposal({ status: 'rejected' });
      (mockClient.mutation as any).mockImplementation(async () => resolved);

      registerReconciliationRoutes(router, mockClient as any);
      const match = router.match('POST', '/api/reconciliation/proposals/prop-1/reject');
      expect(match).not.toBeNull();

      const response = await match!.handler(
        makeRequest('POST', '/api/reconciliation/proposals/prop-1/reject'),
        { id: 'prop-1' },
      );
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data._id).toBe('prop-1');
      expect(data.status).toBe('rejected');
    });

    it('returns 404 when Convex resolves null', async () => {
      (mockClient.mutation as any).mockImplementation(async () => null);

      registerReconciliationRoutes(router, mockClient as any);
      const match = router.match('POST', '/api/reconciliation/proposals/missing/reject');
      const response = await match!.handler(
        makeRequest('POST', '/api/reconciliation/proposals/missing/reject'),
        { id: 'missing' },
      );
      expect(response.status).toBe(404);
    });
  });

  describe('response shape', () => {
    it('list response fields align with the ReconciliationProposalEntry contract', async () => {
      const proposals = [makeProposal()];
      (mockClient.query as any).mockImplementation(async () => proposals);

      registerReconciliationRoutes(router, mockClient as any);
      const match = router.match('GET', '/api/reconciliation/proposals');
      const response = await match!.handler(
        makeRequest('GET', '/api/reconciliation/proposals'),
        {},
      );
      const data = await response.json();
      const entry = data[0];
      const required = [
        '_id',
        'projectSlug',
        'artifactType',
        'artifactId',
        'patchJson',
        'sourceSide',
        'reason',
        'status',
        'createdAt',
      ];
      for (const field of required) {
        expect(entry).toHaveProperty(field);
      }
    });
  });
});
