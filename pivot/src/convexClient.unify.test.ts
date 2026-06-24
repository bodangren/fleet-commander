import { describe, expect, test } from 'bun:test';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { ConvexHttpClient } from 'convex/browser';
import type {
  FunctionReference,
  FunctionArgs,
  FunctionReturnType,
} from 'convex/server';
import {
  createConvexClient,
  getConvexUrl,
  typedQuery,
  typedMutation,
  dynamicConvexCall,
  api as convexApi,
} from './convexClient';
import { api as generatedApi } from '../../convex/_generated/api';

// Type-level deep-equality helper (no expect-type / tsd in this project).
type AssertEqual<T, U> = (<G>() => G extends T ? 1 : 2) extends (<G>() => G extends U ? 1 : 2)
  ? true
  : false;

const PIVOT_SRC_DIR = join(import.meta.dir);

/**
 * Recursively collect every .ts file under `pivot/src/`. We avoid
 * `Bun.Glob` to keep the test deterministic across runners and easy to
 * reason about in code review.
 *
 * @param dir - Directory to walk
 * @returns Absolute paths to every `.ts` file beneath `dir`
 */
function listPivotSourceFiles(dir: string): string[] {
  const out: string[] = [];
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...listPivotSourceFiles(fullPath));
      continue;
    }
    if (!entry.isFile()) continue;
    if (!entry.name.endsWith('.ts')) continue;
    if (entry.name.endsWith('.d.ts')) continue;
    out.push(fullPath);
  }
  return out;
}

/**
 * Recursive walker used for the deprecated-module absence assertion.
 *
 * @param dir - Directory to walk
 * @returns Absolute paths to every entry under `dir`
 */
function listAllPivotEntries(dir: string): string[] {
  const out: string[] = [];
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    out.push(fullPath);
    if (entry.isDirectory()) {
      out.push(...listAllPivotEntries(fullPath));
    }
  }
  return out;
}

// ──────────────────────────────────────────────────────────────────────────────
// Phase 1 Task 1: Only the canonical module exists.
// ──────────────────────────────────────────────────────────────────────────────

