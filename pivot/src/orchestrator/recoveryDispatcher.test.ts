import { describe, expect, it, beforeEach, mock } from 'bun:test';
import { RecoveryDispatcher, HealthCheckLoop } from './recoveryDispatcher';

/**
 * Creates a mock ConvexHttpClient for testing RecoveryDispatcher.
 * Detects stalled tasks and determines recovery actions (retry, reroute, requeue, block).
 */
function createMockClient(overrides: Record<string, any> = {}) {
  return {
    query: mock(async () => overrides.queryResult ?? []),
    mutation: mock(async () => overrides.mutationResult ?? null),
  } as any;
}

describe('RecoveryDispatcher', () => {
  it('detects stalled tasks and returns retry action', async () => {
    const now = Date.now();
    const mockClient = createMockClient({
      queryResult: [
        {
          taskKey: 'task-1',
          assignee: 'agent-1',
          status: 'in_progress',
          startedAt: now - 700_000,
        },
      ],
      mutationResult: 'closed',
    });

    const dispatcher = new RecoveryDispatcher(mockClient, 600_000);
    const actions = await dispatcher.runHealthCheck();

    expect(actions).toHaveLength(1);
    expect(actions[0].taskId).toBe('task-1');
    expect(actions[0].action).toBe('retry');
  });

  it('returns requeue action when circuit breaker is open', async () => {
    const now = Date.now();
    let callCount = 0;
    const mockClient = {
      query: mock(async () => [
        {
          taskKey: 'task-1',
          assignee: 'agent-1',
          status: 'in_progress',
          startedAt: now - 700_000,
        },
      ]),
      mutation: mock(async () => {
        callCount++;
        if (callCount === 1) return 'open';
        return null;
      }),
    } as any;

    const dispatcher = new RecoveryDispatcher(mockClient, 600_000);
    const actions = await dispatcher.runHealthCheck();

    expect(actions).toHaveLength(1);
    expect(actions[0].action).toBe('requeue');
    expect(actions[0].reason).toContain('circuit breaker open');
  });

  it('returns empty array when no tasks are stalled', async () => {
    const now = Date.now();
    const mockClient = createMockClient({
      queryResult: [
        {
          taskKey: 'task-1',
          assignee: 'agent-1',
          status: 'in_progress',
          startedAt: now - 60_000,
        },
      ],
    });

    const dispatcher = new RecoveryDispatcher(mockClient, 600_000);
    const actions = await dispatcher.runHealthCheck();

    expect(actions).toHaveLength(0);
  });

  it('handles empty task list', async () => {
    const mockClient = createMockClient({ queryResult: [] });
    const dispatcher = new RecoveryDispatcher(mockClient, 600_000);
    const actions = await dispatcher.runHealthCheck();
    expect(actions).toHaveLength(0);
  });

  it('uses unknown agent when assignee is missing', async () => {
    const now = Date.now();
    const mockClient = createMockClient({
      queryResult: [
        {
          taskKey: 'task-1',
          status: 'in_progress',
          startedAt: now - 700_000,
        },
      ],
      mutationResult: 'closed',
    });

    const dispatcher = new RecoveryDispatcher(mockClient, 600_000);
    const actions = await dispatcher.runHealthCheck();

    expect(actions).toHaveLength(1);
    expect(actions[0].taskId).toBe('task-1');
  });
});

describe('HealthCheckLoop', () => {
  it('starts and stops without errors', () => {
    const mockClient = createMockClient({ queryResult: [] });
    const loop = new HealthCheckLoop(mockClient, 1000);

    expect(loop.isRunning()).toBe(false);
    loop.start();
    expect(loop.isRunning()).toBe(true);
    loop.stop();
    expect(loop.isRunning()).toBe(false);
  });

  it('does not start twice', () => {
    const mockClient = createMockClient({ queryResult: [] });
    const loop = new HealthCheckLoop(mockClient, 1000);
    loop.start();
    loop.start();
    expect(loop.isRunning()).toBe(true);
    loop.stop();
  });

  it('can be stopped multiple times safely', () => {
    const mockClient = createMockClient({ queryResult: [] });
    const loop = new HealthCheckLoop(mockClient, 1000);
    loop.start();
    loop.stop();
    loop.stop();
    expect(loop.isRunning()).toBe(false);
  });
});
