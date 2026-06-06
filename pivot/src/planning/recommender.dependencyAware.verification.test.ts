/**
 * Phase 6 verification — PM agent recommender end-to-end through the
 * production `generateRecommendation` import.
 *
 * Encodes the Phase 6 manual checklist item:
 *
 *   "Manual test: start sprint with dependent tasks, verify PM agent
 *    recommends in correct order"
 *
 * This file is a verification (not a Red gate) — once the Phase 4 Green
 * work lands, these tests should pass. The companion Red-gate file is
 * `recommender.dependencyAware.test.ts` (still failing on topo order and
 * `makespan` until the Green phase widens `Task` to include
 * `dependencies`/`taskKey` and adds the `makespan` field to
 * `SprintRecommendation`).
 *
 * The scenario is a 5-task sprint with a real diamond + tail:
 *
 *   T1 (root, 2 pts)
 *     ├── T2 (5 pts, depends on T1)
 *     └── T3 (3 pts, depends on T1)
 *             └── T5 (1 pt, depends on T3)
 *   T4 (independent root, 4 pts)
 *
 * Expected topological order: T1, T2, T3, T4, T5 — with T2/T3 at the same
 * depth (tie-broken by score) and T4 reachable from any depth ≥ 0.
 * Expected makespan: max(2+5, 2+3+1) = max(7, 6) = 7 (heavier branch
 * through T2).
 *
 * No production source code is modified in this commit.
 */

import { describe, expect, it } from 'bun:test';

import {
  generateRecommendation,
  type SprintRecommendation,
} from './recommender.js';
import type { Agent, Task } from '../pipeline/agentTypes.js';

type TaskWithDeps = Task & { taskKey: string; dependencies: string[] };
type SprintRecommendationWithMakespan = SprintRecommendation & { makespan: number };

const architect: Agent = {
  _id: 'agent-arch-1',
  name: 'arch1',
  role: 'architect',
  skills: ['typescript', 'react'],
  model: 'claude-opus',
  costPerPoint: 4.2,
  reliability: 0.95,
  status: 'active',
  workload: 0,
  maxWorkload: 5,
  createdAt: 0,
};

const executor: Agent = {
  _id: 'agent-exec-1',
  name: 'exec1',
  role: 'executor',
  skills: ['node', 'postgresql'],
  model: 'claude-sonnet',
  costPerPoint: 2.1,
  reliability: 0.92,
  status: 'active',
  workload: 0,
  maxWorkload: 5,
  createdAt: 0,
};

function makeTask(opts: {
  _id: string;
  taskKey: string;
  title: string;
  storyPoints: number;
  priority: 'low' | 'medium' | 'high';
  dependencies?: string[];
}): TaskWithDeps {
  return {
    _id: opts._id,
    taskKey: opts.taskKey,
    projectId: 'p1',
    title: opts.title,
    description: 'task',
    storyPoints: opts.storyPoints,
    status: 'backlog',
    priority: opts.priority,
    costEstimate: 0,
    createdAt: 0,
    updatedAt: 0,
    dependencies: opts.dependencies ?? [],
  };
}