describe('Phase 1 Task 1: single canonical Convex client module', () => {
  test('canonical pivot/src/convexClient.ts exists', () => {
    expect(existsSync(join(PIVOT_SRC_DIR, 'convexClient.ts'))).toBe(true);
  });

  test('deprecated pivot/src/typedConvexClient.ts is absent', () => {
    expect(existsSync(join(PIVOT_SRC_DIR, 'typedConvexClient.ts'))).toBe(false);
  });

  test('no typedConvexClient.* file lives anywhere under pivot/src', () => {
    const matches = listAllPivotEntries(PIVOT_SRC_DIR).filter((p) =>
      /typedConvexClient(\.ts|\.tsx|\.js|\.cjs|\.mjs)?$/.test(p),
    );
    expect(matches).toEqual([]);
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// Phase 1 Task 2: Static import audit — zero callers of the deprecated path.
// ──────────────────────────────────────────────────────────────────────────────

describe('Phase 1 Task 2: no source imports the deprecated client path', () => {
  test('no pivot/src TypeScript file imports from a typedConvexClient module', () => {
    const selfPath = join(PIVOT_SRC_DIR, 'convexClient.unify.test.ts');
    const existingClientTestPath = join(PIVOT_SRC_DIR, 'convexClient.test.ts');
    const excluded = new Set([selfPath, existingClientTestPath]);

    const candidates = listPivotSourceFiles(PIVOT_SRC_DIR).filter(
      (p) => !excluded.has(p),
    );

    const violations: Array<{ file: string; line: number; text: string }> = [];
    const importPattern = /typedConvexClient/;

    for (const filePath of candidates) {
      const content = readFileSync(filePath, 'utf8');
      const lines = content.split('\n');
      lines.forEach((line, idx) => {
        if (importPattern.test(line)) {
          violations.push({ file: filePath, line: idx + 1, text: line.trim() });
        }
      });
    }

    expect(violations).toEqual([]);
  });

  test('all pivot/src callers reference ./convexClient or ../convexClient', () => {
    const selfPath = join(PIVOT_SRC_DIR, 'convexClient.unify.test.ts');
    const existingClientTestPath = join(PIVOT_SRC_DIR, 'convexClient.test.ts');
    const excluded = new Set([selfPath, existingClientTestPath]);

    const candidates = listPivotSourceFiles(PIVOT_SRC_DIR).filter(
      (p) => !excluded.has(p),
    );

    const importsCanonical = /from\s+['"](\.\.?\/)+convexClient['"]/;
    let convexClientImportCount = 0;

    for (const filePath of candidates) {
      const content = readFileSync(filePath, 'utf8');
      const lines = content.split('\n');
      for (const line of lines) {
        if (importsCanonical.test(line)) {
          convexClientImportCount += 1;
        }
      }
    }

    expect(convexClientImportCount).toBeGreaterThan(20);
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// Phase 1 Task 3: Canonical client exposes the unified API surface.
// ──────────────────────────────────────────────────────────────────────────────

describe('Phase 1 Task 3: canonical client exports unified API surface', () => {
  test('createConvexClient is exported as a function', () => {
    expect(typeof createConvexClient).toBe('function');
  });

  test('getConvexUrl is exported as a function', () => {
    expect(typeof getConvexUrl).toBe('function');
  });

  test('typedQuery is exported as a function', () => {
    expect(typeof typedQuery).toBe('function');
  });

  test('typedMutation is exported as a function', () => {
    expect(typeof typedMutation).toBe('function');
  });

  test('dynamicConvexCall is exported as a function', () => {
    expect(typeof dynamicConvexCall).toBe('function');
  });

  test('api namespace is re-exported as a non-null object', () => {
    expect(convexApi).toBeTruthy();
    expect(typeof convexApi).toBe('object');
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// Phase 1 Task 3 (cont): Re-exported `api` matches the generated source.
// ──────────────────────────────────────────────────────────────────────────────

describe('Phase 1 Task 3: canonical api re-export matches generated source', () => {
  test('convexClient.api is the same reference as convex/_generated/api', () => {
    expect(convexApi).toBe(generatedApi);
  });

  test('convexClient.api exposes the expected module namespaces', () => {
    expect(convexApi).toBeTruthy();
    // `api` is a Proxy generated by Convex — top-level keys are not
    // enumerable, so we probe nested module accessors instead.
    const apiRef = convexApi as unknown as Record<string, Record<string, unknown>>;
    for (const expected of [
      'agents',
      'fleetCatalog',
      'issues',
      'pipelineRuns',
      'scoreAudit',
    ]) {
      expect(apiRef[expected]).toBeTruthy();
    }
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// Phase 1 Task 4: Behavior preservation — mock-client injection and call shape.
// ──────────────────────────────────────────────────────────────────────────────

describe('Phase 1 Task 4: typedQuery / typedMutation / dynamicConvexCall accept stub clients', () => {
  function makeStubClient() {
    const calls: Array<{ method: 'query' | 'mutation'; fn: unknown; args: unknown }> = [];
    const stub = {
      query: async (fn: unknown, args: unknown) => {
        calls.push({ method: 'query', fn, args });
        return null;
      },
      mutation: async (fn: unknown, args: unknown) => {
        calls.push({ method: 'mutation', fn, args });
        return null;
      },
    };
    return { stub: stub as unknown as ConvexHttpClient, calls };
  }

  test('typedQuery routes through stubClient.query with the function reference', async () => {
    const { stub, calls } = makeStubClient();
    const fnRef = generatedApi.fleetCatalog.listAgents;
    // Cast result to a neutral type — the runtime shape is verified by the
    // `calls` record; the static return type is checked separately in
    // Phase 1 Task 5.
    await typedQuery(stub, fnRef, {} as unknown as FunctionArgs<typeof fnRef>);
    expect(calls).toHaveLength(1);
    expect(calls[0]?.method).toBe('query');
    expect(calls[0]?.fn).toBe(fnRef);
    expect(calls[0]?.args).toEqual({});
  });

  test('typedMutation routes through stubClient.mutation with the function reference', async () => {
    const { stub, calls } = makeStubClient();
    const fnRef = generatedApi.fleetCatalog.setSetting;
    const args = { scope: 'test', key: 'k', valueJson: '{}' };
    await typedMutation(
      stub,
      fnRef,
      args as unknown as FunctionArgs<typeof fnRef>,
    );
    expect(calls).toHaveLength(1);
    expect(calls[0]?.method).toBe('mutation');
    expect(calls[0]?.fn).toBe(fnRef);
    expect(calls[0]?.args).toEqual(args);
  });

  test('dynamicConvexCall routes queries and mutations through the correct client method', async () => {
    const { stub, calls } = makeStubClient();

    const queryRef = generatedApi.fleetCatalog.listAgents;
    await dynamicConvexCall(stub, queryRef, {} as unknown as FunctionArgs<typeof queryRef>);

    const mutationRef = generatedApi.fleetCatalog.setSetting;
    const args = { scope: 'test', key: 'k', valueJson: '{}' };
    await dynamicConvexCall(
      stub,
      mutationRef,
      args as unknown as FunctionArgs<typeof mutationRef>,
    );

    expect(calls).toHaveLength(2);
    expect(calls[0]?.method).toBe('query');
    expect(calls[0]?.fn).toBe(queryRef);
    expect(calls[0]?.args).toEqual({});
    expect(calls[1]?.method).toBe('mutation');
    expect(calls[1]?.fn).toBe(mutationRef);
    expect(calls[1]?.args).toEqual(args);
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// Phase 1 Task 5: Signature preservation — (client, fn, args) arity.
// ──────────────────────────────────────────────────────────────────────────────

describe('Phase 1 Task 5: typed wrappers keep (client, fn, args) signature', () => {
  test('typedQuery declares three parameters', () => {
    expect(typedQuery.length).toBe(3);
  });

  test('typedMutation declares three parameters', () => {
    expect(typedMutation.length).toBe(3);
  });

  test('dynamicConvexCall declares three parameters', () => {
    expect(dynamicConvexCall.length).toBe(3);
  });

  test('typedQuery infers return type from a query FunctionReference', () => {
    const fnRef = generatedApi.fleetCatalog.listAgents;
    type Inferred = Awaited<
      ReturnType<typeof typedQuery<typeof fnRef>>
    >;
    type Expected = FunctionReturnType<typeof fnRef>;
    type Check = AssertEqual<Inferred, Expected>;
    const assert: Check = true;
    expect(assert).toBe(true);
  });

  test('typedMutation infers return type from a mutation FunctionReference', () => {
    const fnRef = generatedApi.fleetCatalog.setSetting;
    type Inferred = Awaited<
      ReturnType<typeof typedMutation<typeof fnRef>>
    >;
    type Expected = FunctionReturnType<typeof fnRef>;
    type Check = AssertEqual<Inferred, Expected>;
    const assert: Check = true;
    expect(assert).toBe(true);
  });

  test('typedQuery infers args type from a query FunctionReference', () => {
    const fnRef = generatedApi.fleetCatalog.getAgentByName;
    type Param = Parameters<typeof typedQuery<typeof fnRef>>[2];
    type Expected = FunctionArgs<typeof fnRef>;
    type Check = AssertEqual<Param, Expected>;
    const assert: Check = true;
    expect(assert).toBe(true);
  });

  test('dynamicConvexCall infers return type from a FunctionReference', () => {
    const fnRef = generatedApi.fleetCatalog.listAgents;
    type Inferred = Awaited<
      ReturnType<typeof dynamicConvexCall<typeof fnRef>>
    >;
    type Expected = FunctionReturnType<typeof fnRef>;
    type Check = AssertEqual<Inferred, Expected>;
    const assert: Check = true;
    expect(assert).toBe(true);
  });

  test('typedQuery rejects string literals in place of FunctionReference', () => {
    const _bad = typedQuery(
      {} as ConvexHttpClient,
      // @ts-expect-error — string literals must be rejected by typedQuery
      'fleetCatalog:listAgents',
      {},
    );
    _bad.catch(() => {});
    expect(_bad).toBeInstanceOf(Promise);
  });

  test('dynamicConvexCall rejects string literals in place of FunctionReference', () => {
    const _bad = dynamicConvexCall(
      {} as ConvexHttpClient,
      // @ts-expect-error — string literals must be rejected by dynamicConvexCall
      'fleetCatalog:listAgents',
      {},
    );
    _bad.catch(() => {});
    expect(_bad).toBeInstanceOf(Promise);
  });

  test('typedQuery still accepts FunctionReference values, not strings', () => {
    const fnRef: FunctionReference<'query'> = generatedApi.fleetCatalog.listAgents;
    type Check = AssertEqual<typeof fnRef, FunctionReference<'query'>>;
    const assert: Check = true;
    expect(assert).toBe(true);
  });
});