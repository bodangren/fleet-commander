import { describe, expect, it } from 'bun:test';
import {
  HarnessProfile,
  InvocationTemplateSchema,
  CapabilitySchema,
  PolicySchema,
  isHarnessProfile,
} from './harnessProfile';

describe('HarnessProfile', () => {
  it('parses a valid harness profile with all fields', () => {
    const profile = {
      name: 'opencode',
      binary: 'opencode',
      discovery: {
        command: 'opencode models',
        parse_strategy: 'line-per-model',
        pattern: '',
        notes: 'Lists available models',
      },
      invocation: {
        template: 'opencode -m {model} run "{prompt}"',
        flags: {
          agent: '--agent {value}',
          continue: '--continue',
          session: '--session {value}',
          prompt: '--prompt "{value}"',
        },
      },
      capabilities: {
        supportedTaskClasses: ['feature', 'bug', 'chore'],
        supportsContinuousMode: true,
        maxConcurrentTasks: 3,
        supportedLlmProviders: ['anthropic', 'openai', 'google'],
      },
      policy: {
        allowed_task_classes: ['feature', 'bug', 'chore'],
        concurrency_limit: 3,
        retry_with_human_review_on_failure: false,
      },
    };
    expect(() => HarnessProfile.parse(profile)).not.toThrow();
  });

  it('parses a minimal valid harness profile', () => {
    const profile = {
      name: 'minimal-harness',
      binary: 'minimal',
      invocation: {
        template: 'minimal run "{prompt}"',
        flags: {},
      },
    };
    expect(() => HarnessProfile.parse(profile)).not.toThrow();
  });

  it('rejects profile missing required name', () => {
    const profile = {
      binary: 'test',
      invocation: { template: 'test "{prompt}"', flags: {} },
      capabilities: { supportedTaskClasses: ['feature'] },
      policy: {},
    };
    expect(() => HarnessProfile.parse(profile)).toThrow();
  });

  it('rejects profile missing binary', () => {
    const profile = {
      name: 'test',
      invocation: { template: 'test "{prompt}"', flags: {} },
      capabilities: { supportedTaskClasses: ['feature'] },
      policy: {},
    };
    expect(() => HarnessProfile.parse(profile)).toThrow();
  });

  it('rejects profile with invalid task class in capabilities', () => {
    const profile = {
      name: 'test',
      binary: 'test',
      invocation: { template: 'test "{prompt}"', flags: {} },
      capabilities: {
        supportedTaskClasses: ['invalid_class' as any],
      },
      policy: {},
    };
    expect(() => HarnessProfile.parse(profile)).toThrow();
  });

  it('rejects profile with invalid task class in policy', () => {
    const profile = {
      name: 'test',
      binary: 'test',
      invocation: { template: 'test "{prompt}"', flags: {} },
      capabilities: { supportedTaskClasses: ['feature'] },
      policy: {
        allowed_task_classes: ['invalid_class' as any],
      },
    };
    expect(() => HarnessProfile.parse(profile)).toThrow();
  });

  it('rejects profile with negative concurrency_limit', () => {
    const profile = {
      name: 'test',
      binary: 'test',
      invocation: { template: 'test "{prompt}"', flags: {} },
      capabilities: { supportedTaskClasses: ['feature'] },
      policy: {
        concurrency_limit: -1,
      },
    };
    expect(() => HarnessProfile.parse(profile)).toThrow();
  });

  it('rejects profile with non-boolean retry_with_human_review_on_failure', () => {
    const profile = {
      name: 'test',
      binary: 'test',
      invocation: { template: 'test "{prompt}"', flags: {} },
      capabilities: { supportedTaskClasses: ['feature'] },
      policy: {
        retry_with_human_review_on_failure: 'yes' as any,
      },
    };
    expect(() => HarnessProfile.parse(profile)).toThrow();
  });
});

