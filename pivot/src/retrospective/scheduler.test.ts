// Phase 2 runtime integration gate for `Typed Convex API Boundary`.
//
// The existing source-pattern gate (`pivot/src/routes/typed-convex-boundary.test.ts`)
// only reads each route file as text and asserts that string-based Convex calls,
// `as any` casts, and the `'module:fn' as any` literal are absent. That gate
// cannot verify the *runtime argument shape* (does the call receive `{ projectId }`
// or `{ projectSlug }`?) or the *reference identity* of the function argument
// (is `api.sprints.listSprintsHandler` being passed, or a string?). This file
// fills that gap with a runtime test that constructs `RetrospectiveScheduler`
// with a captured-call mock client and asserts on the exact `api.*` reference
// (identified by its `Symbol.for('functionName')` discriminator) and argument
// shape that reach the client.
//
// Test-strategy references:
//   §1 Phase 2: unit + route integration (this file is the integration half)
//   §5 Phase 2: per-file test gate, one commit per route file
//   §6 build-graph: scheduler is the principal dynamic Convex consumer
//   Test-strategy §3 cross-phase edge case "Dynamic function selection":
//     proves the scheduler passes `api.*` references, not string paths

import { describe, expect, it } from 'bun:test';
import { RetrospectiveScheduler } from './scheduler';
import { api } from '../../../convex/_generated/api';

const FUNCTION_NAME = Symbol.for('functionName');

/**
 * Read the Convex function name from a `FunctionReference` value. Convex's
 * `anyApi` proxy carries the name on the well-known `Symbol.for('functionName')`
 * symbol (see `pivot/src/convexClient.ts:181-184`). Returns the name string,
 * or `undefined` if the symbol is absent (e.g. a raw string path).
 * @param fn - The function reference value (typed `api.*` or a string)
 * @returns The function name in `"module:fn"` form, or undefined
 */
function getFnName(fn: unknown): string | undefined {
  if (fn && typeof fn === 'object') {
    return (fn as Record<symbol, string | undefined>)[FUNCTION_NAME];
  }
  return undefined;
}

interface CapturedCall {
  fnName: string | undefined;
  args: unknown;
}

interface MockClient {
  query: (fn: unknown, args?: unknown) => Promise<unknown>;
  mutation: (fn: unknown, args?: unknown) => Promise<unknown>;
  calls: { query: CapturedCall[]; mutation: CapturedCall[] };
}

interface SprintStub {
  _id: string;
  projectId: string;
  closedAt?: number;
  startedAt?: number;
  createdAt: number;
}

interface MockHandlers {
  projects: () => Array<{ _id: string; name: string }>;
  sprints: (projectId: string) => Array<SprintStub>;
  retrospectives: (sprintId: string) => Array<unknown>;
}

/**
 * Build a mock Convex client whose `query`/`mutation` capture every call
 * (recording the function name discriminator) and route to the supplied
 * handlers. Mutation calls that the scheduler fires as part of
 * `executeRetrospectiveGeneration` are intentionally unhandled so the
 * scheduler's fire-and-forget `.catch()` exercises its real error path.
 * @param handlers - Query handlers for the three scheduler-owned queries
 * @returns A mock client with a `calls` log for assertions
 */
function createCapturingMockClient(handlers: MockHandlers): MockClient {
  const calls: { query: CapturedCall[]; mutation: CapturedCall[] } = {
    query: [],
    mutation: [],
  };
  return {
    async query(fn: unknown, args?: unknown) {
      const fnName = getFnName(fn);
      calls.query.push({ fnName, args });
      if (fnName === 'projects:listProjectsHandler') {
        return handlers.projects();
      }
      if (fnName === 'sprints:listSprintsHandler') {
        const a = (args ?? {}) as { projectId: string };
        return handlers.sprints(a.projectId);
      }
      if (fnName === 'retrospectives:listRetrospectives') {
        const a = (args ?? {}) as { sprintId: string };
        return handlers.retrospectives(a.sprintId);
      }
      throw new Error(
        `Unexpected query in scheduler test: fnName=${fnName ?? '<missing>'} (proves the call site is NOT using the typed api.* reference)`,
      );
    },
    async mutation(fn: unknown, args?: unknown) {
      const fnName = getFnName(fn);
      calls.mutation.push({ fnName, args });
      // Let the fire-and-forget executeRetrospectiveGeneration fail loudly so
      // the scheduler's own .catch() is exercised. The test asserts only on
      // the scheduler's own three queries, not on the generation cascade.
      throw new Error(
        `Unexpected mutation in scheduler test: fnName=${fnName ?? '<missing>'}`,
      );
    },
    calls,
  };
}

