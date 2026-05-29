import { describe, it, expect } from 'bun:test';
import { getProjectHealth } from './portfolio';

describe('getProjectHealth', () => {
  const now = Date.now();

  it('returns red when no sprints exist', () => {
    const result = getProjectHealth({
      lastSprintStatus: null,
      lastSprintBudget: null,
      lastSprintActualCost: null,
      lastSprintClosedAt: null,
      rejectionRate: null,
      totalSprints: 0,
    });
    expect(result.health).toBe('red');
    expect(result.reason).toBe('No sprints');
  });

  it('returns red when last sprint closed more than 7 days ago', () => {
    const result = getProjectHealth({
      lastSprintStatus: 'closed',
      lastSprintBudget: 100,
      lastSprintActualCost: 80,
      lastSprintClosedAt: now - 8 * 24 * 60 * 60 * 1000,
      rejectionRate: 0,
      totalSprints: 3,
    });
    expect(result.health).toBe('red');
    expect(result.reason).toBe('No sprints in 7 days');
  });

  it('returns red when active sprint has high rejection rate', () => {
    const result = getProjectHealth({
      lastSprintStatus: 'active',
      lastSprintBudget: 100,
      lastSprintActualCost: 50,
      lastSprintClosedAt: null,
      rejectionRate: 25,
      totalSprints: 2,
    });
    expect(result.health).toBe('red');
    expect(result.reason).toBe('High rejection rate');
  });

  it('returns yellow when closed sprint is over budget', () => {
    const result = getProjectHealth({
      lastSprintStatus: 'closed',
      lastSprintBudget: 100,
      lastSprintActualCost: 120,
      lastSprintClosedAt: now - 1000,
      rejectionRate: 0,
      totalSprints: 2,
    });
    expect(result.health).toBe('yellow');
    expect(result.reason).toBe('over budget');
  });

  it('returns yellow when closed sprint has rejection rate > 20%', () => {
    const result = getProjectHealth({
      lastSprintStatus: 'closed',
      lastSprintBudget: 100,
      lastSprintActualCost: 80,
      lastSprintClosedAt: now - 1000,
      rejectionRate: 25,
      totalSprints: 2,
    });
    expect(result.health).toBe('yellow');
    expect(result.reason).toBe('rejections >20%');
  });

  it('returns yellow when closed sprint is over budget AND rejections > 20%', () => {
    const result = getProjectHealth({
      lastSprintStatus: 'closed',
      lastSprintBudget: 100,
      lastSprintActualCost: 120,
      lastSprintClosedAt: now - 1000,
      rejectionRate: 30,
      totalSprints: 2,
    });
    expect(result.health).toBe('yellow');
    expect(result.reason).toBe('over budget, rejections >20%');
  });

  it('returns green when closed sprint within budget', () => {
    const result = getProjectHealth({
      lastSprintStatus: 'closed',
      lastSprintBudget: 100,
      lastSprintActualCost: 80,
      lastSprintClosedAt: now - 1000,
      rejectionRate: 5,
      totalSprints: 3,
    });
    expect(result.health).toBe('green');
    expect(result.reason).toBe('Last sprint closed within budget');
  });

  it('returns yellow for active sprint within budget', () => {
    const result = getProjectHealth({
      lastSprintStatus: 'active',
      lastSprintBudget: 100,
      lastSprintActualCost: 0,
      lastSprintClosedAt: null,
      rejectionRate: 0,
      totalSprints: 1,
    });
    expect(result.health).toBe('yellow');
    expect(result.reason).toBe('Last sprint active');
  });

  it('returns green when budget is 0 and actualCost is 0', () => {
    const result = getProjectHealth({
      lastSprintStatus: 'closed',
      lastSprintBudget: 0,
      lastSprintActualCost: 0,
      lastSprintClosedAt: now - 1000,
      rejectionRate: 0,
      totalSprints: 1,
    });
    expect(result.health).toBe('green');
  });

  it('returns yellow for planned sprint', () => {
    const result = getProjectHealth({
      lastSprintStatus: 'planned',
      lastSprintBudget: 100,
      lastSprintActualCost: 0,
      lastSprintClosedAt: null,
      rejectionRate: 0,
      totalSprints: 1,
    });
    expect(result.health).toBe('yellow');
    expect(result.reason).toBe('Last sprint planned');
  });
});
