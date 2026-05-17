export interface PerformanceAgent {
  _id: string
  name: string
  displayName: string
  model: string
  tasksCompleted: number
  totalCost: number
  costPerPoint: number
  reliability: number
  rejectionRate: number
  trend: 'improving' | 'stable' | 'declining'
}

export interface PipelineStageCost {
  stage: string
  cost: number
  percentage: number
}

export interface RejectionReason {
  reason: string
  count: number
  percentage: number
}

export interface PerformanceData {
  agents: PerformanceAgent[]
  pipelineCosts: PipelineStageCost[]
  rejectionReasons: RejectionReason[]
}

const BASE_TIME = Date.now()

export const mockPerformanceAgents: PerformanceAgent[] = [
  {
    _id: 'perf-agent-1',
    name: 'alice',
    displayName: 'Alice',
    model: 'claude-opus',
    tasksCompleted: 42,
    totalCost: 1250.5,
    costPerPoint: 2.5,
    reliability: 0.95,
    rejectionRate: 0.05,
    trend: 'improving',
  },
  {
    _id: 'perf-agent-2',
    name: 'bob',
    displayName: 'Bob',
    model: 'claude-sonnet',
    tasksCompleted: 38,
    totalCost: 890.25,
    costPerPoint: 1.8,
    reliability: 0.92,
    rejectionRate: 0.08,
    trend: 'stable',
  },
  {
    _id: 'perf-agent-3',
    name: 'charlie',
    displayName: 'Charlie',
    model: 'gpt-4',
    tasksCompleted: 25,
    totalCost: 650.0,
    costPerPoint: 3.2,
    reliability: 0.88,
    rejectionRate: 0.12,
    trend: 'declining',
  },
]

export const mockPipelineCosts: PipelineStageCost[] = [
  { stage: 'Architect', cost: 450.5, percentage: 25 },
  { stage: 'Executor', cost: 680.25, percentage: 38 },
  { stage: 'Reviewer', cost: 320.0, percentage: 18 },
  { stage: 'Merger', cost: 210.75, percentage: 12 },
  { stage: 'Retries', cost: 125.5, percentage: 7 },
]

export const mockRejectionReasons: RejectionReason[] = [
  { reason: 'Code quality', count: 12, percentage: 35 },
  { reason: 'Test failures', count: 8, percentage: 24 },
  { reason: 'Security concerns', count: 6, percentage: 18 },
  { reason: 'Requirements mismatch', count: 5, percentage: 15 },
  { reason: 'Performance issues', count: 3, percentage: 8 },
]

export const mockPerformanceData: PerformanceData = {
  agents: mockPerformanceAgents,
  pipelineCosts: mockPipelineCosts,
  rejectionReasons: mockRejectionReasons,
}

export const mockSinglePerformanceData: PerformanceData = {
  agents: [mockPerformanceAgents[0]],
  pipelineCosts: [mockPipelineCosts[0]],
  rejectionReasons: [mockRejectionReasons[0]],
}

export const mockLargePerformanceData: PerformanceData = {
  agents: Array.from({ length: 55 }, (_, i) => ({
    _id: `perf-agent-${i}`,
    name: `agent-${i}`,
    displayName: `Agent ${i + 1}`,
    model: i % 3 === 0 ? 'claude-opus' : i % 3 === 1 ? 'claude-sonnet' : 'gpt-4',
    tasksCompleted: 20 + (i % 30),
    totalCost: 500 + i * 10,
    costPerPoint: 1.5 + (i % 10) * 0.2,
    reliability: 0.7 + (i % 30) * 0.01,
    rejectionRate: 0.3 - (i % 30) * 0.01,
    trend: i % 3 === 0 ? 'improving' : i % 3 === 1 ? 'stable' : 'declining',
  })),
  pipelineCosts: mockPipelineCosts,
  rejectionReasons: mockRejectionReasons,
}

export const mockEmptyPerformanceData: PerformanceData = {
  agents: [],
  pipelineCosts: [],
  rejectionReasons: [],
}

export const mockZeroCostPerformanceData: PerformanceData = {
  agents: [
    {
      ...mockPerformanceAgents[0],
      totalCost: 0,
      costPerPoint: 0,
    },
  ],
  pipelineCosts: mockPipelineCosts,
  rejectionReasons: mockRejectionReasons,
}
