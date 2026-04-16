import { describe, expect, test, vi, beforeEach, afterEach } from 'bun:test';
import { loadAgentPrompts } from '../agents/index';

describe('agent prompt sync', () => {
  test('loadAgentPrompts returns all four agent prompts', () => {
    const prompts = loadAgentPrompts();
    expect(prompts.length).toBe(4);

    const names = prompts.map((p) => p.name);
    expect(names).toContain('architect');
    expect(names).toContain('executor');
    expect(names).toContain('reviewer');
    expect(names).toContain('recovery');
    expect(names.length).toBe(4);
  });

  test('each prompt has required fields for Convex upsert', () => {
    const prompts = loadAgentPrompts();
    for (const prompt of prompts) {
      expect(typeof prompt.name).toBe('string');
      expect(prompt.name.length).toBeGreaterThan(0);
      expect(typeof prompt.description).toBe('string');
      expect(typeof prompt.mode).toBe('string');
      expect(typeof prompt.model).toBe('string');
      expect(typeof prompt.temperature).toBe('number');
      expect(prompt.temperature).toBeGreaterThanOrEqual(0);
      expect(prompt.temperature).toBeLessThanOrEqual(1);
      expect(typeof prompt.tools).toBe('object');
      expect(typeof prompt.tools.write).toBe('boolean');
      expect(typeof prompt.tools.edit).toBe('boolean');
      expect(typeof prompt.tools.bash).toBe('boolean');
      expect(typeof prompt.prompt).toBe('string');
      expect(prompt.prompt.length).toBeGreaterThan(0);
    }
  });

  test('architect prompt requests ArchitectOutput JSON schema', () => {
    const prompts = loadAgentPrompts();
    const architect = prompts.find((p) => p.name === 'architect');
    expect(architect).toBeDefined();
    expect(architect!.prompt).toContain('output');
    expect(architect!.prompt).toContain('confidence');
    expect(architect!.prompt).toContain('assumptions');
    expect(architect!.prompt).toContain('suggestedHarness');
  });

  test('executor prompt requests ExecutorOutput JSON schema', () => {
    const prompts = loadAgentPrompts();
    const executor = prompts.find((p) => p.name === 'executor');
    expect(executor).toBeDefined();
    expect(executor!.prompt).toContain('changedFiles');
    expect(executor!.prompt).toContain('testsRun');
    expect(executor!.prompt).toContain('unresolvedAssumptions');
    expect(executor!.prompt).toContain('confidence');
    expect(executor!.prompt).toContain('branch');
    expect(executor!.prompt).toContain('commit');
    expect(executor!.prompt).toContain('status');
  });

  test('reviewer prompt requests ReviewerOutput with issueClass and severity', () => {
    const prompts = loadAgentPrompts();
    const reviewer = prompts.find((p) => p.name === 'reviewer');
    expect(reviewer).toBeDefined();
    expect(reviewer!.prompt).toContain('status');
    expect(reviewer!.prompt).toContain('summary');
    expect(reviewer!.prompt).toContain('issueClass');
    expect(reviewer!.prompt).toContain('severity');
  });

  test('recovery prompt requests RecoveryOutput with action enum', () => {
    const prompts = loadAgentPrompts();
    const recovery = prompts.find((p) => p.name === 'recovery');
    expect(recovery).toBeDefined();
    expect(recovery!.prompt).toContain('action');
    expect(recovery!.prompt).toContain('retry');
    expect(recovery!.prompt).toContain('escalate');
    expect(recovery!.prompt).toContain('split');
    expect(recovery!.prompt).toContain('replan');
    expect(recovery!.prompt).toContain('human_review');
    expect(recovery!.prompt).toContain('reason');
  });

  test('tools object can be serialized to toolsJson', () => {
    const prompts = loadAgentPrompts();
    for (const prompt of prompts) {
      const toolsJson = JSON.stringify(prompt.tools);
      expect(() => JSON.parse(toolsJson)).not.toThrow();
      const parsed = JSON.parse(toolsJson);
      expect(parsed).toHaveProperty('write');
      expect(parsed).toHaveProperty('edit');
      expect(parsed).toHaveProperty('bash');
    }
  });
});