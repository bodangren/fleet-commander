import { useRealtimeWithProject, useRealtimeWithParam } from './core'

/**
 * Returns sprint board data for a project.
 */
export function useSprintBoard(projectId: string | undefined) {
  return useRealtimeWithProject('kanban:getSprintBoardHandler', projectId)
}

/**
 * Returns the active sprint for a project.
 */
export function useActiveSprint(projectId: string | undefined) {
  return useRealtimeWithProject('kanban:getActiveSprintHandler', projectId)
}

/**
 * Returns all sprints for a project.
 */
export function useSprintsByProject(projectId: string | undefined) {
  return useRealtimeWithProject('kanban:getSprintsByProjectHandler', projectId)
}

/**
 * Returns backlog tasks for a project.
 */
export function useBacklogTasks(projectId: string | undefined) {
  return useRealtimeWithProject('sprintPlanning:getBacklogTasksHandler', projectId)
}

/**
 * Returns agents available for sprint planning.
 */
export function useAgentsForPlanning(projectId: string | undefined) {
  return useRealtimeWithProject('sprintPlanning:getAgentsForPlanningHandler', projectId)
}

/**
 * Returns project statistics for planning.
 */
export function useProjectStats(projectId: string | undefined) {
  return useRealtimeWithProject('sprintPlanning:getProjectStatsHandler', projectId)
}

/**
 * Returns sprints list for a project.
 */
export function useSprintsList(projectId: string | undefined) {
  return useRealtimeWithProject('sprints:listSprintsHandler', projectId)
}

/**
 * Returns a specific sprint by ID.
 */
export function useSprint(sprintId: string | undefined) {
  return useRealtimeWithParam('sprints:getSprintHandler', 'sprintId', sprintId)
}
