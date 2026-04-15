import { useEffect, useState } from 'react'
import type { DispatchRejection } from '@/lib/fleetTypes'

const convexUrl = import.meta.env.VITE_CONVEX_URL as string | undefined

export interface RunContractStage {
  architect?: {
    output: string
    confidence: number
    assumptions: string[]
    suggestedHarness?: string
  }
  executor?: {
    changedFiles: string[]
    testsRun: string[]
    unresolvedAssumptions: string[]
    confidence: number
    branch: string
    commit: string
    status: 'succeeded' | 'failed'
  }
  reviewer?: {
    status: 'passed' | 'failed' | 'needs-changes'
    summary: string
    issueClass?: 'correctness' | 'security' | 'performance' | 'style' | 'spec_mismatch'
    severity?: 'blocker' | 'major' | 'minor'
  }
  recovery?: {
    action: 'retry' | 'escalate' | 'split' | 'replan' | 'human_review'
    reason: string
  }
}

export interface RunContractDisplay {
  taskId: string
  projectSlug: string
  objective: string
  scope: string[]
  acceptanceCriteria: string[]
  createdAt: Date
  stages: RunContractStage
  dispatchRejections: DispatchRejection[]
}

export interface RawRunContract {
  taskId: string
  projectSlug: string
  objective: string
  scope: string[]
  acceptanceCriteria: string[]
  createdAt: number
  architectOutput?: string
  architectConfidence?: number
  architectAssumptions?: string[]
  executorChangedFiles?: string[]
  executorTestsRun?: string[]
  executorUnresolvedAssumptions?: string[]
  executorConfidence?: number
  executorBranch?: string
  executorCommit?: string
  executorStatus?: 'succeeded' | 'failed'
  reviewerStatus?: 'passed' | 'failed' | 'needs-changes'
  reviewerSummary?: string
  reviewerIssueClass?: 'correctness' | 'security' | 'performance' | 'style' | 'spec_mismatch'
  reviewerSeverity?: 'blocker' | 'major' | 'minor'
  recoveryAction?: 'retry' | 'escalate' | 'split' | 'replan' | 'human_review'
  recoveryReason?: string
  dispatchRejections?: DispatchRejection[]
}

export function transformRunContract(raw: RawRunContract): RunContractDisplay {
  return {
    taskId: raw.taskId,
    projectSlug: raw.projectSlug,
    objective: raw.objective,
    scope: raw.scope,
    acceptanceCriteria: raw.acceptanceCriteria,
    createdAt: new Date(raw.createdAt),
    stages: {
      architect: raw.architectOutput
        ? {
            output: raw.architectOutput,
            confidence: raw.architectConfidence ?? 0,
            assumptions: raw.architectAssumptions ?? [],
          }
        : undefined,
      executor:
        raw.executorChangedFiles && raw.executorBranch && raw.executorCommit
          ? {
              changedFiles: raw.executorChangedFiles,
              testsRun: raw.executorTestsRun ?? [],
              unresolvedAssumptions: raw.executorUnresolvedAssumptions ?? [],
              confidence: raw.executorConfidence ?? 0,
              branch: raw.executorBranch,
              commit: raw.executorCommit,
              status: raw.executorStatus ?? 'succeeded',
            }
          : undefined,
      reviewer: raw.reviewerStatus
        ? {
            status: raw.reviewerStatus,
            summary: raw.reviewerSummary ?? '',
            issueClass: raw.reviewerIssueClass,
            severity: raw.reviewerSeverity,
          }
        : undefined,
      recovery: raw.recoveryAction
        ? {
            action: raw.recoveryAction,
            reason: raw.recoveryReason ?? '',
          }
        : undefined,
    },
    dispatchRejections: raw.dispatchRejections ?? [],
  }
}

export interface UseRunContractReturn {
  runContract: RunContractDisplay | null
  loading: boolean
  error: string | null
}

export function useRunContract(taskId: string | undefined): UseRunContractReturn {
  const [runContract, setRunContract] = useState<RunContractDisplay | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!taskId || taskId.trim() === '') {
      setRunContract(null)
      setLoading(false)
      setError(null)
      return
    }

    if (!convexUrl) {
      setRunContract(null)
      setLoading(false)
      setError(null)
      return
    }

    let cancelled = false
    let unsubscribe: (() => void) | undefined

    setLoading(true)
    setError(null)

    import('convex/browser')
      .then(({ ConvexClient }) => {
        if (cancelled) return
        const client = new ConvexClient(convexUrl)
        unsubscribe = (
          client as unknown as {
            onUpdate: (
              query: string,
              args: object,
              cb: (result: RawRunContract | null) => void,
            ) => () => void
          }
        ).onUpdate('runContracts:getRunContract', { taskId }, (result: RawRunContract | null) => {
          if (cancelled) return
          setLoading(false)
          if (result === null) {
            setRunContract(null)
          } else {
            setRunContract(transformRunContract(result))
          }
        })
      })
      .catch(err => {
        if (cancelled) return
        setLoading(false)
        setError(err instanceof Error ? err.message : 'Unknown error')
      })

    return () => {
      cancelled = true
      if (typeof unsubscribe === 'function') {
        unsubscribe()
      }
    }
  }, [taskId])

  return { runContract, loading, error }
}
