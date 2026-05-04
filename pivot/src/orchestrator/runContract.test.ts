import { describe, expect, it, mock, beforeEach } from 'bun:test';
import type { ConvexHttpClient } from 'convex/browser';
import {
  validateAndParse,
  validateAndPersist,
  createRunContractIfNeeded,
  RunContractValidationError,
  isRunContract,
  isArchitectOutput,
  isExecutorOutput,
  isReviewerOutput,
  isRecoveryOutput,
  RunContract,
  ArchitectOutput,
  ExecutorOutput,
  ReviewerOutput,
  RecoveryOutput,
  validateExecutorEnforcement,
} from './runContract';

function createMockClient() {
  return {
    query: mock(),
    mutation: mock(),
  } as unknown as ConvexHttpClient;
}

describe('orchestrator runContract re-exports', () => {
  it('re-exports schemas and type guards from shared', () => {
    expect(RunContract).toBeDefined();
    expect(ArchitectOutput).toBeDefined();
    expect(ExecutorOutput).toBeDefined();
    expect(ReviewerOutput).toBeDefined();
    expect(RecoveryOutput).toBeDefined();
    expect(isRunContract).toBeDefined();
    expect(isArchitectOutput).toBeDefined();
    expect(isExecutorOutput).toBeDefined();
    expect(isReviewerOutput).toBeDefined();
    expect(isRecoveryOutput).toBeDefined();
  });
});

describe('validateAndParse', () => {
  it('parses valid architect stage output', () => {
    const result = validateAndParse('architect', {
      output: 'Design a system',
      confidence: 0.85,
      assumptions: ['Use REST'],
    });
    expect(result).not.toBeNull();
    expect(result?.action).toBe('validated');
  });

  it('returns error for invalid architect output', () => {
    const result = validateAndParse('architect', {
      output: 'Design a system',
      confidence: 1.5, // invalid
      assumptions: [],
    });
    expect(result).not.toBeNull();
    expect(result?.action).toBe('error');
    expect(result?.error).toContain('confidence');
  });

  it('parses valid executor stage output', () => {
    const result = validateAndParse('executor', {
      changedFiles: ['src/a.ts'],
      testsRun: [],
      unresolvedAssumptions: [],
      confidence: 0.9,
      branch: 'feat/a',
      commit: 'abc',
      status: 'succeeded',
    });
    expect(result).not.toBeNull();
    expect(result?.action).toBe('validated');
  });

  it('returns error for invalid executor output', () => {
    const result = validateAndParse('executor', {
      changedFiles: ['src/a.ts'],
      testsRun: [],
      unresolvedAssumptions: [],
      confidence: -0.1,
      branch: 'feat/a',
      commit: 'abc',
      status: 'succeeded',
    });
    expect(result).not.toBeNull();
    expect(result?.action).toBe('error');
    expect(result?.error).toContain('confidence');
  });

  it('parses valid reviewer stage output', () => {
    const result = validateAndParse('reviewer', {
      status: 'passed',
      summary: 'Looks good',
      issueClass: 'correctness',
      severity: 'minor',
    });
    expect(result).not.toBeNull();
    expect(result?.action).toBe('validated');
  });

  it('returns error for invalid reviewer output', () => {
    const result = validateAndParse('reviewer', {
      status: 'passed',
      summary: 'Looks good',
      issueClass: 'invalid_class' as any,
      severity: 'minor',
    });
    expect(result).not.toBeNull();
    expect(result?.action).toBe('error');
  });

  it('parses valid recovery stage output', () => {
    const result = validateAndParse('recovery', {
      action: 'retry',
      reason: 'Timeout occurred',
    });
    expect(result).not.toBeNull();
    expect(result?.action).toBe('validated');
  });

  it('returns error for invalid recovery output', () => {
    const result = validateAndParse('recovery', {
      action: 'invalid_action' as any,
      reason: 'Timeout occurred',
    });
    expect(result).not.toBeNull();
    expect(result?.action).toBe('error');
  });

  it('returns null for unknown stage', () => {
    const result = validateAndParse('unknown' as any, {});
    expect(result).toBeNull();
  });
});

