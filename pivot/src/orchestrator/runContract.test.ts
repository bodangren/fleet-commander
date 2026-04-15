import { describe, expect, it } from 'bun:test';
import {
  validateAndParse,
  isRunContract,
  isArchitectOutput,
  isExecutorOutput,
  isReviewerOutput,
  isRecoveryOutput,
  RunContract,
  ArchitectOutput,
  ExecutorOutput,
  ReviewerOutput,
  RecoveryOutput,
} from './runContract';

describe('orchestrator runContract re-exports', () => {
  it('re-exports schemas and type guards from shared', () => {
    expect(RunContract).toBeDefined();
    expect(ArchitectOutput).toBeDefined();
    expect(ExecutorOutput).toBeDefined();
    expect(ReviewerOutput).toBeDefined();
    expect(RecoveryOutput).toBeDefined();
    expect(isRunContract).toBeDefined();
    expect(isArchitectOutput).toBeDefined();
    expect(isExecutorOutput).toBeDefined();
    expect(isReviewerOutput).toBeDefined();
    expect(isRecoveryOutput).toBeDefined();
  });
});

describe('validateAndParse', () => {
  it('parses valid architect stage output', () => {
    const result = validateAndParse('architect', {
      output: 'Design a system',
      confidence: 0.85,
      assumptions: ['Use REST'],
    });
    expect(result).not.toBeNull();
    expect(result?.action).toBe('validated');
  });

  it('returns error for invalid architect output', () => {
    const result = validateAndParse('architect', {
      output: 'Design a system',
      confidence: 1.5, // invalid
      assumptions: [],
    });
    expect(result).not.toBeNull();
    expect(result?.action).toBe('error');
    expect(result?.error).toContain('confidence');
  });

  it('parses valid executor stage output', () => {
    const result = validateAndParse('executor', {
      changedFiles: ['src/a.ts'],
      testsRun: [],
      unresolvedAssumptions: [],
      confidence: 0.9,
      branch: 'feat/a',
      commit: 'abc',
      status: 'succeeded',
    });
    expect(result).not.toBeNull();
    expect(result?.action).toBe('validated');
  });

  it('returns error for invalid executor output', () => {
    const result = validateAndParse('executor', {
      changedFiles: ['src/a.ts'],
      testsRun: [],
      unresolvedAssumptions: [],
      confidence: -0.1,
      branch: 'feat/a',
      commit: 'abc',
      status: 'succeeded',
    });
    expect(result).not.toBeNull();
    expect(result?.action).toBe('error');
    expect(result?.error).toContain('confidence');
  });

  it('parses valid reviewer stage output', () => {
    const result = validateAndParse('reviewer', {
      status: 'passed',
      summary: 'Looks good',
      issueClass: 'correctness',
      severity: 'minor',
    });
    expect(result).not.toBeNull();
    expect(result?.action).toBe('validated');
  });

  it('returns error for invalid reviewer output', () => {
    const result = validateAndParse('reviewer', {
      status: 'passed',
      summary: 'Looks good',
      issueClass: 'invalid_class' as any,
      severity: 'minor',
    });
    expect(result).not.toBeNull();
    expect(result?.action).toBe('error');
  });

  it('parses valid recovery stage output', () => {
    const result = validateAndParse('recovery', {
      action: 'retry',
      reason: 'Timeout occurred',
    });
    expect(result).not.toBeNull();
    expect(result?.action).toBe('validated');
  });

  it('returns error for invalid recovery output', () => {
    const result = validateAndParse('recovery', {
      action: 'invalid_action' as any,
      reason: 'Timeout occurred',
    });
    expect(result).not.toBeNull();
    expect(result?.action).toBe('error');
  });

  it('returns null for unknown stage', () => {
    const result = validateAndParse('unknown' as any, {});
    expect(result).toBeNull();
  });
});
