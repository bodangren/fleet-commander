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
    expect(tables.runs).toBeDefined();
  });

  it('excludes obsolete orchestration tables', () => {
    expect(tables.agents).toBeUndefined();
    expect(tables.harnesses).toBeUndefined();
    expect(tables.circuitBreakers).toBeUndefined();
    expect(tables.recoveryLog).toBeUndefined();
    expect(tables.scoreAudit).toBeUndefined();
    expect(tables.dispatchPolicyStats).toBeUndefined();
    expect(tables.pipelineExecutions).toBeUndefined();
  });
});