describe('InvocationTemplateSchema', () => {
  it('parses valid invocation with all flag types', () => {
    const invocation = {
      template: 'harness -m {model} "{prompt}"',
      flags: {
        agent: '--agent {value}',
        continue: '--continue',
        timeout: '--timeout {value}',
        session: '--session {value}',
      },
    };
    expect(() => InvocationTemplateSchema.parse(invocation)).not.toThrow();
  });

  it('parses invocation with empty flags', () => {
    const invocation = {
      template: 'simple "{prompt}"',
      flags: {},
    };
    expect(() => InvocationTemplateSchema.parse(invocation)).not.toThrow();
  });

  it('rejects invocation missing template', () => {
    const invocation = {
      flags: { agent: '--agent {value}' },
    };
    expect(() => InvocationTemplateSchema.parse(invocation)).toThrow();
  });

  it('rejects invocation with non-string template', () => {
    const invocation = {
      template: 123 as any,
      flags: {},
    };
    expect(() => InvocationTemplateSchema.parse(invocation)).toThrow();
  });
});

describe('CapabilitySchema', () => {
  it('parses capabilities with all optional fields', () => {
    const caps = {
      supportedTaskClasses: ['feature', 'bug', 'chore', 'review'],
      supportsContinuousMode: true,
      maxConcurrentTasks: 5,
      supportedLlmProviders: ['anthropic', 'openai'],
    };
    expect(() => CapabilitySchema.parse(caps)).not.toThrow();
  });

  it('parses capabilities with only required fields', () => {
    const caps = {
      supportedTaskClasses: ['feature'],
    };
    expect(() => CapabilitySchema.parse(caps)).not.toThrow();
  });

  it('rejects capabilities with non-array supportedTaskClasses', () => {
    const caps = {
      supportedTaskClasses: 'feature' as any,
    };
    expect(() => CapabilitySchema.parse(caps)).toThrow();
  });

  it('rejects capabilities with non-boolean supportsContinuousMode', () => {
    const caps = {
      supportedTaskClasses: ['feature'],
      supportsContinuousMode: 'yes' as any,
    };
    expect(() => CapabilitySchema.parse(caps)).toThrow();
  });

  it('rejects capabilities with negative maxConcurrentTasks', () => {
    const caps = {
      supportedTaskClasses: ['feature'],
      maxConcurrentTasks: 0,
    };
    expect(() => CapabilitySchema.parse(caps)).toThrow();
  });
});

describe('PolicySchema', () => {
  it('parses policy with all fields', () => {
    const policy = {
      allowed_task_classes: ['feature', 'bug'],
      concurrency_limit: 4,
      retry_with_human_review_on_failure: true,
    };
    expect(() => PolicySchema.parse(policy)).not.toThrow();
  });

  it('parses empty policy', () => {
    expect(() => PolicySchema.parse({})).not.toThrow();
  });

  it('rejects policy with non-array allowed_task_classes', () => {
    const policy = {
      allowed_task_classes: 'feature' as any,
    };
    expect(() => PolicySchema.parse(policy)).toThrow();
  });

  it('rejects policy with non-number concurrency_limit', () => {
    const policy = {
      concurrency_limit: '3' as any,
    };
    expect(() => PolicySchema.parse(policy)).toThrow();
  });
});

describe('isHarnessProfile', () => {
  it('returns true for valid profile', () => {
    const profile = {
      name: 'test',
      binary: 'test',
      invocation: { template: 'test "{prompt}"', flags: {} },
      capabilities: { supportedTaskClasses: ['feature'] },
      policy: {},
    };
    expect(isHarnessProfile(profile)).toBe(true);
  });

  it('returns false for invalid profile', () => {
    expect(isHarnessProfile({})).toBe(false);
    expect(isHarnessProfile({ name: 'test' })).toBe(false);
    expect(
      isHarnessProfile({
        name: 'test',
        binary: 'test',
        invocation: { template: 'test', flags: {} },
        capabilities: { supportedTaskClasses: ['invalid' as any] },
        policy: {},
      }),
    ).toBe(false);
  });
});