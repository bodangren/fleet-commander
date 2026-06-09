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
 * Resolves the active sprint for the project. When a sprint has an active
 * budget, the sprint scope is checked first. If it fails, dispatch is blocked.
 * If no sprint is active, falls back to the project scope.
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
    const sprint = await client.query(
      api.fleetCatalog.getActiveSprintForProject,
      { projectSlug },
    );

    if (sprint && sprint.status === 'active') {
      const sprintBudget = await client.query(api.budgets.checkDispatchBudget, {
        scope: `sprint:${sprint._id}`,
      });
      if (sprintBudget && !sprintBudget.allowed) {
        console.warn(`Sprint budget blocked dispatch for ${taskKey}: ${sprintBudget.reason}`);
        await logAndCaptureError(
          client,
          'warning',
          'Sprint budget enforcement blocked dispatch',
          { projectSlug, taskKey, sprintId: sprint._id, operation: 'sprintBudgetCheck' },
          new Error(sprintBudget.reason),
        );
        return {
          allowed: false,
          reason: sprintBudget.reason,
          policy: sprintBudget.policy as 'strict' | 'advisory' | undefined,
        };
      }
    }

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
