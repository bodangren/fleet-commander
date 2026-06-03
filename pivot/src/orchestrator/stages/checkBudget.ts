import { ConvexHttpClient } from 'convex/browser';
import { api } from '../../../../convex/_generated/api';
import { logAndCaptureError } from '../logger';

/**
 * Result of a budget check.
 */
export type BudgetCheckResult =
  | { allowed: true }
  | { allowed: false; reason: string; policy?: 'strict' | 'advisory' | undefined };

/**
 * Checks if dispatch is allowed under the project's budget policy.
 *
 * Returns a discriminated result. When `policy === 'strict'` the caller should
 * abort the dispatch. When the check itself errors, returns allowed=true so the
 * orchestrator can continue (budget enforcement must not block runs when Convex
 * is down).
 */
export async function checkBudget(
  client: ConvexHttpClient,
  projectSlug: string,
  taskKey: string,
): Promise<BudgetCheckResult> {
  try {
    const budgetCheck = await client.query(api.budgets.checkDispatchBudget, {
      scope: `project:${projectSlug}`,
    });
    if (budgetCheck && !budgetCheck.allowed) {
      console.warn(`Budget blocked dispatch for ${taskKey}: ${budgetCheck.reason}`);
      await logAndCaptureError(
        client,
        'warning',
        'Budget enforcement blocked dispatch',
        { projectSlug, taskKey, operation: 'budgetCheck' },
        new Error(budgetCheck.reason),
      );
      return {
        allowed: false,
        reason: budgetCheck.reason,
        policy: budgetCheck.policy as 'strict' | 'advisory' | undefined,
      };
    }
    return { allowed: true };
  } catch (err) {
    await logAndCaptureError(
      client,
      'debug',
      'Budget check failed (non-blocking)',
      { projectSlug, taskKey, operation: 'budgetCheck' },
      err,
    );
    return { allowed: true };
  }
}
