import { describe, test, expect } from 'bun:test';
import { validateBranchName, sanitizeForShell } from './validation';

describe('validateBranchName', () => {
  test('rejects empty branch name', () => {
    const result = validateBranchName('');
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.reason).toBe('Branch name is required');
    }
  });

  test('rejects branch name starting with hyphen', () => {
    const result = validateBranchName('-feature');
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.reason).toBe('Branch name cannot start with a hyphen');
    }
  });

  test('rejects branch name with double dots', () => {
    const result = validateBranchName('feature..test');
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.reason).toBe('Branch name cannot contain double dots');
    }
  });

  test('rejects branch name ending with dot', () => {
    const result = validateBranchName('feature.');
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.reason).toBe('Branch name cannot end with a dot');
    }
  });

  test('rejects branch name with double slashes', () => {
    const result = validateBranchName('feature//test');
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.reason).toBe('Branch name cannot contain double slashes');
    }
  });

  test('rejects branch name with invalid characters', () => {
    const result = validateBranchName('feature test');
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.reason).toContain('invalid characters');
    }
  });

  test('accepts valid branch name', () => {
    expect(validateBranchName('feature/test-123').valid).toBe(true);
  });

  test('accepts branch name with dots', () => {
    expect(validateBranchName('release/1.2.3').valid).toBe(true);
  });

  test('accepts branch name with underscores', () => {
    expect(validateBranchName('fix/my_bug').valid).toBe(true);
  });
});

describe('sanitizeForShell', () => {
  test('removes null bytes', () => {
    expect(sanitizeForShell('test\x00value')).toBe('testvalue');
  });

  test('removes control characters', () => {
    expect(sanitizeForShell('test\x01\x02\x03value')).toBe('testvalue');
  });

  test('removes delete character', () => {
    expect(sanitizeForShell('test\x7fvalue')).toBe('testvalue');
  });

  test('preserves normal text', () => {
    expect(sanitizeForShell('hello world')).toBe('hello world');
  });

  test('removes newlines and tabs (control characters)', () => {
    expect(sanitizeForShell('line1\nline2\ttab')).toBe('line1line2tab');
  });
});
