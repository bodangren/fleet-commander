/**
 * Phase 4 Red gate: the PM agent recommender must sort recommended tasks by
 * topological order, and `SprintRecommendation` must expose a `makespan`
 * field (the dependency-induced serialization estimate, distinct from
 * `totalCost`). See `measure/tracks/task_dependencies_critical_path_20260605/plan.md`
 * Phase 4 + Phase 4b preamble and test-strategy §4.1.
 *
 * Current behavior: `generateRecommendation` sorts by `scoreTaskForSprint`
 * (priority * 10 + storyPoints + sizePenalty). Tasks with dependencies are
 * NOT ordered before their prerequisites, and the output type has no
 * `makespan` field. Both behaviors are pinned as Red gates below.
 *
 * Fixtures are built locally (with a `TaskWithDeps` type extension that
 * adds `dependencies` and a required `taskKey` to the recommender's
 * `Task` type) so that the test never reaches into the production type
 * definitions. The Green phase is expected to either widen the recommender
 * `Task` type to include `dependencies` / required `taskKey`, or accept a
 * separate `dependencyEdges` parameter.
 */

import { describe, expect, it } from 'bun:test';

import {
  generateRecommendation,
  type SprintRecommendation,
} from './recommender.js';
import type { Agent, Task, TaskStatus } from './agentTypes.js';

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

interface TaskOpts {
  _id: string;
  taskKey: string;
  title: string;
  storyPoints: number;
  priority: 'low' | 'medium' | 'high';
  status?: TaskStatus;
  dependencies?: string[];
  description?: string;
}

function makeRecommenderTask(opts: TaskOpts): TaskWithDeps {
  return {
    _id: opts._id,
    taskKey: opts.taskKey,
    projectId: 'p1',
    title: opts.title,
    description: opts.description ?? 'task',
    storyPoints: opts.storyPoints,
    status: opts.status ?? 'backlog',
    priority: opts.priority,
    costEstimate: 0,
    createdAt: 0,
    updatedAt: 0,
    dependencies: opts.dependencies ?? [],
  };
}

describe('generateRecommendation: dependency-aware ordering (Phase 4 Red)', () => {
  it('orders a dependent task AFTER its prerequisite, even when score would reverse it [RED]', () => {
    // Score order (no-dep sorting) would be: T2 (35) before T1 (16) before T3 (12).
    // Topo order is: T1 must come before T2 and T3 (T2 + T3 both depend on T1).
    // The current implementation sorts by score and emits T2 first, so this
    // assertion fails — that is the Red gate.
    const t1 = makeRecommenderTask({
      _id: 't1', taskKey: 'T1', title: 'Foundation', storyPoints: 8, priority: 'low',
    });
    const t2 = makeRecommenderTask({
      _id: 't2', taskKey: 'T2', title: 'Feature', storyPoints: 5, priority: 'high',
      dependencies: ['T1'],
    });
    const t3 = makeRecommenderTask({
      _id: 't3', taskKey: 'T3', title: 'Polish', storyPoints: 2, priority: 'low',
      dependencies: ['T1'],
    });

    const rec = generateRecommendation([t1, t2, t3], [architect]);
    const ids = rec.tasks.map((t) => t.taskId);
    const idx = (id: string) => ids.indexOf(id);

    expect(idx('t1')).toBeGreaterThanOrEqual(0);
    expect(idx('t1')).toBeLessThan(idx('t2'));
    expect(idx('t1')).toBeLessThan(idx('t3'));
  });

  it('breaks a tie between two dependents of the same root deterministically by score [RED]', () => {
    // T1 has no dep. T2 and T3 both depend on T1.
    // T2: medium/5 = 25. T3: low/2 = 12. Topo order: T1, then T2, T3.
    // When the Green phase implements the topo rule, T2 should still come
    // before T3 because they are at the same depth and the tie-break is
    // score. The current implementation does not consider depth, so the
    // assertion that T1 precedes T2 and T3 is the Red gate.
    const t1 = makeRecommenderTask({
      _id: 't1', taskKey: 'T1', title: 'Root', storyPoints: 2, priority: 'high',
    });
    const t2 = makeRecommenderTask({
      _id: 't2', taskKey: 'T2', title: 'Branch A', storyPoints: 5, priority: 'medium',
      dependencies: ['T1'],
    });
    const t3 = makeRecommenderTask({
      _id: 't3', taskKey: 'T3', title: 'Branch B', storyPoints: 2, priority: 'low',
      dependencies: ['T1'],
    });

    const rec = generateRecommendation([t1, t2, t3], [architect]);
    const ids = rec.tasks.map((t) => t.taskId);
    const idx = (id: string) => ids.indexOf(id);

    expect(idx('t1')).toBeLessThan(idx('t2'));
    expect(idx('t1')).toBeLessThan(idx('t3'));
  });

  it('returns an empty task list (and zero makespan) when the dependency graph has a cycle [RED]', () => {
    // T1 depends on T2, T2 depends on T1: cycle.
    // The Green phase must detect this and return an empty result, mirroring
    // the behaviour of `topologicalSort`. The current implementation does
    // not detect cycles and will return the tasks in score order.
    const t1 = makeRecommenderTask({
      _id: 't1', taskKey: 'T1', title: 'A', storyPoints: 3, priority: 'high',
      dependencies: ['T2'],
    });
    const t2 = makeRecommenderTask({
      _id: 't2', taskKey: 'T2', title: 'B', storyPoints: 3, priority: 'high',
      dependencies: ['T1'],
    });

    const rec = generateRecommendation([t1, t2], [architect]);
    expect(rec.tasks).toHaveLength(0);
  });

  it('skips dependency keys that do not resolve to a known taskKey [RED]', () => {
    // T2 depends on MISSING which is not in the task set. Topo order should
    // treat T1 and T2 as both roots, ordered by score.
    const t1 = makeRecommenderTask({
      _id: 't1', taskKey: 'T1', title: 'A', storyPoints: 2, priority: 'medium',
    });
    const t2 = makeRecommenderTask({
      _id: 't2', taskKey: 'T2', title: 'B', storyPoints: 5, priority: 'high',
      dependencies: ['MISSING'],
    });

    const rec = generateRecommendation([t1, t2], [architect]);
    expect(rec.tasks.length).toBe(2);
  });
});

