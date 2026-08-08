import type { ConvexHttpClient } from 'convex/browser';
import type { FunctionReturnType } from 'convex/server';
import { api } from '../../../convex/_generated/api';

export interface BudgetInput {
  scope: string;
  periodStart: number;
  periodEnd: number;
  cap: number;
  spent?: number;
  policy: 'strict' | 'soft' | 'advisory';
}

export interface GovernanceEventInput {
  scope: string;
  eventType: 'budget_breach' | 'budget_warning' | 'retry_escalation' | 'harness_selection' | 'review_depth';
  payload: Record<string, string | number | boolean>;
}

type BudgetRecord = FunctionReturnType<typeof api.budgets.upsertBudget>;

/**
 * Upserts a budget record via Convex.
 * @param client - Convex HTTP client
 * @param input - Budget input data
 * @returns Created/updated budget record
 */
export async function upsertBudget(
  client: ConvexHttpClient,
  input: BudgetInput,
): Promise<BudgetRecord> {
  return client.mutation(api.budgets.upsertBudget, input);
}

/**
 * Get budget by scope.
 * @param client - Convex HTTP client
 * @param scope - Budget scope identifier
 * @returns Budget record or null
 */
export async function getBudget(
  client: ConvexHttpClient,
  scope: string,
): Promise<FunctionReturnType<typeof api.budgets.getBudget>> {
  return client.query(api.budgets.getBudget, { scope });
}

/**
 * Lists all budget records.
 * @param client - Convex HTTP client
 * @returns Array of budget records
 */
export async function listBudgets(
  client: ConvexHttpClient,
): Promise<FunctionReturnType<typeof api.budgets.listBudgets>> {
  return client.query(api.budgets.listBudgets, {});
}

/**
 * Records spend amount against a budget scope.
 * @param client - Convex HTTP client
 * @param scope - Budget scope identifier
 * @param amount - Amount to record as spent
 * @returns Updated budget record
 */
export async function recordSpend(
  client: ConvexHttpClient,
  scope: string,
  amount: number,
): Promise<FunctionReturnType<typeof api.budgets.recordSpend>> {
  return client.mutation(api.budgets.recordSpend, { scope, amount });
}

/**
 * Delete budget by scope.
 * @param client - Convex HTTP client
 * @param scope - Budget scope identifier
 */
export async function deleteBudget(
  client: ConvexHttpClient,
  scope: string,
): Promise<FunctionReturnType<typeof api.budgets.deleteBudget>> {
  return client.mutation(api.budgets.deleteBudget, { scope });
}

/**
 * Logs governance event via Convex.
 * @param client - Convex HTTP client
 * @param input - Governance event input data
 * @returns Created governance event record
 */
export async function logGovernanceEvent(
  client: ConvexHttpClient,
  input: GovernanceEventInput,
): Promise<FunctionReturnType<typeof api.budgets.logGovernanceEvent>> {
  return client.mutation(api.budgets.logGovernanceEvent, input);
}

/**
 * Get governance events with optional filtering.
 * @param client - Convex HTTP client
 * @param scope - Optional scope filter
 * @param eventType - Optional event type filter
 * @param limit - Maximum number of events to return
 * @returns Array of governance event records
 */
export async function getGovernanceEvents(
  client: ConvexHttpClient,
  scope?: string,
  eventType?: GovernanceEventInput['eventType'],
  limit = 100,
): Promise<FunctionReturnType<typeof api.budgets.getGovernanceEvents>> {
  return client.query(api.budgets.getGovernanceEvents, { scope, eventType, limit });
}

/**
 * Get recent governance events since timestamp.
 * @param client - Convex HTTP client
 * @param since - Timestamp to get events after
 * @param scope - Optional scope filter
 * @returns Array of governance event records
 */
export async function getRecentGovernanceEvents(
  client: ConvexHttpClient,
  since: number,
  scope?: string,
): Promise<FunctionReturnType<typeof api.budgets.getRecentGovernanceEvents>> {
  return client.query(api.budgets.getRecentGovernanceEvents, { since, scope });
}
