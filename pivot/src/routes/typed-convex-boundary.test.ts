// Phase 2 Red tests for `Typed Convex API Boundary`.
//
// Verifies that pivot/src/routes/** and pivot/src/retrospective/scheduler.ts
// have been migrated off string-based Convex calls
// (`client.query('module:fn' as any, ...)`) onto the typed path
// (`typedQuery` / `typedMutation` / `dynamicConvexCall` from ../convexClient).
//
// Tests run as part of the pivot bun:test suite and read source files
// directly. They fail until each route file is migrated. Phase 2 Task 2
// (the typecheck + per-file test step) is verified by `bun --cwd pivot
// typecheck` + the existing per-route `*.test.ts` suites, both of which
// are also called out as pass-gates in the test-strategy.

import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { api } from '../../../convex/_generated/api';

// Routes to migrate (one commit per file).
const ROUTE_FILES = [
  'routes/retrospectives.ts',
  'routes/performance.ts',
  'routes/costs.ts',
  'routes/analytics.ts',
  'retrospective/scheduler.ts',
] as const;

const PIVOT_SRC = dirname(import.meta.dir);

const STRING_QUERY_CALL = /\.query\(\s*['"][a-zA-Z_]+:[a-zA-Z_]+['"]/;
const STRING_MUTATION_CALL = /\.mutation\(\s*['"][a-zA-Z_]+:[a-zA-Z_]+['"]/;
const STRING_LITERAL_AS_ANY = /['"][a-zA-Z_]+:[a-zA-Z_]+['"]\s+as\s+any\b/;
const METHOD_LEVEL_AS_ANY = /\(\s*client\.(?:query|mutation)\s+as\s+any\s*\)/;
const TYPED_IMPORT =
  /import\s*\{[^}]*(?:typedQuery|typedMutation|dynamicConvexCall)[^}]*\}\s*from\s*['"]\.\.\/convexClient['"]/;

/**
 * Read a pivot source file relative to pivot/src.
 * @param relativePath - Path relative to pivot/src (e.g. "routes/analytics.ts")
 * @returns The file contents as a UTF-8 string
 */
function readSource(relativePath: string): string {
  return readFileSync(join(PIVOT_SRC, relativePath), 'utf8');
}

// ──────────────────────────────────────────────────────────────────────────────
// Phase 2 Task 1: route files no longer use the string-based Convex API
// ──────────────────────────────────────────────────────────────────────────────

describe('Phase 2 Task 1: pivot route string-based Convex calls are gone', () => {
  for (const file of ROUTE_FILES) {
    describe(file, () => {
      const source = readSource(file);

      test('has no client.query( with a string literal Convex path', () => {
        expect(source).not.toMatch(STRING_QUERY_CALL);
      });

      test('has no client.mutation( with a string literal Convex path', () => {
        expect(source).not.toMatch(STRING_MUTATION_CALL);
      });

      test('has no \'module:fn\' as any literal cast', () => {
        expect(source).not.toMatch(STRING_LITERAL_AS_ANY);
      });

      test('has no (client.query as any) / (client.mutation as any) method-level cast', () => {
        expect(source).not.toMatch(METHOD_LEVEL_AS_ANY);
      });

      test('imports typedQuery / typedMutation / dynamicConvexCall from ../convexClient', () => {
        expect(source).toMatch(TYPED_IMPORT);
      });
    });
  }
});

// ──────────────────────────────────────────────────────────────────────────────
// Phase 2 Task 1: every documented inventory call site is migrated
// ──────────────────────────────────────────────────────────────────────────────

describe('Phase 2 Task 1: inventory call sites no longer appear as string literals', () => {
  // Mirrors measure/tracks/typed_convex_boundary_20260605/inventory.md.
  // After migration, none of these identifiers may appear as a quoted string
  // literal in the corresponding source file.
  const inventoryByFile: Record<string, readonly string[]> = {
    'routes/retrospectives.ts': [
      'fleetCatalog:listAgents',
      'sprints:getSprintById',
      'retrospectives:getSprintAggregateData',
      'retrospectives:listRetrospectives',
      'retrospectives:getRetrospective',
      'retrospectives:createRetrospective',
      'retrospectives:failRetrospective',
      'retrospectives:completeRetrospective',
    ],
    'routes/performance.ts': [
      'performance:getPhaseBreakdown',
      'performance:getPhaseTrends',
      'performance:getAgentLatencyStats',
      'performance:getSlowAgents',
      'performance:getRegressionAlerts',
      'performance:getEmployeePerformance',
    ],
    'routes/costs.ts': [
      'costs:getCostByProject',
      'costs:getCostByAgent',
      'costs:getCostTrend',
      'costs:getSessionSavings',
      'costs:getCostPerTask',
    ],
    'routes/analytics.ts': [
      'analytics:getCompletionTrends',
      'analytics:getAgentUtilization',
      'analytics:getBottlenecks',
      'analytics:getQueueDepth',
      'analytics:getHookMetrics',
      'analytics:getSessionMetrics',
    ],
    'retrospective/scheduler.ts': [
      'projects:listProjects',
      'sprints:listSprints',
      'retrospectives:listRetrospectives',
    ],
  };

  for (const [file, fns] of Object.entries(inventoryByFile)) {
    test(`${file} contains zero string-literal Convex fns (${fns.length} documented)`, () => {
      const source = readSource(file);
      for (const fn of fns) {
        const single = `'${fn}'`;
        const double = `"${fn}"`;
        // The literal identifier must not appear as a string in the source.
        // If it does, that call site has not yet been migrated.
        const present = source.includes(single) || source.includes(double);
        expect(present).toBe(false);
      }
    });
  }
});

// ──────────────────────────────────────────────────────────────────────────────
// Phase 2 Task 1: typed call sites resolve to api.* FunctionReference values
// ──────────────────────────────────────────────────────────────────────────────

describe('Phase 4 adversarial regression: migrated call sites use generated arg shapes', () => {
  test('RetrospectiveScheduler passes projectId, not projectSlug, to listSprintsHandler', () => {
    const source = readSource('retrospective/scheduler.ts');
    expect(source).toContain('api.sprints.listSprintsHandler');
    expect(source).toContain('projectId: project._id');
    expect(source).not.toContain('projectSlug,');
  });

  test('employee performance route calls getPerformanceOverview with projectSlug only', () => {
    const source = readSource('routes/performance.ts');
    const callSite = source.match(/api\.performance\.getPerformanceOverview[\s\S]*?\}\);/);
    expect(callSite).not.toBeNull();
    expect(callSite![0]).toContain('projectSlug: projectId');
    expect(callSite![0]).not.toContain('employeeId:');
    expect(callSite![0]).not.toContain('windowDays,');
  });

  test('retrospective generation casts string route IDs at Convex ID boundaries only', () => {
    const source = readSource('routes/retrospectives.ts');
    expect(source).toContain("sprintId as Id<'sprints'>");
    expect(source).toContain("retroId as Id<'retrospectives'>");
    expect(source).not.toContain('id: retroId as any');
    expect(source).not.toContain('id: params.id as any');
  });
});

describe('Phase 2 Task 1: every typed Convex call site resolves to a generated api.* ref', () => {
  // Each of these is a query/mutation used by a Phase 2 file. The migration
  // must replace `'module:fn' as any` with `api.module.fn`. The test is a
  // smoke check that the generated api is in place; the type-level inference
  // guarantee is asserted via the existing Phase 1 wrapper tests in
  // convexClient.test.ts and via `bun --cwd pivot typecheck` (Phase 2 Task 2).
  const references = [
    ['retrospectives.listRetrospectives', () => api.retrospectives.listRetrospectives],
    ['retrospectives.getRetrospective', () => api.retrospectives.getRetrospective],
    ['retrospectives.getSprintAggregateData', () => api.retrospectives.getSprintAggregateData],
    ['retrospectives.createRetrospective', () => api.retrospectives.createRetrospective],
    ['retrospectives.failRetrospective', () => api.retrospectives.failRetrospective],
    ['retrospectives.completeRetrospective', () => api.retrospectives.completeRetrospective],
    ['sprints.getSprintHandler', () => api.sprints.getSprintHandler],
    ['sprints.listSprintsHandler', () => api.sprints.listSprintsHandler],
    ['fleetCatalog.listAgents', () => api.fleetCatalog.listAgents],
    ['projects.listProjectsHandler', () => api.projects.listProjectsHandler],
    ['performance.getPhaseBreakdown', () => api.performance.getPhaseBreakdown],
    ['performance.getPhaseTrends', () => api.performance.getPhaseTrends],
    ['performance.getAgentLatencyStats', () => api.performance.getAgentLatencyStats],
    ['performance.getSlowAgents', () => api.performance.getSlowAgents],
    ['performance.getRegressionAlerts', () => api.performance.getRegressionAlerts],
    ['performance.getPerformanceOverview', () => api.performance.getPerformanceOverview],
    ['costs.getCostByProject', () => api.costs.getCostByProject],
    ['costs.getCostByAgent', () => api.costs.getCostByAgent],
    ['costs.getCostTrend', () => api.costs.getCostTrend],
    ['costs.getSessionSavings', () => api.costs.getSessionSavings],
    ['costs.getCostPerTask', () => api.costs.getCostPerTask],
    ['analytics.getCompletionTrends', () => api.analytics.getCompletionTrends],
    ['analytics.getAgentUtilization', () => api.analytics.getAgentUtilization],
    ['analytics.getBottlenecks', () => api.analytics.getBottlenecks],
    ['analytics.getQueueDepth', () => api.analytics.getQueueDepth],
    ['analytics.getHookMetrics', () => api.analytics.getHookMetrics],
    ['analytics.getSessionMetrics', () => api.analytics.getSessionMetrics],
    ['pipelineRuns.createPipelineRunHandler', () => api.pipelineRuns.createPipelineRunHandler],
    ['pipelineRuns.updatePipelineRunStatusHandler', () => api.pipelineRuns.updatePipelineRunStatusHandler],
    ['pipelineRuns.getPipelineRunsByTaskHandler', () => api.pipelineRuns.getPipelineRunsByTaskHandler],
  ] as const;

  for (const [label, getRef] of references) {
    test(`api.${label} resolves to a generated FunctionReference value`, () => {
      expect(getRef()).toBeDefined();
    });
  }
});

// ──────────────────────────────────────────────────────────────────────────────
// Phase 2 Task 2: dynamicConvexCall wrapper is wired for the scheduler
// ──────────────────────────────────────────────────────────────────────────────

describe('Phase 2 Task 2: dynamicConvexCall accepts the scheduler api.* references', () => {
  // The scheduler iterates projects → sprints → retrospectives and selects
  // Convex functions dynamically. Per the test-strategy, this is the
  // principal `dynamicConvexCall` consumer. These tests assert that the
  // references the scheduler will pass through dynamicConvexCall are
  // valid FunctionReference values that the wrapper accepts without
  // requiring an `as any` cast.
  test('api.projects.listProjectsHandler is a valid query reference for dynamicConvexCall', async () => {
    const { dynamicConvexCall } = await import('../convexClient');
    const calls: Array<{ fn: unknown; args: unknown }> = [];
    const stub = {
      query: async (fn: unknown, args: unknown) => {
        calls.push({ fn, args });
        return [];
      },
      mutation: async () => null,
    };
    await dynamicConvexCall(stub as never, api.projects.listProjectsHandler, {});
    expect(calls).toHaveLength(1);
  });

  test('api.sprints.listSprintsHandler is a valid query reference for dynamicConvexCall', async () => {
    const { dynamicConvexCall } = await import('../convexClient');
    const calls: Array<{ fn: unknown; args: unknown }> = [];
    const stub = {
      query: async (fn: unknown, args: unknown) => {
        calls.push({ fn, args });
        return [];
      },
      mutation: async () => null,
    };
    await dynamicConvexCall(stub as never, api.sprints.listSprintsHandler, { projectId: 'demo' as any });
    expect(calls).toHaveLength(1);
  });

  test('api.retrospectives.listRetrospectives is a valid query reference for dynamicConvexCall', async () => {
    const { dynamicConvexCall } = await import('../convexClient');
    const calls: Array<{ fn: unknown; args: unknown }> = [];
    const stub = {
      query: async (fn: unknown, args: unknown) => {
        calls.push({ fn, args });
        return [];
      },
      mutation: async () => null,
    };
    await dynamicConvexCall(stub as never, api.retrospectives.listRetrospectives, {
      sprintId: 'sprint-1',
      limit: 1,
    });
    expect(calls).toHaveLength(1);
  });
});
