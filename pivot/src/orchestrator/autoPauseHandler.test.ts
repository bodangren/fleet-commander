import { describe, expect, it, mock, beforeEach } from 'bun:test';
import { AutoPauseHandler } from './autoPauseHandler';
import type { ContinuousModeManager } from './continuousMode';
import { ContinuousModeManager as CMM } from './continuousMode';

describe('AutoPauseHandler', () => {
  let manager: ContinuousModeManager;
  let handler: AutoPauseHandler;
  let alertCreated: boolean;
  let alertDetails: { projectSlug: string; taskKey: string; error: string } | null;

  beforeEach(() => {
    manager = new CMM();
    alertCreated = false;
    alertDetails = null;
    handler = new AutoPauseHandler(
      manager,
      async (projectSlug, taskKey, error) => {
        alertCreated = true;
        alertDetails = { projectSlug, taskKey, error };
      },
    );
  });

  it('does not auto-pause on first failure', async () => {
    manager.setMaxConsecutiveFailures(3);
    manager.setState('running');
    await handler.recordFailure('test-project', 't1', 'error 1');
    expect(manager.getState().state).toBe('running');
    expect(alertCreated).toBe(false);
  });

  it('does not auto-pause on second failure', async () => {
    manager.setMaxConsecutiveFailures(3);
    manager.setState('running');
    await handler.recordFailure('test-project', 't1', 'error 1');
    await handler.recordFailure('test-project', 't2', 'error 2');
    expect(manager.getState().state).toBe('running');
    expect(alertCreated).toBe(false);
  });

  it('auto-pauses on third consecutive failure', async () => {
    manager.setMaxConsecutiveFailures(3);
    manager.setState('running');
    await handler.recordFailure('test-project', 't1', 'error 1');
    await handler.recordFailure('test-project', 't2', 'error 2');
    await handler.recordFailure('test-project', 't3', 'error 3');
    expect(manager.getState().state).toBe('paused');
    expect(alertCreated).toBe(true);
    expect(alertDetails).not.toBeNull();
    expect(alertDetails!.projectSlug).toBe('test-project');
    expect(alertDetails!.taskKey).toBe('t3');
    expect(alertDetails!.error).toBe('error 3');
  });

  it('resets failure count on success', async () => {
    manager.setMaxConsecutiveFailures(3);
    manager.setState('running');
    await handler.recordFailure('test-project', 't1', 'error 1');
    await handler.recordFailure('test-project', 't2', 'error 2');
    await handler.recordSuccess();
    expect(manager.getState().consecutiveFailures).toBe(0);
    await handler.recordFailure('test-project', 't3', 'error 3');
    expect(manager.getState().state).toBe('running');
  });

  it('does not auto-pause if already paused', async () => {
    manager.setMaxConsecutiveFailures(3);
    manager.setState('paused');
    await handler.recordFailure('test-project', 't1', 'error 1');
    await handler.recordFailure('test-project', 't2', 'error 2');
    await handler.recordFailure('test-project', 't3', 'error 3');
    expect(manager.getState().state).toBe('paused');
    expect(alertCreated).toBe(false);
  });

  it('creates alert with failure details', async () => {
    manager.setMaxConsecutiveFailures(3);
    manager.setState('running');
    await handler.recordFailure('my-project', 'task-42', 'timeout');
    await handler.recordFailure('my-project', 'task-43', 'exit code 1');
    await handler.recordFailure('my-project', 'task-44', 'OOM');
    expect(alertDetails!.error).toBe('OOM');
    expect(alertDetails!.taskKey).toBe('task-44');
  });
});
