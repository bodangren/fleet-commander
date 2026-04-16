import { describe, it, expect, beforeEach } from 'bun:test';
import { existsSync, writeFileSync, unlinkSync } from 'fs';
import { join } from 'path';
import { parseReconciliationRules, ReconciliationRules } from './rules';

describe('parseReconciliationRules', () => {
  const testConfigPath = join('/tmp', 'test-reconciliation.yml');

  beforeEach(() => {
    if (existsSync(testConfigPath)) {
      unlinkSync(testConfigPath);
    }
  });

  it('parses valid reconciliation.yml with all artifact classes', () => {
    const validYaml = `
artifactClasses:
  task:
    canonicalSource: convex
    exportTarget: 'conductor/tracks/*/plan.md'
    importAllowed:
      - status
      - priority
    conflictStrategy: prefer_canonical

  trackMetadata:
    canonicalSource: convex
    exportTarget: 'conductor/tracks.md'
    importAllowed: []
    conflictStrategy: manual

  issue:
    canonicalSource: markdown
    exportTarget: null
    importAllowed:
      - title
      - description
    conflictStrategy: prefer_export

  plan:
    canonicalSource: markdown
    exportTarget: 'conductor/tracks/*/plan.md'
    importAllowed: []
    conflictStrategy: reject
`;
    writeFileSync(testConfigPath, validYaml);

    const rules = parseReconciliationRules(testConfigPath);

    expect(rules.artifactClasses).toHaveProperty('task');
    expect(rules.artifactClasses.task.canonicalSource).toBe('convex');
    expect(rules.artifactClasses.task.exportTarget).toBe('conductor/tracks/*/plan.md');
    expect(rules.artifactClasses.task.importAllowed).toContain('status');
    expect(rules.artifactClasses.task.conflictStrategy).toBe('prefer_canonical');

    expect(rules.artifactClasses.trackMetadata.canonicalSource).toBe('convex');
    expect(rules.artifactClasses.trackMetadata.conflictStrategy).toBe('manual');

    expect(rules.artifactClasses.issue.canonicalSource).toBe('markdown');
    expect(rules.artifactClasses.issue.conflictStrategy).toBe('prefer_export');

    expect(rules.artifactClasses.plan.canonicalSource).toBe('markdown');
    expect(rules.artifactClasses.plan.conflictStrategy).toBe('reject');
  });

  it('throws error when file does not exist', () => {
    expect(() => parseReconciliationRules('/nonexistent/path.yml')).toThrow();
  });

  it('throws error for invalid canonicalSource', () => {
    const invalidYaml = `
artifactClasses:
  task:
    canonicalSource: invalid_source
    exportTarget: 'conductor/tracks/*/plan.md'
    importAllowed: []
    conflictStrategy: prefer_canonical
`;
    writeFileSync(testConfigPath, invalidYaml);

    expect(() => parseReconciliationRules(testConfigPath)).toThrow(/canonicalSource/);
  });

  it('throws error for invalid conflictStrategy', () => {
    const invalidYaml = `
artifactClasses:
  task:
    canonicalSource: convex
    exportTarget: 'conductor/tracks/*/plan.md'
    importAllowed: []
    conflictStrategy: invalid_strategy
`;
    writeFileSync(testConfigPath, invalidYaml);

    expect(() => parseReconciliationRules(testConfigPath)).toThrow(/conflictStrategy/);
  });

  it('throws error when artifactClasses is missing', () => {
    const invalidYaml = `
someOtherField: value
`;
    writeFileSync(testConfigPath, invalidYaml);

    expect(() => parseReconciliationRules(testConfigPath)).toThrow(/artifactClasses/);
  });

  it('allows null exportTarget for no-export artifacts', () => {
    const validYaml = `
artifactClasses:
  issue:
    canonicalSource: markdown
    exportTarget: null
    importAllowed:
      - title
    conflictStrategy: manual
`;
    writeFileSync(testConfigPath, validYaml);

    const rules = parseReconciliationRules(testConfigPath);

    expect(rules.artifactClasses.issue.exportTarget).toBeNull();
  });

  it('rejects artifact class with empty importAllowed that is not empty array', () => {
    const invalidYaml = `
artifactClasses:
  task:
    canonicalSource: convex
    exportTarget: 'conductor/tracks/*/plan.md'
    importAllowed: 'not_an_array'
    conflictStrategy: prefer_canonical
`;
    writeFileSync(testConfigPath, invalidYaml);

    expect(() => parseReconciliationRules(testConfigPath)).toThrow(/importAllowed/);
  });
});