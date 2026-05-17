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

export interface ROISummary {
  avgCostPerPoint: number
  pointsPerDollar: number
  estimatedProjectCost: number
}

export interface OptimizationOpportunity {
  title: string
  description: string
  potentialSavings: number
  priority: 'high' | 'medium' | 'low'
}

export interface CostData {
  costTrend: CostPointItem[]
  agentEfficiency: AgentEfficiencyRow[]
  roiSummary: ROISummary
  optimizations: OptimizationOpportunity[]
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

export const mockCostTrend: CostPointItem[] = [
  {
    sprintName: 'Sprint 14',
    costPerPoint: 1.8,
    pointsDelivered: 18,
    targetCostPerPoint: 2.0,
  },
  {
    sprintName: 'Sprint 13',
    costPerPoint: 2.55,
    pointsDelivered: 15,
    targetCostPerPoint: 2.0,
  },
  {
    sprintName: 'Sprint 12',
    costPerPoint: 2.65,
    pointsDelivered: 14,
    targetCostPerPoint: 2.0,
  },
  {
    sprintName: 'Sprint 11',
    costPerPoint: 2.4,
    pointsDelivered: 20,
    targetCostPerPoint: 2.0,
  },
]

export const mockAgentEfficiency: AgentEfficiencyRow[] = [
  {
    agentName: 'Alice',
    model: 'claude-opus',
    totalPoints: 120,
    totalCost: 1250.5,
    costPerPoint: 2.5,
    reliability: 0.95,
    valueScore: 'Standard',
  },
  {
    agentName: 'Bob',
    model: 'claude-sonnet',
    totalPoints: 95,
    totalCost: 890.25,
    costPerPoint: 1.8,
    reliability: 0.92,
    valueScore: 'High Value',
  },
  {
    agentName: 'Charlie',
    model: 'gpt-4',
    totalPoints: 65,
    totalCost: 650.0,
    costPerPoint: 3.2,
    reliability: 0.88,
    valueScore: 'Premium',
  },
]

export const mockROISummary: ROISummary = {
  avgCostPerPoint: 2.35,
  pointsPerDollar: 0.43,
  estimatedProjectCost: 12500.0,
}

export const mockOptimizations: OptimizationOpportunity[] = [
  {
    title: 'Switch to cheaper model',
    description: 'Use claude-sonnet for routine tasks',
    potentialSavings: 350.0,
    priority: 'high',
  },
  {
    title: 'Reduce retry rate',
    description: 'Improve test coverage to catch failures earlier',
    potentialSavings: 180.0,
    priority: 'medium',
  },
  {
    title: 'Batch API calls',
    description: 'Combine small tasks into single prompts',
    potentialSavings: 120.0,
    priority: 'low',
  },
]

export const mockCostData: CostData = {
  costTrend: mockCostTrend,
  agentEfficiency: mockAgentEfficiency,
  roiSummary: mockROISummary,
  optimizations: mockOptimizations,
}

export const mockSingleCostData: CostData = {
  costTrend: [mockCostTrend[0]],
  agentEfficiency: [mockAgentEfficiency[0]],
  roiSummary: mockROISummary,
  optimizations: [mockOptimizations[0]],
}

export const mockLargeCostData: CostData = {
  costTrend: Array.from({ length: 55 }, (_, i) => ({
    sprintName: `Sprint ${i + 1}`,
    costPerPoint: 1.5 + (i % 10) * 0.2,
    pointsDelivered: 10 + (i % 15),
    targetCostPerPoint: 2.0,
  })),
  agentEfficiency: Array.from({ length: 55 }, (_, i) => ({
    agentName: `Agent ${i + 1}`,
    model: i % 3 === 0 ? 'claude-opus' : i % 3 === 1 ? 'claude-sonnet' : 'gpt-4',
    totalPoints: 50 + (i % 50),
    totalCost: 500 + i * 15,
    costPerPoint: 1.5 + (i % 10) * 0.2,
    reliability: 0.7 + (i % 30) * 0.01,
    valueScore: i % 3 === 0 ? 'High Value' : i % 3 === 1 ? 'Standard' : 'Premium',
  })),
  roiSummary: {
    avgCostPerPoint: 2.35,
    pointsPerDollar: 0.43,
    estimatedProjectCost: 12500.0,
  },
  optimizations: Array.from({ length: 10 }, (_, i) => ({
    title: `Opportunity ${i + 1}`,
    description: `Description for opportunity ${i + 1}`,
    potentialSavings: 50 + i * 25,
    priority: i % 3 === 0 ? 'high' : i % 3 === 1 ? 'medium' : 'low',
  })),
}

export const mockEmptyCostData: CostData = {
  costTrend: [],
  agentEfficiency: [],
  roiSummary: {
    avgCostPerPoint: 0,
    pointsPerDollar: 0,
    estimatedProjectCost: 0,
  },
  optimizations: [],
}

export const mockZeroPointCostData: CostData = {
  costTrend: [
    {
      sprintName: 'Sprint Zero',
      costPerPoint: 0,
      pointsDelivered: 0,
      targetCostPerPoint: 2.0,
    },
  ],
  agentEfficiency: [
    {
      agentName: 'Alice',
      model: 'claude-opus',
      totalPoints: 0,
      totalCost: 0,
      costPerPoint: 0,
      reliability: 0.95,
      valueScore: 'Standard',
    },
  ],
  roiSummary: {
    avgCostPerPoint: 0,
    pointsPerDollar: 0,
    estimatedProjectCost: 0,
  },
  optimizations: [],
}
