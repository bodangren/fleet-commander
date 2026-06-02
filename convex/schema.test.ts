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
    expect(tables.abTests).toBeDefined();
    expect(tables.runs).toBeDefined();
  });

  it('excludes obsolete orchestration tables', () => {
    expect(tables.harnesses).toBeUndefined();
    expect(tables.circuitBreakers).toBeUndefined();
    expect(tables.recoveryLog).toBeUndefined();
    expect(tables.dispatchPolicyStats).toBeUndefined();
    expect(tables.pipelineExecutions).toBeUndefined();
  });

  it('includes score audit persistence for dispatch analytics', () => {
    expect(tables.scoreAudit).toBeDefined();
  });

  it('has composite index on performanceBaselines for employee, project, and taskKind', () => {
    const indexes = tables.performanceBaselines.indexes as Array<{ indexDescriptor: string; fields: string[] }>;
    const hasComposite = indexes.some(
      (i) =>
        i.fields.length === 3 &&
        i.fields[0] === 'agent' &&
        i.fields[1] === 'projectSlug' &&
        i.fields[2] === 'taskKind',
    );
    expect(hasComposite).toBe(true);
  });

  it('has time-window index on runs for employee queries', () => {
    const indexes = tables.runs.indexes as Array<{ indexDescriptor: string; fields: string[] }>;
    const hasTimeWindow = indexes.some(
      (i) => i.fields.includes('employeeId') && i.fields.includes('startedAt'),
    );
    expect(hasTimeWindow).toBe(true);
  });
});
