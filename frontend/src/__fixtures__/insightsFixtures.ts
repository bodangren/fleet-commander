import type { SprintHistoryItem } from './historyFixtures'

export interface InsightSprint extends SprintHistoryItem {
  costPerPoint: number
  budgetAccuracy: number
}

export interface InsightMetrics {
  avgCostPerPoint: number
  pointsPerDollar: number
  sprintVelocity: number
  budgetAccuracy: number
}

export interface CostPointItem {
  sprintName: string
  costPerPoint: number
  pointsDelivered: number
  targetCostPerPoint: number
}

export interface AgentEfficiencyRow {
  agentName: string
  model: string
  totalPoints: number
  totalCost: number
  costPerPoint: number
  reliability: number
  valueScore: 'High Value' | 'Standard' | 'Premium'
}

export interface PipelineCostBreakdown {
  stage: string
  cost: number
  percentage: number
}

const BASE_TIME = Date.now()

export const mockInsightSprints: InsightSprint[] = [
  {
    _id: 'sprint-14',
    name: 'Sprint 14',
    status: 'active',
    startDate: BASE_TIME - 1000 * 60 * 60 * 24 * 7,
    endDate: BASE_TIME + 1000 * 60 * 60 * 24 * 7,
    budget: 50,
    actualCost: 32.4,
    pointsDelivered: 18,
    pointsEstimated: 20,
    taskCount: 18,
    completedCount: 12,
    velocity: 18,
    costPerPoint: 1.8,
    budgetAccuracy: 35,
  },
  {
    _id: 'sprint-13',
    name: 'Sprint 13',
    status: 'closed',
    startDate: BASE_TIME - 1000 * 60 * 60 * 24 * 21,
    endDate: BASE_TIME - 1000 * 60 * 60 * 24 * 7,
    budget: 40,
    actualCost: 38.25,
    pointsDelivered: 15,
    pointsEstimated: 16,
    taskCount: 15,
    completedCount: 15,
    velocity: 15,
    costPerPoint: 2.55,
    budgetAccuracy: 4,
  },
  {
    _id: 'sprint-12',
    name: 'Sprint 12',
    status: 'closed',
    startDate: BASE_TIME - 1000 * 60 * 60 * 24 * 35,
    endDate: BASE_TIME - 1000 * 60 * 60 * 24 * 21,
    budget: 35,
    actualCost: 37.1,
    pointsDelivered: 14,
    pointsEstimated: 15,
    taskCount: 14,
    completedCount: 14,
    velocity: 14,
    costPerPoint: 2.65,
    budgetAccuracy: -6,
  },
  {
    _id: 'sprint-11',
    name: 'Sprint 11',
    status: 'closed',
    startDate: BASE_TIME - 1000 * 60 * 60 * 24 * 49,
    endDate: BASE_TIME - 1000 * 60 * 60 * 24 * 35,
    budget: 60,
    actualCost: 48.0,
    pointsDelivered: 20,
    pointsEstimated: 22,
    taskCount: 20,
    completedCount: 16,
    velocity: 20,
    costPerPoint: 2.4,
    budgetAccuracy: 20,
  },
]

export const mockInsightMetrics: InsightMetrics = {
  avgCostPerPoint: 2.53,
  pointsPerDollar: 0.39,
  sprintVelocity: 18,
  budgetAccuracy: 94,
}

export const mockSingleInsightSprint: InsightSprint[] = [
  {
    _id: 'sprint-1',
    name: 'Sprint 1',
    status: 'closed',
    startDate: BASE_TIME - 1000 * 60 * 60 * 24 * 14,
    endDate: BASE_TIME - 1000 * 60 * 60 * 24 * 1,
    budget: 100,
    actualCost: 90,
    pointsDelivered: 10,
    pointsEstimated: 12,
    taskCount: 10,
    completedCount: 8,
    velocity: 10,
    costPerPoint: 9.0,
    budgetAccuracy: 10,
  },
]

export const mockLargeInsightSprints: InsightSprint[] = Array.from({ length: 55 }, (_, i) => ({
  _id: `sprint-${i + 1}`,
  name: `Sprint ${i + 1}`,
  status: i === 54 ? 'active' : 'closed',
  startDate: BASE_TIME - 1000 * 60 * 60 * 24 * 14 * (i + 1),
  endDate: BASE_TIME - 1000 * 60 * 60 * 24 * 14 * i,
  budget: 50 + i * 2,
  actualCost: 45 + i * 1.8,
  pointsDelivered: 10 + (i % 15),
  pointsEstimated: 12 + (i % 15),
  taskCount: 10 + (i % 10),
  completedCount: 8 + (i % 10),
  velocity: 10 + (i % 15),
  costPerPoint: 4.5 + (i % 5) * 0.3,
  budgetAccuracy: 5 + (i % 20) - 10,
}))