describe('SprintRecommendation.makespan (Phase 4b Red)', () => {
  it('exposes a `makespan` field on the recommendation output [RED]', () => {
    // Red gate: SprintRecommendation has no `makespan` field today; the
    // access below must succeed (the Green phase adds the field). If the
    // field is missing, the test fails at the assertion.
    const t1 = makeRecommenderTask({
      _id: 't1', taskKey: 'T1', title: 'Root', storyPoints: 2, priority: 'medium',
    });
    const rec = generateRecommendation([t1], [architect]) as SprintRecommendationWithMakespan;
    expect(typeof rec.makespan).toBe('number');
  });

  it('reports the diamond critical path as the makespan (11 pts) [RED]', () => {
    // Diamond: A(2) -> {B(8), C(3)} -> D(1). Heavier branch = A->B->D = 11.
    const a = makeRecommenderTask({
      _id: 'a', taskKey: 'A', title: 'A', storyPoints: 2, priority: 'medium',
    });
    const b = makeRecommenderTask({
      _id: 'b', taskKey: 'B', title: 'B', storyPoints: 8, priority: 'medium',
      dependencies: ['A'],
    });
    const c = makeRecommenderTask({
      _id: 'c', taskKey: 'C', title: 'C', storyPoints: 3, priority: 'medium',
      dependencies: ['A'],
    });
    const d = makeRecommenderTask({
      _id: 'd', taskKey: 'D', title: 'D', storyPoints: 1, priority: 'medium',
      dependencies: ['B', 'C'],
    });
    const rec = generateRecommendation([a, b, c, d], [architect]) as SprintRecommendationWithMakespan;
    expect(rec.makespan).toBe(11);
  });

  it('reports a single task makespan equal to its story points [RED]', () => {
    const t1 = makeRecommenderTask({
      _id: 't1', taskKey: 'T1', title: 'Solo', storyPoints: 5, priority: 'medium',
    });
    const rec = generateRecommendation([t1], [architect]) as SprintRecommendationWithMakespan;
    expect(rec.makespan).toBe(5);
  });

  it('reports a chain makespan equal to the sum of story points [RED]', () => {
    // Chain: A(2) -> B(3) -> C(4) = 9.
    const a = makeRecommenderTask({
      _id: 'a', taskKey: 'A', title: 'A', storyPoints: 2, priority: 'medium',
    });
    const b = makeRecommenderTask({
      _id: 'b', taskKey: 'B', title: 'B', storyPoints: 3, priority: 'medium',
      dependencies: ['A'],
    });
    const c = makeRecommenderTask({
      _id: 'c', taskKey: 'C', title: 'C', storyPoints: 4, priority: 'medium',
      dependencies: ['B'],
    });
    const rec = generateRecommendation([a, b, c], [architect]) as SprintRecommendationWithMakespan;
    expect(rec.makespan).toBe(9);
  });

  it('reports 0 makespan for an empty sprint [RED]', () => {
    const rec = generateRecommendation([], [architect]) as SprintRecommendationWithMakespan;
    expect(rec.makespan).toBe(0);
  });

  it('reports the max across disconnected components [RED]', () => {
    // Component 1: A(2) -> B(3) = 5. Component 2: C(1) -> D(7) = 8.
    // Expected makespan = max(5, 8) = 8.
    const a = makeRecommenderTask({
      _id: 'a', taskKey: 'A', title: 'A', storyPoints: 2, priority: 'medium',
    });
    const b = makeRecommenderTask({
      _id: 'b', taskKey: 'B', title: 'B', storyPoints: 3, priority: 'medium',
      dependencies: ['A'],
    });
    const c = makeRecommenderTask({
      _id: 'c', taskKey: 'C', title: 'C', storyPoints: 1, priority: 'medium',
    });
    const d = makeRecommenderTask({
      _id: 'd', taskKey: 'D', title: 'D', storyPoints: 7, priority: 'medium',
      dependencies: ['C'],
    });
    const rec = generateRecommendation([a, b, c, d], [architect]) as SprintRecommendationWithMakespan;
    expect(rec.makespan).toBe(8);
  });
});
