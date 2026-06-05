/**
 * Schema tests for the projectTemplates table (Phase 2 of the Project Template Marketplace track).
 *
 * These tests assert that the Convex schema exposes a `projectTemplates` table with the
 * fields, types, and indexes required by the spec and the test strategy. They are written
 * first (Red phase) so the schema implementation has a clear contract to satisfy.
 *
 * Spec: measure/tracks/project_template_marketplace_20260530/spec.md
 * Test strategy: measure/tracks/project_template_marketplace_20260530/test-strategy.md
 */
import { describe, expect, it } from 'bun:test';
import schema from './schema';

describe('projectTemplates table (schema)', () => {
  const tables = (schema as any).tables;

  function getField(tableName: string, fieldName: string): any {
    return tables[tableName]?.validator?.fields?.[fieldName] ?? null;
  }

  function getFieldNames(tableName: string): string[] {
    const fields = tables[tableName]?.validator?.fields;
    return fields ? Object.keys(fields) : [];
  }

  function getArrayElement(fieldValidator: any): any {
    if (!fieldValidator || fieldValidator.kind !== 'array') return null;
    return fieldValidator.element ?? null;
  }

  function getObjectFields(fieldValidator: any): string[] {
    if (!fieldValidator || fieldValidator.kind !== 'object') return [];
    return Object.keys(fieldValidator.fields ?? {});
  }

  function getIndexes(tableName: string): Array<{ indexDescriptor: string; fields: string[] }> {
    return tables[tableName]?.indexes ?? [];
  }

  it('exists in the schema', () => {
    expect(tables.projectTemplates).toBeDefined();
  });

  it('exposes the spec-required top-level fields', () => {
    const fields = getFieldNames('projectTemplates');
    expect(fields).toContain('name');
    expect(fields).toContain('description');
    expect(fields).toContain('category');
    expect(fields).toContain('tasks');
    expect(fields).toContain('defaultAgents');
    expect(fields).toContain('estimatedBudget');
    expect(fields).toContain('createdAt');
    expect(fields).toContain('updatedAt');
  });

  it('uses string validators for name, description, and category', () => {
    expect(getField('projectTemplates', 'name')?.kind).toBe('string');
    expect(getField('projectTemplates', 'description')?.kind).toBe('string');
    expect(getField('projectTemplates', 'category')?.kind).toBe('string');
  });

  it('uses a number validator for estimatedBudget', () => {
    expect(getField('projectTemplates', 'estimatedBudget')?.kind).toBe('float64');
  });

  it('uses float64 timestamps for createdAt and updatedAt', () => {
    expect(getField('projectTemplates', 'createdAt')?.kind).toBe('float64');
    expect(getField('projectTemplates', 'updatedAt')?.kind).toBe('float64');
  });

  describe('tasks[] array element', () => {
    const tasksArray = getField('projectTemplates', 'tasks');
    const element = getArrayElement(tasksArray);

    it('is an array', () => {
      expect(tasksArray?.kind).toBe('array');
    });

    it('element is an object with the structure-only fields from extractTemplateFromProject', () => {
      const names = getObjectFields(element);
      expect(names).toContain('title');
      expect(names).toContain('storyPoints');
      expect(names).toContain('priority');
      expect(names).toContain('status');
      expect(names).toContain('dependencies');
    });

    it('does NOT carry runtime fields (description, costEstimate, actualCost, assigneeId, etc.)', () => {
      const names = getObjectFields(element);
      expect(names).not.toContain('description');
      expect(names).not.toContain('costEstimate');
      expect(names).not.toContain('actualCost');
      expect(names).not.toContain('assigneeId');
      expect(names).not.toContain('reviewerId');
      expect(names).not.toContain('mergerId');
      expect(names).not.toContain('sessionId');
      expect(names).not.toContain('blockerReason');
      expect(names).not.toContain('rejectionReason');
    });

    it('title is a string, storyPoints is a number', () => {
      const titleField = element?.fields?.title;
      const storyPointsField = element?.fields?.storyPoints;
      expect(titleField?.kind).toBe('string');
      expect(storyPointsField?.kind).toBe('float64');
    });

    it('priority is a union of low/medium/high literals', () => {
      const priorityField = element?.fields?.priority;
      expect(priorityField?.kind).toBe('union');
      const values = priorityField?.members
        ?.filter((m: any) => m.kind === 'literal')
        .map((m: any) => m.value) ?? [];
      expect(values).toContain('low');
      expect(values).toContain('medium');
      expect(values).toContain('high');
    });

    it('status is a union of the six task status literals', () => {
      const statusField = element?.fields?.status;
      expect(statusField?.kind).toBe('union');
      const values = statusField?.members
        ?.filter((m: any) => m.kind === 'literal')
        .map((m: any) => m.value) ?? [];
      expect(values).toContain('backlog');
      expect(values).toContain('ready');
      expect(values).toContain('in_progress');
      expect(values).toContain('review');
      expect(values).toContain('done');
      expect(values).toContain('blocked');
    });

    it('dependencies is an optional array of strings', () => {
      const depsField = element?.fields?.dependencies;
      // Optional wrappers are unions with a literal('undefined') member; accept either
      // the bare array shape or the optional-of-array shape.
      const isOptionalArray =
        depsField?.kind === 'array' ||
        (depsField?.kind === 'union' &&
          depsField.members?.some(
            (m: any) => m.kind === 'array' && m.element?.kind === 'string',
          ));
      expect(isOptionalArray).toBe(true);
    });
  });

  describe('defaultAgents[] array element', () => {
    const agentsArray = getField('projectTemplates', 'defaultAgents');
    const element = getArrayElement(agentsArray);

    it('is an array', () => {
      expect(agentsArray?.kind).toBe('array');
    });

    it('element is an object with role, model, skills, costPerPoint', () => {
      const names = getObjectFields(element);
      expect(names).toContain('role');
      expect(names).toContain('model');
      expect(names).toContain('skills');
      expect(names).toContain('costPerPoint');
    });

    it('does NOT carry a per-agent name field (anonymized)', () => {
      const names = getObjectFields(element);
      expect(names).not.toContain('name');
    });

    it('role is a union of architect/executor/reviewer/merger', () => {
      const roleField = element?.fields?.role;
      expect(roleField?.kind).toBe('union');
      const values = roleField?.members
        ?.filter((m: any) => m.kind === 'literal')
        .map((m: any) => m.value) ?? [];
      expect(values).toContain('architect');
      expect(values).toContain('executor');
      expect(values).toContain('reviewer');
      expect(values).toContain('merger');
    });

    it('skills is an array of strings', () => {
      const skillsField = element?.fields?.skills;
      expect(skillsField?.kind).toBe('array');
      expect(skillsField?.element?.kind).toBe('string');
    });

    it('costPerPoint is a number', () => {
      const costField = element?.fields?.costPerPoint;
      expect(costField?.kind).toBe('float64');
    });
  });

  describe('indexes', () => {
    it('exposes a by_name index (mirrors agentTemplates pattern)', () => {
      const indexes = getIndexes('projectTemplates');
      const hasByName = indexes.some((i) => i.fields[0] === 'name');
      expect(hasByName).toBe(true);
    });

    it('exposes a by_category index for gallery filtering', () => {
      const indexes = getIndexes('projectTemplates');
      const hasByCategory = indexes.some((i) => i.fields[0] === 'category');
      expect(hasByCategory).toBe(true);
    });
  });

  describe('projects table templateId back-reference', () => {
    const projectsTable = tables.projects;

    it('exposes an optional templateId field on the projects table', () => {
      const field = projectsTable?.validator?.fields?.templateId ?? null;
      expect(field).not.toBeNull();
      // Optional wrappers in Convex present as a union containing the literal
      // 'undefined'; accept either the bare string shape or the optional-of-string.
      const isOptionalString =
        field?.kind === 'string' ||
        (field?.kind === 'union' &&
          field.members?.some(
            (m: any) => m.kind === 'string' || m.value === undefined,
          ));
      expect(isOptionalString).toBe(true);
    });

    it('exposes a by_templateId index on the projects table (delete-guard dependency)', () => {
      const indexes = projectsTable?.indexes ?? [];
      const hasByTemplateId = indexes.some((i: any) => i.fields[0] === 'templateId');
      expect(hasByTemplateId).toBe(true);
    });
  });
});