describe('Phase 6 verification — PM agent on a 5-task dependent sprint', () => {
  it('orders T1 before its dependents T2 and T3, and orders T3 before T5', () => {
    const t1 = makeTask({ _id: 't1', taskKey: 'T1', title: 'Root', storyPoints: 2, priority: 'high' });
    const t2 = makeTask({ _id: 't2', taskKey: 'T2', title: 'Branch A', storyPoints: 5, priority: 'medium', dependencies: ['T1'] });
    const t3 = makeTask({ _id: 't3', taskKey: 'T3', title: 'Branch B', storyPoints: 3, priority: 'medium', dependencies: ['T1'] });
    const t4 = makeTask({ _id: 't4', taskKey: 'T4', title: 'Independent', storyPoints: 4, priority: 'medium' });
    const t5 = makeTask({ _id: 't5', taskKey: 'T5', title: 'Tail', storyPoints: 1, priority: 'medium', dependencies: ['T3'] });

    const rec = generateRecommendation([t1, t2, t3, t4, t5], [architect, executor]);
    const ids = rec.tasks.map((t) => t.taskId);
    const idx = (id: string) => ids.indexOf(id);

    expect(idx('t1')).toBeGreaterThanOrEqual(0);
    expect(idx('t1')).toBeLessThan(idx('t2'));
    expect(idx('t1')).toBeLessThan(idx('t3'));
    expect(idx('t3')).toBeLessThan(idx('t5'));
  });

  it('emits a `makespan` field equal to the heavier branch critical path (7 pts)', () => {
    // Branch T1→T2 = 2+5 = 7. Branch T1→T3→T5 = 2+3+1 = 6.
    // Critical path = max(7, 6) = 7.
    const t1 = makeTask({ _id: 't1', taskKey: 'T1', title: 'Root', storyPoints: 2, priority: 'high' });
    const t2 = makeTask({ _id: 't2', taskKey: 'T2', title: 'Branch A', storyPoints: 5, priority: 'medium', dependencies: ['T1'] });
    const t3 = makeTask({ _id: 't3', taskKey: 'T3', title: 'Branch B', storyPoints: 3, priority: 'medium', dependencies: ['T1'] });
    const t4 = makeTask({ _id: 't4', taskKey: 'T4', title: 'Independent', storyPoints: 4, priority: 'medium' });
    const t5 = makeTask({ _id: 't5', taskKey: 'T5', title: 'Tail', storyPoints: 1, priority: 'medium', dependencies: ['T3'] });

    const rec = generateRecommendation([t1, t2, t3, t4, t5], [architect, executor]) as SprintRecommendationWithMakespan;
    expect(typeof rec.makespan).toBe('number');
    expect(rec.makespan).toBe(7);
  });

  it('keeps totalCost additive and does NOT conflate it with makespan (cost != makespan)', () => {
    const t1 = makeTask({ _id: 't1', taskKey: 'T1', title: 'Root', storyPoints: 2, priority: 'high' });
    const t2 = makeTask({ _id: 't2', taskKey: 'T2', title: 'Branch A', storyPoints: 5, priority: 'medium', dependencies: ['T1'] });
    const t3 = makeTask({ _id: 't3', taskKey: 'T3', title: 'Branch B', storyPoints: 3, priority: 'medium', dependencies: ['T1'] });

    const rec = generateRecommendation([t1, t2, t3], [architect]) as SprintRecommendationWithMakespan;
    expect(rec.totalCost).toBeGreaterThan(0);
    expect(rec.makespan).toBe(7);
    expect(rec.makespan).not.toBe(rec.totalCost);
  });

  it('places T1 first even when its score would otherwise put it after a child', () => {
    // Score-only order: T2 (35) > T3 (23) > T1 (22). T1 must still be first
    // because T2 and T3 both depend on it.
    const t1 = makeTask({ _id: 't1', taskKey: 'T1', title: 'Foundation', storyPoints: 2, priority: 'low' });
    const t2 = makeTask({ _id: 't2', taskKey: 'T2', title: 'Feature', storyPoints: 5, priority: 'high', dependencies: ['T1'] });
    const t3 = makeTask({ _id: 't3', taskKey: 'T3', title: 'Polish', storyPoints: 3, priority: 'medium', dependencies: ['T1'] });

    const rec = generateRecommendation([t1, t2, t3], [architect]);
    const ids = rec.tasks.map((t) => t.taskId);
    const idx = (id: string) => ids.indexOf(id);
    expect(idx('t1')).toBe(0);
    expect(idx('t1')).toBeLessThan(idx('t2'));
    expect(idx('t1')).toBeLessThan(idx('t3'));
  });

  it('returns an empty task list (and zero makespan) when the dependency graph contains a cycle', () => {
    const t1 = makeTask({ _id: 't1', taskKey: 'T1', title: 'A', storyPoints: 3, priority: 'high', dependencies: ['T2'] });
    const t2 = makeTask({ _id: 't2', taskKey: 'T2', title: 'B', storyPoints: 3, priority: 'high', dependencies: ['T1'] });

    const rec = generateRecommendation([t1, t2], [architect]) as SprintRecommendationWithMakespan;
    expect(rec.tasks).toHaveLength(0);
    expect(rec.makespan).toBe(0);
  });
});
