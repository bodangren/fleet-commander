import { vi } from 'vitest'

import type { AgentRecord, HarnessRecord, ProjectSummary } from '../lib/fleetTypes'
import type {
  MockSprint,
  MockAgent,
  MockActivityItem,
  MockAlert,
  MockKeyMetrics,
} from './dashboardFixtures'
import type {
  SprintHistoryItem,
  AgentHistoryItem,
  TaskHistoryItem,
} from './historyFixtures'

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

export function setMockConvexData(data: Partial<MockConvexData>) {
  currentData = { ...defaultData, ...data }
}

export function resetMockConvexData() {
  currentData = { ...defaultData }
}

export function setupConvexMocks() {
  vi.mock('../lib/useConvexData', () => ({
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
  }))

  vi.mock('../lib/useFleetApi', () => ({
    useActiveSprint: () => (currentData.sprint ? { data: currentData.sprint } : undefined),
  }))

  vi.mock('../hooks/useDashboardData', () => ({
    useDashboardSprint: () => currentData.dashboardSprint,
    useDashboardAgents: () => currentData.dashboardAgents,
    useDashboardActivity: () => currentData.dashboardActivity,
    useDashboardAlerts: () => currentData.dashboardAlerts,
    useDashboardMetrics: () => currentData.dashboardMetrics,
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
