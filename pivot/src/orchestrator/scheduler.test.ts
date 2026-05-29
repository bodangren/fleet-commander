import { describe, expect, it, mock } from 'bun:test';
import {
  matchTaskToEmployee,
  runSchedulerTick,
  executeTaskWithEmployee,
  type SchedulerDeps,
  type AgentTemplate,
} from './scheduler';
import { RetryManager } from './retryManager';
import { SYMPHONY_RETRY_CONFIG } from './types';
import { createTask, createEmployee } from '../__fixtures__/convex-mock';

function createMockDeps(overrides?: Partial<SchedulerDeps>): SchedulerDeps {
  return {
    queryReadyTasks: mock(async () => []),
    queryActiveEmployees: mock(async () => []),
    queryTemplates: mock(async () => []),
    createRun: mock(async () => 'run-1'),
    updateTaskStatus: mock(async () => {}),
    appendRunOutput: mock(async () => {}),
    executeCommand: mock(async () => ({
      stdout: '',
      stderr: '',
      exitCode: 0,
      timedOut: false,
      tokensExceeded: false,
    })),
    ...overrides,
  };
}

describe('matchTaskToEmployee', () => {
  it('matches task to employee with intersecting skills', () => {
    const task = createTask({ status: 'ready', assignee: undefined });
    const employee = createEmployee({ status: 'active', skills: ['typescript', 'react'] });
    const matched = matchTaskToEmployee(task, [employee]);
    expect(matched).not.toBeNull();
    expect(matched!.employee).toBe(employee);
  });

  it('returns null when no skills intersect', () => {
    const task = createTask({ status: 'ready', assignee: undefined });
    task.skills = ['rust'];
    const employee = createEmployee({ status: 'active', skills: ['typescript', 'react'] });
    const matched = matchTaskToEmployee(task, [employee]);
    expect(matched).toBeNull();
  });

  it('returns null when task has no assignee and no skills field', () => {
    const task = createTask({ status: 'ready', assignee: undefined });
    const employee = createEmployee({ status: 'active', skills: ['typescript'] });
    const matched = matchTaskToEmployee(task, [employee]);
    expect(matched).not.toBeNull();
    expect(matched!.employee).toBe(employee);
  });

  it('prefers employee with more skill overlap', () => {
    const task = createTask({ status: 'ready', assignee: undefined });
    task.skills = ['typescript', 'react', 'node'];
    const empA = createEmployee({ status: 'active', skills: ['typescript'] });
    const empB = createEmployee({ status: 'active', skills: ['typescript', 'react', 'node'] });
    const matched = matchTaskToEmployee(task, [empA, empB]);
    expect(matched).not.toBeNull();
    expect(matched!.employee).toBe(empB);
  });

  it('skips away employees', () => {
    const task = createTask({ status: 'ready', assignee: undefined });
    task.skills = ['typescript'];
    const away = createEmployee({ status: 'away', skills: ['typescript'] });
    const active = createEmployee({ status: 'active', skills: ['typescript'] });
    const matched = matchTaskToEmployee(task, [away, active]);
    expect(matched).not.toBeNull();
    expect(matched!.employee).toBe(active);
  });

  it('returns null when no employees provided', () => {
    const task = createTask({ status: 'ready', assignee: undefined });
    const matched = matchTaskToEmployee(task, []);
    expect(matched).toBeNull();
  });

  it('prefers template-matched employee when templates provided', () => {
    const task = createTask({ status: 'ready', assignee: undefined });
    task.skills = ['typescript', 'react'];
    const empA = createEmployee({ name: 'alice', status: 'active', skills: ['typescript', 'react'] });
    const empB = createEmployee({ name: 'bob', status: 'active', skills: ['typescript'] });
    const templates: AgentTemplate[] = [
      { _id: 't1', name: 'alice', role: 'architect', model: 'claude-opus', temperature: 0.3, systemPrompt: 'architect', skills: ['typescript', 'react'], estimatedCostPer1kTokens: 0.015 },
      { _id: 't2', name: 'bob', role: 'executor', model: 'claude-sonnet', temperature: 0.2, systemPrompt: 'executor', skills: ['node'], estimatedCostPer1kTokens: 0.003 },
    ];
    const matched = matchTaskToEmployee(task, [empA, empB], templates);
    expect(matched).not.toBeNull();
    expect(matched!.employee).toBe(empA);
    expect(matched!.template).toBe(templates[0]);
  });

  it('falls back to employee matching when no template matches', () => {
    const task = createTask({ status: 'ready', assignee: undefined });
    task.skills = ['typescript'];
    const emp = createEmployee({ name: 'carol', status: 'active', skills: ['typescript'] });
    const templates: AgentTemplate[] = [
      { _id: 't1', name: 'alice', role: 'architect', model: 'claude-opus', temperature: 0.3, systemPrompt: '', skills: ['python'], estimatedCostPer1kTokens: 0.015 },
    ];
    const matched = matchTaskToEmployee(task, [emp], templates);
    expect(matched).not.toBeNull();
    expect(matched!.employee).toBe(emp);
    expect(matched!.template).toBeUndefined();
  });
});