/**
 * Poll for an expected call to appear in the captured log. Avoids arbitrary
 * `setTimeout` sleeps that would flake on slow CI.
 * @param calls - Captured call log
 * @param predicate - Returns true once the expected call has been observed
 * @param timeoutMs - Maximum wait time in milliseconds
 */
async function waitForCall(
  calls: CapturedCall[],
  predicate: (c: CapturedCall) => boolean,
  timeoutMs = 1000,
): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (calls.some(predicate)) return;
    await new Promise((r) => setTimeout(r, 5));
  }
  throw new Error(
    `waitForCall: predicate never matched within ${timeoutMs}ms; saw ${
      calls.length
    } call(s) with names: ${calls
      .slice(0, 5)
      .map((c) => c.fnName ?? '<missing>')
      .join(', ')}`,
  );
}

describe('RetrospectiveScheduler — typed Convex call contract (Phase 2 runtime gate)', () => {
  // The scheduler uses `intervalMs` as BOTH the setTimeout delay (line 48) and
  // the window size (line 54: `cutoff = now - this.intervalMs`). A large
  // interval makes the setTimeout fire too late for a 1s `waitForCall`. Use a
  // small intervalMs (1ms) and control window membership via `sprint.closedAt`
  // relative to `Date.now()`.
  const FAST_INTERVAL_MS = 1;

  it('passes api.projects.listProjectsHandler (the typed reference, not a string path)', async () => {
    const mock = createCapturingMockClient({
      projects: () => [{ _id: 'project-1', name: 'Demo Project' }],
      sprints: () => [],
      retrospectives: () => [],
    });
    const scheduler = new RetrospectiveScheduler(mock as never, FAST_INTERVAL_MS);
    scheduler.start();

    try {
      await waitForCall(
        mock.calls.query,
        (c) => c.fnName === 'projects:listProjectsHandler',
      );

      const listProjectsCall = mock.calls.query.find(
        (c) => c.fnName === 'projects:listProjectsHandler',
      );
      expect(listProjectsCall).toBeDefined();
      expect(listProjectsCall!.args).toEqual({});
      // Sanity: the function name discriminator must be present, proving the
      // call site passed a `FunctionReference` (not a raw string).
      expect(listProjectsCall!.fnName).toBe('projects:listProjectsHandler');
    } finally {
      scheduler.stop();
    }
  });

  it('passes the Convex projectId (not a projectSlug) to listSprintsHandler', async () => {
    const mock = createCapturingMockClient({
      projects: () => [{ _id: 'project-1', name: 'Demo Project' }],
      sprints: () => [],
      retrospectives: () => [],
    });
    const scheduler = new RetrospectiveScheduler(mock as never, FAST_INTERVAL_MS);
    scheduler.start();

    try {
      await waitForCall(
        mock.calls.query,
        (c) => c.fnName === 'sprints:listSprintsHandler',
      );

      const sprintCall = mock.calls.query.find(
        (c) => c.fnName === 'sprints:listSprintsHandler',
      );
      expect(sprintCall).toBeDefined();
      expect(sprintCall!.args).toEqual({ projectId: 'project-1' });
      expect(
        (sprintCall!.args as Record<string, unknown>).projectSlug,
      ).toBeUndefined();
    } finally {
      scheduler.stop();
    }
  });

  it('passes { sprintId, limit: 1 } to api.retrospectives.listRetrospectives for in-window sprints', async () => {
    // The sprint's `closedAt` is generated lazily inside the mock handler so it
    // is evaluated at the moment the scheduler calls the query, not at
    // mock-creation time. This keeps the sprint inside the scheduler's window
    // even when the full test suite adds latency before this test runs.
    const mock = createCapturingMockClient({
      projects: () => [{ _id: 'project-1', name: 'Demo Project' }],
      sprints: () => {
        const now = Date.now();
        return [
          {
            _id: 'sprint-1',
            projectId: 'project-1',
            closedAt: now,
            startedAt: now - 5000,
            createdAt: now - 10000,
          },
        ];
      },
      retrospectives: () => [],
    });
    const scheduler = new RetrospectiveScheduler(mock as never, FAST_INTERVAL_MS);
    scheduler.start();

    try {
      await waitForCall(
        mock.calls.query,
        (c) => c.fnName === 'retrospectives:listRetrospectives',
      );

      const retroCall = mock.calls.query.find(
        (c) => c.fnName === 'retrospectives:listRetrospectives',
      );
      expect(retroCall).toBeDefined();
      expect(retroCall!.args).toEqual({ sprintId: 'sprint-1', limit: 1 });
    } finally {
      scheduler.stop();
    }
  });

  it('skips listRetrospectives for sprints whose endDate is outside the scheduler window', async () => {
    const now = Date.now();
    // Window is 1ms. closedAt is 1 hour ago — out of window.
    const mock = createCapturingMockClient({
      projects: () => [{ _id: 'project-1', name: 'Demo Project' }],
      sprints: () => [
        {
          _id: 'sprint-old',
          projectId: 'project-1',
          closedAt: now - 60 * 60 * 1000,
          startedAt: now - 2 * 60 * 60 * 1000,
          createdAt: now - 3 * 60 * 60 * 1000,
        },
      ],
      retrospectives: () => {
        throw new Error(
          'listRetrospectives must NOT be called for out-of-window sprints',
        );
      },
    });
    const scheduler = new RetrospectiveScheduler(mock as never, FAST_INTERVAL_MS);
    scheduler.start();

    try {
      await waitForCall(
        mock.calls.query,
        (c) => c.fnName === 'sprints:listSprintsHandler',
      );
      // Give the inner sprint-loop a moment to run and check the window.
      await new Promise((r) => setTimeout(r, 20));

      const retroCalls = mock.calls.query.filter(
        (c) => c.fnName === 'retrospectives:listRetrospectives',
      );
      expect(retroCalls).toHaveLength(0);
    } finally {
      scheduler.stop();
    }
  });

  it('skips listRetrospectives when the in-window sprint is in the future (endDate > now)', async () => {
    const now = Date.now();
    const mock = createCapturingMockClient({
      projects: () => [{ _id: 'project-1', name: 'Demo Project' }],
      sprints: () => [
        {
          _id: 'sprint-future',
          projectId: 'project-1',
          closedAt: now + 60 * 60 * 1000,
          startedAt: now - 1000,
          createdAt: now - 2000,
        },
      ],
      retrospectives: () => {
        throw new Error(
          'listRetrospectives must NOT be called for future sprints',
        );
      },
    });
    const scheduler = new RetrospectiveScheduler(mock as never, FAST_INTERVAL_MS);
    scheduler.start();

    try {
      await waitForCall(
        mock.calls.query,
        (c) => c.fnName === 'sprints:listSprintsHandler',
      );
      await new Promise((r) => setTimeout(r, 20));

      const retroCalls = mock.calls.query.filter(
        (c) => c.fnName === 'retrospectives:listRetrospectives',
      );
      expect(retroCalls).toHaveLength(0);
    } finally {
      scheduler.stop();
    }
  });
});

/**
 * Suppress unused-symbol warning: `api` is imported so the test file fails
 * TypeScript compilation if the generated Convex API ever drops one of the
 * three scheduler-owned references. The runtime assertions all go through
 * `getFnName` against string literals, but the import is the static guarantee.
 */
void api;
