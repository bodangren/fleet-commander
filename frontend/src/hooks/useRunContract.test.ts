import { describe, expect, it } from 'vitest'
import { transformRunContract, type RawRunContract } from '../hooks/useRunContract'

const mockRawContract: RawRunContract = {
  taskId: 'task-123',
  projectSlug: 'test-project',
  objective: 'Implement feature X',
  scope: ['file1.ts', 'file2.ts'],
  acceptanceCriteria: ['criterion 1', 'criterion 2'],
  createdAt: 1712000000000,
  architectOutput: 'Design approach',
  architectConfidence: 0.8,
  architectAssumptions: ['assumption 1'],
  executorChangedFiles: ['file1.ts'],
  executorTestsRun: ['test1.ts'],
  executorUnresolvedAssumptions: [],
  executorConfidence: 0.9,
  executorBranch: 'feature-x',
  executorCommit: 'abc123',
  executorStatus: 'succeeded',
  reviewerStatus: 'passed',
  reviewerSummary: 'LGTM',
  reviewerIssueClass: undefined,
  reviewerSeverity: undefined,
  recoveryAction: undefined,
  recoveryReason: undefined,
  dispatchRejections: [
    { taskKey: 'task-1', filter: 'blocked', reason: 'Task blocked by dependency' },
    { taskKey: 'task-2', filter: 'priority', reason: 'Lower priority' },
  ],
}

describe('transformRunContract', () => {
  it('transforms all fields correctly', () => {
    const result = transformRunContract(mockRawContract)

    expect(result.taskId).toBe('task-123')
    expect(result.projectSlug).toBe('test-project')
    expect(result.objective).toBe('Implement feature X')
    expect(result.scope).toEqual(['file1.ts', 'file2.ts'])
    expect(result.acceptanceCriteria).toEqual(['criterion 1', 'criterion 2'])
    expect(result.createdAt).toBeInstanceOf(Date)
    expect(result.createdAt.getTime()).toBe(1712000000000)
  })

  it('transforms architect stage correctly', () => {
    const result = transformRunContract(mockRawContract)

    expect(result.stages.architect).toBeDefined()
    expect(result.stages.architect?.output).toBe('Design approach')
    expect(result.stages.architect?.confidence).toBe(0.8)
    expect(result.stages.architect?.assumptions).toEqual(['assumption 1'])
  })

  it('transforms executor stage correctly', () => {
    const result = transformRunContract(mockRawContract)

    expect(result.stages.executor).toBeDefined()
    expect(result.stages.executor?.changedFiles).toEqual(['file1.ts'])
    expect(result.stages.executor?.testsRun).toEqual(['test1.ts'])
    expect(result.stages.executor?.unresolvedAssumptions).toEqual([])
    expect(result.stages.executor?.confidence).toBe(0.9)
    expect(result.stages.executor?.branch).toBe('feature-x')
    expect(result.stages.executor?.commit).toBe('abc123')
    expect(result.stages.executor?.status).toBe('succeeded')
  })

  it('transforms reviewer stage correctly', () => {
    const result = transformRunContract(mockRawContract)

    expect(result.stages.reviewer).toBeDefined()
    expect(result.stages.reviewer?.status).toBe('passed')
    expect(result.stages.reviewer?.summary).toBe('LGTM')
    expect(result.stages.reviewer?.issueClass).toBeUndefined()
    expect(result.stages.reviewer?.severity).toBeUndefined()
  })

  it('transforms dispatch rejections correctly', () => {
    const result = transformRunContract(mockRawContract)

    expect(result.dispatchRejections).toHaveLength(2)
    expect(result.dispatchRejections[0]).toEqual({
      taskKey: 'task-1',
      filter: 'blocked',
      reason: 'Task blocked by dependency',
    })
  })

  it('handles missing optional fields gracefully', () => {
    const minimalContract: RawRunContract = {
      taskId: 'minimal-task',
      projectSlug: 'test',
      objective: 'Test',
      scope: [],
      acceptanceCriteria: [],
      createdAt: 1234567890,
    }

    const result = transformRunContract(minimalContract)

    expect(result.taskId).toBe('minimal-task')
    expect(result.stages.architect).toBeUndefined()
    expect(result.stages.executor).toBeUndefined()
    expect(result.stages.reviewer).toBeUndefined()
    expect(result.stages.recovery).toBeUndefined()
    expect(result.dispatchRejections).toEqual([])
  })

  it('handles reviewer with issue class and severity', () => {
    const contractWithReview: RawRunContract = {
      ...mockRawContract,
      reviewerStatus: 'failed',
      reviewerSummary: 'Found issues',
      reviewerIssueClass: 'correctness',
      reviewerSeverity: 'blocker',
    }

    const result = transformRunContract(contractWithReview)

    expect(result.stages.reviewer?.status).toBe('failed')
    expect(result.stages.reviewer?.issueClass).toBe('correctness')
    expect(result.stages.reviewer?.severity).toBe('blocker')
  })

  it('handles recovery stage', () => {
    const contractWithRecovery: RawRunContract = {
      ...mockRawContract,
      recoveryAction: 'human_review',
      recoveryReason: 'Manual review needed',
    }

    const result = transformRunContract(contractWithRecovery)

    expect(result.stages.recovery).toBeDefined()
    expect(result.stages.recovery?.action).toBe('human_review')
    expect(result.stages.recovery?.reason).toBe('Manual review needed')
  })
})
