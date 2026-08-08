import { useState, useEffect, useCallback, useMemo } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'

import { KanbanBoard } from '@/components/kanban/KanbanBoard'
import { SprintInfoBar } from '@/components/kanban/SprintInfoBar'
import {
  useSprintBoard,
  useProjectSprints,
  useActiveSprint,
  updateTaskStatus,
  updateSprintStatus,
  closeSprint,
  unblockTask,
} from '@/hooks/useKanbanBoard'
import { useProjectList } from '@/hooks/useProjectList'
import { useBlockerResolutionToast } from '@/hooks/useBlockerResolutionToast'

/**
 * Interactive kanban board for managing sprint tasks across status columns.
 */
export function KanbanBoardPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { projects, loading: projectsLoading } = useProjectList()
  const [selectedProjectId, setSelectedProjectId] = useState<string>('')
  const [selectedSprintId, setSelectedSprintId] = useState<string>('')
  const [pendingTaskId, setPendingTaskId] = useState<string | null>(null)
  const [closing, setClosing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Default to the URL project, then fall back to the first project.
  const projectParam = searchParams.get('project')
  useEffect(() => {
    if (projects.length > 0 && !selectedProjectId) {
      const selectedProject = projectParam
        ? projects.find(project => project.id === projectParam || project.slug === projectParam)
        : undefined
      setSelectedProjectId(selectedProject?.id ?? projects[0].id)
    }
  }, [projects, projectParam, selectedProjectId])

  const { sprints, loading: sprintsLoading } = useProjectSprints(selectedProjectId)
  const { activeSprint } = useActiveSprint(selectedProjectId)

  // Default to active sprint, then first sprint
  useEffect(() => {
    if (sprints.length > 0 && !selectedSprintId) {
      if (activeSprint) {
        setSelectedSprintId(activeSprint._id)
      } else {
        setSelectedSprintId(sprints[0]._id)
      }
    }
  }, [sprints, activeSprint, selectedSprintId])

  const { board, loading: boardLoading, refresh } = useSprintBoard(selectedSprintId)

  useBlockerResolutionToast({ tasks: board?.tasks ?? [] })

  const totalPoints = useMemo(() => {
    if (!board) return 0
    return board.tasks.reduce((sum, t) => sum + t.storyPoints, 0)
  }, [board])

  const totalEstimate = useMemo(() => {
    if (!board) return 0
    return board.tasks.reduce((sum, t) => sum + t.costEstimate, 0)
  }, [board])

  const totalActualCost = useMemo(() => {
    if (!board) return 0
    return board.tasks.reduce((sum, t) => sum + (t.actualCost ?? 0), 0)
  }, [board])

  const handleMoveTask = useCallback(
    async (taskId: string, newStatus: string) => {
      setPendingTaskId(taskId)
      setError(null)
      const result = await updateTaskStatus(taskId, newStatus)
      if (!result.ok) {
        setError(result.error || 'Failed to update task')
      }
      setPendingTaskId(null)
      await refresh()
    },
    [refresh],
  )

  const handleTaskClick = useCallback(
    (taskId: string) => {
      navigate(`/tasks/${taskId}/timeline`)
    },
    [navigate],
  )

  const handleUnblock = useCallback(
    async (taskId: string) => {
      setPendingTaskId(taskId)
      setError(null)
      const result = await unblockTask(taskId)
      if (!result.ok) {
        setError(result.error || 'Failed to unblock task')
      }
      setPendingTaskId(null)
      await refresh()
    },
    [refresh],
  )

  const handleSprintAction = useCallback(async () => {
    if (!board?.sprint) return
    setClosing(true)
    setError(null)

    if (board.sprint.status === 'active') {
      const result = await closeSprint(board.sprint._id)
      if (!result.ok) {
        setError(result.error || 'Failed to close sprint')
      }
    } else if (board.sprint.status === 'planned') {
      const result = await updateSprintStatus(board.sprint._id, 'active')
      if (!result.ok) {
        setError(result.error || 'Failed to activate sprint')
      }
    }

    setClosing(false)
    await refresh()
  }, [board?.sprint, refresh])

  const selectedSprint = board?.sprint

  return (
    <div className="space-y-5">
      {/* Project & Sprint Selectors */}
      <div className="flex items-center gap-4 flex-wrap">
        <div>
          <label
            htmlFor="project-select"
            className="text-[11px] font-medium text-[#62666d] uppercase tracking-[0.5px] block mb-1.5"
          >
            Project
          </label>
          <select
            id="project-select"
            className="bg-[#0f1011] border border-[#23252a] text-[#f7f8f8] text-sm rounded-md px-3 py-2 w-52 focus:outline-none focus:ring-1 focus:ring-[#5e6ad2]"
            value={selectedProjectId}
            onChange={e => {
              setSelectedProjectId(e.target.value)
              setSelectedSprintId('')
            }}
            disabled={projectsLoading}
          >
            {projects.map(p => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label
            id="sprint-selector-label"
            className="text-[11px] font-medium text-[#62666d] uppercase tracking-[0.5px] block mb-1.5"
          >
            Sprint
          </label>
          <div
            role="group"
            aria-labelledby="sprint-selector-label"
            className="flex gap-2 flex-wrap"
          >
            {sprints.map(s => (
              <button
                key={s._id}
                type="button"
                onClick={() => setSelectedSprintId(s._id)}
                className={`
                  text-xs font-medium px-3 py-1.5 rounded-md transition-colors
                  ${
                    selectedSprintId === s._id
                      ? 'bg-[#5e6ad2] text-white'
                      : 'bg-[#141516] text-[#d0d6e0] border border-[#23252a] hover:bg-[#18191a] hover:text-[#f7f8f8]'
                  }
                `}
              >
                {s.name}
                {s.status === 'active' && <span className="ml-1.5 text-[10px] opacity-80">●</span>}
              </button>
            ))}
            {sprintsLoading && <span className="text-xs text-[#8a8f98]">Loading...</span>}
            {!sprintsLoading && sprints.length === 0 && (
              <span className="text-xs text-[#8a8f98]">
                No sprints ·{' '}
                <a href="/sprint-planning" className="text-[#5e6ad2] hover:underline">
                  Create one
                </a>
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="p-3 bg-[rgba(235,61,84,0.08)] border border-[rgba(235,61,84,0.2)] rounded-lg text-sm text-[#eb3d54]">
          {error}
        </div>
      )}

      {/* Sprint Info Bar */}
      {selectedSprint && (
        <SprintInfoBar
          sprint={selectedSprint}
          totalPoints={totalPoints}
          totalEstimate={totalEstimate}
          totalActualCost={totalActualCost}
          onCloseSprint={handleSprintAction}
          closing={closing}
        />
      )}

      {/* Board */}
      {boardLoading ? (
        <div className="p-8 text-center text-sm text-[#8a8f98]">Loading board...</div>
      ) : board ? (
        <KanbanBoard
          tasks={board.tasks}
          onMoveTask={handleMoveTask}
          onTaskClick={handleTaskClick}
          onUnblock={handleUnblock}
          pendingTaskId={pendingTaskId}
        />
      ) : (
        <div className="p-8 text-center text-sm text-[#8a8f98]">
          {selectedSprintId ? 'No tasks in this sprint.' : 'Select a sprint to view the board.'}
        </div>
      )}
    </div>
  )
}
