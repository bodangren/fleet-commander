import { describe, expect, it } from 'bun:test';
import { buildAgentPrompt, executeWithRetry } from './executeWithRetry';
import type { Task, OrchestratorConfig, ExecutionOptions, ExecutionResult } from '../types';

const baseConfig: OrchestratorConfig = {
  maxRetries: 0,
  baseDelayMs: 0,
  maxDelayMs: 0,
  commandTimeoutMs: 60_000,
};

function makeTask(overrides: Partial<Task> = {}): Task {
  return {
    projectSlug: 'demo',
    trackId: 'demo_track',
    taskKey: 'T-001',
    title: 'Implement the feature',
    status: 'ready',
    assignee: 'alice',
    dependencies: [],
    updatedAt: Date.now(),
    ...overrides,
  };
}

function makeLifecycle() {
  return {
    appendLog: async () => undefined,
    start: async () => undefined,
    finalize: async () => undefined,
  } as any;
}

function makeClient() {
  return {
    mutation: async () => undefined,
    query: async () => null,
  } as any;
}

describe('buildAgentPrompt', () => {
  it('returns task title when no track context is supplied', () => {
    const task = makeTask({ title: 'Bare task' });
    expect(buildAgentPrompt(task, undefined, 16_000)).toBe('Bare task');
  });

  it('prepends Specification and Implementation Plan sections from track context', () => {
    const task = makeTask({ title: 'Add login button' });
    const prompt = buildAgentPrompt(
      task,
      {
        title: 'Auth Track',
        specMarkdown: 'AC-1: login works',
        planMarkdown: 'Phase 1: scaffolding',
      },
      16_000,
    );
    expect(prompt).toContain('# Task: Add login button');
    expect(prompt).toContain('# Specification');
    expect(prompt).toContain('AC-1: login works');
    expect(prompt).toContain('# Implementation Plan');
    expect(prompt).toContain('Phase 1: scaffolding');
  });

  it('truncates with [truncated] suffix when the prompt exceeds contextMaxChars', () => {
    const task = makeTask({ title: 'big task' });
    const spec = 'S'.repeat(20_000);
    const plan = 'P'.repeat(20_000);
    const prompt = buildAgentPrompt(
      task,
      { title: 'huge', specMarkdown: spec, planMarkdown: plan },
      16_000,
    );
    expect(prompt.length).toBeLessThanOrEqual(16_000);
    expect(prompt.endsWith('[truncated]')).toBe(true);
  });
});

describe('executeWithRetry', () => {
  it('carries timeout, token, and project-path bounds to an injected backend', async () => {
    let capturedTimeout: number | undefined;
    let capturedOptions: ExecutionOptions | undefined;
    const executeFn = async (
      _client: unknown,
      _agent: string,
      _prompt: string,
      taskKey: string,
      timeoutMs: number,
      options?: ExecutionOptions,
    ): Promise<ExecutionResult> => {
      capturedTimeout = timeoutMs;
      capturedOptions = options;
      return { taskKey, status: 'succeeded', durationMs: 1, output: '' };
    };

    await executeWithRetry(
      makeClient(),
      'demo',
      makeTask(),
      baseConfig,
      undefined,
      executeFn,
      makeLifecycle(),
      12_345,
      678,
      undefined,
      16_000,
      '/imported/project',
    );

    expect(capturedTimeout).toBe(12_345);
    expect(capturedOptions).toEqual({
      sessionId: undefined,
      projectPath: '/imported/project',
      maxTokens: 678,
    });
  });

  it('falls back to configured bounds for non-positive contract overrides', async () => {
    const captured: Array<{ timeoutMs: number; maxTokens: number | undefined }> = [];
    const executeFn = async (
      _client: unknown,
      _agent: string,
      _prompt: string,
      taskKey: string,
      timeoutMs: number,
      options?: ExecutionOptions,
    ): Promise<ExecutionResult> => {
      captured.push({ timeoutMs, maxTokens: options?.maxTokens });
      return { taskKey, status: 'succeeded', durationMs: 1, output: '' };
    };

    await executeWithRetry(
      makeClient(),
      'demo',
      makeTask(),
      { ...baseConfig, commandTimeoutMs: 60_000, maxTokens: 16_000 },
      undefined,
      executeFn,
      makeLifecycle(),
      0,
      -1,
    );

    expect(captured).toEqual([{ timeoutMs: 60_000, maxTokens: 16_000 }]);
  });

  it('passes the spec+plan-augmented prompt to the injected executeFn', async () => {
    let capturedPrompt = '';
    const executeFn = async (
      _client: unknown,
      _agent: string,
      prompt: string,
      taskKey: string,
    ): Promise<ExecutionResult> => {
      capturedPrompt = prompt;
      return {
        taskKey,
        status: 'succeeded',
        durationMs: 1,
        output: '',
      };
    };

    const task = makeTask({ title: 'Implement login' });
    const result = await executeWithRetry(
      makeClient(),
      'demo',
      task,
      baseConfig,
      undefined,
      executeFn,
      makeLifecycle(),
      undefined,
      undefined,
      {
        title: 'Auth Track',
        specMarkdown: 'spec body here',
        planMarkdown: 'plan body here',
      },
      16_000,
    );

    expect(result.lastResult?.status).toBe('succeeded');
    expect(capturedPrompt).toContain('# Specification');
    expect(capturedPrompt).toContain('spec body here');
    expect(capturedPrompt).toContain('# Implementation Plan');
    expect(capturedPrompt).toContain('plan body here');
  });

  it('falls back to task.title when no track context is supplied', async () => {
    let capturedPrompt = '';
    const executeFn = async (
      _client: unknown,
      _agent: string,
      prompt: string,
      taskKey: string,
    ): Promise<ExecutionResult> => {
      capturedPrompt = prompt;
      return { taskKey, status: 'succeeded', durationMs: 1, output: '' };
    };

    const task = makeTask({ title: 'Bare prompt task' });
    await executeWithRetry(
      makeClient(),
      'demo',
      task,
      baseConfig,
      undefined,
      executeFn,
      makeLifecycle(),
      undefined,
      undefined,
    );

    expect(capturedPrompt).toBe('Bare prompt task');
  });
});
