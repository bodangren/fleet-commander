import { ConvexHttpClient } from 'convex/browser';
import { api } from '../../../../convex/_generated/api';
import { logAndCaptureError } from '../logger';

/**
 * Result of a budget reservation.
 */
export interface BudgetReservationResult {
  reserved: boolean;
  reservationId: string;
  reason?: string;
}

export const ESTIMATED_COST_PER_DISPATCH = 0.10;

/**
 * Reserves budget atomically at dispatch time.
 *
 * Calls `reserveBudget` which atomically increments `spent` if the
 * reservation succeeds. This prevents concurrent dispatches from
 * exceeding the budget cap (reservation semantics).
 *
 * When Convex is unreachable, returns `reserved: true` so the
 * orchestrator can continue (budget enforcement must not block runs
 * when Convex is down). The reservation is best-effort.
 */
export async function reserveBudgetAtDispatch(
  client: ConvexHttpClient,
  projectSlug: string,
  taskKey: string,
  estimatedCost: number = ESTIMATED_COST_PER_DISPATCH,
): Promise<BudgetReservationResult> {
  const correlationId = `dispatch:${projectSlug}:${taskKey}:${Date.now()}`;

  try {
    const sprint = await client.query(
      api.fleetCatalog.getActiveSprintForProject,
      { projectSlug },
    );

    if (sprint && sprint.status === 'active') {
      const result = await client.mutation(api.budgets.reserveBudget, {
        scope: `sprint:${sprint._id}`,
        amount: estimatedCost,
        correlationId,
      });
      if (result && !result.reserved) {
        return { reserved: false, reservationId: correlationId, reason: result.reason };
      }
    }

    const projectResult = await client.mutation(api.budgets.reserveBudget, {
      scope: `project:${projectSlug}`,
      amount: estimatedCost,
      correlationId,
    });

    if (projectResult && !projectResult.reserved) {
      return { reserved: false, reservationId: correlationId, reason: projectResult.reason };
    }

    return { reserved: true, reservationId: correlationId };
  } catch (err) {
    await logAndCaptureError(
      client,
      'debug',
      'Budget reservation failed (non-blocking)',
      { projectSlug, taskKey, operation: 'reserveBudget' },
      err,
    );
    return { reserved: true, reservationId: correlationId };
  }
}

/**
 * Reconciles a budget reservation after execution completes.
 *
 * Adjusts the `spent` amount based on actual cost, replacing the
 * reserved estimate with the real cost. This is a best-effort
 * operation — failures are logged but not thrown.
 */
export async function reconcileBudgetOnComplete(
  client: ConvexHttpClient,
  projectSlug: string,
  correlationId: string,
  actualCost: number,
): Promise<void> {
  try {
    const sprint = await client.query(
      api.fleetCatalog.getActiveSprintForProject,
      { projectSlug },
    );

    if (sprint && sprint.status === 'active') {
      await client.mutation(api.budgets.reconcileBudgetReservation, {
        scope: `sprint:${sprint._id}`,
        correlationId,
        actualCost,
      });
    }

    await client.mutation(api.budgets.reconcileBudgetReservation, {
      scope: `project:${projectSlug}`,
      correlationId,
      actualCost,
    });
  } catch (err) {
    await logAndCaptureError(
      client,
      'debug',
      'Budget reconciliation failed (non-blocking)',
      { projectSlug, correlationId, operation: 'reconcileBudget' },
      err,
    );
  }
}