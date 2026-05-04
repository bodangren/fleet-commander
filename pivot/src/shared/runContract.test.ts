import { describe, expect, it } from 'bun:test';
import {
  RunContract,
  ArchitectOutput,
  ExecutorOutput,
  ReviewerOutput,
  RecoveryOutput,
  isRunContract,
  isArchitectOutput,
  isExecutorOutput,
  isReviewerOutput,
  isRecoveryOutput,
} from './runContract';

describe('RunContract', () => {
  it('parses a valid run contract', () => {
    const contract = {
      taskId: 'task-123',
      projectSlug: 'my-project',
      objective: 'Implement user authentication',
      scope: ['login', 'logout', 'password-reset'],
      acceptanceCriteria: ['Users can log in', 'Sessions persist'],
      createdAt: Date.now(),
      stages: {
        architect: {
          output: 'Build a secure auth system',
          confidence: 0.85,
          assumptions: ['Use JWT for sessions'],
        },
        executor: {
          changedFiles: ['auth/login.ts', 'auth/logout.ts'],
          testsRun: ['login.test.ts', 'logout.test.ts'],
          unresolvedAssumptions: [],
          confidence: 0.9,
          branch: 'feat/auth',
          commit: 'abc123',
          status: 'succeeded' as const,
        },
      },
    };
    expect(() => RunContract.parse(contract)).not.toThrow();
  });

  it('rejects contract missing taskId', () => {
    const contract = {
      projectSlug: 'my-project',
      objective: 'Implement user authentication',
      scope: [],
      acceptanceCriteria: [],
      createdAt: Date.now(),
      stages: {},
    };
    expect(() => RunContract.parse(contract)).toThrow();
  });

  it('rejects contract with invalid confidence value', () => {
    const contract = {
      taskId: 'task-123',
      projectSlug: 'my-project',
      objective: 'Implement user authentication',
      scope: [],
      acceptanceCriteria: [],
      createdAt: Date.now(),
      stages: {
        architect: {
          output: 'Build a secure auth system',
          confidence: 1.5, // Invalid: should be 0-1
          assumptions: [],
        },
      },
    };
    expect(() => RunContract.parse(contract)).toThrow();
  });
});

describe('ArchitectOutput', () => {
  it('parses valid architect output', () => {
    const output = {
      output: 'Design a REST API with endpoints',
      confidence: 0.75,
      assumptions: ['Use Express framework'],
      suggestedHarness: 'node-test',
    };
    expect(() => ArchitectOutput.parse(output)).not.toThrow();
  });

  it('rejects architect output with negative confidence', () => {
    const output = {
      output: 'Design a REST API',
      confidence: -0.1,
      assumptions: [],
    };
    expect(() => ArchitectOutput.parse(output)).toThrow();
  });

  it('rejects architect output with confidence > 1', () => {
    const output = {
      output: 'Design a REST API',
      confidence: 1.1,
      assumptions: [],
    };
    expect(() => ArchitectOutput.parse(output)).toThrow();
  });
});

describe('ExecutorOutput', () => {
  it('parses valid executor output', () => {
    const output = {
      changedFiles: ['src/index.ts', 'src/utils.ts'],
      testsRun: ['test/index.test.ts'],
      unresolvedAssumptions: ['SSL certificates available'],
      confidence: 0.85,
      branch: 'feature/new-endpoint',
      commit: 'def456',
      status: 'succeeded' as const,
    };
    expect(() => ExecutorOutput.parse(output)).not.toThrow();
  });

  it('rejects executor output missing changedFiles', () => {
    const output = {
      testsRun: ['test/index.test.ts'],
      unresolvedAssumptions: [],
      confidence: 0.85,
      branch: 'feature/new-endpoint',
      commit: 'def456',
      status: 'succeeded' as const,
    };
    expect(() => ExecutorOutput.parse(output)).toThrow();
  });

  it('rejects executor output with invalid status', () => {
    const output = {
      changedFiles: ['src/index.ts'],
      testsRun: [],
      unresolvedAssumptions: [],
      confidence: 0.85,
      branch: 'feature/new-endpoint',
      commit: 'def456',
      status: 'invalid_status' as any,
    };
    expect(() => ExecutorOutput.parse(output)).toThrow();
  });

  it('rejects executor output with non-array changedFiles', () => {
    const output = {
      changedFiles: 'src/index.ts', // should be array
      testsRun: [],
      unresolvedAssumptions: [],
      confidence: 0.85,
      branch: 'feature/new-endpoint',
      commit: 'def456',
      status: 'succeeded' as const,
    };
    expect(() => ExecutorOutput.parse(output)).toThrow();
  });
});

