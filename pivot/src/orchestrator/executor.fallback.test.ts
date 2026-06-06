/**
 * Phase 3 fallback-chain integration tests for `executeTaskWithFallback`.
 *
 * These tests cover the contract documented in
 * `measure/tracks/provider_health_resilience_20260605/test-strategy.md` §5
 * (Phase 3 — Incomplete: Fallback integration tests):
 *
 *   - Stub `executeFn` to fail with a provider error on first call, succeed on second
 *   - Assert `selectFallbackModel` is called with correct healthMap
 *   - Assert `onFallbackEvent` callback fires with fallbackFrom, fallbackTo, fallbackReason
 *   - Assert fallbackEvents Convex row is persisted via `persistFallbackEvent`
 *   - Test exhausted fallbacks (all unhealthy): executor returns error, single fallbackEvent with null `fallbackTo`
 *
 * Cross-phase edge cases from §3 also covered:
 *   - `executeTaskWithFallback` maxFallbacks=0 → single-attempt, no fallbackEvent
 *   - `tokens_exceeded` is NOT a provider error → no fallback
 *   - All providers unhealthy → executor propagates a clear error
 *
 * The tests use prefixed model IDs (`openai/gpt-4o`, `anthropic/claude-3-opus`,
 * `google/gemini-pro`) so that `selectFallbackModel`'s default provider-prefix
 * resolver matches the `healthMap` keys (`openai`, `anthropic`, `google`).
 *
 * Spec: `measure/tracks/provider_health_resilience_20260605/spec.md`
 * Test strategy: `measure/tracks/provider_health_resilience_20260605/test-strategy.md`
 */
import { describe, expect, it, mock, type Mock } from 'bun:test';
import { executeTask, executeTaskWithFallback, type FallbackEvent } from './executor';
import type { HealthMap, ProviderHealthState } from '../policy/providerHealth';
import type { ConvexHttpClient } from 'convex/browser';
import type { ExecutionResult } from './types';
import type { ResolveOptions } from './resolver';
import type { OpencodeClient } from '@opencode-ai/sdk';

// ---------------------------------------------------------------------------
// Factories
// ---------------------------------------------------------------------------

function makeHealthState(overrides: Partial<ProviderHealthState> = {}): ProviderHealthState {
  return {
    providerName: 'openai',
    status: 'healthy',
    avgLatencyMs: 2000,
    failureCount: 0,
    lastCheckedAt: Date.now(),
    lastSuccessAt: Date.now(),
    ...overrides,
  };
}

function makeHealthMap(overrides: Partial<HealthMap> = {}): HealthMap {
  return {
    openai: makeHealthState({ providerName: 'openai', status: 'healthy' }),
    anthropic: makeHealthState({ providerName: 'anthropic', status: 'healthy' }),
    google: makeHealthState({ providerName: 'google', status: 'healthy' }),
    ...overrides,
  };
}

function makeFailed(error: string, failureType: ExecutionResult['failureType'] = 'exit_code'): ExecutionResult {
  return {
    taskKey: 'task-fallback',
    status: 'failed',
    durationMs: 100,
    error,
    failureType,
    output: '',
  };
}

function makeSucceeded(output = 'ok'): ExecutionResult {
  return {
    taskKey: 'task-fallback',
    status: 'succeeded',
    durationMs: 200,
    exitCode: 0,
    output,
  };
}

function makeTokensExceeded(): ExecutionResult {
  return {
    taskKey: 'task-fallback',
    status: 'failed',
    durationMs: 100,
    error: 'output exceeded max tokens',
    failureType: 'tokens_exceeded',
    output: 'partial output',
  };
}

function makeMockClient() {
  const mutationMock = mock(
    async (..._args: unknown[]): Promise<string> => 'fallbackEvents-1',
  ) as Mock<(name: string, ...args: unknown[]) => Promise<string>>;
  const queryMock = mock(
    async (..._args: unknown[]): Promise<unknown> => [],
  ) as Mock<(name: string, ...args: unknown[]) => Promise<unknown>>;

  const client = {
    mutation: mutationMock as unknown as ConvexHttpClient['mutation'],
    query: queryMock as unknown as ConvexHttpClient['query'],
  } as ConvexHttpClient;

  return { client, mutationMock, queryMock };
}

