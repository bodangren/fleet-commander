// Pure calculation helpers for Insights views (Phase 5: Data Queries)
// Stubs — implementation follows in Green phase.

export interface SprintMetric {
  _id: string;
  name: string;
  status: string;
  budget: number;
  actualCost: number;
  pointsDelivered: number;
  pointsEstimated: number;
  taskCount: number;
  completedCount: number;
  velocity: number;
  costPerPoint: number;
  budgetAccuracy: number;
}

export interface CostTrendItem {
  sprintName: string;
  costPerPoint: number;
  pointsDelivered: number;
  targetCostPerPoint: number;
}

export interface AgentEfficiencyRow {
  agentName: string;
  model: string;
  totalPoints: number;
  totalCost: number;
  costPerPoint: number;
  reliability: number;
  valueScore: 'High Value' | 'Standard' | 'Premium';
}

export interface ROISummary {
  avgCostPerPoint: number;
  pointsPerDollar: number;
  estimatedProjectCost: number;
}

export interface OptimizationOpportunity {
  title: string;
  description: string;
  potentialSavings: number;
  priority: 'high' | 'medium' | 'low';
}

export function computeSprintMetrics(sprints: any[]): SprintMetric[] {
  throw new Error('Not implemented');
}

export function computeCostTrend(sprints: any[], _costRecords: any[]): CostTrendItem[] {
  throw new Error('Not implemented');
}

export function computeAgentEfficiency(
  agents: any[],
  tasks: any[],
  costRecords: any[],
): AgentEfficiencyRow[] {
  throw new Error('Not implemented');
}

export function computeROISummary(costRecords: any[], sprints: any[]): ROISummary {
  throw new Error('Not implemented');
}

export function computeOptimizations(
  agentEfficiency: AgentEfficiencyRow[],
): OptimizationOpportunity[] {
  throw new Error('Not implemented');
}

export function classifyValueScore(
  costPerPoint: number,
): 'High Value' | 'Standard' | 'Premium' {
  throw new Error('Not implemented');
}
