import { vi } from 'vitest'

import type { AgentRecord, HarnessRecord, ProjectSummary } from '../lib/fleetTypes'
import type {
  MockSprint,
  MockAgent,
  MockActivityItem,
  MockAlert,
  MockKeyMetrics,
} from './dashboardFixtures'
import type { SprintHistoryItem, AgentHistoryItem, TaskHistoryItem } from './historyFixtures'

export interface MockConvexData {
  tasks: Array<{ status: string; title: string; _id: string }> | undefined
  issues: Array<{ _id: string; title: string; status: string }> | undefined
  logs: Array<{ _id: string; taskId: string; output: string }> | undefined
  projects:
    | Array<{
        slug: string
        name: string
        rootPath: string
        status: string
        updatedAt: number
      }>
    | undefined
  agents: AgentRecord[] | undefined
  harnesses: HarnessRecord[] | undefined
  coverage:
    | Array<{
        projectSlug: string
        projectId: string
        percentage: number
        tool: string
        executionId?: string
        createdAt: number
      }>
    | undefined
  settings: Record<string, unknown> | undefined
  sprint:
    | {
        name: string
        taskKeys: string[]
        status: string
      }
    | undefined
  dashboardSprint: MockSprint | undefined
  dashboardAgents: MockAgent[] | undefined
  dashboardActivity: MockActivityItem[] | undefined
  dashboardAlerts: MockAlert[] | undefined
  dashboardMetrics: MockKeyMetrics | undefined
  sprintHistory: SprintHistoryItem[] | undefined
  agentHistory: AgentHistoryItem[] | undefined
  taskHistory: TaskHistoryItem[] | undefined
}

const defaultData: MockConvexData = {
  tasks: undefined,
  issues: undefined,
  logs: undefined,
  projects: undefined,
  agents: undefined,
  harnesses: undefined,
  coverage: undefined,
  settings: undefined,
  sprint: undefined,
  dashboardSprint: undefined,
  dashboardAgents: undefined,
  dashboardActivity: undefined,
  dashboardAlerts: undefined,
  dashboardMetrics: undefined,
  sprintHistory: undefined,
  agentHistory: undefined,
  taskHistory: undefined,
}

let currentData: MockConvexData = { ...defaultData }

/**
 * Typed mock data store for testing Convex-related hooks
 * @param data - Partial mock data to merge with defaults
 */
export function setMockConvexData(data: Partial<MockConvexData>) {
  currentData = { ...defaultData, ...data }
}

/**
 * Typed mock data store for testing Convex-related hooks
 */
export function resetMockConvexData() {
  currentData = { ...defaultData }
}

/**
 * Sets up Vitest mocks for Convex hooks
 */
