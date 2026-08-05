import { describe, expect, it } from 'bun:test';
import schema from './schema';

describe('simplified schema', () => {
  const tables = (schema as any).tables;

  it('includes required minimal tables', () => {
    expect(tables.projects).toBeDefined();
    expect(tables.sprints).toBeDefined();
    expect(tables.boards).toBeDefined();
    expect(tables.columns).toBeDefined();
    expect(tables.tasks).toBeDefined();
    expect(tables.employees).toBeDefined();
    expect(tables.agents).toBeDefined();
    expect(tables.providers).toBeDefined();
    expect(tables.pipelineRuns).toBeDefined();
    expect(tables.runs).toBeDefined();
  });

  it('excludes obsolete orchestration tables', () => {
    expect(tables.harnesses).toBeUndefined();
    expect(tables.circuitBreakers).toBeUndefined();
    expect(tables.recoveryLog).toBeUndefined();
    expect(tables.dispatchPolicyStats).toBeUndefined();
    expect(tables.pipelineExecutions).toBeUndefined();
  });

  it('excludes the simulation and experimentation tables', () => {
    // Removed in the Phase 3 scalpel: A/B testing, policy simulation, and
    // performance baselines modelled a company rather than the work loop, and
    // no dispatch decision ever read them.
    expect(tables.abTests).toBeUndefined();
    expect(tables.experimentRuns).toBeUndefined();
    expect(tables.simulationRuns).toBeUndefined();
    expect(tables.performanceBaselines).toBeUndefined();
  });

  it('includes score audit persistence for dispatch analytics', () => {
    expect(tables.scoreAudit).toBeDefined();
  });

  it('has time-window index on runs for employee queries', () => {
    const indexes = tables.runs.indexes as Array<{ indexDescriptor: string; fields: string[] }>;
    const hasTimeWindow = indexes.some(
      (i) => i.fields.includes('employeeId') && i.fields.includes('startedAt'),
    );
    expect(hasTimeWindow).toBe(true);
  });
});
