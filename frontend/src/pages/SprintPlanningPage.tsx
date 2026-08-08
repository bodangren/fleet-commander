import { useState, useEffect, useCallback, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  useSprintPlanningRecommendation,
  useProjectStats,
  createSprint,
} from '@/hooks/useSprintPlanning'

interface Project {
  id: string
  name: string
  slug?: string
}

/**
 * Hook to fetch and manage project list from API
 * @returns Object containing projects array and loading state
 */
function useProjects() {
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    setLoading(true)
    fetch('/api/projects')
      .then(r => r.json() as Promise<Project[]>)
      .then(data => {
        setProjects(data)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  return { projects, loading }
}

/**
 * Sprint planning page with project selection, budget input, and task recommendation interface
 */
export function SprintPlanningPage() {
  const { projects } = useProjects()
  const [searchParams] = useSearchParams()
  const [selectedProjectId, setSelectedProjectId] = useState<string>('')
  const [budget, setBudget] = useState<string>('')
  const [selectedTasks, setSelectedTasks] = useState<Set<string>>(new Set())
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)

  // Auto-select project from URL param, or first project
  useEffect(() => {
    if (projects.length > 0 && !selectedProjectId) {
      const paramProjectId = searchParams.get('project')
      const selectedProject = paramProjectId
        ? projects.find(p => p.id === paramProjectId || p.slug === paramProjectId)
        : undefined
      setSelectedProjectId(selectedProject?.id ?? projects[0].id)
    }
  }, [projects, selectedProjectId, searchParams])

  const {
    recommendation,
    loading: recLoading,
    error: recommendationError,
    refresh,
  } = useSprintPlanningRecommendation(selectedProjectId)

  const { stats } = useProjectStats(selectedProjectId)

  // Initialize selected tasks from recommendation
  useEffect(() => {
    if (recommendation) {
      setSelectedTasks(current => {
        const available = new Set(recommendation.tasks.map(task => task.taskId))
        return new Set([...current].filter(taskId => available.has(taskId)))
      })
      if (!budget) {
        setBudget(recommendation.recommendedBudget.toFixed(2))
      }
    }
  }, [recommendation])

  const toggleTask = useCallback((taskId: string) => {
    setSelectedTasks(prev => {
      if (prev.has(taskId)) return new Set()
      return new Set([taskId])
    })
  }, [])

  const selectedRecommendations = useMemo(() => {
    if (!recommendation) return []
    return recommendation.tasks.filter(t => selectedTasks.has(t.taskId))
  }, [recommendation, selectedTasks])

  const unassignedTaskCount = useMemo(
    () => recommendation?.tasks.filter(task => !task.assignedAgentId).length ?? 0,
    [recommendation],
  )

  const selectedTotal = useMemo(() => {
    return selectedRecommendations.reduce(
      (acc, t) => ({ points: acc.points + t.storyPoints, cost: acc.cost + t.estimatedCost }),
      { points: 0, cost: 0 },
    )
  }, [selectedRecommendations])

  const agentBreakdown = useMemo(() => {
    const map = new Map<
      string,
      { name: string; role: string; points: number; cost: number; count: number }
    >()
    for (const t of selectedRecommendations) {
      if (!t.assignedAgentId) continue
      const existing = map.get(t.assignedAgentId)
      if (existing) {
        existing.points += t.storyPoints
        existing.cost += t.estimatedCost
        existing.count += 1
      } else {
        map.set(t.assignedAgentId, {
          name: t.assignedAgentName,
          role: t.agentRole,
          points: t.storyPoints,
          cost: t.estimatedCost,
          count: 1,
        })
      }
    }
    return Array.from(map.values())
  }, [selectedRecommendations])

  const handleStartSprint = async () => {
    if (!selectedProjectId || !budget) return
    if (hasExternalIncompleteDeps) return
    setCreating(true)
    setCreateError(null)

    const assignments = selectedRecommendations.flatMap(t =>
      t.assignedAgentId ? [{ taskId: t.taskId, agentId: t.assignedAgentId }] : [],
    )

    const result = await createSprint({
      projectId: selectedProjectId,
      name: `Sprint ${new Date().toLocaleDateString()}`,
      budget: parseFloat(budget),
      taskAssignments: assignments,
    })

    setCreating(false)
    if (!result.ok) {
      setCreateError(result.error || 'Failed to create sprint')
    } else {
      setSelectedTasks(new Set())
      setBudget('')
      void refresh()
    }
  }

  const maxPoints =
    recommendation && parseFloat(budget)
      ? Math.floor(parseFloat(budget) / (recommendation.avgCostPerPoint || 1))
      : 0

  const criticalPath = recommendation?.criticalPath ?? null
  const hasSelectedCriticalPath =
    criticalPath !== null && criticalPath.path.some(taskId => selectedTasks.has(taskId))

  const externalIncompleteDeps = recommendation?.externalIncompleteDeps ?? []
  const hasExternalIncompleteDeps = externalIncompleteDeps.length > 0

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Sprint Planning</h2>
          <p className="text-sm text-[#8a8f98] mt-1">
            PM Agent recommends tasks · You set the budget · Then trigger the sprint
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => void refresh()}
            className="px-4 py-2 text-sm font-medium border border-[#34343a] rounded-md hover:bg-[#141516]"
          >
            Recalculate
          </button>
          <button
            onClick={() => void handleStartSprint()}
            disabled={creating || selectedTasks.size === 0}
            className="px-4 py-2 text-sm font-medium bg-[#5e6ad2] text-white rounded-md hover:bg-[#828fff] disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-[#5e6ad2]"
          >
            {creating ? 'Creating...' : 'Start Sprint'}
          </button>
        </div>
      </div>

      {createError && (
        <div className="rounded-md bg-red-900/20 border border-red-800/50 px-4 py-3 text-sm text-red-300">
          {createError}
        </div>
      )}

      {hasSelectedCriticalPath && criticalPath && (
        <div
          role="alert"
          className="rounded-md bg-amber-900/20 border border-amber-800/50 px-4 py-3 text-sm text-amber-300"
        >
          Critical path: {criticalPath.totalStoryPoints} story points
        </div>
      )}

      <div className="bg-[#141516] rounded-md px-4 py-3 text-sm font-semibold">
        Makespan: {recommendation?.makespan ?? 0} pts
      </div>

      {hasExternalIncompleteDeps && (
        <div
          role="alert"
          className="rounded-md bg-orange-900/20 border border-orange-800/50 px-4 py-3 text-sm text-orange-300"
        >
          <strong>Incomplete dependencies outside the sprint:</strong>{' '}
          {externalIncompleteDeps.map(dep => (
            <span key={dep.taskId}>
              {dep.taskTitle} ({dep.missingDeps.map(d => d.title).join(', ')})
            </span>
          ))}
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-xl border border-[#23252a] bg-[#0f1011] p-6">
          <label htmlFor="sprint-planning-project" className="font-semibold mb-4 block">
            Project
          </label>
          <select
            id="sprint-planning-project"
            className="w-full bg-[#0f1011] border border-[#34343a] rounded-md px-3 py-2 text-sm mb-4"
            value={selectedProjectId}
            onChange={e => setSelectedProjectId(e.target.value)}
          >
            {projects.map(p => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-[#141516] rounded-md p-3">
              <div className="text-[11px] text-[#8a8f98]">Backlog Tasks</div>
              <div className="text-xl font-semibold">{stats?.backlogCount ?? '—'}</div>
            </div>
            <div className="bg-[#141516] rounded-md p-3">
              <div className="text-[11px] text-[#8a8f98]">Total Points</div>
              <div className="text-xl font-semibold">{stats?.totalPoints ?? '—'}</div>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-[#23252a] bg-[#0f1011] p-6">
          <h3 className="font-semibold mb-4">Budget</h3>
          <div className="mb-4">
            <label className="text-xs text-[#8a8f98] block mb-2">Sprint Budget</label>
            <div className="flex items-center gap-2">
              <span className="text-xl font-semibold">$</span>
              <input
                type="number"
                value={budget}
                onChange={e => setBudget(e.target.value)}
                className="bg-[#0f1011] border border-[#34343a] rounded-md px-3 py-2 text-xl font-semibold w-28"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-[#141516] rounded-md p-3">
              <div className="text-[11px] text-[#8a8f98]">Avg Cost/Point</div>
              <div className="text-xl font-semibold">
                ${recommendation?.avgCostPerPoint.toFixed(2) ?? '—'}
              </div>
            </div>
            <div className="bg-[#141516] rounded-md p-3">
              <div className="text-[11px] text-[#8a8f98]">Max Points</div>
              <div className="text-xl font-semibold">{maxPoints || '—'}</div>
            </div>
          </div>
        </div>
      </div>

      {recommendation && (
        <div className="rounded-xl border border-[#5e6ad2] bg-[#0f1011] p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 rounded-md bg-[rgba(94,106,210,0.15)] flex items-center justify-center text-[#5e6ad2] text-sm font-semibold">
              PM
            </div>
            <div>
              <div className="font-semibold">PM Agent Recommendation</div>
              <div className="text-sm text-[#8a8f98]">
                Based on priority, agent availability, and historical cost data
              </div>
            </div>
          </div>
          <div className="bg-[#141516] rounded-md p-4 text-sm leading-relaxed text-[#d0d6e0]">
            <strong className="text-[#f7f8f8]">Recommended sprint:</strong>{' '}
            {recommendation.totalPoints} story points across {recommendation.taskCount} tasks.
            Estimated cost: ${recommendation.totalCost.toFixed(2)}{' '}
            {parseFloat(budget || '0') > 0 &&
              `(within $${parseFloat(budget).toFixed(2)} budget with ${recommendation.bufferPercent}% buffer)`}
            . Prioritized high-value tasks that fit the budget.
          </div>
        </div>
      )}

      <div className="rounded-xl border border-[#23252a] bg-[#0f1011] p-6">
        <h3 className="font-semibold mb-4">Task Selection</h3>
        {unassignedTaskCount > 0 && (
          <div className="mb-4 rounded-md border border-amber-800/50 bg-amber-900/20 px-4 py-3 text-sm text-amber-300">
            {unassignedTaskCount} backlog task{unassignedTaskCount === 1 ? '' : 's'} need
            {unassignedTaskCount === 1 ? 's' : ''} an active agent before a sprint can start.
          </div>
        )}
        {recommendationError ? (
          <div
            role="alert"
            className="rounded-md border border-red-800/50 bg-red-900/20 px-4 py-3 text-sm text-red-300"
          >
            {recommendationError}
          </div>
        ) : recLoading ? (
          <div className="text-sm text-[#8a8f98]">Loading recommendations...</div>
        ) : recommendation && recommendation.tasks.length > 0 ? (
          <div className="space-y-2">
            {recommendation.tasks.map(task => (
              <label
                key={task.taskId}
                className={`flex items-center gap-4 p-3 rounded-md bg-[#141516] transition-colors ${
                  task.assignedAgentId
                    ? 'hover:bg-[#1a1b1c] cursor-pointer'
                    : 'cursor-not-allowed opacity-75'
                }`}
              >
                <input
                  type="checkbox"
                  checked={selectedTasks.has(task.taskId)}
                  onChange={() => toggleTask(task.taskId)}
                  disabled={!task.assignedAgentId}
                  className="w-4 h-4 accent-[#5e6ad2]"
                />
                <div className="flex-1">
                  <div className="text-sm font-medium">{task.taskTitle}</div>
                  <div className="text-xs text-[#8a8f98]">
                    {task.storyPoints} pts · {task.priority} priority
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-medium">
                    {task.assignedAgentId ? `@${task.assignedAgentName}` : task.assignedAgentName}
                  </div>
                  <div className="text-xs text-[#8a8f98]">
                    ${task.costPerPoint.toFixed(2)}/pt · ${task.estimatedCost.toFixed(2)}
                  </div>
                </div>
              </label>
            ))}
            <div className="flex justify-between items-center pt-3 border-t border-[#23252a] text-sm">
              <span className="text-[#8a8f98]">
                {selectedTasks.size} of {recommendation.tasks.length} selected
              </span>
              <span className="font-semibold">
                {selectedTotal.points} pts · ${selectedTotal.cost.toFixed(2)}
              </span>
            </div>
          </div>
        ) : (
          <div className="text-sm text-[#8a8f98]">
            No backlog tasks available for this project.{' '}
            <a href="/board" className="text-[#5e6ad2] hover:underline">
              Go to the Project Board
            </a>{' '}
            to create tasks.
          </div>
        )}
      </div>

      {agentBreakdown.length > 0 && (
        <div className="rounded-xl border border-[#23252a] bg-[#0f1011] p-6">
          <h3 className="font-semibold mb-4">Agent Cost Breakdown</h3>
          <div className="space-y-2">
            {agentBreakdown.map(agent => (
              <div
                key={agent.name}
                className="flex items-center justify-between p-3 rounded-md bg-[#141516]"
              >
                <div>
                  <div className="text-sm font-medium">
                    @{agent.name} <span className="text-[#8a8f98]">({agent.role})</span>
                  </div>
                  <div className="text-xs text-[#8a8f98]">
                    {agent.count} task{agent.count !== 1 ? 's' : ''} · {agent.points} pts
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-medium">${agent.cost.toFixed(2)}</div>
                  <div className="text-xs text-[#8a8f98]">${agent.cost / agent.points}/pt</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