describe('ReviewerOutput', () => {
  it('parses valid reviewer output with issueClass and severity', () => {
    const output = {
      status: 'passed' as const,
      summary: 'Code looks good',
      issueClass: 'correctness' as const,
      severity: 'minor' as const,
    };
    expect(() => ReviewerOutput.parse(output)).not.toThrow();
  });

  it('parses reviewer output with agent comments', () => {
    const output = {
      status: 'needs-changes' as const,
      summary: 'Fix type errors',
      issueClass: 'correctness' as const,
      severity: 'major' as const,
      agentComments: [
        { file: 'src/index.ts', line: 42, severity: 'error', message: 'Type mismatch' },
      ],
    };
    expect(() => ReviewerOutput.parse(output)).not.toThrow();
  });

  it('parses reviewer output with resolvedAssumptions', () => {
    const output = {
      status: 'passed' as const,
      summary: 'All assumptions validated',
      issueClass: 'correctness' as const,
      severity: 'minor' as const,
      resolvedAssumptions: true,
    };
    expect(() => ReviewerOutput.parse(output)).not.toThrow();
  });

  it('rejects reviewer output with invalid issueClass', () => {
    const output = {
      status: 'failed' as const,
      summary: 'Security issue found',
      issueClass: 'invalid_class' as any,
      severity: 'blocker' as const,
    };
    expect(() => ReviewerOutput.parse(output)).toThrow();
  });

  it('rejects reviewer output with invalid severity', () => {
    const output = {
      status: 'failed' as const,
      summary: 'Style issue',
      issueClass: 'style' as const,
      severity: 'critical' as any, // Invalid severity
    };
    expect(() => ReviewerOutput.parse(output)).toThrow();
  });

  it('rejects reviewer output missing issueClass', () => {
    const output = {
      status: 'passed' as const,
      summary: 'Looks good',
      severity: 'minor' as const,
      // missing issueClass
    };
    expect(() => ReviewerOutput.parse(output)).toThrow();
  });

  it('rejects reviewer output missing severity', () => {
    const output = {
      status: 'passed' as const,
      summary: 'Looks good',
      issueClass: 'correctness' as const,
      // missing severity
    };
    expect(() => ReviewerOutput.parse(output)).toThrow();
  });
});

describe('RecoveryOutput', () => {
  it('parses valid recovery output with retry action', () => {
    const output = {
      action: 'retry' as const,
      reason: 'Task timed out, retrying with higher timeout',
    };
    expect(() => RecoveryOutput.parse(output)).not.toThrow();
  });

  it('parses valid recovery output with human_review action', () => {
    const output = {
      action: 'human_review' as const,
      reason: 'Schema validation failed, needs manual inspection',
    };
    expect(() => RecoveryOutput.parse(output)).not.toThrow();
  });

  it('rejects recovery output with invalid action', () => {
    const output = {
      action: 'unknown_action' as any,
      reason: 'Some reason',
    };
    expect(() => RecoveryOutput.parse(output)).toThrow();
  });

  it('rejects recovery output missing reason', () => {
    const output = {
      action: 'retry' as const,
    };
    expect(() => RecoveryOutput.parse(output)).toThrow();
  });

  it('accepts all valid recovery actions', () => {
    const actions = ['retry', 'escalate', 'split', 'replan', 'human_review'] as const;
    for (const action of actions) {
      const output = {
        action,
        reason: `Testing ${action} action`,
      };
      expect(() => RecoveryOutput.parse(output)).not.toThrow();
    }
  });
});

describe('Type guards', () => {
  it('isRunContract returns true for valid contract', () => {
    const contract = {
      taskId: 'task-123',
      projectSlug: 'my-project',
      objective: 'Test',
      scope: [],
      acceptanceCriteria: [],
      createdAt: Date.now(),
      stages: {},
    };
    expect(isRunContract(contract)).toBe(true);
  });

  it('isRunContract returns false for invalid contract', () => {
    expect(isRunContract({})).toBe(false);
    expect(isRunContract({ taskId: 'task-123' })).toBe(false);
  });

  it('isArchitectOutput returns true for valid architect output', () => {
    expect(
      isArchitectOutput({
        output: 'Design',
        confidence: 0.8,
        assumptions: [],
      }),
    ).toBe(true);
  });

  it('isExecutorOutput returns true for valid executor output', () => {
    expect(
      isExecutorOutput({
        changedFiles: ['a.ts'],
        testsRun: [],
        unresolvedAssumptions: [],
        confidence: 0.8,
        branch: 'b',
        commit: 'c',
        status: 'succeeded',
      }),
    ).toBe(true);
  });

  it('isReviewerOutput returns true for valid reviewer output', () => {
    expect(
      isReviewerOutput({
        status: 'passed',
        summary: 'OK',
        issueClass: 'correctness',
        severity: 'minor',
      }),
    ).toBe(true);
  });

  it('isRecoveryOutput returns true for valid recovery output', () => {
    expect(
      isRecoveryOutput({
        action: 'retry',
        reason: 'Timeout',
      }),
    ).toBe(true);
  });
});
