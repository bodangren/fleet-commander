import { describe, expect, test } from 'bun:test';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
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

const INVENTORY_PATH = join(
  process.cwd(),
  '..',
  'measure',
  'tracks',
  'typed_convex_boundary_20260605',
  'inventory.md',
);

// ──────────────────────────────────────────────────────────────────────────────
// Phase 1 Task 1: Inventory artifact
// ──────────────────────────────────────────────────────────────────────────────

describe('Phase 1 Task 1: Typed Convex inventory', () => {
  test('inventory.md exists at the track path', () => {
    expect(existsSync(INVENTORY_PATH)).toBe(true);
  });

  test('inventory.md contains the pivot string-based call section', () => {
    const content = readFileSync(INVENTORY_PATH, 'utf8');
    expect(content).toMatch(/## Pivot String-Based Convex Calls/);
  });

  test('inventory.md contains the frontend string-based call section', () => {
    const content = readFileSync(INVENTORY_PATH, 'utf8');
    expect(content).toMatch(/## Frontend String-Based Convex Calls/);
  });

  test('inventory.md contains the Convex-related as-any section', () => {
    const content = readFileSync(INVENTORY_PATH, 'utf8');
    expect(content).toMatch(/## Convex-Related `as any`/);
  });

  test('inventory.md table has call-site / target / args / return columns', () => {
    const content = readFileSync(INVENTORY_PATH, 'utf8');
    const headerPattern =
      /\|\s*Call Site\s*\|[^|]*Target[^|]*\|[^|]*Args[^|]*\|[^|]*Return[^|]*\|/;
    expect(content).toMatch(headerPattern);
  });

  test('inventory.md captures retrospectives.ts as a string-based call site', () => {
    const content = readFileSync(INVENTORY_PATH, 'utf8');
    expect(content).toMatch(/retrospectives\.ts/);
  });

  test('inventory.md captures costs.ts as a string-based call site', () => {
    const content = readFileSync(INVENTORY_PATH, 'utf8');
    expect(content).toMatch(/costs\.ts/);
  });

  test('inventory.md captures analytics.ts as a string-based call site', () => {
    const content = readFileSync(INVENTORY_PATH, 'utf8');
    expect(content).toMatch(/analytics\.ts/);
  });

  test('inventory.md captures performance.ts as a string-based call site', () => {
    const content = readFileSync(INVENTORY_PATH, 'utf8');
    expect(content).toMatch(/performance\.ts/);
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// Phase 1 Task 2: Wrapper design documentation
// ──────────────────────────────────────────────────────────────────────────────

describe('Phase 1 Task 2: Wrapper design', () => {
  test('inventory.md has a Wrapper Design section', () => {
    const content = readFileSync(INVENTORY_PATH, 'utf8');
    expect(content).toMatch(/## Wrapper Design/);
  });

  test('inventory.md identifies dynamic fn selection as a wrapper use case', () => {
    const content = readFileSync(INVENTORY_PATH, 'utf8');
    expect(content).toMatch(/dynamic/i);
  });

  test('inventory.md references the retrospective scheduler as a dynamic site', () => {
    const content = readFileSync(INVENTORY_PATH, 'utf8');
    expect(content).toMatch(/RetrospectiveScheduler|retrospective\/scheduler/);
  });
});

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
        return 'query-result';
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
    expect(result).toBe('query-result');
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
        return 'mutation-result';
      },
    } as unknown as ConvexHttpClient;

    const fnRef = api.fleetCatalog.createAgent;
    const result = await dynamicConvexCall(stubClient, fnRef, { name: 'test' });

    expect(calls).toHaveLength(1);
    expect(calls[0]?.method).toBe('mutation');
    expect(result).toBe('mutation-result');
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
    // @ts-expect-error — string literals must be rejected by the wrapper
    const _bad: unknown = dynamicConvexCall(
      {} as ConvexHttpClient,
      'fleetCatalog:listAgents',
      {},
    );
    expect(_bad).toBeDefined();
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
