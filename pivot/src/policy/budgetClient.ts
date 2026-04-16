import type { ConvexHttpClient } from 'convex/browser';
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

export async function upsertBudget(
  client: ConvexHttpClient,
  input: BudgetInput,
): Promise<Record<string, unknown>> {
  return client.mutation(api.budgets.upsertBudget, input);
}

export async function getBudget(
  client: ConvexHttpClient,
  scope: string,
): Promise<Record<string, unknown> | null> {
  return client.query(api.budgets.getBudget, { scope }) as Promise<Record<string, unknown> | null>;
}

export async function listBudgets(
  client: ConvexHttpClient,
): Promise<BudgetInput[]> {
  return client.query(api.budgets.listBudgets, {}) as Promise<BudgetInput[]>;
}

export async function recordSpend(
  client: ConvexHttpClient,
  scope: string,
  amount: number,
): Promise<Record<string, unknown> | null> {
  return client.mutation(api.budgets.recordSpend, { scope, amount });
}

export async function deleteBudget(
  client: ConvexHttpClient,
  scope: string,
): Promise<null> {
  return client.mutation(api.budgets.deleteBudget, { scope });
}

export async function logGovernanceEvent(
  client: ConvexHttpClient,
  input: GovernanceEventInput,
): Promise<Record<string, unknown>> {
  return client.mutation(api.budgets.logGovernanceEvent, input);
}

export async function getGovernanceEvents(
  client: ConvexHttpClient,
  scope?: string,
  eventType?: GovernanceEventInput['eventType'],
  limit = 100,
): Promise<Record<string, unknown>[]> {
  return client.query(api.budgets.getGovernanceEvents, { scope, eventType, limit }) as Promise<Record<string, unknown>[]>;
}

export async function getRecentGovernanceEvents(
  client: ConvexHttpClient,
  since: number,
  scope?: string,
): Promise<Record<string, unknown>[]> {
  return client.query(api.budgets.getRecentGovernanceEvents, { since, scope }) as Promise<Record<string, unknown>[]>;
}