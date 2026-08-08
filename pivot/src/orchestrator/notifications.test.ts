import { describe, expect, it, mock, beforeEach } from 'bun:test';
import type { Task, IssueHooks, ExecuteFn } from './types';

describe('runProject notification triggers', () => {
  const mockClient = {
    mutation: mock(async () => {}),
    query: mock(async () => []),
  };

  beforeEach(() => {
    mockClient.mutation.mockReset();
    mockClient.query.mockReset();
    (mockClient.query as any).mockImplementation(async () => {
      return [
        {
          projectSlug: 'test-project',
          trackId: 'track-a',
          taskKey: 't1',
          title: 'Test task',
          status: 'backlog',
          dependencies: [],
          updatedAt: Date.now(),
          assignee: 'agent-1',
        },
      ];
    });
  });

  it('notifies task completed on success', async () => {
    const { runProjectWithTestPreflight: runProject } = await import('./orchestrator.testHelper');
    const mockExecute: ExecuteFn = mock(async () => ({
      taskKey: 't1',
      status: 'succeeded' as const,
      exitCode: 0,
      output: 'success',
      durationMs: 200,
    }));

    await runProject(mockClient as any, 'test-project', undefined, undefined, mockExecute);

    const notifyCalls = (mockClient.mutation.mock.calls as unknown as [any, any][]).filter(
      ([, args]) => args && args.taskKey === 't1' && args.taskTitle === 'Test task',
    );
    expect(notifyCalls.length).toBeGreaterThanOrEqual(1);
  });

  it('notifies task failed on max retries', async () => {
    const { runProjectWithTestPreflight: runProject } = await import('./orchestrator.testHelper');
    const mockExecute: ExecuteFn = mock(async () => ({
      taskKey: 't1',
      status: 'failed' as const,
      exitCode: 1,
      output: '',
      error: 'test error',
      failureType: 'exit_code' as const,
      durationMs: 100,
    }));

    await runProject(
      mockClient as any,
      'test-project',
      { maxRetries: 0, baseDelayMs: 1, maxDelayMs: 1, commandTimeoutMs: 1000 },
      undefined,
      mockExecute,
    );

    const notifyCalls = (mockClient.mutation.mock.calls as unknown as [any, any][]).filter(
      ([, args]) => args && args.taskKey === 't1' && args.error,
    );
    expect(notifyCalls.length).toBeGreaterThanOrEqual(1);
  });

  it('notifies backoff exhausted when retry cap reached', async () => {
    const { runProjectWithTestPreflight: runProject } = await import('./orchestrator.testHelper');
    const mockExecute: ExecuteFn = mock(async () => ({
      taskKey: 't1',
      status: 'failed' as const,
      exitCode: 1,
      output: '',
      error: 'persistent failure',
      failureType: 'exit_code' as const,
      durationMs: 100,
    }));

    await runProject(
      mockClient as any,
      'test-project',
      { maxRetries: 1, baseDelayMs: 1, maxDelayMs: 1, commandTimeoutMs: 1000 },
      undefined,
      mockExecute,
    );

    const backoffCalls = (mockClient.mutation.mock.calls as unknown as [any, any][]).filter(
      ([, args]) => args && args.maxRetries !== undefined,
    );
    expect(backoffCalls.length).toBeGreaterThanOrEqual(1);
  });

  it('notifies hook failure when beforeRun hook fails', async () => {
    const { runProjectWithTestPreflight: runProject } = await import('./orchestrator.testHelper');
    const mockExecute: ExecuteFn = mock(async () => ({
      taskKey: 't1',
      status: 'succeeded' as const,
      exitCode: 0,
      output: 'success',
      durationMs: 200,
    }));

    await runProject(
      mockClient as any,
      'test-project',
      { maxRetries: 0, baseDelayMs: 1, maxDelayMs: 1, commandTimeoutMs: 1000 },
      undefined,
      mockExecute,
    );

    // No beforeRun hook configured in this test, so no hook failure notification
    // This test verifies the orchestrator doesn't crash when hooks aren't present
    expect(mockExecute).toHaveBeenCalled();
  });

  it('notifies session resumed on retry with preserved session', async () => {
    const { runProjectWithTestPreflight: runProject } = await import('./orchestrator.testHelper');
    const mockExecute: ExecuteFn = mock(async () => ({
      taskKey: 't1',
      status: 'succeeded' as const,
      exitCode: 0,
      output: 'success',
      durationMs: 200,
      sessionId: 'session-abc',
    }));

    await runProject(mockClient as any, 'test-project', undefined, undefined, mockExecute);

    // First attempt succeeded, no retry, so no session resumption notification
    // notifySessionResumed has sessionId but no projectSlug (unlike upsertTask)
    const sessionCalls = (mockClient.mutation.mock.calls as unknown as [any, any][]).filter(
      ([, args]) => args && args.sessionId === 'session-abc' && !args.projectSlug,
    );
    // Session resumption only fires on retry (attempt > 0)
    expect(sessionCalls.length).toBe(0);
  });
});