describe('executeTaskWithEmployee', () => {
  it('spawns employee CLI with task context and captures stdout', async () => {
    const task = createTask({ status: 'ready', title: 'Fix bug', spec: 'fix the login' });
    const employee = createEmployee({ status: 'active', model: 'gpt-4' });
    const deps = createMockDeps({
      executeCommand: mock(async () => ({
        stdout: 'Done',
        stderr: '',
        exitCode: 0,
        timedOut: false,
        tokensExceeded: false,
      })),
    });

    const result = await executeTaskWithEmployee(task, employee, deps);

    expect(deps.executeCommand).toHaveBeenCalled();
    expect(result.success).toBe(true);
    expect(result.output).toBe('Done');
  });

  it('captures stderr in output on failure', async () => {
    const task = createTask({ status: 'ready', title: 'Break things' });
    const employee = createEmployee({ status: 'active' });
    const deps = createMockDeps({
      executeCommand: mock(async () => ({
        stdout: '',
        stderr: 'Error: something broke',
        exitCode: 1,
        timedOut: false,
        tokensExceeded: false,
      })),
    });

    const result = await executeTaskWithEmployee(task, employee, deps);

    expect(result.success).toBe(false);
    expect(result.output).toContain('Error: something broke');
  });

  it('reports failure on non-zero exit code', async () => {
    const task = createTask({ status: 'ready' });
    const employee = createEmployee({ status: 'active' });
    const deps = createMockDeps({
      executeCommand: mock(async () => ({
        stdout: '',
        stderr: '',
        exitCode: 1,
        timedOut: false,
        tokensExceeded: false,
      })),
    });

    const result = await executeTaskWithEmployee(task, employee, deps);

    expect(result.success).toBe(false);
  });

  it('reports failure on timeout', async () => {
    const task = createTask({ status: 'ready' });
    const employee = createEmployee({ status: 'active' });
    const deps = createMockDeps({
      executeCommand: mock(async () => ({
        stdout: '',
        stderr: '',
        exitCode: 0,
        timedOut: true,
        tokensExceeded: false,
      })),
    });

    const result = await executeTaskWithEmployee(task, employee, deps);

    expect(result.success).toBe(false);
  });
});

