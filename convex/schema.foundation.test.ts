import { describe, expect, it } from 'bun:test';
import schema from './schema';

describe('foundation layer schema', () => {
  const tables = (schema as any).tables;

  function getField(tableName: string, fieldName: string): any {
    return tables[tableName]?.validator?.fields?.[fieldName] ?? null;
  }

  function getFieldNames(tableName: string): string[] {
    const fields = tables[tableName]?.validator?.fields;
    return fields ? Object.keys(fields) : [];
  }

  function getLiteralValues(fieldValidator: any): string[] {
    if (!fieldValidator || fieldValidator.kind !== 'union') return [];
    return fieldValidator.members
      .filter((m: any) => m.kind === 'literal')
      .map((m: any) => m.value);
  }

  function getIndexes(tableName: string): Array<{ indexDescriptor: string; fields: string[] }> {
    return tables[tableName]?.indexes ?? [];
  }

  describe('projects table', () => {
    it('exists with required fields', () => {
      expect(tables.projects).toBeDefined();
      const fields = getFieldNames('projects');
      expect(fields).toContain('name');
      expect(fields).toContain('description');
      expect(fields).toContain('createdAt');
      expect(fields).toContain('updatedAt');
    });

    it('has correct field types', () => {
      expect(getField('projects', 'name')?.kind).toBe('string');
      expect(getField('projects', 'description')?.kind).toBe('string');
      expect(getField('projects', 'createdAt')?.kind).toBe('float64');
      expect(getField('projects', 'updatedAt')?.kind).toBe('float64');
    });
  });

  describe('sprints table', () => {
    it('exists with required fields', () => {
      expect(tables.sprints).toBeDefined();
      const fields = getFieldNames('sprints');
      expect(fields).toContain('projectId');
      expect(fields).toContain('name');
      expect(fields).toContain('status');
      expect(fields).toContain('budget');
      expect(fields).toContain('actualCost');
      expect(fields).toContain('pointsDelivered');
      expect(fields).toContain('taskCount');
      expect(fields).toContain('completedCount');
      expect(fields).toContain('createdAt');
      expect(fields).toContain('startedAt');
      expect(fields).toContain('closedAt');
    });

    it('has status enum with planned/active/closed', () => {
      const status = getField('sprints', 'status');
      expect(status?.kind).toBe('union');
      const values = getLiteralValues(status);
      expect(values).toContain('planned');
      expect(values).toContain('active');
      expect(values).toContain('closed');
    });

    it('has by_project index', () => {
      const indexes = getIndexes('sprints');
      const hasByProject = indexes.some((i) => i.fields[0] === 'projectId');
      expect(hasByProject).toBe(true);
    });
  });

  describe('tasks table', () => {
    it('exists with required fields', () => {
      expect(tables.tasks).toBeDefined();
      const fields = getFieldNames('tasks');
      expect(fields).toContain('projectId');
      expect(fields).toContain('sprintId');
      expect(fields).toContain('title');
      expect(fields).toContain('description');
      expect(fields).toContain('storyPoints');
      expect(fields).toContain('status');
      expect(fields).toContain('priority');
      expect(fields).toContain('costEstimate');
      expect(fields).toContain('actualCost');
      expect(fields).toContain('assigneeId');
      expect(fields).toContain('reviewerId');
      expect(fields).toContain('mergerId');
      expect(fields).toContain('createdAt');
      expect(fields).toContain('updatedAt');
    });

    it('has status enum with all six states', () => {
      const status = getField('tasks', 'status');
      expect(status?.kind).toBe('union');
      const values = getLiteralValues(status);
      expect(values).toContain('backlog');
      expect(values).toContain('ready');
      expect(values).toContain('in_progress');
      expect(values).toContain('for_review');
      expect(values).toContain('merged');
      expect(values).toContain('blocked');
    });

    it('has priority enum with low/med/high', () => {
      const priority = getField('tasks', 'priority');
      expect(priority?.kind).toBe('union');
      const values = getLiteralValues(priority);
      expect(values).toContain('low');
      expect(values).toContain('med');
      expect(values).toContain('high');
    });

    it('has composite indexes for project and status', () => {
      const indexes = getIndexes('tasks');
      const hasByProject = indexes.some((i) =>
        i.fields.includes('projectId')
      );
      const hasByStatus = indexes.some((i) =>
        i.fields.includes('status')
      );
      expect(hasByProject).toBe(true);
      expect(hasByStatus).toBe(true);
    });
  });

  describe('agents table', () => {
    it('exists with required fields', () => {
      expect(tables.agents).toBeDefined();
      const fields = getFieldNames('agents');
      expect(fields).toContain('name');
      expect(fields).toContain('role');
      expect(fields).toContain('skills');
      expect(fields).toContain('model');
      expect(fields).toContain('costPerPoint');
      expect(fields).toContain('reliability');
      expect(fields).toContain('status');
      expect(fields).toContain('workload');
      expect(fields).toContain('maxWorkload');
      expect(fields).toContain('createdAt');
    });

    it('has role enum with architect/executor/reviewer/merger', () => {
      const role = getField('agents', 'role');
      expect(role?.kind).toBe('union');
      const values = getLiteralValues(role);
      expect(values).toContain('architect');
      expect(values).toContain('executor');
      expect(values).toContain('reviewer');
      expect(values).toContain('merger');
    });

    it('has status enum with active/idle/blocked/offline', () => {
      const status = getField('agents', 'status');
      expect(status?.kind).toBe('union');
      const values = getLiteralValues(status);
      expect(values).toContain('active');
      expect(values).toContain('idle');
      expect(values).toContain('blocked');
      expect(values).toContain('offline');
    });

    it('has skills as array of strings', () => {
      const skills = getField('agents', 'skills');
      expect(skills?.kind).toBe('array');
      expect(skills?.element?.kind).toBe('string');
    });

    it('has by_status and by_name indexes', () => {
      const indexes = getIndexes('agents');
      const hasByStatus = indexes.some((i) => i.fields[0] === 'status');
      const hasByName = indexes.some((i) => i.fields[0] === 'name');
      expect(hasByStatus).toBe(true);
      expect(hasByName).toBe(true);
    });
  });

  describe('providers table', () => {
    it('exists with required fields', () => {
      expect(tables.providers).toBeDefined();
      const fields = getFieldNames('providers');
      expect(fields).toContain('name');
      expect(fields).toContain('models');
      expect(fields).toContain('status');
      expect(fields).toContain('latency');
      expect(fields).toContain('createdAt');
    });

    it('has status enum with active/rate_limited/idle', () => {
      const status = getField('providers', 'status');
      expect(status?.kind).toBe('union');
      const values = getLiteralValues(status);
      expect(values).toContain('active');
      expect(values).toContain('rate_limited');
      expect(values).toContain('idle');
    });

    it('has models as array of strings', () => {
      const models = getField('providers', 'models');
      expect(models?.kind).toBe('array');
      expect(models?.element?.kind).toBe('string');
    });
  });

  describe('pipelineRuns table', () => {
    it('exists with required fields', () => {
      expect(tables.pipelineRuns).toBeDefined();
      const fields = getFieldNames('pipelineRuns');
      expect(fields).toContain('taskId');
      expect(fields).toContain('stage');
      expect(fields).toContain('agentId');
      expect(fields).toContain('startTime');
      expect(fields).toContain('endTime');
      expect(fields).toContain('cost');
      expect(fields).toContain('status');
      expect(fields).toContain('createdAt');
    });

    it('has stage enum with all pipeline stages', () => {
      const stage = getField('pipelineRuns', 'stage');
      expect(stage?.kind).toBe('union');
      const values = getLiteralValues(stage);
      expect(values).toContain('dispatch');
      expect(values).toContain('architect');
      expect(values).toContain('executor');
      expect(values).toContain('reviewer');
      expect(values).toContain('merger');
    });

    it('has status enum with running/completed/failed', () => {
      const status = getField('pipelineRuns', 'status');
      expect(status?.kind).toBe('union');
      const values = getLiteralValues(status);
      expect(values).toContain('running');
      expect(values).toContain('completed');
      expect(values).toContain('failed');
    });

    it('has by_task index', () => {
      const indexes = getIndexes('pipelineRuns');
      const hasByTask = indexes.some((i) => i.fields[0] === 'taskId');
      expect(hasByTask).toBe(true);
    });
  });

  describe('abTests table', () => {
    it('exists with required fields', () => {
      expect(tables.abTests).toBeDefined();
      const fields = getFieldNames('abTests');
      expect(fields).toContain('name');
      expect(fields).toContain('agentRole');
      expect(fields).toContain('controlModel');
      expect(fields).toContain('treatmentModel');
      expect(fields).toContain('splitRatio');
      expect(fields).toContain('status');
      expect(fields).toContain('sprintId');
      expect(fields).toContain('createdAt');
      expect(fields).toContain('completedAt');
    });

    it('has status enum with running/completed', () => {
      const status = getField('abTests', 'status');
      expect(status?.kind).toBe('union');
      const values = getLiteralValues(status);
      expect(values).toContain('running');
      expect(values).toContain('completed');
    });
  });
});
