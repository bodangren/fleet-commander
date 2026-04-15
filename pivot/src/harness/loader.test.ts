import { describe, expect, it, beforeEach, afterEach } from 'bun:test';
import { writeFileSync, mkdirSync, rmSync, readFileSync } from 'fs';
import { join } from 'path';
import { loadHarnessFromFile, loadAllHarnesses, profileToDbEntry } from './loader';
import { HarnessProfile } from '../shared/harnessProfile';

const TEST_HARNESS_DIR = join(process.cwd(), 'test-harnesses');

describe('harness loader', () => {
  beforeEach(() => {
    mkdirSync(TEST_HARNESS_DIR, { recursive: true });
  });

  afterEach(() => {
    rmSync(TEST_HARNESS_DIR, { recursive: true, force: true });
  });

  describe('loadHarnessFromFile', () => {
    it('loads a valid harness YAML file', () => {
      const yaml = `
name: test-harness
binary: test-bin
invocation:
  template: "test run \\"{prompt}\\""
  flags:
    agent: "--agent {value}"
capabilities:
  supportedTaskClasses:
    - feature
    - bug
  supportsContinuousMode: true
  maxConcurrentTasks: 2
policy:
  allowed_task_classes:
    - feature
    - bug
  concurrency_limit: 2
  retry_with_human_review_on_failure: false
`;
      const filePath = join(TEST_HARNESS_DIR, 'test-harness.yaml');
      writeFileSync(filePath, yaml);

      const result = loadHarnessFromFile(filePath);
      expect(result).not.toBeNull();
      expect(result!.name).toBe('test-harness');
      expect(result!.profile.binary).toBe('test-bin');
      expect(result!.profile.capabilities?.supportedTaskClasses).toEqual(['feature', 'bug']);
      expect(result!.profile.policy?.concurrency_limit).toBe(2);
    });

    it('loads harness with minimal fields', () => {
      const yaml = `
name: minimal-harness
binary: minimal
invocation:
  template: "minimal run \\"{prompt}\\""
  flags: {}
`;
      const filePath = join(TEST_HARNESS_DIR, 'minimal.yaml');
      writeFileSync(filePath, yaml);

      const result = loadHarnessFromFile(filePath);
      expect(result).not.toBeNull();
      expect(result!.name).toBe('minimal-harness');
    });

    it('returns null for invalid YAML', () => {
      const yaml = `
name: invalid
binary: test
  invalid yaml here
`;
      const filePath = join(TEST_HARNESS_DIR, 'invalid.yaml');
      writeFileSync(filePath, yaml);

      const result = loadHarnessFromFile(filePath);
      expect(result).toBeNull();
    });

    it('returns null for YAML that fails schema validation', () => {
      const yaml = `
name: invalid
binary: test
capabilities:
  supportedTaskClasses:
    - invalid_class
`;
      const filePath = join(TEST_HARNESS_DIR, 'invalid-schema.yaml');
      writeFileSync(filePath, yaml);

      const result = loadHarnessFromFile(filePath);
      expect(result).toBeNull();
    });

    it('loads harness with discovery block', () => {
      const yaml = `
name: discovery-harness
binary: discovery-bin
discovery:
  command: "discovery-harness models"
  parse_strategy: line-per-model
  pattern: "^(\\\\w+)/(\\\\w+)$"
  notes: "Lists available models"
invocation:
  template: "discovery-harness run \\"{prompt}\\""
  flags: {}
`;
      const filePath = join(TEST_HARNESS_DIR, 'discovery.yaml');
      writeFileSync(filePath, yaml);

      const result = loadHarnessFromFile(filePath);
      expect(result).not.toBeNull();
      expect(result!.profile.discovery?.command).toBe('discovery-harness models');
      expect(result!.profile.discovery?.parse_strategy).toBe('line-per-model');
    });
  });

  describe('profileToDbEntry', () => {
    it('converts a full profile to database entry', () => {
      const profile: HarnessProfile = {
        name: 'test-harness',
        binary: 'test-bin',
        invocation: {
          template: 'test run "{prompt}"',
          flags: { agent: '--agent {value}', continue: '--continue' },
        },
        capabilities: {
          supportedTaskClasses: ['feature', 'bug'],
          supportsContinuousMode: true,
          maxConcurrentTasks: 3,
          supportedLlmProviders: ['anthropic', 'openai'],
        },
        policy: {
          allowed_task_classes: ['feature', 'bug'],
          concurrency_limit: 2,
          retry_with_human_review_on_failure: false,
        },
        discovery: {
          command: 'test models',
          parse_strategy: 'line-per-model',
          pattern: '',
          notes: 'Test discovery',
        },
      };

      const entry = profileToDbEntry(profile);

      expect(entry.name).toBe('test-harness');
      expect(entry.binary).toBe('test-bin');
      expect(entry.discoveryCommand).toBe('test models');
      expect(entry.invocationTemplate).toBe('test run "{prompt}"');
      expect(entry.capabilitiesJson).toBe(JSON.stringify(profile.capabilities));
      expect(entry.policyJson).toBe(JSON.stringify(profile.policy));
    });

    it('handles profile with minimal fields', () => {
      const profile: HarnessProfile = {
        name: 'minimal',
        binary: 'min',
        invocation: {
          template: 'min run "{prompt}"',
          flags: {},
        },
      };

      const entry = profileToDbEntry(profile);

      expect(entry.name).toBe('minimal');
      expect(entry.binary).toBe('min');
      expect(entry.discoveryCommand).toBeUndefined();
      expect(entry.invocationTemplate).toBe('min run "{prompt}"');
      expect(entry.capabilitiesJson).toBe(JSON.stringify({
        supportedTaskClasses: ['feature'],
        supportsContinuousMode: false,
        maxConcurrentTasks: 1,
        supportedLlmProviders: [],
      }));
    });
  });
});