describe('runSchedulerTick', () => {
  it('queries ready tasks and active employees', async () => {
    const deps = createMockDeps();
    await runSchedulerTick(deps);

    expect(deps.queryReadyTasks).toHaveBeenCalled();
    expect(deps.queryActiveEmployees).toHaveBeenCalled();
  });

  it('does nothing when no ready tasks exist', async () => {
    const deps = createMockDeps({
      queryReadyTasks: mock(async () => []),
      queryActiveEmployees: mock(async () => [createEmployee()]),
    });
    await runSchedulerTick(deps);

    expect(deps.createRun).not.toHaveBeenCalled();
    expect(deps.updateTaskStatus).not.toHaveBeenCalled();
  });

  it('does nothing when no active employees exist', async () => {
    const deps = createMockDeps({
      queryReadyTasks: mock(async () => [createTask({ status: 'ready' })]),
      queryActiveEmployees: mock(async () => []),
    });
    await runSchedulerTick(deps);

    expect(deps.createRun).not.toHaveBeenCalled();
    expect(deps.updateTaskStatus).not.toHaveBeenCalled();
  });

  it('skips tasks already in progress', async () => {
    const deps = createMockDeps({
      queryReadyTasks: mock(async () => [
        createTask({ status: 'in_progress' }),
      ]),
      queryActiveEmployees: mock(async () => [createEmployee()]),
    });
    await runSchedulerTick(deps);

    expect(deps.createRun).not.toHaveBeenCalled();
  });

  it('creates a run and updates task to in_progress on match', async () => {
    const task = createTask({ status: 'ready', assignee: undefined });
    task.skills = ['typescript'];
    const employee = createEmployee({ status: 'active', skills: ['typescript', 'react'] });

    const deps = createMockDeps({
      queryReadyTasks: mock(async () => [task]),
      queryActiveEmployees: mock(async () => [employee]),
      executeCommand: mock(async () => ({
        stdout: 'Completed',
        stderr: '',
        exitCode: 0,
        timedOut: false,
        tokensExceeded: false,
      })),
    });

    await runSchedulerTick(deps);

    expect(deps.createRun).toHaveBeenCalled();
    expect(deps.updateTaskStatus).toHaveBeenCalledWith(expect.any(String), 'in_progress');
  });

  it('updates task to done on success', async () => {
    const task = createTask({ status: 'ready', assignee: undefined });
    task.skills = ['typescript'];
    const employee = createEmployee({ status: 'active', skills: ['typescript'] });

    const deps = createMockDeps({
      queryReadyTasks: mock(async () => [task]),
      queryActiveEmployees: mock(async () => [employee]),
      executeCommand: mock(async () => ({
        stdout: 'Done',
        stderr: '',
        exitCode: 0,
        timedOut: false,
        tokensExceeded: false,
      })),
    });

    await runSchedulerTick(deps);

    expect(deps.updateTaskStatus).toHaveBeenCalledWith(expect.any(String), 'done');
  });

  it('updates task to blocked on failure after retries exhausted', async () => {
    const task = createTask({ status: 'ready', assignee: undefined });
    task.skills = ['typescript'];
    const employee = createEmployee({ status: 'active', skills: ['typescript'] });

    const deps = createMockDeps({
      queryReadyTasks: mock(async () => [task]),
      queryActiveEmployees: mock(async () => [employee]),
      executeCommand: mock(async () => ({
        stdout: '',
        stderr: 'fail',
        exitCode: 1,
        timedOut: false,
        tokensExceeded: false,
      })),
    });

    const retryManager = new RetryManager({
      maxRetries: 3,
      baseDelayMs: 1,
      maxDelayMs: 1,
      jitterMs: 0,
    });

    await runSchedulerTick(deps, retryManager);

    expect(deps.updateTaskStatus).toHaveBeenCalledWith(expect.any(String), 'blocked');
  });

  it('retries up to maxRetries before blocking', async () => {
    const task = createTask({ status: 'ready', assignee: undefined });
    task.skills = ['typescript'];
    const employee = createEmployee({ status: 'active', skills: ['typescript'] });

    const executeCommand = mock(async () => ({
      stdout: '',
      stderr: 'fail',
      exitCode: 1,
      timedOut: false,
      tokensExceeded: false,
    }));

    const deps = createMockDeps({
      queryReadyTasks: mock(async () => [task]),
      queryActiveEmployees: mock(async () => [employee]),
      executeCommand,
    });

    const retryManager = new RetryManager({
      maxRetries: 3,
      baseDelayMs: 1,
      maxDelayMs: 1,
      jitterMs: 0,
    });

    await runSchedulerTick(deps, retryManager);

    // Initial attempt + 3 retries = 4 calls total
    expect(executeCommand).toHaveBeenCalledTimes(4);
  });

  it('appends run output on completion', async () => {
    const task = createTask({ status: 'ready', assignee: undefined });
    task.skills = ['typescript'];
    const employee = createEmployee({ status: 'active', skills: ['typescript'] });

    const deps = createMockDeps({
      queryReadyTasks: mock(async () => [task]),
      queryActiveEmployees: mock(async () => [employee]),
      executeCommand: mock(async () => ({
        stdout: 'hello',
        stderr: 'world',
        exitCode: 0,
        timedOut: false,
        tokensExceeded: false,
      })),
    });

    await runSchedulerTick(deps);

    expect(deps.appendRunOutput).toHaveBeenCalled();
  });

  it('does not pick same task twice if already in_progress', async () => {
    const task = createTask({ status: 'in_progress' });
    const employee = createEmployee({ status: 'active' });

    const deps = createMockDeps({
      queryReadyTasks: mock(async () => [task]),
      queryActiveEmployees: mock(async () => [employee]),
    });

    await runSchedulerTick(deps);

    expect(deps.executeCommand).not.toHaveBeenCalled();
  });

  it('skips ready task with no matching employee skills', async () => {
    const task = createTask({ status: 'ready', assignee: undefined });
    task.skills = ['rust'];
    const employee = createEmployee({ status: 'active', skills: ['typescript'] });

    const deps = createMockDeps({
      queryReadyTasks: mock(async () => [task]),
      queryActiveEmployees: mock(async () => [employee]),
    });

    await runSchedulerTick(deps);

    expect(deps.createRun).not.toHaveBeenCalled();
  });
});
