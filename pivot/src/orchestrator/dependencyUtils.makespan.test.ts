/**
 * Phase 4b Red gate: `estimateSprintMakespan` is a new pure function that
 * computes the wall-clock estimate (in story points of the longest weighted
 * dependency path) for a set of sprint tasks. Per the acceptance sub-spec
 * in `measure/tracks/task_dependencies_critical_path_20260605/plan.md`
 * (Phase 4b preamble):
 *
 *   makespan = max over each connected component C of
 *              computeCriticalPath(C).totalStoryPoints
 *
 * This file is the Red phase: the function does not exist yet, so importing
 * it from `./dependencyUtils` is the module-resolution Red gate. Each
 * table-driven case below pins one edge case from the sub-spec.
 *
 * Fixtures come from `./__fixtures__/dependencyFixtures` per test-strategy §2
 * so the same scenario names line up across Phase 1/2/4.
 */

import { describe, expect, it } from 'bun:test';

import { estimateSprintMakespan } from './dependencyUtils';
import { diamond, disconnected, linearChain3, makeTask, parallelBranches } from './__fixtures__/dependencyFixtures';
import type { Task } from './types';

describe('estimateSprintMakespan (Phase 4b Red gate)', () => {
  it('returns 0 for an empty sprint', () => {
    expect(estimateSprintMakespan([])).toBe(0);
  });

  it('returns the single task story points when sprint has one task [RED: function missing]', () => {
    const solo = makeTask({ taskKey: 'solo', storyPoints: 5 });
    expect(estimateSprintMakespan([solo])).toBe(5);
  });

  it('serializes a chain: sum of story points along the chain [RED: function missing]', () => {
    // linearChain3: A(3) -> B(3) -> C(3); expected makespan = 9.
    expect(estimateSprintMakespan(linearChain3)).toBe(9);
  });

  it('overlaps parallel branches: max of the branch totals, not the sum [RED: function missing]', () => {
    // parallelBranches: A(5) (no dep), B(3) (no dep), C(2, dep A), D(10, dep B).
    // Component 1 = A -> C, weight = 7.
    // Component 2 = B -> D, weight = 13.
    // Expected makespan = max(7, 13) = 13 (NOT 20 = sum).
    expect(estimateSprintMakespan(parallelBranches)).toBe(13);
  });

  it('follows the heavier branch of a diamond [RED: function missing]', () => {
    // diamond: A(2) -> {B(8), C(3)} -> D(1).
    // Branch A->B->D = 11. Branch A->C->D = 6.
    // Expected makespan = 11 (the heavier branch), NOT 14 (sum) and NOT 6.
    expect(estimateSprintMakespan(diamond)).toBe(11);
  });

  it('takes the max across disconnected components [RED: function missing]', () => {
    // disconnected: A(5) -> B(3) and C(1) -> D(7).
    // Component 1 weight = 8, Component 2 weight = 8. Expected = 8.
    expect(estimateSprintMakespan(disconnected)).toBe(8);
  });

  it('skips a task whose dependencies are not in the sprint (cycle-isolation) [RED: function missing]', () => {
    // B depends on EXTERNAL which is not in this sprint.
    // B is therefore a root from the perspective of the sprint subgraph.
    // A(3) -> B(5) -> C(2) plus a root X(4). Expected makespan = 9 (chain) OR 9
    // (4 + 5); we pin the contract: external deps are treated as already done.
    const a = makeTask({ taskKey: 'A', storyPoints: 3 });
    const b = makeTask({ taskKey: 'B', dependencies: ['EXTERNAL'], storyPoints: 5 });
    const c = makeTask({ taskKey: 'C', dependencies: ['B'], storyPoints: 2 });
    const x = makeTask({ taskKey: 'X', storyPoints: 4 });
    const tasks: Task[] = [a, b, c, x];
    // B and C are the longest path (5+2=7) since EXTERNAL is treated as root.
    // X is a separate root with 4. Expected = max(7, 4) = 7.
    expect(estimateSprintMakespan(tasks)).toBe(7);
  });

  it('does not mutate the input task array [RED: function missing]', () => {
    const original = [...linearChain3];
    const snapshot = original.map((t) => ({ ...t, dependencies: [...t.dependencies] }));
    estimateSprintMakespan(original);
    expect(original).toEqual(snapshot);
  });
});