describe('createRunContractIfNeeded', () => {
  it('creates contract when none exists', async () => {
    const client = createMockClient();
    (client.query as ReturnType<typeof mock>).mockResolvedValue(null);

    await createRunContractIfNeeded(
      client,
      'task-1',
      'my-project',
      'Test objective',
      ['scope-a'],
      ['criteria-a'],
    );

    const mutationCalls = (client.mutation as ReturnType<typeof mock>).mock.calls;
    expect(mutationCalls.length).toBe(1);
    expect(mutationCalls[0][1]).toEqual({
      taskId: 'task-1',
      projectSlug: 'my-project',
      objective: 'Test objective',
      scope: ['scope-a'],
      acceptanceCriteria: ['criteria-a'],
    });
  });

  it('skips creation when contract already exists', async () => {
    const client = createMockClient();
    (client.query as ReturnType<typeof mock>).mockResolvedValue({ taskId: 'task-1' });

    await createRunContractIfNeeded(
      client,
      'task-1',
      'my-project',
      'Test objective',
      ['scope-a'],
      ['criteria-a'],
    );

    expect((client.mutation as ReturnType<typeof mock>).mock.calls.length).toBe(0);
  });
});

describe('validateAndPersist', () => {
  let client: ConvexHttpClient;

  beforeEach(() => {
    client = createMockClient();
  });

  it('persists valid architect output', async () => {
    (client.mutation as ReturnType<typeof mock>).mockResolvedValue({});

    await validateAndPersist(client, 'task-1', 'architect', {
      output: 'Design API',
      confidence: 0.9,
      assumptions: ['REST'],
    });

    const calls = (client.mutation as ReturnType<typeof mock>).mock.calls;
    expect(calls.length).toBe(1);
    expect(calls[0][1]).toMatchObject({
      taskId: 'task-1',
      output: 'Design API',
      confidence: 0.9,
      assumptions: ['REST'],
    });
  });

  it('persists valid executor output', async () => {
    (client.mutation as ReturnType<typeof mock>).mockResolvedValue({});

    await validateAndPersist(client, 'task-1', 'executor', {
      changedFiles: ['src/a.ts', 'measure/tracks/test-track/plan.md'],
      testsRun: ['a.test.ts'],
      unresolvedAssumptions: [],
      confidence: 0.85,
      branch: 'feat/a',
      commit: 'abc123',
      status: 'succeeded',
    });

    const calls = (client.mutation as ReturnType<typeof mock>).mock.calls;
    expect(calls.length).toBe(1);
    expect(calls[0][1]).toMatchObject({
      taskId: 'task-1',
      changedFiles: ['src/a.ts', 'measure/tracks/test-track/plan.md'],
      testsRun: ['a.test.ts'],
      confidence: 0.85,
      branch: 'feat/a',
      commit: 'abc123',
      status: 'succeeded',
    });
  });

  it('persists valid reviewer output', async () => {
    (client.mutation as ReturnType<typeof mock>).mockResolvedValue({});

    await validateAndPersist(client, 'task-1', 'reviewer', {
      status: 'needs-changes',
      summary: 'Fix types',
      issueClass: 'correctness',
      severity: 'major',
      resolvedAssumptions: true,
    });

    const calls = (client.mutation as ReturnType<typeof mock>).mock.calls;
    expect(calls.length).toBe(1);
    expect(calls[0][1]).toMatchObject({
      taskId: 'task-1',
      status: 'needs-changes',
      summary: 'Fix types',
      issueClass: 'correctness',
      severity: 'major',
      resolvedAssumptions: true,
    });
  });

  it('persists valid recovery output', async () => {
    (client.mutation as ReturnType<typeof mock>).mockResolvedValue({});

    await validateAndPersist(client, 'task-1', 'recovery', {
      action: 'human_review',
      reason: 'Schema mismatch',
    });

    const calls = (client.mutation as ReturnType<typeof mock>).mock.calls;
    expect(calls.length).toBe(1);
    expect(calls[0][1]).toMatchObject({
      taskId: 'task-1',
      action: 'human_review',
      reason: 'Schema mismatch',
    });
  });

  it('throws RunContractValidationError for invalid output', async () => {
    await expect(
      validateAndPersist(client, 'task-1', 'executor', {
        changedFiles: 'not-an-array',
        confidence: 0.5,
      }),
    ).rejects.toBeInstanceOf(RunContractValidationError);
  });

  it('includes raw output in validation error', async () => {
    const raw = { changedFiles: 'not-an-array', confidence: 0.5 };
    try {
      await validateAndPersist(client, 'task-1', 'executor', raw);
      expect(false).toBe(true); // should not reach here
    } catch (err) {
      expect(err).toBeInstanceOf(RunContractValidationError);
      if (err instanceof RunContractValidationError) {
        expect(err.stage).toBe('executor');
        expect(err.rawOutput).toEqual(raw);
      }
    }
  });
});