export function setupConvexMocks() {
  vi.mock('../lib/useConvexData', () => ({
    useConvexQuery: vi.fn(),
    useConvexTasks: () => currentData.tasks,
    useConvexIssues: () => currentData.issues,
    useConvexLogs: () => currentData.logs,
    useConvexProjects: () => currentData.projects,
    useConvexAgents: () => currentData.agents,
    useConvexHarnesses: () => currentData.harnesses,
    useCoverageHistory: () => currentData.coverage,
    useConvexSettings: () => currentData.settings,
    convexCoverageRecordToDisplay: (record: {
      projectSlug: string
      projectId: string
      percentage: number
      tool: string
      executionId?: string
      createdAt: number
    }) => ({
      projectSlug: record.projectSlug,
      projectId: record.projectId,
      percentage: record.percentage,
      tool: record.tool,
      executionId: record.executionId,
      date: new Date(record.createdAt),
    }),
    convexProjectToSummary: (project: {
      slug: string
      name: string
      rootPath: string
      status: string
      updatedAt: number
    }): ProjectSummary => ({
      id: project.slug,
      name: project.name,
      path: project.rootPath,
      tracks: [],
      lastUpdated: project.updatedAt,
    }),
    convexAgentToRecord: (agent: {
      name: string
      displayName: string
      mode: string
      model: string
      temperature: number
      prompt: string
      toolsJson: string
    }): AgentRecord => ({
      layer: 'convex',
      definition: {
        name: agent.name,
        description: agent.displayName,
        mode: agent.mode,
        model: agent.model,
        temperature: agent.temperature,
        tools: (() => {
          try {
            return JSON.parse(agent.toolsJson) as Record<string, boolean>
          } catch {
            return {}
          }
        })(),
        body: agent.prompt,
      },
    }),
    convexHarnessToRecord: (harness: {
      name: string
      commandTemplate: string
      discoveryCommand?: string
    }): HarnessRecord => ({
      layer: 'convex',
      binaryFound: true,
      definition: {
        name: harness.name,
        binary: '',
        discovery: {
          command: harness.discoveryCommand ?? '',
          parseStrategy: 'lines',
          pattern: '',
        },
        invocation: {
          template: harness.commandTemplate,
          flags: {},
        },
      },
    }),
    parseToolsJson: (toolsJson: string): Record<string, boolean> => {
      try {
        return JSON.parse(toolsJson) as Record<string, boolean>
      } catch {
        return {}
      }
    },
    useSprintAggregateData: () => undefined,
    useSprintCostTrend: () => undefined,
    useSprintRejectionReasons: () => undefined,
  }))

  vi.mock('../lib/useFleetApi', () => ({
    useActiveSprint: () => (currentData.sprint ? { data: currentData.sprint } : undefined),
  }))

  vi.mock('../hooks/useDashboardData', () => ({
    useDashboardData: () => {
      const sprint = currentData.dashboardSprint
      if (!sprint) return undefined
      return {
        sprint: {
          _id: 's1',
          name: sprint.name,
          status: sprint.status,
          budget: sprint.budget.estimated,
          actualCost: sprint.budget.actual,
          pointsDelivered: sprint.points.delivered,
          taskCount: sprint.tasks.total,
          completedCount: sprint.tasks.done,
        },
        tasks: (currentData.dashboardActivity ?? []).map((a, i) => ({
          _id: `t${i}`,
          title: a.task,
          status: 'done',
          storyPoints: 3,
          priority: 'medium',
        })),
        agents: (currentData.dashboardAgents ?? []).map((a, i) => ({
          _id: `a${i}`,
          name: a.name,
          role: a.displayName,
          status: a.status.toLowerCase(),
          workload: 0,
          maxWorkload: 5,
        })),
        pipelineRuns: (currentData.dashboardActivity ?? []).map((a, i) => ({
          _id: `r${i}`,
          taskId: `t${i}`,
          stage: a.type === 'merge' ? 'merger' : a.type === 'blocked' ? 'reviewer' : 'dispatch',
          agentId: `a${i}`,
          startTime: a.timestamp,
          status: a.type === 'merge' ? 'completed' : a.type === 'blocked' ? 'failed' : 'running',
          cost: a.cost,
        })),
        alerts: (currentData.dashboardAlerts ?? []).map((a, i) => ({
          _id: `al${i}`,
          type: a.type,
          severity: a.severity,
          message: a.message,
          createdAt: Date.now(),
        })),
        metrics: currentData.dashboardMetrics ?? {
          deliveryRate: 0,
          successRate: 0,
          avgPipelineTime: 0,
          rejectionRate: 0,
        },
      }
    },
  }))

  vi.mock('../hooks/useSprintHistory', () => ({
    useSprintHistory: () => currentData.sprintHistory,
    useAgentHistory: () => currentData.agentHistory,
    useTaskHistory: () => currentData.taskHistory,
    useSprintHistoryQuery: () => currentData.sprintHistory,
    useAgentHistoryQuery: () => currentData.agentHistory,
    useTaskHistoryQuery: () => currentData.taskHistory,
  }))
}