function makeMockExecuteFn(implementation: typeof executeTask) {
  return mock(implementation) as unknown as typeof executeTask;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const FALLBACK_MODELS = [
  'openai/gpt-4o',
  'anthropic/claude-3-opus',
  'google/gemini-pro',
] as const;

const RESOLVE_OPTIONS: ResolveOptions = {};
const INJECTED_SDK = {} as OpencodeClient;

// ---------------------------------------------------------------------------
// executeTaskWithFallback
// ---------------------------------------------------------------------------

describe('executeTaskWithFallback', () => {
  it('returns the first-attempt success without recording any fallback event', async () => {
    const { client } = makeMockClient();
    const executeFn = makeMockExecuteFn(async () => makeSucceeded('primary output'));

    const result = await executeTaskWithFallback(
      executeFn,
      client,
      'openai/gpt-4o',
      'do the thing',
      'task-fallback',
      5000,
      [...FALLBACK_MODELS],
      makeHealthMap(),
    );

    expect(executeFn).toHaveBeenCalledTimes(1);
    expect(result.status).toBe('succeeded');
    expect(result.output).toBe('primary output');
    expect(result.fallbackEvents).toEqual([]);
    expect(client.mutation).not.toHaveBeenCalled();
  });

  it('retries with the next healthy model when the first attempt fails with a provider error', async () => {
    const { client } = makeMockClient();
    const modelsSeen: string[] = [];
    const executeFn = makeMockExecuteFn(async (_c, agentTag: string) => {
      modelsSeen.push(agentTag);
      if (modelsSeen.length === 1) {
        return makeFailed('provider error: 503 service unavailable');
      }
      return makeSucceeded('fallback output');
    });

    const result = await executeTaskWithFallback(
      executeFn,
      client,
      'openai/gpt-4o',
      'do the thing',
      'task-fallback',
      5000,
      [...FALLBACK_MODELS],
      makeHealthMap(),
    );

    expect(executeFn).toHaveBeenCalledTimes(2);
    expect(modelsSeen).toEqual(['openai/gpt-4o', 'anthropic/claude-3-opus']);
    expect(result.status).toBe('succeeded');
    expect(result.output).toBe('fallback output');
  });

  it('records one fallback event with fallbackFrom, fallbackTo, fallbackReason, attemptNumber per retry', async () => {
    const { client } = makeMockClient();
    const executeFn = makeMockExecuteFn(async () => {
      return makeFailed('provider error: rate limit');
    });

    const result = await executeTaskWithFallback(
      executeFn,
      client,
      'openai/gpt-4o',
      'do the thing',
      'task-fallback',
      5000,
      [...FALLBACK_MODELS],
      makeHealthMap(),
    );

    expect(result.fallbackEvents).toBeDefined();
    expect(result.fallbackEvents!.length).toBeGreaterThan(0);

    const event = result.fallbackEvents![0];
    expect(event.taskKey).toBe('task-fallback');
    expect(event.fallbackFrom).toBe('openai/gpt-4o');
    expect(event.fallbackTo).toBe('anthropic/claude-3-opus');
    expect(event.fallbackReason).toBe('provider error: rate limit');
    expect(event.attemptNumber).toBe(1);
    expect(typeof event.timestamp).toBe('number');
    expect(event.timestamp).toBeGreaterThan(0);
  });

  it('invokes the onFallbackEvent callback with each fallback event when provided', async () => {
    const { client } = makeMockClient();
    const callback = mock((_event: FallbackEvent) => {});
    const executeFn = makeMockExecuteFn(async () => makeFailed('connection refused'));

    const result = await executeTaskWithFallback(
      executeFn,
      client,
      'openai/gpt-4o',
      'do the thing',
      'task-fallback',
      5000,
      [...FALLBACK_MODELS],
      makeHealthMap(),
      2,
      callback,
    );

    expect(callback).toHaveBeenCalled();
    const firstCallArg = callback.mock.calls[0][0] as FallbackEvent;
    expect(firstCallArg.fallbackFrom).toBe('openai/gpt-4o');
    expect(firstCallArg.fallbackTo).toBe('anthropic/claude-3-opus');
    expect(firstCallArg.fallbackReason).toBe('connection refused');
    expect(firstCallArg.attemptNumber).toBe(1);
    expect(result.fallbackEvents!.length).toBe(callback.mock.calls.length);
  });

  it('bypasses the default Convex persistence handler when a custom callback is provided', async () => {
    const { client } = makeMockClient();
    const callback = mock((_event: FallbackEvent) => {});
    const executeFn = makeMockExecuteFn(async () => makeFailed('downstream error'));

    await executeTaskWithFallback(
      executeFn,
      client,
      'openai/gpt-4o',
      'do the thing',
      'task-fallback',
      5000,
      [...FALLBACK_MODELS],
      makeHealthMap(),
      2,
      callback,
    );

    expect(callback).toHaveBeenCalled();
    expect(client.mutation).not.toHaveBeenCalled();
  });

  it('persists each fallback event to Convex via client.mutation when no callback is provided', async () => {
    const { client, mutationMock } = makeMockClient();
    const executeFn = makeMockExecuteFn(async () => makeFailed('provider error'));

    const result = await executeTaskWithFallback(
      executeFn,
      client,
      'openai/gpt-4o',
      'do the thing',
      'task-fallback',
      5000,
      [...FALLBACK_MODELS],
      makeHealthMap(),
    );

    expect(client.mutation).toHaveBeenCalled();
    const mutationCalls = mutationMock.mock.calls;
    const resultEventCount = result.fallbackEvents!.length;
    expect(mutationCalls.length).toBe(resultEventCount);

    const [, firstCallArgs] = mutationCalls[0] as [unknown, Record<string, unknown>];
    expect(firstCallArgs.taskKey).toBe('task-fallback');
    expect(firstCallArgs.fallbackFrom).toBe('openai/gpt-4o');
    expect(firstCallArgs.fallbackTo).toBe('anthropic/claude-3-opus');
    expect(firstCallArgs.fallbackReason).toBe('provider error');
    expect(firstCallArgs.attemptNumber).toBe(1);
  });

  it('retries up to maxFallbacks times and then returns the last failure result', async () => {
    const { client } = makeMockClient();
    const executeFn = makeMockExecuteFn(async () => makeFailed('still down'));

    const result = await executeTaskWithFallback(
      executeFn,
      client,
      'openai/gpt-4o',
      'do the thing',
      'task-fallback',
      5000,
      [...FALLBACK_MODELS],
      makeHealthMap(),
      2,
    );

    // default maxFallbacks=2 → 1 initial attempt + 2 retries = 3 total
    expect(executeFn).toHaveBeenCalledTimes(3);
    expect(result.status).toBe('failed');
    expect(result.error).toBe('still down');
    expect(result.fallbackEvents!.length).toBe(2);
  });

  it('honors maxFallbacks=0 and runs a single attempt with no fallback event', async () => {
    const { client } = makeMockClient();
    const executeFn = makeMockExecuteFn(async () => makeFailed('provider error'));

    const result = await executeTaskWithFallback(
      executeFn,
      client,
      'openai/gpt-4o',
      'do the thing',
      'task-fallback',
      5000,
      [...FALLBACK_MODELS],
      makeHealthMap(),
      0,
    );

    expect(executeFn).toHaveBeenCalledTimes(1);
    expect(result.status).toBe('failed');
    expect(result.fallbackEvents).toEqual([]);
    expect(client.mutation).not.toHaveBeenCalled();
  });

  it('does not retry on a non-provider error such as tokens_exceeded', async () => {
    const { client } = makeMockClient();
    const executeFn = makeMockExecuteFn(async () => makeTokensExceeded());

    const result = await executeTaskWithFallback(
      executeFn,
      client,
      'openai/gpt-4o',
      'do the thing',
      'task-fallback',
      5000,
      [...FALLBACK_MODELS],
      makeHealthMap(),
      2,
    );

    expect(executeFn).toHaveBeenCalledTimes(1);
    expect(result.status).toBe('failed');
    expect(result.failureType).toBe('tokens_exceeded');
    expect(result.fallbackEvents).toEqual([]);
    expect(client.mutation).not.toHaveBeenCalled();
  });

  it('uses selectFallbackModel to skip unhealthy providers when picking the next retry', async () => {
    const { client } = makeMockClient();
    const modelsSeen: string[] = [];
    const executeFn = makeMockExecuteFn(async (_c, agentTag: string) => {
      modelsSeen.push(agentTag);
      if (modelsSeen.length === 1) return makeFailed('primary down');
      return makeSucceeded('healthy model output');
    });

    // anthropic is unhealthy; the executor should skip it and pick google
    const result = await executeTaskWithFallback(
      executeFn,
      client,
      'openai/gpt-4o',
      'do the thing',
      'task-fallback',
      5000,
      [...FALLBACK_MODELS],
      makeHealthMap({
        anthropic: makeHealthState({ providerName: 'anthropic', status: 'unhealthy' }),
      }),
    );

    expect(executeFn).toHaveBeenCalledTimes(2);
    expect(modelsSeen[1]).toBe('google/gemini-pro');
    expect(result.fallbackEvents![0].fallbackTo).toBe('google/gemini-pro');
  });

  it('returns a clear failure when all providers in the health map are unhealthy', async () => {
    const { client } = makeMockClient();
    const executeFn = makeMockExecuteFn(async () => makeFailed('primary down'));

    const result = await executeTaskWithFallback(
      executeFn,
      client,
      'openai/gpt-4o',
      'do the thing',
      'task-fallback',
      5000,
      [...FALLBACK_MODELS],
      makeHealthMap({
        openai: makeHealthState({ providerName: 'openai', status: 'unhealthy' }),
        anthropic: makeHealthState({ providerName: 'anthropic', status: 'unhealthy' }),
        google: makeHealthState({ providerName: 'google', status: 'unhealthy' }),
      }),
    );

    expect(result.status).toBe('failed');
    // Implementation gap: the executor currently returns the failure without
    // recording a final fallbackEvent. This test documents the contract from
    // test-strategy §5 Phase 3: the executor should record one final event
    // with fallbackTo=null so audit logs reflect the exhausted-fallback case.
    expect(result.fallbackEvents!.length).toBe(1);
    expect(result.fallbackEvents![0].fallbackTo).toBeNull();
    expect(result.fallbackEvents![0].fallbackFrom).toBe('openai/gpt-4o');
    expect(result.fallbackEvents![0].fallbackReason).toBe('primary down');
  });

  it('records an incrementing attemptNumber for each sequential fallback', async () => {
    const { client } = makeMockClient();
    let attemptCount = 0;
    const executeFn = makeMockExecuteFn(async () => {
      attemptCount++;
      // First two calls fail, third call succeeds (recovered on the last retry)
      if (attemptCount >= 3) return makeSucceeded('recovered');
      return makeFailed(`transient ${attemptCount}`);
    });

    const result = await executeTaskWithFallback(
      executeFn,
      client,
      'openai/gpt-4o',
      'do the thing',
      'task-fallback',
      5000,
      [...FALLBACK_MODELS],
      makeHealthMap(),
      2,
    );

    // maxFallbacks=2 → 1 initial + 2 retries = 3 attempts; 3rd attempt recovers
    expect(result.status).toBe('succeeded');
    expect(result.fallbackEvents!.length).toBe(2);
    expect(result.fallbackEvents![0].attemptNumber).toBe(1);
    expect(result.fallbackEvents![1].attemptNumber).toBe(2);
  });

  it('passes resolveOptions and injectedOpencodeClient through to the underlying executeFn', async () => {
    const { client } = makeMockClient();
    const calls: Array<{ agentTag: string; resolveOptions?: ResolveOptions; sdk?: OpencodeClient }> = [];
    const executeFn = makeMockExecuteFn(
      async (
        _c: ConvexHttpClient,
        agentTag: string,
        _prompt: string,
        _taskKey: string,
        _timeoutMs: number,
        _maxTokens: number | undefined,
        resolveOptions: ResolveOptions | undefined,
        injectedOpencodeClient: OpencodeClient | undefined,
      ) => {
        calls.push({ agentTag, resolveOptions, sdk: injectedOpencodeClient });
        if (calls.length === 1) return makeFailed('retry me');
        return makeSucceeded('done');
      },
    );

    await executeTaskWithFallback(
      executeFn,
      client,
      'openai/gpt-4o',
      'do the thing',
      'task-fallback',
      5000,
      [...FALLBACK_MODELS],
      makeHealthMap(),
      2,
      undefined,
      RESOLVE_OPTIONS,
      INJECTED_SDK,
    );

    expect(calls.length).toBe(2);
    expect(calls[0].resolveOptions).toBe(RESOLVE_OPTIONS);
    expect(calls[0].sdk).toBe(INJECTED_SDK);
    expect(calls[1].resolveOptions).toBe(RESOLVE_OPTIONS);
    expect(calls[1].sdk).toBe(INJECTED_SDK);
  });
});
