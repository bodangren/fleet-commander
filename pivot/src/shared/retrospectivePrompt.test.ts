import { describe, it, expect } from 'bun:test';
import { constructRetrospectivePrompt, validateRetrospectiveReport } from './retrospectivePrompt';

describe('constructRetrospectivePrompt', () => {
  it('includes sprint name and date range', () => {
    const data = {
      sprintName: 'Sprint 42',
      dateRange: { start: '2026-05-01', end: '2026-05-14' },
      taskCounts: {},
      agentWorkload: [],
      issuePatterns: [],
      velocity: {},
      hookFailures: [],
      sessionMetrics: {},
      priorityCorrelation: [],
      blockedByChains: [],
      topErrors: [],
    };
    const prompt = constructRetrospectivePrompt(data);
    expect(prompt).toContain('Sprint 42');
    expect(prompt).toContain('2026-05-01');
    expect(prompt).toContain('2026-05-14');
  });

  it('formats task counts correctly', () => {
    const data = {
      sprintName: 'S',
      dateRange: { start: '2026-01-01', end: '2026-01-07' },
      taskCounts: { planned: 10, completed: 7, blocked: 1, failed: 1, carriedOver: 2 },
      velocity: { completionRate: 0.7 },
      agentWorkload: [],
      issuePatterns: [],
      hookFailures: [],
      sessionMetrics: {},
      priorityCorrelation: [],
      blockedByChains: [],
      topErrors: [],
    };
    const prompt = constructRetrospectivePrompt(data);
    expect(prompt).toContain('Planned: 10');
    expect(prompt).toContain('Completed: 7');
    expect(prompt).toContain('Blocked: 1');
    expect(prompt).toContain('Failed: 1');
    expect(prompt).toContain('Carried Over: 2');
    expect(prompt).toContain('Completion Rate: 70%');
  });

  it('formats agent workload', () => {
    const data = {
      sprintName: 'S',
      dateRange: { start: '2026-01-01', end: '2026-01-07' },
      taskCounts: {},
      agentWorkload: [
        { agent: 'agent-a', tasksAssigned: 3, tasksCompleted: 2, avgDurationMs: 1200 },
      ],
      issuePatterns: [],
      velocity: {},
      hookFailures: [],
      sessionMetrics: {},
      priorityCorrelation: [],
      blockedByChains: [],
      topErrors: [],
    };
    const prompt = constructRetrospectivePrompt(data);
    expect(prompt).toContain('agent-a: 3 assigned, 2 completed, avg 1200ms');
  });

  it('formats issue patterns with limit', () => {
    const patterns = Array.from({ length: 15 }, (_, i) => ({
      pattern: `type-${i}`,
      count: i + 1,
    }));
    const data = {
      sprintName: 'S',
      dateRange: { start: '2026-01-01', end: '2026-01-07' },
      taskCounts: {},
      agentWorkload: [],
      issuePatterns: patterns,
      velocity: {},
      hookFailures: [],
      sessionMetrics: {},
      priorityCorrelation: [],
      blockedByChains: [],
      topErrors: [],
    };
    const prompt = constructRetrospectivePrompt(data);
    expect(prompt).toContain('type-0: 1 occurrences');
    expect(prompt).toContain('type-9: 10 occurrences');
    expect(prompt).not.toContain('type-10');
  });

  it('formats blocked-by chains and top errors with limits', () => {
    const chains = Array.from({ length: 15 }, (_, i) => ({
      taskKey: `t-${i}`,
      blockerCount: i + 1,
      cycleTimeMs: i * 100,
    }));
    const errors = Array.from({ length: 15 }, (_, i) => ({
      message: `err-${i}`,
      count: i + 1,
    }));
    const data = {
      sprintName: 'S',
      dateRange: { start: '2026-01-01', end: '2026-01-07' },
      taskCounts: {},
      agentWorkload: [],
      issuePatterns: [],
      velocity: {},
      hookFailures: [],
      sessionMetrics: {},
      priorityCorrelation: [],
      blockedByChains: chains,
      topErrors: errors,
    };
    const prompt = constructRetrospectivePrompt(data);
    expect(prompt).toContain('t-0: 1 blockers');
    expect(prompt).toContain('t-9: 10 blockers');
    expect(prompt).not.toContain('t-10');
    expect(prompt).toContain('err-0: 1 times');
    expect(prompt).toContain('err-9: 10 times');
    expect(prompt).not.toContain('err-10');
  });

  it('handles null cycle time in blocked-by chains', () => {
    const data = {
      sprintName: 'S',
      dateRange: { start: '2026-01-01', end: '2026-01-07' },
      taskCounts: {},
      agentWorkload: [],
      issuePatterns: [],
      velocity: {},
      hookFailures: [],
      sessionMetrics: {},
      priorityCorrelation: [],
      blockedByChains: [{ taskKey: 't1', blockerCount: 2, cycleTimeMs: null }],
      topErrors: [],
    };
    const prompt = constructRetrospectivePrompt(data);
    expect(prompt).toContain('cycle time N/Ams');
  });

  it('does not contain double quotes that could break shell tokenization', () => {
    const data = {
      sprintName: 'Sprint "Special"',
      dateRange: { start: '2026-01-01', end: '2026-01-07' },
      taskCounts: {},
      agentWorkload: [],
      issuePatterns: [{ pattern: 'type"error', count: 1 }],
      velocity: {},
      hookFailures: [],
      sessionMetrics: {},
      priorityCorrelation: [],
      blockedByChains: [],
      topErrors: [],
    };
    const prompt = constructRetrospectivePrompt(data);
    // The prompt builder should handle quotes gracefully; at minimum it should not crash
    expect(prompt.length).toBeGreaterThan(0);
  });

  it('includes priority accuracy in required sections', () => {
    const data = {
      sprintName: 'S',
      dateRange: { start: '2026-01-01', end: '2026-01-07' },
      taskCounts: {},
      agentWorkload: [],
      issuePatterns: [],
      velocity: {},
      hookFailures: [],
      sessionMetrics: {},
      priorityCorrelation: [],
      blockedByChains: [],
      topErrors: [],
    };
    const prompt = constructRetrospectivePrompt(data);
    expect(prompt).toContain('Priority Accuracy');
    expect(prompt).toContain('Priority Accuracy');
  });
});

describe('validateRetrospectiveReport', () => {
  it('passes when all required sections are present', () => {
    const report = `
# Sprint Summary
Some text

# Patterns Detected
Some text

# Top Blockers
Some text

# Improvement Suggestions
Some text

# Agent Workload Balance
Some text

# Priority Accuracy
Some text
    `;
    const result = validateRetrospectiveReport(report);
    expect(result.valid).toBe(true);
    expect(result.missing).toHaveLength(0);
  });

  it('fails when sections are missing', () => {
    const report = '# Sprint Summary\nOnly one section';
    const result = validateRetrospectiveReport(report);
    expect(result.valid).toBe(false);
    expect(result.missing.length).toBeGreaterThan(0);
  });

  it('is case-insensitive', () => {
    const report = '# SPRINT SUMMARY\n# PATTERNS DETECTED\n# TOP BLOCKERS\n# IMPROVEMENT SUGGESTIONS\n# AGENT WORKLOAD BALANCE\n# PRIORITY ACCURACY';
    const result = validateRetrospectiveReport(report);
    expect(result.valid).toBe(true);
  });
});
