import type {
  MockSprint,
  MockAgent,
  MockActivityItem,
  MockAlert,
  MockKeyMetrics,
} from '@/__fixtures__/dashboardFixtures'

/**
 * Stub: fetch and transform sprint data for the dashboard.
 * Phase 6 implementation will call useActiveSprint / useConvexQuery
 * and merge budget + task stats into the MockSprint shape.
 */
export function useDashboardSprint(): MockSprint | undefined {
  return undefined
}

/**
 * Stub: fetch and transform agent workload for the dashboard.
 * Phase 6 implementation will call useAgentWorkload and map to MockAgent shape.
 */
export function useDashboardAgents(): MockAgent[] | undefined {
  return undefined
}

/**
 * Stub: fetch recent activity for the dashboard.
 * Phase 6 implementation will call useGovernanceEvents or runContracts.
 */
export function useDashboardActivity(): MockActivityItem[] | undefined {
  return undefined
}

/**
 * Stub: fetch active alerts for the dashboard.
 * Phase 6 implementation will call useAlerts or listActiveAlerts.
 */
export function useDashboardAlerts(): MockAlert[] | undefined {
  return undefined
}

/**
 * Stub: compute key metrics for the dashboard.
 * Phase 6 implementation will call useFleetHealth / useQueueHealth / useCoverageHistory.
 */
export function useDashboardMetrics(): MockKeyMetrics | undefined {
  return undefined
}
