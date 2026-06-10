import { describe, expect, it } from 'bun:test';
import schema from './schema';

const tables = (schema as any).tables;
const prefTable = tables.notificationPreferences;

interface FieldMap {
  [fieldName: string]: unknown;
}

function getFieldMap(): FieldMap {
  if (!prefTable) return {};
  const validator = prefTable.validator;
  if (validator && typeof validator === 'object' && 'fields' in validator) {
    return (validator as { fields: FieldMap }).fields ?? {};
  }
  if (prefTable.fields && typeof prefTable.fields === 'object') {
    return prefTable.fields as FieldMap;
  }
  return {};
}

function getIndexFields(): string[][] {
  if (!prefTable) return [];
  const indexes = prefTable.indexes as Array<{ indexDescriptor: string; fields: string[] }> | undefined;
  return (indexes ?? []).map((i) => i.fields);
}

describe('notificationPreferences schema (Phase 2 SoT)', () => {
  it('defines the notificationPreferences table', () => {
    expect(prefTable).toBeDefined();
  });

  it('exposes the plan-mandated preference fields (emailSprints, emailBudget, inAppAlerts, budgetThresholdPercent)', () => {
    const fields = getFieldMap();
    const fieldNames = Object.keys(fields);
    expect(fieldNames).toContain('emailSprints');
    expect(fieldNames).toContain('emailBudget');
    expect(fieldNames).toContain('inAppAlerts');
    expect(fieldNames).toContain('budgetThresholdPercent');
  });

  it('keeps userId as the per-user identity field', () => {
    const fields = getFieldMap();
    expect(Object.keys(fields)).toContain('userId');
  });

  it('keeps updatedAt for optimistic-mutation audit', () => {
    const fields = getFieldMap();
    expect(Object.keys(fields)).toContain('updatedAt');
  });

  it('indexes notificationPreferences by userId for per-user lookups', () => {
    const indexes = getIndexFields();
    const hasByUser = indexes.some(
      (fields) => fields.length === 1 && fields[0] === 'userId',
    );
    expect(hasByUser).toBe(true);
  });
});
