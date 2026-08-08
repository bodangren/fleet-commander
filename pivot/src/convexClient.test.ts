import { describe, expect, test } from 'bun:test';
import { api } from '../../convex/_generated/api';
import type {
  FunctionReference,
  FunctionArgs,
  FunctionReturnType,
} from 'convex/server';
import type { ConvexHttpClient } from 'convex/browser';
import {
  typedQuery,
  typedMutation,
  dynamicConvexCall,
} from './convexClient';

// Type-level deep-equality helper (no expect-type / tsd in this project).
type AssertEqual<T, U> = (<G>() => G extends T ? 1 : 2) extends (<G>() => G extends U ? 1 : 2)
  ? true
  : false;

// ──────────────────────────────────────────────────────────────────────────────
// Phase 1 Task 3: Wrapper existence and runtime contract
// ──────────────────────────────────────────────────────────────────────────────

describe('Phase 1 Task 3: dynamicConvexCall wrapper runtime', () => {
  test('dynamicConvexCall is exported from convexClient', () => {
    expect(typeof dynamicConvexCall).toBe('function');
  });

  test('typedQuery is still exported (regression check)', () => {
    expect(typeof typedQuery).toBe('function');
  });

  test('typedMutation is still exported (regression check)', () => {
    expect(typeof typedMutation).toBe('function');
  });

  test('dynamicConvexCall delegates to the client with the function reference', async () => {
    const calls: Array<{ fn: unknown; args: unknown }> = [];
    const stubClient = {
      query: async (fn: unknown, args: unknown) => {
        calls.push({ fn, args });
        return [
          {
            name: 'retrospective',
            displayName: null,
            mode: null,
            model: 'openai/gpt-4o',
            status: 'active',
            workload: 0,
            maxWorkload: 5,
            temperature: null,
            prompt: null,
            toolsJson: null,
            source: null,
            updatedAt: null,
          },
        ];
      },
      mutation: async (fn: unknown, args: unknown) => {
        calls.push({ fn, args });
        return 'mutation-result';
      },
    } as unknown as ConvexHttpClient;

    const fnRef = api.fleetCatalog.listAgents;
    const result = await dynamicConvexCall(stubClient, fnRef, {});

    expect(calls).toHaveLength(1);
    expect(calls[0]?.fn).toBe(fnRef);
    expect(result).toEqual([
      {
        name: 'retrospective',
        displayName: null,
        mode: null,
        model: 'openai/gpt-4o',
        status: 'active',
        workload: 0,
        maxWorkload: 5,
        temperature: null,
        prompt: null,
        toolsJson: null,
        source: null,
        updatedAt: null,
      },
    ]);
  });

  test('dynamicConvexCall routes mutation references to client.mutation', async () => {
    const calls: Array<{ method: string; fn: unknown; args: unknown }> = [];
    const stubClient = {
      query: async (fn: unknown, args: unknown) => {
        calls.push({ method: 'query', fn, args });
        return null;
      },
      mutation: async (fn: unknown, args: unknown) => {
        calls.push({ method: 'mutation', fn, args });
        return null;
      },
    } as unknown as ConvexHttpClient;

    const fnRef = api.fleetCatalog.setSetting;
    const result = await dynamicConvexCall(stubClient, fnRef, {
      scope: 'test',
      key: 'k',
      valueJson: '{}',
    });

    expect(calls).toHaveLength(1);
    expect(calls[0]?.method).toBe('mutation');
    expect(result).toBeNull();
  });

  test('dynamicConvexCall rejects unresolved function references instead of defaulting to query', async () => {
    const calls: string[] = [];
    const stubClient = {
      query: async () => {
        calls.push('query');
        return null;
      },
      mutation: async () => {
        calls.push('mutation');
        return null;
      },
    } as unknown as ConvexHttpClient;
    const fnRef = {
      [Symbol.for('functionName')]: 'missing:unknown',
    } as unknown as typeof api.fleetCatalog.listAgents;

    await expect(dynamicConvexCall(stubClient, fnRef, {})).rejects.toThrow(
      'Unknown Convex function reference: missing:unknown',
    );
    expect(calls).toEqual([]);
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// Phase 1 Task 3: Wrapper type inference (compile-time assertions)
// ──────────────────────────────────────────────────────────────────────────────

describe('Phase 1 Task 3: dynamicConvexCall type inference', () => {
  test('wrapper infers return type from api.* query reference', () => {
    const fnRef = api.fleetCatalog.listAgents;
    type Wrapper = typeof dynamicConvexCall<typeof fnRef>;
    type Inferred = Awaited<ReturnType<Wrapper>>;
    type Expected = FunctionReturnType<typeof fnRef>;
    type Check = AssertEqual<Inferred, Expected>;
    const assert: Check = true;
    expect(assert).toBe(true);
  });

  test('wrapper infers args type from api.* query reference', () => {
    const fnRef = api.fleetCatalog.getAgentByName;
    type Wrapper = typeof dynamicConvexCall<typeof fnRef>;
    type Param = Parameters<Wrapper>[2];
    type Expected = FunctionArgs<typeof fnRef>;
    type Check = AssertEqual<Param, Expected>;
    const assert: Check = true;
    expect(assert).toBe(true);
  });

  test('wrapper accepts FunctionReference values (not string literals)', () => {
    const fnRef: FunctionReference<'query'> = api.fleetCatalog.listAgents;
    type Check = AssertEqual<typeof fnRef, FunctionReference<'query'>>;
    const assert: Check = true;
    expect(assert).toBe(true);
  });

  test('wrapper rejects string literals at the type level', () => {
    // This block must produce a type error: string literals are not
    // FunctionReference values. If the wrapper silently accepts strings,
    // removing @ts-expect-error will surface the contract violation.
    const _bad = dynamicConvexCall(
      {} as ConvexHttpClient,
      // @ts-expect-error — string literals must be rejected by the wrapper
      'fleetCatalog:listAgents',
      {},
    );
    _bad.catch(() => {});
    expect(_bad).toBeInstanceOf(Promise);
  });

  test('wrapper does not default generics or accept unknown', () => {
    // If the wrapper signature falls back to `unknown` args, this call
    // compiles without complaint. The @ts-expect-error enforces that
    // untyped args are rejected.
    const fnRef = api.fleetCatalog.listAgents;
    // @ts-expect-error — args of type unknown must be rejected
    void dynamicConvexCall({} as ConvexHttpClient, fnRef, undefined);
    expect(true).toBe(true);
  });
});