describe('validateExecutorEnforcement', () => {
  it('returns null when only non-source files are changed', () => {
    const result = validateExecutorEnforcement('task-1', {
      changedFiles: ['README.md'],
      testsRun: [],
      unresolvedAssumptions: [],
      confidence: 0.9,
      branch: 'feat/a',
      commit: 'abc',
      status: 'succeeded',
    });
    expect(result).toBeNull();
  });

  it('returns null when source files are changed with plan.md update', () => {
    const result = validateExecutorEnforcement('task-1', {
      changedFiles: ['src/a.ts', 'measure/tracks/test-track/plan.md'],
      testsRun: ['a.test.ts'],
      unresolvedAssumptions: [],
      confidence: 0.9,
      branch: 'feat/a',
      commit: 'abc',
      status: 'succeeded',
    });
    expect(result).toBeNull();
  });

  it('returns error when source files are changed without plan.md update', () => {
    const result = validateExecutorEnforcement('task-1', {
      changedFiles: ['src/a.ts'],
      testsRun: ['a.test.ts'],
      unresolvedAssumptions: [],
      confidence: 0.9,
      branch: 'feat/a',
      commit: 'abc',
      status: 'succeeded',
    });
    expect(result).toContain('Measure workflow violation');
  });

  it('returns error for feature task with source changes but no tests', () => {
    const result = validateExecutorEnforcement('task-feature-1', {
      changedFiles: ['src/a.ts', 'measure/tracks/test-track/plan.md'],
      testsRun: [],
      unresolvedAssumptions: [],
      confidence: 0.9,
      branch: 'feat/a',
      commit: 'abc',
      status: 'succeeded',
    });
    expect(result).toContain('Mandatory testing violation');
  });

  it('returns error for bug task with source changes but no tests', () => {
    const result = validateExecutorEnforcement('task-bug-1', {
      changedFiles: ['src/a.ts', 'measure/tracks/test-track/plan.md'],
      testsRun: [],
      unresolvedAssumptions: [],
      confidence: 0.9,
      branch: 'fix/a',
      commit: 'abc',
      status: 'succeeded',
    });
    expect(result).toContain('Mandatory testing violation');
  });

  it('returns null for chore task with source changes but no tests', () => {
    const result = validateExecutorEnforcement('task-chore-1', {
      changedFiles: ['src/a.ts', 'measure/tracks/test-track/plan.md'],
      testsRun: [],
      unresolvedAssumptions: [],
      confidence: 0.9,
      branch: 'chore/a',
      commit: 'abc',
      status: 'succeeded',
    });
    expect(result).toBeNull();
  });

  it('treats convex/ files as source changes', () => {
    const result = validateExecutorEnforcement('task-1', {
      changedFiles: ['convex/schema.ts'],
      testsRun: ['a.test.ts'],
      unresolvedAssumptions: [],
      confidence: 0.9,
      branch: 'feat/a',
      commit: 'abc',
      status: 'succeeded',
    });
    expect(result).toContain('Measure workflow violation');
  });

  it('does not enforce testing for unknown task kind (UUID-style taskId)', () => {
    const result = validateExecutorEnforcement('550e8400-e29b-41d4-a716-446655440000', {
      changedFiles: ['src/a.ts', 'measure/tracks/test-track/plan.md'],
      testsRun: [],
      unresolvedAssumptions: [],
      confidence: 0.9,
      branch: 'feat/a',
      commit: 'abc',
      status: 'succeeded',
    });
    // Unknown task kind should not trigger mandatory testing
    expect(result).toBeNull();
  });

  it('infers bug kind from track name in changedFiles', () => {
    const result = validateExecutorEnforcement('550e8400-e29b-41d4-a716-446655440000', {
      changedFiles: ['src/a.ts', 'measure/tracks/fix_parser_bug_20260504/plan.md'],
      testsRun: [],
      unresolvedAssumptions: [],
      confidence: 0.9,
      branch: 'fix/a',
      commit: 'abc',
      status: 'succeeded',
    });
    expect(result).toContain('Mandatory testing violation');
  });
});
